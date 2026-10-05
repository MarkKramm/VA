import { useState } from 'react'
import { useParams } from 'react-router'
import { ListChecks } from 'lucide-react'
import { quizContext } from '@/app/content.ts'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import { NotFoundPage } from '@/features/roadmaps/NotFoundPage.tsx'
import { answeredCount, type Answer, type AnswerMap } from './answers.ts'
import { QuestionCard } from './QuestionCard.tsx'
import styles from './QuizPage.module.css'

/**
 * The quiz page (M4.2).
 *
 * WHAT IT DOES
 *
 * Renders a validated quiz — its title, summary, and its questions in the order
 * the quiz declares — and collects one answer per question in component state.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not score, mark, grade, pass, fail or save anything. There is no
 * `quiz.attempted` event, nothing is written to storage, no lesson is marked
 * practised, and the correct answers are not in this component's data at all —
 * `quizContext` strips them, so the page could not reveal one if it tried. M4.3
 * owns what happens to an answer; M4.2 only collects one.
 *
 * That is why the completion control says what it says. A "Check answers" button
 * that implied a mark had been recorded would be a lie the learner discovers by
 * reloading, and the platform's whole posture is that it does not do that.
 *
 * ANSWERS ARE TRANSIENT
 *
 * `answers` is `useState` and nothing else. Navigating between questions does not
 * touch it; leaving the page discards it. That is the honest M4.2 behaviour, and
 * it is why the page says so rather than implying persistence.
 *
 * AN UNKNOWN QUIZ ID IS A 404
 *
 * The route is addressable by stable quiz id, and an id that does not resolve
 * renders the product's normal in-shell not-found page rather than an error —
 * exactly as an unknown lesson id does.
 */

export const QuizPage = () => {
  const { quizId } = useParams<{ quizId: string }>()
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [checked, setChecked] = useState(false)

  const context = quizId ? quizContext(quizId) : undefined
  if (!context) return <NotFoundPage />

  const { quiz, questions } = context
  const answered = answeredCount(questions, answers)
  const remaining = questions.length - answered

  const answerQuestion = (questionId: string, answer: Answer) => {
    setAnswers((previous) => ({ ...previous, [questionId]: answer }))
    // An answer changed after checking makes the checked state stale, so it goes
    // back to being an offer rather than a claim about the new answers.
    setChecked(false)
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
            />
          </li>
        ))}
      </ol>

      {/*
        The foot of the page states where the learner is and what this quiz does
        not do. `role="status"` on the count so a screen-reader user hears it
        change as they answer, without an alert interrupting them.
      */}
      <footer className={styles.footer} aria-labelledby="quiz-progress-heading">
        <h2 id="quiz-progress-heading" className={styles.footerTitle}>
          Your answers
        </h2>
        <p className={styles.progress} role="status">
          {answered} of {questions.length} answered
          {remaining > 0
            ? ` — ${remaining} ${remaining === 1 ? 'question' : 'questions'} still to answer`
            : ' — every question has an answer'}
        </p>

        {checked ? (
          <p className={styles.notice} role="status">
            Nothing is scored or saved yet. Your answers stay on this page, and marking arrives in a
            later release.
          </p>
        ) : (
          <>
            <Button variant="primary" disabled={remaining > 0} onClick={() => setChecked(true)}>
              Check answers
            </Button>
            <p className={styles.note}>
              This quiz is not marked yet. Checking your answers arrives with saved results in a
              later release.
            </p>
          </>
        )}
      </footer>
    </div>
  )
}
