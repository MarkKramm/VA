import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { downloadTextFile, readTextFile } from '@/app/progress/file-io.ts'
import { useProgressActions } from '@/app/progress/ProgressProvider.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import styles from './DataTransfer.module.css'

/**
 * Export and import the learner's progress (M3).
 *
 * WHY IT IS HERE
 *
 * Progress lives in one browser on one device (D4), and the honest consequence is
 * that clearing site data loses it. Export is the learner's own backup, and it is
 * the reason the platform can credibly say nothing leaves the browser: the file
 * is produced locally and handed to the learner, not uploaded anywhere.
 *
 * WHAT MAKES IT SAFE
 *
 * The file is validated before anything is written, and a valid import is MERGED
 * into the existing log by event id rather than replacing it — so a malformed
 * file changes nothing, and a good one adds to what the learner has instead of
 * overwriting it. The messages say what happened in plain words; a failure is
 * never colour alone.
 *
 * The browser download and file-read calls are isolated in `file-io.ts`, so the
 * logic here is testable without a browser and this component cannot crash the
 * page when an API is missing.
 */

type Feedback = { readonly tone: 'success' | 'danger'; readonly text: string }

export const DataTransfer = () => {
  const actions = useProgressActions()
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const onExport = () => {
    downloadTextFile(actions.exportData(), 'va-progress.json')
    setFeedback({ tone: 'success', text: 'Progress exported to your downloads.' })
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await readTextFile(file)
      const outcome = actions.importData(text)
      setFeedback(
        outcome.ok
          ? {
              tone: 'success',
              text: `Imported ${outcome.imported} ${
                outcome.imported === 1 ? 'entry' : 'entries'
              }. Your progress now holds ${outcome.total}.`,
            }
          : { tone: 'danger', text: outcome.error },
      )
    } catch {
      setFeedback({ tone: 'danger', text: 'That file could not be read.' })
    }
  }

  return (
    <div className={styles.transfer}>
      <p className={styles.label}>Your data</p>
      <p className={styles.note}>
        Progress is stored in this browser only. Export it to keep a copy, or import one you saved
        earlier — importing adds to what you already have.
      </p>
      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={onExport}>
          <Icon size="sm">
            <Download />
          </Icon>
          Export progress
        </Button>
        <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
          <Icon size="sm">
            <Upload />
          </Icon>
          Import progress
        </Button>
        {/*
          The file input is driven by the button above it. It is `hidden` rather
          than visually hidden: an invisible-but-focusable control would put an
          unreachable stop in the tab order, and the button already carries the
          accessible name. Screen-reader and keyboard users use the button.
        */}
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className={styles.fileInput}
          hidden
          onChange={(event) => {
            void onFile(event.target.files?.[0])
            // Reset so selecting the same file twice still fires a change.
            event.target.value = ''
          }}
        />
      </div>
      {feedback ? (
        // `role="status"` announces the outcome without interrupting. The text
        // itself distinguishes success from failure, so tone is not the only cue.
        <p className={styles.feedback} data-tone={feedback.tone} role="status">
          {feedback.text}
        </p>
      ) : null}
    </div>
  )
}
