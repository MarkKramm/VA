import { z } from 'zod'
import { QuestionSlugSchema, SkillSlugSchema, SlugSchema, provenanceShape } from './primitives.js'

/**
 * A question is the first ASSESSABLE content entity (M4.1).
 *
 * WHAT IT IS
 *
 * A reusable unit of assessment, identified by a stable id and referenced by a
 * quiz. It is CONTENT, not presentation: there is no component, no handler, no
 * rendering rule and no application state here. Everything the future quiz
 * renderer needs to draw a question and everything a future scorer needs to mark
 * it is data, which is what lets M4.2/M4.3 build on it without revisiting the
 * schema.
 *
 * WHY A DISCRIMINATED UNION
 *
 * `type` is the discriminator, so a new question type is a new member of the
 * union plus a renderer — never a widening of an existing member. That is what
 * keeps `answer` (true/false) and `correctChoiceId` (a choice reference) from
 * having to coexist as optional fields, which is how "invalid
 * question-type-specific data" becomes representable. TypeScript then refuses a
 * `switch` that forgets a member.
 *
 * THE INITIAL SCOPE IS DELIBERATELY TWO TYPES
 *
 * `single-choice` and `true-false` are enough to prove the architecture: one type
 * with a list of options and a reference to the right one, and one type with an
 * intrinsic answer. `multiple-select`, `matching`, `ordering`, `scenario` and
 * `short-answer` are future members, and each is a new variant rather than a
 * change to these. See `DECISIONS.md` D30.
 *
 * WHAT IT DELIBERATELY DOES NOT HAVE
 *
 * No `points`, no `weight`, no `passMark`, no `timeLimit`, no `difficulty`, no
 * `tags`, no `hints`, no `attempts`, no `evaluatedBy`. Scoring is M4.3 and has no
 * schema yet; adding a field for it now would be guessing at a shape no code
 * consumes. `explanation` is here because it is CONTENT the author writes, not a
 * result the platform computes.
 */

/**
 * One answer option.
 *
 * The id is stable WITHIN the question and is what `correctChoiceId` points at,
 * so an option can be reworded without invalidating the answer. It is a plain
 * slug rather than a global id because a choice has no independent existence —
 * it is never referenced from outside its question.
 */
export const QuestionChoiceSchema = z.object({
  id: SlugSchema,
  text: z.string().min(1),
})

/**
 * The fields every question has, whatever its type.
 *
 * Spread into each variant rather than composed with `z.object().extend()`, so
 * each variant reads as one complete shape and a reader never has to walk an
 * inheritance chain to know what a question contains.
 */
const questionBaseShape = {
  /** Stable and immutable once published. See primitives.ts. */
  id: QuestionSlugSchema,
  /** What the learner is asked. */
  prompt: z.string().min(10),
  /**
   * Why the correct answer is correct. Optional, and authored — this is
   * teaching content, not a computed result, which is why it belongs in M4.1
   * while scoring does not.
   */
  explanation: z.string().min(10).optional(),
  /**
   * The skills this question exercises. Checked against the skill collection at
   * validation time, exactly as `lesson.skills` and `exercise.skills` are.
   */
  skills: z.array(SkillSlugSchema).default([]),
  ...provenanceShape,
}

/**
 * One correct answer among several options.
 *
 * `correctChoiceId` must name one of `choices[].id` — enforced by the union's
 * refinement below rather than by this object, because the rule spans two fields
 * and a per-field schema cannot see both. That check is what makes
 * "invalid question-type-specific answer data" a schema failure instead of a
 * question that can never be marked.
 */
export const SingleChoiceQuestionSchema = z.object({
  ...questionBaseShape,
  type: z.literal('single-choice'),
  /** Two is the minimum that is a choice; eight keeps a question readable. */
  choices: z.array(QuestionChoiceSchema).min(2).max(8),
  correctChoiceId: SlugSchema,
})

/**
 * A statement the learner marks true or false.
 *
 * The answer is intrinsic to the question, so there is no choices list: a
 * true/false question whose options were authored as choices would be a
 * single-choice question with two options, and the distinction would be a
 * convention rather than a type.
 */
export const TrueFalseQuestionSchema = z.object({
  ...questionBaseShape,
  type: z.literal('true-false'),
  answer: z.boolean(),
})

/**
 * The question union.
 *
 * The two refinements are the cross-field rules a per-field schema cannot
 * express, and both are about the ANSWER being unambiguous:
 *
 *  1. `correctChoiceId` must name a real choice. Without this a question parses
 *     and can never be answered correctly.
 *  2. Choice ids must be unique within the question. Without this the answer
 *     reference is ambiguous, and a duplicate would silently make one option
 *     unreachable.
 *
 * They are `.refine()` rather than a hand-written check in the validator so that
 * a malformed question is DROPPED at parse time (like any other schema failure)
 * rather than entering the registry as an entity that looks valid and cannot be
 * marked.
 */
export const QuestionSchema = z
  .discriminatedUnion('type', [SingleChoiceQuestionSchema, TrueFalseQuestionSchema])
  .refine(
    (question) =>
      question.type !== 'single-choice' ||
      question.choices.some((choice) => choice.id === question.correctChoiceId),
    {
      path: ['correctChoiceId'],
      message: 'must match the id of one of choices[]',
    },
  )
  .refine(
    (question) =>
      question.type !== 'single-choice' ||
      new Set(question.choices.map((choice) => choice.id)).size === question.choices.length,
    {
      path: ['choices'],
      message: 'choice ids must be unique within a question',
    },
  )

export type Question = z.infer<typeof QuestionSchema>
export type QuestionChoice = z.infer<typeof QuestionChoiceSchema>
export type QuestionType = Question['type']
