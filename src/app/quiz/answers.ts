/**
 * The answer model (M4.2, shared with scoring at M4.3).
 *
 * WHY THIS LIVES IN `src/app/` AND NOT IN THE QUIZ FEATURE
 *
 * A submitted answer is read by two callers: the quiz UI, which collects it, and
 * the scorer, which marks it. If the type lived in `src/features/quizzes/`, the
 * scorer would have to import from a feature, which reverses the dependency
 * direction the whole architecture rests on (content → app → feature). Here both
 * import downward and the direction holds.
 *
 * The tag matters. A `choice` answer names a choice id and a `boolean` answer is a
 * true/false state, so the scorer cannot mistake one for the other — the same
 * distinction the content's discriminated union already makes. It is also what
 * lets the scorer tell an INVALID submission (a boolean answer to a single-choice
 * question) from a wrong one, which is a different thing to tell a learner.
 */
export type Answer =
  | { readonly kind: 'choice'; readonly choiceId: string }
  | { readonly kind: 'boolean'; readonly value: boolean }

/** questionId -> the learner's answer. A missing key means unanswered. */
export type AnswerMap = Readonly<Record<string, Answer>>

/**
 * The stored value an answer represents.
 *
 * The one place the tagged union is flattened to a comparable string, so the
 * renderer (comparing against a radio's `value`) and the scorer (comparing against
 * a canonical id) cannot disagree about what a given answer means.
 */
export const answerValue = (answer: Answer | undefined): string | undefined => {
  if (answer === undefined) return undefined
  return answer.kind === 'choice' ? answer.choiceId : String(answer.value)
}
