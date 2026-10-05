import type { Question } from '@/content/schemas/index.ts'
import type { Answer, AnswerMap } from './answers.ts'

/**
 * QUIZ SCORING (M4.3).
 *
 * WHY THIS IS A SEPARATE SEAM FROM THE RENDERER
 *
 * M4.2 deliberately gives the renderer a view with the correct answers stripped
 * out (`quizContext`), so that a component cannot leak an answer by accident. The
 * scorer is the other side of that boundary: it takes the CANONICAL `Question`
 * entities and the submitted answers, and it is the only thing in the application
 * that compares the two. A component never calls it with anything but a
 * submission, and its result is the only place a correct answer becomes visible.
 *
 * WHY IT IS PURE
 *
 * `scoreQuestions` reads no registry, no clock, no randomness and no DOM. The same
 * questions and the same answers produce the same result, always — which is what
 * makes a score a fact about the learner rather than about the machine that
 * happened to render the page. The caller supplies the canonical questions, which
 * is also what keeps this function testable without a content registry.
 *
 * THE SCORING MODEL
 *
 * One point per question, so `maxScore` is the number of questions. A question
 * earns its point only if the submitted answer is well formed for its type AND
 * matches the canonical answer. There is no partial credit, no weighting, no
 * negative marking, no fuzzy matching and no tolerance — the two supported types
 * have exactly one right answer each, and pretending otherwise would invent a
 * precision the content does not carry.
 *
 * Unanswered and malformed submissions score zero and are REPORTED separately, so
 * the UI can say "you skipped 2" rather than calling a skipped question wrong.
 * Nothing here throws: a submission that cannot be understood is a zero, not a
 * crash on a page a learner is looking at.
 */

/** One point per question. A weight would be a content field, and there is none. */
export const POINTS_PER_QUESTION = 1

/**
 * The pass mark, as a ratio of the available points.
 *
 * A single constant rather than a per-quiz field: `DECISIONS.md` D30 deliberately
 * left `passMark` out of the quiz schema, and inventing one now would be a content
 * decision made by an implementation detail. 0.8 matches the domain's existing
 * `DEFAULT_STAGE_THRESHOLD`, so "passing" means the same thing at both levels.
 * A per-quiz mark would be a schema change and its own decision.
 */
export const QUIZ_PASS_THRESHOLD = 0.8

/** One question's outcome. The correct answer is present ONLY here. */
export interface QuizQuestionResult {
  readonly questionId: string
  /** A well-formed answer was submitted. False for skipped or malformed. */
  readonly answered: boolean
  readonly correct: boolean
  /** The canonical correct choice, for single-choice. `undefined` otherwise. */
  readonly correctChoiceId: string | undefined
  /** The canonical answer, for true/false. `undefined` otherwise. */
  readonly correctAnswer: boolean | undefined
  /** The authored rationale, shown after submission when the content has one. */
  readonly explanation: string | undefined
}

export interface QuizResult {
  /** Questions answered correctly. */
  readonly score: number
  /** Questions in the quiz, times `POINTS_PER_QUESTION`. */
  readonly maxScore: number
  /** 0–100, rounded. 0 when there is nothing to score. */
  readonly percentage: number
  readonly passed: boolean
  readonly correctCount: number
  /** Answered but wrong. Skipped questions are counted in `unanswered`, not here. */
  readonly incorrectCount: number
  /** Question ids with no answer, or an answer of the wrong shape. */
  readonly unanswered: readonly string[]
  readonly questions: readonly QuizQuestionResult[]
}

interface Mark {
  readonly answered: boolean
  readonly correct: boolean
}

/**
 * Mark one question.
 *
 * The `switch` is exhaustive and its `default` passes the question to a `never`
 * parameter, so adding a question type to the content schema is a COMPILE error
 * here rather than a new type that silently scores every learner zero.
 */
const mark = (question: Question, answer: Answer | undefined): Mark => {
  switch (question.type) {
    case 'single-choice':
      if (answer?.kind !== 'choice') return { answered: false, correct: false }
      return { answered: true, correct: answer.choiceId === question.correctChoiceId }
    case 'true-false':
      if (answer?.kind !== 'boolean') return { answered: false, correct: false }
      return { answered: true, correct: answer.value === question.answer }
    default:
      return unhandledQuestionType(question)
  }
}

/**
 * Compile-time exhaustiveness guard for `mark`.
 *
 * The `never` parameter is the guard: an unhandled type fails the build. It
 * returns a zero rather than throwing so that the impossible case, if it were ever
 * reached, would cost a learner one point instead of taking the page down.
 */
const unhandledQuestionType = (question: never): Mark => {
  void question
  return { answered: false, correct: false }
}

const toQuestionResult = (question: Question, answer: Answer | undefined): QuizQuestionResult => ({
  questionId: question.id,
  ...mark(question, answer),
  correctChoiceId: question.type === 'single-choice' ? question.correctChoiceId : undefined,
  correctAnswer: question.type === 'true-false' ? question.answer : undefined,
  explanation: question.explanation,
})

/**
 * Score a submission. Pure: the same inputs always give the same result.
 *
 * `questions` is the canonical list, in the quiz's declared order, and the result
 * preserves that order so the result view renders exactly what the learner saw.
 */
export const scoreQuestions = (questions: readonly Question[], answers: AnswerMap): QuizResult => {
  const results = questions.map((question) => toQuestionResult(question, answers[question.id]))

  const correctCount = results.filter((result) => result.correct).length
  const incorrectCount = results.filter((result) => result.answered && !result.correct).length
  const maxScore = questions.length * POINTS_PER_QUESTION
  const score = correctCount * POINTS_PER_QUESTION

  return {
    score,
    maxScore,
    percentage: maxScore === 0 ? 0 : Math.round((score / maxScore) * 100),
    // An empty quiz cannot be passed, and a pass is a ratio rather than a count so
    // it survives a quiz gaining a question.
    passed: maxScore > 0 && score / maxScore >= QUIZ_PASS_THRESHOLD,
    correctCount,
    incorrectCount,
    unanswered: results.filter((result) => !result.answered).map((result) => result.questionId),
    questions: results,
  }
}
