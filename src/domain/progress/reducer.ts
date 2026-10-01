import {
  PROGRESS_STATE_VERSION,
  type Artifact,
  type Attempt,
  type DerivedProgress,
  type LabAttempt,
  type LessonId,
  type ProgressEvent,
  type ProgressState,
  type RoadmapId,
  type TopicId,
} from './types.ts'

/**
 * The progress reducer.
 *
 * Two functions, and the relationship between them is the point:
 *
 *   deriveProgress(events)  — build the cache from scratch
 *   applyEvent(state, e)    — append one event, then re-derive
 *
 * `applyEvent` re-deriving rather than patching incrementally looks wasteful, and
 * it is the right call anyway: it makes "derived always equals the fold" true by
 * construction rather than by careful bookkeeping, and the fold over a few
 * thousand events is sub-millisecond. If measurement ever says otherwise, an
 * incremental patch can replace the re-derive without changing the invariant
 * test, because the test compares against `deriveProgress` either way.
 */

export const emptyDerived = (): DerivedProgress => ({
  completedLessons: {},
  completedTopics: {},
  practisedLessons: {},
  quizAttempts: {},
  labAttempts: {},
  assessmentAttempts: {},
  enrolledRoadmaps: [],
  bookmarks: [],
  notes: [],
  portfolio: [],
  lastViewedLesson: undefined,
  viewedAt: {},
})

export const createInitialState = (): ProgressState => ({
  version: PROGRESS_STATE_VERSION,
  events: [],
  derived: emptyDerived(),
})

export function deriveProgress(events: readonly ProgressEvent[]): DerivedProgress {
  const completedLessons: Record<LessonId, DerivedProgress['completedLessons'][string]> = {}
  const completedTopics: Record<TopicId, DerivedProgress['completedTopics'][string]> = {}
  const practisedLessons: Record<LessonId, string> = {}
  const quizAttempts: Record<string, Attempt[]> = {}
  const labAttempts: Record<string, LabAttempt[]> = {}
  const assessmentAttempts: Record<string, Attempt[]> = {}
  const bookmarks: { refType: string; refId: string }[] = []
  const notes: { refType: string; refId: string; body: string; at: string }[] = []
  const portfolio: Artifact[] = []
  const viewedAt: Record<LessonId, string> = {}

  // The log is append-only, so a single ordered pass is sufficient. Everything
  // is "last write wins", which is why an `uncompleted` event can undo a
  // `completed` one without the reducer needing to understand history.
  for (const event of events) {
    switch (event.type) {
      case 'lesson.viewed':
        viewedAt[event.lessonId] = event.at
        break
      case 'lesson.completed':
        completedLessons[event.lessonId] = { at: event.at, source: event.source }
        break
      case 'lesson.uncompleted':
        delete completedLessons[event.lessonId]
        break
      case 'topic.completed':
        if (event.completed) completedTopics[event.topicId] = { at: event.at, source: 'manual' }
        else delete completedTopics[event.topicId]
        break
      case 'exercise.attempted':
        practisedLessons[event.lessonId] = event.at
        break
      case 'quiz.attempted': {
        const existing = quizAttempts[event.quizId] ?? []
        quizAttempts[event.quizId] = [
          ...existing,
          {
            attemptId: event.attemptId,
            at: event.at,
            score: event.score,
            maxScore: event.maxScore,
            passed: event.passed,
            evaluatedBy: event.evaluatedBy,
          },
        ]
        break
      }
      case 'lab.submitted': {
        const existing = labAttempts[event.labId] ?? []
        labAttempts[event.labId] = [
          ...existing,
          {
            attemptId: event.attemptId,
            at: event.at,
            score: 0,
            maxScore: 0,
            passed: event.passed,
            evaluatedBy: event.evaluatedBy,
            attemptNumber: event.attemptNumber,
            payload: event.payload,
            feedbackNotes: event.feedbackNotes,
          },
        ]
        break
      }
      case 'assessment.attempted': {
        const existing = assessmentAttempts[event.assessmentId] ?? []
        assessmentAttempts[event.assessmentId] = [
          ...existing,
          {
            attemptId: event.attemptId,
            at: event.at,
            score: event.score,
            maxScore: event.maxScore,
            passed: event.passed,
            evaluatedBy: event.evaluatedBy,
          },
        ]
        break
      }
      case 'roadmap.enrolled':
      case 'roadmap.unenrolled':
        // Handled in a second pass below, so that enrolment and unenrolment
        // cancel out regardless of how they interleave.
        break
      case 'bookmark.toggled': {
        const index = bookmarks.findIndex(
          (b) => b.refType === event.refType && b.refId === event.refId,
        )
        if (index === -1) bookmarks.push({ refType: event.refType, refId: event.refId })
        else bookmarks.splice(index, 1)
        break
      }
      case 'note.saved': {
        const index = notes.findIndex((n) => n.refType === event.refType && n.refId === event.refId)
        const next = { refType: event.refType, refId: event.refId, body: event.body, at: event.at }
        if (index === -1) notes.push(next)
        else notes[index] = next
        break
      }
      case 'portfolio.artifact.added':
        portfolio.push({
          artifactId: event.artifactId,
          roadmapId: event.roadmapId,
          skills: event.skills,
          at: event.at,
        })
        break
    }
  }

  // Enrolment is a set built after the pass, because enrolment and unenrolment
  // must cancel out regardless of interleaving.
  const enrolled = new Set<RoadmapId>()
  for (const event of events) {
    if (event.type === 'roadmap.enrolled') enrolled.add(event.roadmapId)
    if (event.type === 'roadmap.unenrolled') enrolled.delete(event.roadmapId)
  }

  const lastViewed = [...events]
    .reverse()
    .find(
      (event): event is Extract<ProgressEvent, { type: 'lesson.viewed' }> =>
        event.type === 'lesson.viewed',
    )

  return {
    completedLessons,
    completedTopics,
    practisedLessons,
    quizAttempts,
    labAttempts,
    assessmentAttempts,
    enrolledRoadmaps: [...enrolled],
    bookmarks,
    notes,
    portfolio,
    lastViewedLesson: lastViewed?.lessonId,
    viewedAt,
  }
}

export const foldEvents = (events: readonly ProgressEvent[]): ProgressState => ({
  version: PROGRESS_STATE_VERSION,
  events: [...events],
  derived: deriveProgress(events),
})

export function applyEvent(state: ProgressState, event: ProgressEvent): ProgressState {
  return foldEvents([...state.events, event])
}

/** The canonical fold. Every "what has the learner done" question goes through it. */
export const recompute = (state: ProgressState): ProgressState => foldEvents(state.events)
