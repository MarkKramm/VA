import type { ReactNode } from 'react'
import { cn } from '@/lib/cn.ts'
import styles from './Callout.module.css'

/**
 * Callout.
 *
 * A boxed aside for a note, a warning, or a piece of context that is not part of
 * the main flow.
 *
 * Severity is carried by an icon and a word, not only by a coloured border. That
 * is `DESIGN_SYSTEM.md` §2.1 again: a red left border alone means nothing to
 * someone who cannot distinguish it from amber, or to anyone reading a
 * monochrome printout.
 *
 * `note` and `success` use neutral/accent surfaces rather than the progression
 * state hues, because a callout's job is emphasis, and reusing the state palette
 * here would blur what "complete" means.
 */

export type CalloutTone = 'note' | 'info' | 'success' | 'warning' | 'danger'

export interface CalloutProps {
  readonly children: ReactNode
  readonly tone?: CalloutTone
  /** Short title. Omit for a plain aside. */
  readonly title?: string
  /** Icon before the title. Should be aria-hidden. */
  readonly icon?: ReactNode
  readonly className?: string
}

export const Callout = ({ children, tone = 'note', title, icon, className }: CalloutProps) => (
  // `role="note"` is a landmark-ish role that assistive tech announces. It is
  // deliberately NOT `role="alert"`: nothing here is urgent, and an alert would
  // interrupt a screen reader for what is usually a footnote.
  <aside className={cn(styles.callout, styles[tone], className)} role="note">
    {title ? (
      <p className={styles.title}>
        {icon ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {title}
      </p>
    ) : null}
    <div className={styles.body}>{children}</div>
  </aside>
)
