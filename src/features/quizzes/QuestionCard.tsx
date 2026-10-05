import type { QuizQuestionView } from '@/app/content.ts'
import { answerFromValue, answerOptions, answerValue, type Answer } from './answers.ts'
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
 * The selected state is carried by the radio dot itself, not by colour, and the
 * card states "Answered" in words — so nothing here is signalled by colour alone.
 *
 * AN UNKNOWN TYPE RENDERS NOTHING ANSWERABLE
 *
 * `answerOptions` returns an empty list for a type this build does not know, and
 * this renders an honest sentence instead of a plausible control that would record
 * an answer of the wrong shape. See `answers.ts`.
 */
export interface QuestionCardProps {
  readonly question: QuizQuestionView
  readonly position: number
  readonly total: number
  readonly answer: Answer | undefined
  readonly onAnswer: (answer: Answer) => void
}

export const QuestionCard = ({
  question,
  position,
  total,
  answer,
  onAnswer,
}: QuestionCardProps) => {
  const options = answerOptions(question)
  const selected = answerValue(answer)

  return (
    <fieldset className={styles.card}>
      <legend className={styles.legend}>
        <span className={styles.position}>
          Question {position} of {total}
        </span>
        <span className={styles.prompt}>{question.prompt}</span>
        {/* A word, not a colour: the radio dot shows the selection, this names it. */}
        {answer !== undefined ? <span className={styles.state}>Answered</span> : null}
      </legend>

      {options.length === 0 ? (
        <p className={styles.unsupported} role="status">
          This question uses a type this version cannot show yet, so it cannot be answered here.
        </p>
      ) : (
        <ul className={styles.options}>
          {options.map((option) => (
            <li key={option.value}>
              <label className={styles.option} data-selected={selected === option.value}>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.value}
                  checked={selected === option.value}
                  onChange={() => {
                    const next = answerFromValue(question, option.value)
                    if (next) onAnswer(next)
                  }}
                  className={styles.input}
                />
                <span className={styles.optionText}>{option.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}
