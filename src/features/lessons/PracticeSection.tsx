import { CheckCircle2, ListChecks } from 'lucide-react'
import type { ExerciseView } from '@/app/content.ts'
import { lessonProgressFor } from '@/app/progress/composition.ts'
import { useProgressActions, useProgressState } from '@/app/progress/ProgressProvider.tsx'
import { MdxContent } from '@/components/mdx/render.tsx'
import { Badge } from '@/components/ui/Badge.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import { formatDuration } from '@/lib/cn.ts'
import styles from './PracticeSection.module.css'

/**
 * The Practice section (M2.4).
 *
 * The first place practice reaches a learner. It renders the exercises a lesson
 * references — title, summary, difficulty, duration, the exercise body, the
 * deliverable and the self-check list — and nothing else.
 *
 * WHAT THIS SECTION DOES AT M3
 *
 * It records an ATTEMPT, and only an attempt. The learner can say "I have done
 * this exercise", which records the existing `exercise.attempted` event with
 * `selfChecked: true` — practice happened, nothing more. There is still no score,
 * no pass/fail, no grading, no AI evaluation and no mastery calculation; the
 * exercise stays ungraded (D25), and the copy says so plainly.
 *
 * Practice is tracked per LESSON in the domain (`practisedLessons` is keyed by
 * lesson), so once any exercise in a lesson is marked, every card in that lesson
 * reflects it. All current lessons have one exercise, so this is not visible
 * today; it is stated here so the day a lesson has two, the behaviour is
 * understood rather than discovered.
 *
 * HEADING LEVELS
 *
 * The lesson page owns the `<h1>`. This section is an `<h2>` ("Practice"), each
 * exercise title is an `<h3>`, and the sub-headings inside an exercise are
 * `<h4>`. The exercise BODY is compiled with an `h4` floor (D26) precisely so it
 * slots in under that `<h3>` without colliding with the lesson's own `h2`
 * sections.
 */

const DIFFICULTY_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const

const ExerciseCard = ({
  exercise,
  practised,
  onPractise,
}: {
  readonly exercise: ExerciseView
  readonly practised: boolean
  readonly onPractise: () => void
}) => (
  <article className={styles.exercise} aria-labelledby={`exercise-${exercise.id}`}>
    <header className={styles.header}>
      <h3 id={`exercise-${exercise.id}`} className={styles.title}>
        {exercise.title}
      </h3>
      <div className={styles.badges}>
        <Badge label={DIFFICULTY_LABEL[exercise.difficulty]} tone="outline" />
        <Badge label={formatDuration(exercise.estimatedMinutes)} tone="neutral" />
      </div>
    </header>

    <p className={styles.summary}>{exercise.summary}</p>

    {exercise.body && exercise.body.length > 0 ? (
      <MdxContent nodes={exercise.body} keyPrefix={`exercise-${exercise.id}`} />
    ) : null}

    <div className={styles.block}>
      <h4 className={styles.subheading}>What to hand in</h4>
      <p className={styles.bodyText}>{exercise.deliverable}</p>
    </div>

    <div className={styles.block}>
      <h4 className={styles.subheading}>Check your own work</h4>
      <ul className={styles.checkList}>
        {exercise.selfCheck.map((criterion) => (
          <li key={criterion} className={styles.checkItem}>
            {criterion}
          </li>
        ))}
      </ul>
    </div>

    {/*
      The self-report action. It records that practice happened and nothing else:
      no score, no pass/fail, no evaluator. Once recorded, the state is stated
      rather than offered again — the event log keeps every attempt, but the
      domain tracks practice per lesson, so re-pressing it would add noise without
      changing what the learner sees.
    */}
    <div className={styles.practise}>
      {practised ? (
        <p className={styles.practiseDone} role="status">
          <Icon size="sm">
            <CheckCircle2 />
          </Icon>
          Practice recorded. Nothing is scored — this only marks that you did it.
        </p>
      ) : (
        <Button variant="secondary" onClick={onPractise}>
          I have done this exercise
        </Button>
      )}
    </div>
  </article>
)

export const PracticeSection = ({
  exercises,
  lessonId,
}: {
  readonly exercises: readonly ExerciseView[]
  readonly lessonId: string
}) => {
  const state = useProgressState()
  const actions = useProgressActions()
  const { practised } = lessonProgressFor(state, lessonId)

  // No exercises means no section at all — an empty "Practice" heading on a
  // reading-only lesson would promise something that is not there.
  if (exercises.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="practice-heading">
      <h2 id="practice-heading" className={styles.sectionTitle}>
        <Icon size="sm">
          <ListChecks />
        </Icon>
        Practice
      </h2>
      {/*
        The honesty note. It says what is and is not recorded: practice is marked,
        but nothing is scored, graded or sent anywhere, and the record stays in
        this browser. A learner who just read a lesson needs to know that pressing
        the button below produces no mark, so they do not wait for one.
      */}
      <p className={styles.intro}>
        These exercises are for you to do, not to hand in. Nothing is scored or graded — marking one
        only records that you did it, in this browser.
      </p>
      <div className={styles.list}>
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            practised={practised}
            onPractise={() => actions.markExercisePractised(exercise.id, lessonId)}
          />
        ))}
      </div>
    </section>
  )
}
