import type { ReactNode } from 'react'
import { cn } from '@/lib/cn.ts'
import styles from './Badge.module.css'

/**
 * Badge.
 *
 * A short label for a state, category or count.
 *
 * THE RULE: a badge is never colour alone.
 *
 * `DESIGN_SYSTEM.md` §2.1 makes colour the secondary channel, not the primary
 * one. A `Badge` with no `label` is therefore a misuse — `state` sets the colour,
 * but the *words* carry the meaning. Every badge in this product renders text.
 * An icon-only coloured dot is exactly the failure the design system exists to
 * prevent, and it is not exported as a component so it cannot be built by
 * accident.
 *
 * `state` maps to the five progression states. It is optional: a badge is also
 * used for non-progression labels (a lane, a difficulty, a count), and forcing
 * every badge into a state would dilute the meaning of the five hues.
 */

export type BadgeState = 'complete' | 'in-progress' | 'available' | 'recommended' | 'locked'

export type BadgeTone = 'neutral' | 'accent' | 'outline'

export interface BadgeProps {
  /** Required. The text that carries the meaning — see the note above. */
  readonly label: string
  readonly state?: BadgeState
  readonly tone?: BadgeTone
  /**
   * Icon before the label. Must be `aria-hidden`; the label already says it.
   * Purely a scanning aid for someone who already knows the vocabulary.
   */
  readonly icon?: ReactNode
  readonly className?: string
}

export const Badge = ({ label, state, tone, icon, className }: BadgeProps) => (
  <span
    className={cn(
      styles.badge,
      state && styles[state],
      tone === 'outline' && styles.outline,
      className,
    )}
    // `data-state` is what lets the CSS pick up --state-bg / --state-fg, so the
    // colours are defined once in tokens.css rather than per component.
    data-state={state}
  >
    {icon ? (
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
    ) : null}
    {label}
  </span>
)
