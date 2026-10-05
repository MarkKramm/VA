import type { QuizQuestionView } from '@/app/content.ts'
import type { Answer, AnswerMap } from '@/app/quiz/answers.ts'

/**
 * Renderer helpers over the answer model.
 *
 * The model itself — `Answer`, `AnswerMap`, `answerValue` — lives in
 * `src/app/quiz/answers.ts`, because the SCORER reads it too and the scorer may
 * not import from a feature. What is left here is what only a renderer needs:
 * turning a question into a list of options, and turning a radio's value back
 * into an answer.
 */

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

/**
 * Build an answer from a selected option value.
 *
 * `undefined` for a question type this build cannot render, so an unrecognised
 * type records NOTHING rather than a plausible-looking answer of the wrong shape.
 * The scorer treats both as unanswered, so the learner is never marked wrong for
 * a question the platform could not draw.
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
