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
  // from a slightly different version still yields a working session.
  const known = parsed.data.events.filter(
    (event) => typeof event.type === 'string' && KNOWN_EVENT_TYPES.has(event.type),
  )
  const skipped = parsed.data.events.length - known.length

  const state = foldEvents(known as unknown as readonly ProgressEvent[])

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

export { EvaluatedBySchema, KNOWN_EVENT_TYPES, createInitialState }
