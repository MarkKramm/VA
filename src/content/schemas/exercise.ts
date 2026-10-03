import { z } from 'zod'
import {
  ExerciseSlugSchema,
  DifficultySchema,
  SkillSlugSchema,
  provenanceShape,
} from './primitives.js'

/**
 * An exercise is the first PRACTICE entity (M2.4).
 *
 * A lesson with no exercise, quiz or lab is a reading page, and
 * `quality/no-practice` warns about exactly that. The exercise is what lets a
 * lesson reach practice without the whole assessment apparatus — no scoring, no
 * attempts, no persistence. See `DECISIONS.md` D25.
 *
 * WHAT AN EXERCISE DELIBERATELY IS NOT
 *
 * It is ungraded and unsaved. There is no `kind`, no `prerequisites`, no
 * `aliases`, no `resources`, no `hints`, no `commonMistakes`, no
 * `referenceSolution`, no evaluation criteria, no score, no rubric, no attempt
 * and no `evaluatedBy`. Those belong to the Lab / evaluation system, which is a
 * later milestone. An exercise asks the learner to DO something and to check
 * their own work against a static list; it records nothing.
 *
 * THE REFERENCE DIRECTION
 *
 * `lesson.exercises` owns the relationship, exactly as `module.lessons` does. An
 * exercise does NOT carry a `lessonId`: an exercise can be reused by more than
 * one lesson, and a second copy of the relationship would be a second source of
 * truth. The registry derives `exerciseLessonIds` from the lesson side.
 */
export const ExerciseSchema = z.object({
  /** Stable and immutable once published. See primitives.ts. */
  id: ExerciseSlugSchema,
  title: z.string().min(3),
  summary: z.string().min(10),
  difficulty: DifficultySchema,
  estimatedMinutes: z.number().int().positive().max(600),
  /**
   * What the learner actually produces. A concrete artifact ("a folder tree and
   * three example filenames") rather than a vague instruction ("practise
   * organising"), because the deliverable is what makes the exercise checkable
   * against the self-check list.
   */
  deliverable: z.string().min(10),
  /**
   * Static, non-interactive self-check criteria. At least one: an exercise with
   * nothing to check against is not practice, it is a suggestion. The UI renders
   * these as a plain list — no checkboxes, no persistence — because an ungraded
   * exercise must not pretend to record anything.
   */
  selfCheck: z.array(z.string().min(4)).min(1),
  skills: z.array(SkillSlugSchema).default([]),
  ...provenanceShape,
})

export type Exercise = z.infer<typeof ExerciseSchema>
