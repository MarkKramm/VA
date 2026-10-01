import { cn } from '@/lib/cn.ts'
import styles from './ProgressBar.module.css'

/**
 * ProgressBar.
 *
 * A visual progress indicator that always carries its number in text.
 *
 * WHY THE LABEL IS NOT OPTIONAL
 *
 * A bar whose fill level is the only information fails for screen-reader users,
 * for anyone with low vision, and in monochrome printing. `DESIGN_SYSTEM.md` §2.1
 * makes colour-never-alone a hard rule and this is where it mostly gets applied.
 * So `label` is a required prop and it is rendered as visible text beside the
 * bar, not hidden in an `aria-label`.
 *
 * The bar itself is `role="progressbar"` with `aria-valuenow` / `aria-valuemin` /
 * `aria-valuemax`, and `aria-valuetext` giving the human phrasing ("3 of 8
 * lessons") because the raw number alone is ambiguous.
 *
 * The fill is a solid colour, not a gradient, and it is never the only signal.
 */

export interface ProgressBarProps {
  /** 0 to 1. Values outside the range are clamped rather than trusted. */
  readonly value: number
  /** Required. Visible text stating the progress, e.g. "3 of 8 lessons". */
  readonly label: string
  /** Sets the colour. Omit for a neutral bar. */
  readonly state?: 'complete' | 'in-progress' | 'available' | 'recommended' | 'locked'
  readonly size?: 'sm' | 'md'
  /** Hides the visible label but keeps it for assistive tech. Avoid if possible. */
  readonly hideLabel?: boolean
  readonly className?: string
}

/** Clamp to 0..1. A progress bar that renders a negative or 140% fill is a bug. */
const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/** "3 of 8 lessons" -> "3 / 8". Used for the ARIA value text. */
const toPercent = (value: number): number => Math.round(value * 100)

export const ProgressBar = ({
  value,
  label,
  state,
  size = 'md',
  hideLabel = false,
  className,
}: ProgressBarProps) => {
  const clamped = clamp01(value)
  const percent = toPercent(clamped)

  return (
    <div className={cn(styles.wrapper, className)} data-state={state}>
      <div className={styles.labels}>
        {/* The visible text. Not aria-hidden: this is the accessible name for
            anyone who cannot see the bar, so hiding it would be backwards. */}
        <span className={cn(styles.label, hideLabel && styles.srOnly)}>{label}</span>
        <span className={cn(styles.percent, hideLabel && styles.srOnly)} aria-hidden="true">
          {percent}%
        </span>
      </div>
      <div
        className={cn(styles.track, styles[size])}
        role="progressbar"
        // The ARIA value text carries the meaning; valuenow carries the machine
        // number. Both, because they answer different questions.
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={label}
      >
        <div className={styles.fill} style={{ inlineSize: `${percent}%` }} />
      </div>
    </div>
  )
}
