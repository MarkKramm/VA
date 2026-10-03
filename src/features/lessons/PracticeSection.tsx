import { ListChecks } from 'lucide-react'
import type { ExerciseView } from '@/app/content.ts'
import { MdxContent } from '@/components/mdx/render.tsx'
import { Badge } from '@/components/ui/Badge.tsx'
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
 * WHAT THIS SECTION DELIBERATELY DOES NOT DO
 *
 * It does not score, save, submit or record anything. There are no checkboxes,
 * no "Submit" button, no progress state and no call into the progress store. An
 * exercise is ungraded and unsaved at M2.4, and the section says so in plain
 * words rather than implying a record that does not exist. Wiring the existing
 * `exercise.attempted` event is M3 work; doing it here would write progress into
 * a UI that has no home for it.
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

const ExerciseCard = ({ exercise }: { readonly exercise: ExerciseView }) => (
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
  </article>
)

export const PracticeSection = ({ exercises }: { readonly exercises: readonly ExerciseView[] }) => {
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
        The honesty note. It is not decoration: a learner who has just read a
        lesson needs to know that doing the exercise produces no tick, no score
        and no record, so they do not wait for one.
      */}
      <p className={styles.intro}>
        These exercises are for you to do, not to hand in. Nothing here is scored, saved or sent
        anywhere — work through them in your own files and check your own work against the list.
      </p>
      <div className={styles.list}>
        {exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </section>
  )
}
