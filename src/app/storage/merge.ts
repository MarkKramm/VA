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
      at: event.at ?? new Date().toISOString(),
    } as ProgressEvent
    const merged = mergeEventLogs(current.events, [full])
    const next = foldEvents(merged)
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
   * Called when another tab writes. Re-reads and returns the state if it differs
   * from `previous` by event count, so the caller can avoid a pointless render.
   */
  syncFrom(previous: ProgressState): ProgressState | undefined {
    const latest = this.load()
    return latest.events.length === previous.events.length ? undefined : latest
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
