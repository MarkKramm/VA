import { createInitialState } from '@domain/progress/reducer.ts'
import type { EvaluatedBy, NewProgressEvent, ProgressState } from '@domain/progress/types.ts'
import { ProgressStore } from '@/app/storage/merge.ts'
import { parseProgressExport, serializeProgressExport } from '@/app/storage/export-validate.ts'
import type { StorageAdapter } from '@/app/storage/port.ts'

/**
 * The React-facing progress store (M3).
 *
 * WHY THIS IS NOT ZUSTAND
 *
 * `ARCHITECTURE.md` records Zustand as the state-management choice over Redux and
 * friends, and `DECISIONS.md` D17 defers it to M3. M3 is here, and the honest
 * answer is still: it is not needed. What this store has to do is hold one value,
 * let React read it, and let a storage event replace it. React's own
 * `useSyncExternalStore` is built for exactly that, and the store below is about
 * sixty lines. Adding a dependency would buy nothing that the platform already
 * provides, against a runtime budget of twenty (rule 3).
 *
 * WHAT IT IS
 *
 * A thin, framework-free object that owns a `ProgressStore` (the storage layer)
 * and the current `ProgressState`. It does NOT fold events, know about
 * localStorage, or decide what a completion means — those live in the domain and
 * the storage adapter. It is the seam where the two meet React.
 *
 * The UI talks to this through `useProgressState` / `useProgressActions`. No
 * component touches the adapter, and no component folds events.
 */

/** The result of an import, phrased for a learner rather than for a log. */
export type ImportOutcome =
  | {
      readonly ok: true
      /** How many events the file contained and were merged in. */
      readonly imported: number
      /** Events of a type this build does not understand, dropped by the parser. */
      readonly skipped: number
      /** Total events now held, so the UI can say "12 events in total". */
      readonly total: number
    }
  | { readonly ok: false; readonly error: string }

/**
 * Restore a usable state from persisted storage.
 *
 * The sanitizing lives in `ProgressStore.load` — the storage boundary — so EVERY
 * path that reads persisted progress gets it: initialization, append, merge and
 * cross-tab sync. Filtering here alone (as M3 originally did) left the write and
 * sync paths reading raw storage, where a malformed event reached the merge's
 * sort and threw (pre-M4 hardening, A1).
 *
 * The `try` covers INITIALIZATION specifically. The shipped adapters do not
 * throw, but this runs during React render, where a throw would take the whole
 * page down, and a future adapter (an HTTP one, say) could throw.
 */
const restore = (store: ProgressStore): ProgressState => {
  try {
    return store.load()
  } catch (error) {
    console.warn('[progress] stored progress could not be read; starting empty.', error)
    return createInitialState()
  }
}

export class LearnerProgress {
  private readonly store: ProgressStore
  private state: ProgressState
  private readonly listeners = new Set<() => void>()

  constructor(adapter: StorageAdapter) {
    this.store = new ProgressStore(adapter)
    this.state = restore(this.store)
  }

  /** The current state. Stable identity between changes, so React can compare it. */
  getState = (): ProgressState => this.state

  /**
   * Subscribe to state changes. Returns an unsubscribe function.
   *
   * Arrow properties, not methods, so `useSyncExternalStore` gets stable
   * identities and does not resubscribe on every render.
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private commit(next: ProgressState): void {
    this.state = next
    for (const listener of this.listeners) listener()
  }

  /** Record any event. The general primitive the intent helpers below use. */
  record(event: NewProgressEvent): void {
    this.commit(this.store.append(event))
  }

  /**
   * Mark a lesson complete. `source: 'manual'` because the learner pressed the
   * button — completion is explicit, never inferred from a page view (the
   * distinction the event model already carries).
   */
  completeLesson(lessonId: string): void {
    this.record({ type: 'lesson.completed', lessonId, source: 'manual' })
  }

  /** Undo a completion. The event model has `lesson.uncompleted`; use it. */
  uncompleteLesson(lessonId: string): void {
    this.record({ type: 'lesson.uncompleted', lessonId })
  }

  /**
   * Record that the learner opened a lesson.
   *
   * A VIEW, not a completion — it is what powers "continue learning" and nothing
   * else. Recording it is honest: the domain already models `lesson.viewed`, and
   * a learner who opened a lesson and did not finish it is exactly what the
   * dashboard should be able to say.
   */
  recordLessonViewed(lessonId: string): void {
    this.record({ type: 'lesson.viewed', lessonId })
  }

  /**
   * Record an exercise attempt (M3).
   *
   * `selfChecked: true` is the existing field's meaning: the learner checked
   * their own work against the exercise's static self-check list. There is NO
   * score, no pass/fail, no evaluator — the exercise is ungraded (D25), and this
   * records that practice happened, not how well.
   */
  markExercisePractised(exerciseId: string, lessonId: string): void {
    this.record({ type: 'exercise.attempted', exerciseId, lessonId, selfChecked: true })
  }

  /**
   * Record a completed quiz attempt (M4.3).
   *
   * The ONE write a quiz submission makes, and the only thing that turns an
   * answer into progress. `evaluatedBy: 'system'` because the platform marked it
   * against the canonical answers — the domain distinguishes that from `'self'`,
   * which is a learner checking their own work, and weights them differently.
   *
   * The `attemptId` is supplied by the caller rather than generated here, because
   * the caller is the thing that knows a submission happened exactly once. The
   * store still supplies the event `id` and `at` (see `append`), so cross-tab
   * merging and event ordering are unchanged.
   *
   * Note what is NOT recorded: the learner's individual answers. The data model
   * defines an attempt as a score against a quiz, not as an answer sheet, and
   * storing answers the model does not require would put a second, disagreeing
   * source of truth beside the log.
   */
  submitQuizAttempt(attempt: {
    readonly quizId: string
    readonly attemptId: string
    readonly score: number
    readonly maxScore: number
    readonly passed: boolean
  }): void {
    this.record({
      type: 'quiz.attempted',
      quizId: attempt.quizId,
      attemptId: attempt.attemptId,
      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,
      evaluatedBy: 'system',
    })
  }

  /**
   * Record a completed practical assessment attempt (M5).
   *
   * The existing `assessment.attempted` event, and the ONLY write an assessment
   * submission makes. `evaluatedBy` is a required argument rather than a constant
   * here, because it is the honest part: the platform has no automated evaluator
   * for a practical task, so a submission is `'self'` — the learner scored their
   * own work against the published rubric. The domain distinguishes that from
   * `'system'` precisely so a self-report can never be mistaken for a marked
   * result, and defaulting it here would throw that away.
   *
   * No payload is recorded. `docs/ARCHITECTURE.md` lists file upload as a
   * deliberate non-feature — there is nowhere to put a file — and the data model
   * defines an attempt as an outcome, not an answer sheet.
   */
  submitAssessmentAttempt(attempt: {
    readonly assessmentId: string
    readonly attemptId: string
    readonly score: number
    readonly maxScore: number
    readonly passed: boolean
    readonly evaluatedBy: EvaluatedBy
  }): void {
    this.record({
      type: 'assessment.attempted',
      assessmentId: attempt.assessmentId,
      attemptId: attempt.attemptId,
      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,
      evaluatedBy: attempt.evaluatedBy,
    })
  }

  /**
   * Re-read after another tab wrote. Called from the `storage` subscription.
   *
   * `syncFrom` compares event identity, so this is a no-op when the log is
   * genuinely unchanged and a re-render otherwise.
   */
  syncExternal = (): void => {
    const next = this.store.syncFrom(this.state)
    if (next) this.commit(next)
  }

  /** The learner's whole log, as the export format. Pure. */
  exportData(): string {
    return serializeProgressExport(this.state)
  }

  /**
   * Import a previously exported file.
   *
   * The file is validated BEFORE anything is written, and the imported events are
   * MERGED into the existing log by id rather than replacing it. So a malformed
   * file changes nothing, and a valid file adds to what the learner already has
   * instead of overwriting it — the two properties that make import safe.
   */
  importData(raw: string): ImportOutcome {
    const parsed = parseProgressExport(raw)
    if (!parsed.ok) return { ok: false, error: parsed.error }

    const next = this.store.mergeEvents(parsed.state.events)
    this.commit(next)
    return {
      ok: true,
      imported: parsed.state.events.length,
      skipped: parsed.skipped,
      total: next.events.length,
    }
  }

  /** Wipe all local progress. Backs the "clear my data" control. */
  clear(): void {
    this.store.clear()
    this.commit(this.store.load())
  }
}
