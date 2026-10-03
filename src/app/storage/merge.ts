import type { NewProgressEvent, ProgressEvent, ProgressState } from '@domain/progress/types.ts'
import { createInitialState, foldEvents } from '@domain/progress/reducer.ts'
import type { StorageAdapter } from './port.ts'

/**
 * The progress store, and the fix for the worst bug in a local-first app.
 *
 * THE BUG. localStorage is shared by every tab on the origin, but each tab holds
 * its own in-memory copy. So:
 *
 *   1. Tab A has the dashboard open, holding events [e1 … e40]
 *   2. Tab B, a lesson in another window, records e41 and writes [e1 … e41]
 *   3. Tab A completes a lesson, folds from its OWN stale copy, writes [e1 … e40, e42]
 *
 * e41 is gone. The learner loses work with no error, no warning, and no
 * reproducible cause. On a laptop with several tabs — or a phone, where this
 * app will mostly be used — that is not a rare race.
 *
 * THE FIX, which is cheap because progress is an append-only event log:
 *
 *   - Every event carries a unique `id` (see types.ts), so two logs can be
 *     merged by union rather than by last-write-wins.
 *   - `append` re-reads from storage immediately before writing. It never writes
 *     a cached snapshot.
 *   - A `storage` event listener lets an open tab notice another tab's write and
 *     re-fold, so it catches up instead of overwriting.
 *
 * The event `id` is the enabling change, and it is the reason it is worth adding
 * now while there is no learner data to migrate.
 */

export const PROGRESS_KEY = 'progress'

export const newEventId = (): string => {
  const cryptoRef = globalThis.crypto
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') return cryptoRef.randomUUID()
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * A timestamp strictly later than the newest event in the log.
 *
 * WHY THIS EXISTS (M3). The fold is "last write wins" over the log's ORDER, and
 * the order is `at` then `id`. Two events recorded in the same millisecond —
 * which a fast machine does easily, and which a test does every time — get the
 * same `at`, so the only tiebreak left is a RANDOM id. That makes the outcome of
 * "mark complete, then mark not complete" a coin flip.
 *
 * So the generated timestamp is nudged to be strictly greater than the last
 * event's. The adjustment is at most a millisecond, and in exchange "the later
 * action wins" is true rather than probabilistic. An event that supplies its own
 * `at` (imports, fixtures) is left exactly as given.
 */
const nextTimestamp = (events: readonly ProgressEvent[]): string => {
  const last = events[events.length - 1]
  const lastMs = last ? Date.parse(last.at) : Number.NaN
  const now = Date.now()
  const base = Number.isFinite(lastMs) ? Math.max(now, lastMs + 1) : now
  return new Date(base).toISOString()
}

/**
 * Union two event logs by id.
 *
 * Order is by `at` then `id`, so the result is deterministic regardless of which
 * tab contributed which event — which matters because the fold is order-sensitive
 * (last write wins on completion).
 */
export const mergeEventLogs = (
  a: readonly ProgressEvent[],
  b: readonly ProgressEvent[],
): ProgressEvent[] => {
  const byId = new Map<string, ProgressEvent>()
  for (const event of a) byId.set(event.id, event)
  for (const event of b) if (!byId.has(event.id)) byId.set(event.id, event)
  return [...byId.values()].sort((x, y) =>
    x.at === y.at ? x.id.localeCompare(y.id) : x.at.localeCompare(y.at),
  )
}

/**
 * True when two event logs are the same events in the same order.
 *
 * Identity, not length. `mergeEventLogs` makes the log a union keyed by `id`, so
 * the id sequence IS the identity of the log. The log is always stored in the
 * deterministic order above, so comparing the sequence is exact — and it avoids
 * deep-comparing every event payload on every cross-tab notification.
 */
const sameEventLog = (a: readonly ProgressEvent[], b: readonly ProgressEvent[]): boolean => {
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index += 1) {
    if (a[index]?.id !== b[index]?.id) return false
  }
  return true
}

export class ProgressStore {
  constructor(private readonly adapter: StorageAdapter) {}

  /** Always re-reads. Never trust an in-memory copy across a tab boundary. */
  load(): ProgressState {
    return this.adapter.read<ProgressState>(PROGRESS_KEY, createInitialState())
  }

  /**
   * Append an event. Re-reads and merges first, so a concurrent write from
   * another tab is never clobbered.
   */
  append(event: NewProgressEvent & { id?: string; at?: string }): ProgressState {
    const current = this.load()
    const full = {
      ...event,
      id: event.id ?? newEventId(),
      // Monotonic, so two appends in the same millisecond still order correctly.
      at: event.at ?? nextTimestamp(current.events),
    } as ProgressEvent
    return this.mergeEvents([full])
  }

  /**
   * Merge events into the persisted log and return the new state (M3).
   *
   * Always re-reads first, so it can never clobber a concurrent write — the same
   * guarantee `append` gives, which is now expressed in terms of this. It is the
   * primitive the import path uses: an imported file is a list of events, and
   * merging by id (rather than replacing the log) is what makes an import
   * ADDITIVE and non-destructive to whatever the learner already has.
   */
  mergeEvents(events: readonly ProgressEvent[]): ProgressState {
    const current = this.load()
    const next = foldEvents(mergeEventLogs(current.events, events))
    this.adapter.write(PROGRESS_KEY, next)
    return next
  }

  /**
   * Re-read after another tab wrote. Returns the new state, or undefined if
   * nothing changed.
   */
  refresh(): ProgressState | undefined {
    const current = this.load()
    return current
  }

  /**
   * Called when another tab writes. Re-reads and returns the state when the event
   * LOG has changed, so the caller can re-render.
   *
   * CHANGE IS DETECTED BY EVENT IDENTITY, NOT EVENT COUNT (pre-M3 hardening, F2).
   * Counting is insufficient: two logs can hold the same number of events and
   * still differ — a same-length replacement written by an import, or a divergent
   * log of equal length. A count-only check reports "nothing changed" and leaves
   * the tab showing stale progress until some later write happens to change the
   * length, which is exactly the class of silent staleness the merge exists to
   * prevent.
   */
  syncFrom(previous: ProgressState): ProgressState | undefined {
    const latest = this.load()
    return sameEventLog(latest.events, previous.events) ? undefined : latest
  }

  /** Wipe all local progress. Backs the one-click "clear my data" control at M3. */
  clear(): void {
    this.adapter.remove(PROGRESS_KEY)
  }
}

/**
 * Subscribe to writes from OTHER tabs. Returns an unsubscribe function.
 *
 * The `storage` event only fires in tabs that did not perform the write, which is
 * exactly the set we want to hear from.
 */
export const subscribeToExternalWrites = (
  onChange: () => void,
  key: string = PROGRESS_KEY,
): (() => void) => {
  if (typeof globalThis.addEventListener !== 'function') return () => {}
  const handler = (event: Event): void => {
    const storageEvent = event as StorageEvent
    if (storageEvent.key === null || storageEvent.key.endsWith(key)) onChange()
  }
  globalThis.addEventListener('storage', handler)
  return () => globalThis.removeEventListener('storage', handler)
}
