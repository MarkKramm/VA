import type { QuizQuestionView } from '@/app/content.ts'
import { answerValue, type Answer } from '@/app/quiz/answers.ts'
import type { QuizQuestionResult } from '@/app/quiz/score.ts'
import { answerFromValue, answerOptions } from './options.ts'
import styles from './QuestionCard.module.css'

/**
 * One question, as a radio group.
 *
 * WHY RADIOS RATHER THAN BUTTONS
 *
 * A single-choice question IS a single-select group, and `input type="radio"`
 * already has the semantics a learner needs: arrow keys move between options,
 * `checked` is programmatically determinable, and a screen reader announces
 * "2 of 4" without any ARIA. Reimplementing that with `role="radiogroup"` and
 * `aria-checked` is more code and more ways to be wrong.
 *
 * Each question names its own group after its id, so two questions can never
 * share one — which would make selecting an answer to question 2 clear the answer
 * to question 1. A question appears at most once in a quiz (the schema rejects a
 * repeat), so the id is a safe group name.
 *
 * BEFORE AND AFTER SUBMISSION
 *
 * `feedback` is absent until the attempt is submitted, and its presence is what
 * switches the card from "collect an answer" to "report an outcome". It is the
 * ONLY source of correctness here — the pre-submission props carry no correct
 * answer at all, so the card could not mark itself if it tried. Once it is present
 * the controls are disabled: a result is a record of what the learner did, not a
 * form.
 *
 * Nothing is signalled by colour alone. The selected row carries the radio dot,
 * the outcome is stated in words ("Correct", "Not correct", "Not answered"), and
 * the right option is labelled "Correct answer" rather than merely tinted.
 *
 * AN UNKNOWN TYPE RENDERS NOTHING ANSWERABLE
 *
 * `answerOptions` returns an empty list for a type this build does not know, and
 * this renders an honest sentence instead of a plausible control that would record
 * an answer of the wrong shape. See `options.ts`.
 */
export interface QuestionCardProps {
  readonly question: QuizQuestionView
  readonly position: number
  readonly total: number
  readonly answer: Answer | undefined
  readonly onAnswer: (answer: Answer) => void
  /** The marked outcome. Present only after submission (M4.3). */
  readonly feedback?: QuizQuestionResult
}

export const QuestionCard = ({
  question,
  position,
  total,
  answer,
  onAnswer,
  feedback,
}: QuestionCardProps) => {
  const options = answerOptions(question)
  const selected = answerValue(answer)

  const isCorrectOption = (value: string): boolean => {
    if (!feedback) return false
    if (question.type === 'single-choice') return feedback.correctChoiceId === value
    if (question.type === 'true-false') return String(feedback.correctAnswer) === value
    return false
  }
  const isWrongSelection = (value: string): boolean =>
    feedback !== undefined && !feedback.correct && selected === value

  const verdict = feedback
    ? feedback.correct
      ? 'Correct'
      : feedback.answered
        ? 'Not correct'
        : 'Not answered'
    : undefined

  return (
    <fieldset className={styles.card} data-state={verdict?.toLowerCase()}>
      <legend className={styles.legend}>
        <span className={styles.position}>
          Question {position} of {total}
        </span>
        <span className={styles.prompt}>{question.prompt}</span>
      </legend>

      {/*
        Deliberately OUTSIDE the legend. A fieldset is named by its legend, so a
        marker inside it makes the radio group's accessible name change as the
        learner answers — a name that mutates under interaction is less predictable
        for assistive technology than a stable name plus a separate state.
      */}
      {!feedback && answer !== undefined ? <p className={styles.state}>Answered</p> : null}

      {verdict ? <p className={styles.verdict}>{verdict}</p> : null}

      {options.length === 0 ? (
        <p className={styles.unsupported} role="status">
          This question uses a type this version cannot show yet, so it cannot be answered here.
        </p>
      ) : (
        <ul className={styles.options}>
          {options.map((option) => (
            <li key={option.value}>
              <label
                className={styles.option}
                data-selected={selected === option.value}
                data-correct={isCorrectOption(option.value)}
                data-wrong={isWrongSelection(option.value)}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.value}
                  checked={selected === option.value}
                  disabled={feedback !== undefined}
                  onChange={() => {
                    const next = answerFromValue(question, option.value)
                    if (next) onAnswer(next)
                  }}
                  className={styles.input}
                />
                <span className={styles.optionText}>{option.label}</span>
                {isCorrectOption(option.value) ? (
                  <span className={styles.flag}>Correct answer</span>
                ) : isWrongSelection(option.value) ? (
                  <span className={styles.flag}>Your answer</span>
                ) : null}
              </label>
            </li>
          ))}
        </ul>
      )}

      {feedback?.explanation ? <p className={styles.explanation}>{feedback.explanation}</p> : null}
    </fieldset>
  )
}
