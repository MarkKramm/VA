import type { QuizQuestionView } from '@/app/content.ts'

/**
 * The answer model for M4.2.
 *
 * TRANSIENT BY DESIGN. An answer lives in component state and nowhere else: it is
 * not written to storage, it does not become a progress event, and nothing scores
 * it. M4.3 owns what happens to an answer — M4.2 only collects one.
 *
 * The tag matters. A `choice` answer names a choice id and a `boolean` answer is a
 * true/false state, so a future scorer cannot mistake one for the other — the same
 * distinction the content's discriminated union already makes.
 */
export type Answer =
  | { readonly kind: 'choice'; readonly choiceId: string }
  | { readonly kind: 'boolean'; readonly value: boolean }

/** questionId -> the learner's answer. A missing key means unanswered. */
export type AnswerMap = Readonly<Record<string, Answer>>

/** One option as the radio group renders it. `value` is what gets stored. */
export interface AnswerOption {
  readonly value: string
  readonly label: string
}

/**
 * The options for a question.
 *
 * True/false has no authored choices — the two states ARE the type — so the
 * renderer supplies them. That is also why the content schema gives a true/false
 * question no `choices`: two authored options would make it a single-choice
 * question with two choices, and the distinction would be a convention rather
 * than a type.
 */
export const answerOptions = (question: QuizQuestionView): readonly AnswerOption[] => {
  switch (question.type) {
    case 'single-choice':
      return question.choices.map((choice) => ({ value: choice.id, label: choice.text }))
    case 'true-false':
      return [
        { value: 'true', label: 'True' },
        { value: 'false', label: 'False' },
      ]
    default:
      // Unreachable for the current union. Empty rather than a guess, so an
      // unrecognised type renders no options instead of the wrong ones.
      return []
  }
}

/** The stored value an answer represents, for comparing against an option. */
export const answerValue = (answer: Answer | undefined): string | undefined => {
  if (answer === undefined) return undefined
  return answer.kind === 'choice' ? answer.choiceId : String(answer.value)
}

/**
 * Build an answer from a selected option value.
 *
 * `undefined` for a question type this build cannot render, so an unrecognised
 * type records NOTHING rather than a plausible-looking answer of the wrong shape.
 */
export const answerFromValue = (question: QuizQuestionView, value: string): Answer | undefined => {
  switch (question.type) {
    case 'single-choice':
      return { kind: 'choice', choiceId: value }
    case 'true-false':
      return { kind: 'boolean', value: value === 'true' }
    default:
      return undefined
  }
}

/** How many of the given questions have an answer. */
export const answeredCount = (questions: readonly QuizQuestionView[], answers: AnswerMap): number =>
  questions.filter((question) => answers[question.id] !== undefined).length
