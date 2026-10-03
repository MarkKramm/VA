import { CheckCircle2, Circle } from 'lucide-react'
import { lessonProgressFor } from '@/app/progress/composition.ts'
import { useProgressActions, useProgressState } from '@/app/progress/ProgressProvider.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import styles from './CompletionControl.module.css'

/**
 * Lesson completion (M3).
 *
 * THE SMALLEST HONEST INTERACTION. It shows whether the lesson is complete and
 * offers the one action that changes that, using the existing `lesson.completed`
 * / `lesson.uncompleted` events with `source: 'manual'`.
 *
 * WHY IT IS NOT A CHECKBOX OR A PRESSED TOGGLE
 *
 * The state ("is this complete?") and the action ("mark it complete") are
 * different things, so they are different elements: a status line that says what
 * is true, and a button whose label says what pressing it will do. A single
 * toggle whose label flips between two descriptions reads as both at once and is
 * genuinely ambiguous with a screen reader.
 *
 * WHY COMPLETION IS NEVER AUTOMATIC
 *
 * Opening or scrolling a page does NOT complete a lesson. `recordLessonViewed`
 * records a view, which only powers "continue learning". Completion is a
 * deliberate act, and the event model's `source` field keeps the two apart.
 */

export const CompletionControl = ({ lessonId }: { readonly lessonId: string }) => {
  const state = useProgressState()
  const actions = useProgressActions()
  const { complete } = lessonProgressFor(state, lessonId)

  return (
    <div className={styles.control} data-complete={complete}>
      {/* `role="status"` so a screen reader hears the change when it happens,
          without an alert interrupting. The icon is decorative — the sentence
          carries the meaning, so completion is never signalled by colour alone. */}
      <p className={styles.status} role="status">
        <Icon size="sm" className={styles.icon}>
          {complete ? <CheckCircle2 /> : <Circle />}
        </Icon>
        {complete ? 'You have completed this lesson.' : 'You have not completed this lesson yet.'}
      </p>
      <Button
        variant={complete ? 'secondary' : 'primary'}
        onClick={() =>
          complete ? actions.uncompleteLesson(lessonId) : actions.completeLesson(lessonId)
        }
      >
        {complete ? 'Mark as not complete' : 'Mark lesson complete'}
      </Button>
    </div>
  )
}
