import { registry } from '@/content/registry.ts'
import { assessmentsForSkill, lessonsForSkill, quizzesForSkill } from '@/content/selectors.ts'
import type { Lesson, Skill } from '@/content/schemas/index.ts'
import { isLessonComplete, isLessonPractised } from '@domain/progress/selectors.ts'
import type { ProgressState } from '@domain/progress/types.ts'

/**
 * SKILL EVIDENCE (M5).
 *
 * `docs/DATA_MODEL.md` defines three tiers, and this is that table as code:
 *
 *   EXPOSED      read the lesson          `lesson.viewed`
 *   PRACTISED    did the exercise         `exercise.attempted`
 *   DEMONSTRATED passed a scored check    `quiz.attempted` / `assessment.attempted`, passed
 *
 * WHY IT IS A DERIVATION AND NOT STORED STATE
 *
 * Evidence is a pure function of the content (which lessons, quizzes and
 * assessments touch a skill) and the event log (what the learner did). Nothing is
 * written: there is no `skillEvidence` field anywhere, because a second source of
 * truth can always disagree with the log, and the log is the platform's single
 * source of truth by design.
 *
 * WHY EXPOSURE IS NOT COMPETENCE
 *
 * `lesson.completed` is a self-report and `lesson.viewed` is a page view; neither
 * is competence, and `docs/DATA_MODEL.md` says so in as many words. The tier
 * ordering exists so the UI can show the difference rather than flattening it —
 * and so nothing anywhere can read "opened a lesson" as "can do the job".
 *
 * WHERE A QUIZ'S SKILLS COME FROM
 *
 * A quiz declares none. Its skills are the union of its questions', so the
 * registry derives `skillQuizIds` through the questions. That is why a quiz can
 * demonstrate a skill at all.
 */

export type EvidenceTier = 'none' | 'exposed' | 'practised' | 'demonstrated'

/** A scored check that produced demonstration evidence. */
export interface DemonstratedBy {
  readonly kind: 'quiz' | 'assessment'
  readonly id: string
}

export interface SkillEvidence {
  readonly skillId: string
  /** The HIGHEST tier reached, which is what a UI should show. */
  readonly tier: EvidenceTier
  /** Lesson ids that exposed the learner to this skill. */
  readonly exposedBy: readonly string[]
  /** Lesson ids whose practice the learner did. */
  readonly practisedBy: readonly string[]
  /** Scored checks the learner PASSED that cover this skill. */
  readonly demonstratedBy: readonly DemonstratedBy[]
}

/** True when the learner has met this lesson at all — read or completed. */
const hasEncountered = (state: ProgressState, lessonId: string): boolean =>
  state.derived.viewedAt[lessonId] !== undefined || isLessonComplete(state, lessonId)

/**
 * The evidence for one skill.
 *
 * `state` is passed in rather than read from a provider so this stays a pure
 * function and is testable with no DOM — the same contract
 * `src/app/progress/composition.ts` has.
 */
export const skillEvidenceFor = (state: ProgressState, skillId: string): SkillEvidence => {
  const lessons = lessonsForSkill(registry, skillId)

  const exposedBy = lessons.filter((lesson) => hasEncountered(state, lesson.id)).map((l) => l.id)
  const practisedBy = lessons
    .filter((lesson) => isLessonPractised(state, lesson.id))
    .map((l) => l.id)

  const demonstratedBy: DemonstratedBy[] = []
  for (const quiz of quizzesForSkill(registry, skillId)) {
    const passed = (state.derived.quizAttempts[quiz.id] ?? []).some((attempt) => attempt.passed)
    if (passed) demonstratedBy.push({ kind: 'quiz', id: quiz.id })
  }
  for (const assessment of assessmentsForSkill(registry, skillId)) {
    const passed = (state.derived.assessmentAttempts[assessment.id] ?? []).some(
      (attempt) => attempt.passed,
    )
    if (passed) demonstratedBy.push({ kind: 'assessment', id: assessment.id })
  }

  const tier: EvidenceTier =
    demonstratedBy.length > 0
      ? 'demonstrated'
      : practisedBy.length > 0
        ? 'practised'
        : exposedBy.length > 0
          ? 'exposed'
          : 'none'

  return { skillId, tier, exposedBy, practisedBy, demonstratedBy }
}

/** Every skill's evidence, in registry order. */
export const allSkillEvidence = (state: ProgressState): readonly SkillEvidence[] =>
  [...registry.skills.values()].map((skill) => skillEvidenceFor(state, skill.id))

/** The skills at a given tier, in registry order. */
export const skillsAtTier = (state: ProgressState, tier: EvidenceTier): readonly Skill[] =>
  [...registry.skills.values()].filter((skill) => skillEvidenceFor(state, skill.id).tier === tier)

/** How many skills sit at each tier. Counts, never a score. */
export const evidenceCounts = (state: ProgressState): Readonly<Record<EvidenceTier, number>> => {
  const counts: Record<EvidenceTier, number> = {
    none: 0,
    exposed: 0,
    practised: 0,
    demonstrated: 0,
  }
  for (const evidence of allSkillEvidence(state)) counts[evidence.tier] += 1
  return counts
}

/**
 * The prerequisite lessons of a lesson that are not yet complete.
 *
 * Prerequisites are advisory for a lesson (Q6 — the platform does not build
 * walls), so this is information rather than a lock. It exists so the UI can say
 * what is missing instead of leaving the learner to guess.
 */
export const unmetPrerequisitesFor = (
  state: ProgressState,
  lessonId: string,
): readonly Lesson[] => {
  const lesson = registry.lessons.get(lessonId)
  if (!lesson) return []
  return lesson.prerequisites
    .map((prerequisite) => registry.lessons.get(prerequisite.id))
    .filter((target): target is Lesson => target !== undefined)
    .filter((target) => !isLessonComplete(state, target.id))
}

/** One skill with its evidence, for a UI that lists them. */
export interface SkillEvidenceView {
  readonly skill: Skill
  readonly tier: EvidenceTier
  readonly demonstratedBy: readonly DemonstratedBy[]
}

/**
 * The skills the learner has met at all, with their tier.
 *
 * Skills at tier `none` are omitted deliberately. A learner has not touched most
 * of a nineteen-skill tree, and listing all of them would be a wall of "not
 * started" rather than information — the same reasoning that keeps a roadmap's
 * progress honest by showing what exists rather than what does not.
 */
export const skillEvidenceOverview = (state: ProgressState): readonly SkillEvidenceView[] =>
  [...registry.skills.values()]
    .map((skill) => {
      const evidence = skillEvidenceFor(state, skill.id)
      return { skill, tier: evidence.tier, demonstratedBy: evidence.demonstratedBy }
    })
    .filter((entry) => entry.tier !== 'none')
