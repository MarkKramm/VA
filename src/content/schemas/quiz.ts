import { z } from 'zod'
import { QuestionSlugSchema, QuizSlugSchema, provenanceShape } from './primitives.js'

/**
 * A quiz is an ordered selection of questions (M4.1).
 *
 * WHAT IT IS, AND WHAT IT IS NOT
 *
 * It is a CONTENT entity: a stable id, a title, and an ordered list of question
 * ids. It is not a quiz engine. There is no score, no pass mark, no time limit,
 * no attempt, no result and no shuffling rule here, because none of those exist
 * yet — M4.3 owns taking a quiz and recording what happened, and M4.2 owns
 * rendering one. A `passMark` field now would be a number no code reads and a
 * decision made before the milestone that has to live with it.
 *
 * THE REFERENCE DIRECTION, AND WHY QUESTIONS ARE NOT INLINED
 *
 * `questionIds` points at canonical `Question` entities. A quiz never embeds a
 * question object. Two consequences, and both are the point:
 *
 *  - A question asked by two quizzes is authored once. Editing it fixes both,
 *    and "which quizzes ask this?" is answerable from the derived
 *    `questionQuizIds` index rather than by searching every quiz file.
 *  - The question bank stays independently reviewable. Provenance belongs to the
 *    question, not to each quiz that happens to use it.
 *
 * This is the same id-reference model as `module.lessons` and
 * `lesson.exercises`, and the registry derives the reverse direction the same
 * way.
 *
 * ORDER IS THE ARRAY ORDER
 *
 * `questionIds` is a LIST, and its order is the order the questions are asked.
 * It is not sorted on the way in: a quiz is an authored sequence, and
 * re-ordering it is an editorial act. Determinism comes from the array being the
 * single source of the sequence — there is no second place an order could be
 * expressed, so none to disagree with.
 *
 * EMPTY AND DUPLICATED ARE BOTH REJECTED
 *
 * A quiz with no questions is not a quiz, so `.min(1)` is a schema failure rather
 * than a warning. A repeated question would be asked twice and, once scoring
 * exists, counted twice — so duplicates are rejected too. Both rules are here
 * rather than in the validator because a quiz that violates them is malformed
 * content, not a referential-integrity problem.
 */
export const QuizSchema = z
  .object({
    /** Stable and immutable once published. See primitives.ts. */
    id: QuizSlugSchema,
    title: z.string().min(3),
    summary: z.string().min(10),
    /**
     * The questions this quiz asks, in the order it asks them. Every id must
     * resolve to a canonical Question; that is checked by referential integrity
     * at validation time, exactly as `lesson.exercises` is.
     */
    questionIds: z.array(QuestionSlugSchema).min(1),
    ...provenanceShape,
  })
  .refine((quiz) => new Set(quiz.questionIds).size === quiz.questionIds.length, {
    path: ['questionIds'],
    message: 'a question may appear at most once in a quiz',
  })

export type Quiz = z.infer<typeof QuizSchema>
