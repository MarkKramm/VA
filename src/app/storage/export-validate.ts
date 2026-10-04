import { z } from 'zod'
import {
  PROGRESS_EVENT_TYPES,
  PROGRESS_STATE_VERSION,
  type ProgressEvent,
} from '@domain/progress/types.ts'
import { createInitialState, foldEvents } from '@domain/progress/reducer.ts'
import type { ProgressState } from '@domain/progress/types.ts'

/**
 * Import validation.
 *
 * A learner WILL hand-edit an export file. It will be truncated, it will be from
 * a much older version, and it will occasionally be a text file that was never a
 * JSON export at all. All three are guaranteed eventually, so the requirement is
 * not "prevent them" — it is that none of them can crash the app or destroy
 * existing progress.
 *
 * The rule: validate into a CANDIDATE state, and only commit on success. A failed
 * import leaves the learner exactly where they were.
 *
 * Deliberately permissive about `evaluatedBy` and similar enums: a file written
 * by a future version should degrade rather than be rejected outright. Strictness
 * here buys nothing, because the only thing being protected is a learner's own
 * local view of their own progress.
 *
 * NOTE ON PLACEMENT: the implementation plan listed this file at
 * src/content/export-validate.ts. That would have put progress-data validation
 * inside the content layer, which inverts the dependency arrow this project is
 * built on — the content layer knows about curriculum, not about learners. It
 * lives here, at the persistence boundary, where it belongs.
 */

const IsoTimestamp = z.string().min(10)

const EvaluatedBySchema = z.enum(['system', 'self'])

/**
 * Only the fields the fold needs are validated strictly. `id` and `at` are
 * required because the merge logic depends on them; everything else is read
 * defensively with a fallback so an old or partial file still yields a usable
 * session rather than an error.
 */
const EventSchema = z.looseObject({
  id: z.string().min(1),
  at: IsoTimestamp,
  type: z.string().min(3),
})

export const ExportedProgressSchema = z.looseObject({
  version: z.number().int().min(1),
  events: z.array(EventSchema),
})

export type ImportResult =
  | {
      readonly ok: true
      readonly state: ProgressState
      readonly skipped: number
      readonly note?: string
    }
  | { readonly ok: false; readonly error: string }

const describe = (error: z.ZodError): string => {
  const first = error.issues[0]
  if (!first) return 'The file is not in the expected format.'
  const where = first.path.length > 0 ? ` at "${first.path.join('.')}"` : ''
  return `The file is not a valid progress export${where}: ${first.message}`
}

/**
 * Parse a raw export into a validated state. Never throws, never mutates, and
 * never destroys anything the caller already has.
 */
export const parseProgressExport = (raw: string): ImportResult => {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return {
      ok: false,
      error:
        'That file could not be read as JSON. Make sure you selected the exported .json file and not a text file that happens to have the same name.',
    }
  }

  const parsed = ExportedProgressSchema.safeParse(json)
  if (!parsed.success) return { ok: false, error: describe(parsed.error) }

  const version = parsed.data.version
  if (version > PROGRESS_STATE_VERSION) {
    return {
      ok: false,
      error: `That export was created by a newer version of the platform (format ${version}, this version understands ${PROGRESS_STATE_VERSION}). Update the site and try again.`,
    }
  }

  // Events of an unrecognised type are dropped rather than rejected, so a log
  // from a slightly different version still yields a working session. This is the
  // IMPORT path's rule alone: it is reported through `skipped`, whereas a storage
  // read must PRESERVE an unknown type or it would delete a newer build's data
  // (A1-R).
  const known = filterKnownEvents(parsed.data.events)
  const skipped = parsed.data.events.length - known.length

  const state = foldEvents(known)

  return {
    ok: true,
    state,
    skipped,
    note:
      skipped > 0
        ? `${skipped} entr${skipped === 1 ? 'y' : 'ies'} from a newer format were skipped.`
        : version < PROGRESS_STATE_VERSION
          ? `Imported from an older format (${version}).`
          : undefined,
  }
}

/**
 * Produce an export string from a progress state (pre-M3 hardening, F9).
 *
 * The PRODUCER half of the round trip whose parser is `parseProgressExport`.
 * Without it there is nothing to hand a learner who wants their data out, and the
 * validator alone can only read a file nobody can write.
 *
 * ONE FORMAT, NOT TWO. The output is exactly the shape `ExportedProgressSchema`
 * validates — `{ version, events }` — so the parser is the single definition of
 * the format and the two cannot drift.
 *
 * PURE AND DETERMINISTIC. The events are already in the log's canonical order
 * (by `at`, then `id`), so nothing is reordered and no clock or random value is
 * read: the same state always produces a byte-identical string. `null, 2` yields
 * a file a human can read and hand-edit, which is the premise of import
 * validation — a learner is expected to open it.
 */
export const serializeProgressExport = (state: ProgressState): string =>
  JSON.stringify({ version: state.version, events: state.events }, null, 2)

/**
 * The event types this build understands, DERIVED from the `ProgressEvent` union
 * (pre-M3 hardening, F5).
 *
 * This was a hand-written list "kept in sync" with the union, which is a second
 * source of truth that fails silently: a new variant would parse and validate,
 * then be filtered out here as "unknown" and dropped on import. It now comes from
 * `PROGRESS_EVENT_TYPES`, whose `satisfies Record<ProgressEventType, true>` makes
 * the compiler reject any drift between the union and this set.
 *
 * `Set<string>` rather than `Set<ProgressEventType>` because the value being
 * tested is `event.type` off a loosely-parsed file, which is a plain string.
 */
const KNOWN_EVENT_TYPES = new Set<string>(PROGRESS_EVENT_TYPES)

/**
 * A persisted event this build can safely PRESERVE (pre-M4 hardening, A1/A1-R).
 *
 * STRUCTURAL, NOT SEMANTIC. Only `id`, `at` and `type` must be strings — `type` is
 * deliberately NOT required to be one this build knows. A log written by a newer
 * build can hold an event type that did not exist when this build shipped, and a
 * build that filtered those out would DELETE them on its next write, because the
 * sanitized state is what gets persisted. The fold ignores a type it has no case
 * for, so preserving an unknown type is safe; discarding it is silent data loss.
 *
 * The storage adapter guards invalid JSON but not invalid shape: a stored value
 * can be valid JSON and still not be an event — an older format, a hand-edited
 * value, a partially written one. Folding a malformed one produces nonsense
 * progress at best, and at worst throws inside the merge's sort, so structurally
 * unusable entries are dropped rather than trusted.
 *
 * The `ProgressEvent` predicate is a narrowing that cannot be expressed exactly
 * without widening the public event union — a larger change than this boundary
 * concern justifies. It does not leak: every consumer either switches on `type`
 * (no case → no-op) or reads only `id`/`at`.
 */
export const isStoredProgressEvent = (value: unknown): value is ProgressEvent => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { id?: unknown; at?: unknown; type?: unknown }
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.at === 'string' &&
    typeof candidate.type === 'string'
  )
}

/**
 * A persisted event this build UNDERSTANDS — the same shape, plus a known type.
 *
 * The IMPORT path only. An imported file is the one place an unknown type is
 * dropped, because the learner is told how many entries were skipped. Storage
 * reads must never take that route (A1-R).
 */
export const isKnownProgressEvent = (value: unknown): value is ProgressEvent =>
  isStoredProgressEvent(value) && KNOWN_EVENT_TYPES.has(value.type)

/**
 * Filter a raw persisted event array down to what can be preserved: structurally
 * valid events, INCLUDING types this build does not know.
 */
export const sanitizeStoredEvents = (events: readonly unknown[]): ProgressEvent[] =>
  events.filter(isStoredProgressEvent)

/**
 * Filter parsed import events down to the types this build UNDERSTANDS.
 *
 * The import path's counterpart to `sanitizeStoredEvents`, and the one place an
 * unknown type is dropped — reported through `skipped`, never silent.
 */
export const filterKnownEvents = (events: readonly unknown[]): ProgressEvent[] =>
  events.filter(isKnownProgressEvent)

export { EvaluatedBySchema, KNOWN_EVENT_TYPES, createInitialState }
