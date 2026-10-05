import { useState } from 'react'
import { useParams } from 'react-router'
import { ListChecks } from 'lucide-react'
import { quizContext, quizScoringInput } from '@/app/content.ts'
import { useProgressActions, useProgressState } from '@/app/progress/ProgressProvider.tsx'
import { newEventId } from '@/app/storage/merge.ts'
import type { Answer, AnswerMap } from '@/app/quiz/answers.ts'
import { scoreQuestions, type QuizResult } from '@/app/quiz/score.ts'
import { summariseAttempts } from '@domain/progress/selectors.ts'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import { NotFoundPage } from '@/features/roadmaps/NotFoundPage.tsx'
import { answeredCount } from './options.ts'
import { QuestionCard } from './QuestionCard.tsx'
import styles from './QuizPage.module.css'

/**
 * The quiz page (renderer at M4.2, submission at M4.3).
 *
 * THE THREE THINGS THAT MATTER HERE
 *
 * 1. BEFORE submission this page knows nothing about correctness. `quizContext`
 *    gives it questions with the answers stripped, so there is no field to leak
 *    and no branch that could accidentally reveal one.
 *
 * 2. SUBMISSION is the only moment the canonical questions are read, and it
 *    happens inside the click handler — never during render, never in an effect.
 *    That is what makes "exactly one attempt per submission" a property of the
 *    code rather than a hope about React: a re-render cannot re-run a handler,
 *    and an effect that submitted would.
 *
 * 3. PROGRESS is written through the existing store, as the existing
 *    `quiz.attempted` event. History is then read back from the LOG rather than
 *    from local state, so a reload shows what the learner just saw and two tabs
 *    agree.
 *
 * ANSWERS ARE STILL TRANSIENT
 *
 * `answers` is component state and is never persisted. Only a completed
 * submission becomes progress. Navigating away half-way through, or reloading
 * before submitting, leaves the log untouched — there is no attempt, and on return
 * the quiz is simply not started again. A half-finished quiz is not evidence of
 * anything, and a resumable answer sheet would be a feature nobody asked for.
 *
 * NO SCORING BEFORE SUBMISSION
 *
 * The completion control is disabled until every question has an answer, and there
 * is no score, percentage or pass/fail anywhere on the page until an attempt
 * exists. Once it does, the outcome is stated in words as well as figures.
 */

export const QuizPage = () => {
  const { quizId } = useParams<{ quizId: string }>()
  const progress = useProgressState()
  const actions = useProgressActions()
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [result, setResult] = useState<QuizResult | undefined>(undefined)

  const context = quizId ? quizContext(quizId) : undefined
  if (!context || !quizId) return <NotFoundPage />

  const { quiz, questions } = context
  const answered = answeredCount(questions, answers)
  const remaining = questions.length - answered

  // The learner's persisted attempts, folded from the log. Never local state, so a
  // reload and a second tab agree with what is shown here.
  const attempts = progress.derived.quizAttempts[quizId] ?? []
  const summary = summariseAttempts(attempts)
  const feedbackById = new Map((result?.questions ?? []).map((entry) => [entry.questionId, entry]))

  const answerQuestion = (questionId: string, answer: Answer) => {
    setAnswers((previous) => ({ ...previous, [questionId]: answer }))
  }

  const submit = () => {
    // The canonical questions are read HERE and nowhere else. Everything above
    // this line works from the stripped view, so a correct answer cannot reach the
    // page before this runs.
    const input = quizScoringInput(quizId)
    if (!input) return

    const marked = scoreQuestions(input.questions, answers)
    setResult(marked)
    actions.submitQuizAttempt({
      quizId,
      attemptId: newEventId(),
      score: marked.score,
      maxScore: marked.maxScore,
      passed: marked.passed,
    })
  }

  /** Start a fresh attempt. History is untouched — a retry adds, never replaces. */
  const retry = () => {
    setAnswers({})
    setResult(undefined)
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: quiz.title }]} />

      <header className={styles.header}>
        <p className={styles.eyebrow}>
          <Icon size="sm">
            <ListChecks />
          </Icon>
          Quiz
        </p>
        <h1 className={styles.title}>{quiz.title}</h1>
        <p className={styles.summary}>{quiz.summary}</p>
        <p className={styles.count}>
          {questions.length} {questions.length === 1 ? 'question' : 'questions'}
        </p>
        {attempts.length > 0 ? (
          <p className={styles.history}>
            {attempts.length === 1 ? 'Attempted once' : `Attempted ${attempts.length} times`} · best{' '}
            {Math.round(summary.best * 100)}%
          </p>
        ) : null}
      </header>

      <ol className={styles.questions}>
        {questions.map((question, index) => (
          <li key={question.id}>
            <QuestionCard
              question={question}
              position={index + 1}
              total={questions.length}
              answer={answers[question.id]}
              onAnswer={(answer) => answerQuestion(question.id, answer)}
              feedback={feedbackById.get(question.id)}
            />
          </li>
        ))}
      </ol>

      {result ? (
        <section
          className={styles.footer}
          aria-labelledby="quiz-result-heading"
          data-passed={result.passed}
        >
          <h2 id="quiz-result-heading" className={styles.footerTitle}>
            Your result
          </h2>
          <p className={styles.verdict} role="status">
            {result.passed ? 'Passed' : 'Not passed'}
          </p>
          <dl className={styles.figures}>
            <div className={styles.figure}>
              <dt className={styles.figureLabel}>Score</dt>
              <dd className={styles.figureValue}>
                {result.score} of {result.maxScore}
              </dd>
            </div>
            <div className={styles.figure}>
              <dt className={styles.figureLabel}>Percentage</dt>
              <dd className={styles.figureValue}>{result.percentage}%</dd>
            </div>
            <div className={styles.figure}>
              <dt className={styles.figureLabel}>Correct</dt>
              <dd className={styles.figureValue}>{result.correctCount}</dd>
            </div>
            <div className={styles.figure}>
              <dt className={styles.figureLabel}>Incorrect</dt>
              <dd className={styles.figureValue}>{result.incorrectCount}</dd>
            </div>
            {result.unanswered.length > 0 ? (
              <div className={styles.figure}>
                <dt className={styles.figureLabel}>Not answered</dt>
                <dd className={styles.figureValue}>{result.unanswered.length}</dd>
              </div>
            ) : null}
          </dl>
          <p className={styles.note}>
            This attempt is saved to your progress on this device. Your answers are not stored —
            only the score.
          </p>
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </section>
      ) : (
        <section className={styles.footer} aria-labelledby="quiz-progress-heading">
          <h2 id="quiz-progress-heading" className={styles.footerTitle}>
            Your answers
          </h2>
          <p className={styles.progress} role="status">
            {answered} of {questions.length} answered
            {remaining > 0
              ? ` — ${remaining} ${remaining === 1 ? 'question' : 'questions'} still to answer`
              : ' — every question has an answer'}
          </p>
          <Button variant="primary" disabled={remaining > 0} onClick={submit}>
            Check answers
          </Button>
          <p className={styles.note}>
            Answers are marked against this quiz’s own content. You can retake it as often as you
            like — every attempt is kept.
          </p>
        </section>
      )}
    </div>
  )
}
