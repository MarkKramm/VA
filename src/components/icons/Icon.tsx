import type { ReactNode } from 'react'
import { cn } from '@/lib/cn.ts'
import styles from './Icon.module.css'

/**
 * Icon wrapper for lucide-react.
 *
 * WHY THIS EXISTS
 *
 * Two problems recur in any icon-using codebase, and both are accessibility bugs:
 *
 *  1. **Unannounced icons.** A decorative icon next to a text label is announced
 *     as nothing useful — some screen readers read the SVG's title, others read
 *     "graphic". `aria-hidden` fixes it, and it needs adding every single time.
 *  2. **Inconsistent sizing.** lucide icons default to 24px, which is right for
 *     neither a 14px inline badge nor a 32px feature icon.
 *
 * Both are decisions that should be made once. So this wrapper picks the
 * accessibility default — hidden — and a caller has to opt out of it explicitly
 * with `label`, which is the only way to get a meaningful (announced) icon.
 *
 * The inversion matters: the safe behaviour is the default, so forgetting to
 * think about it produces a working page rather than a broken one.
 */

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface IconProps {
  readonly children: ReactNode
  readonly size?: IconSize
  /**
   * Accessible name. Supply this ONLY when the icon is the sole content of a
   * control or the sole carrier of meaning. Leaving it undefined sets
   * `aria-hidden`, which is correct for the far more common case of an icon
   * sitting beside a text label.
   */
  readonly label?: string
  /**
   * Override the hide/show decision. Almost never needed — `label` is the
   * intended way to make an icon announced.
   */
  readonly decorative?: boolean
  readonly className?: string
}

export const Icon = ({ children, size = 'md', label, decorative, className }: IconProps) => {
  // Explicit `decorative` wins; otherwise a label makes it meaningful; otherwise
  // it is hidden. Default is hidden.
  const isDecorative = decorative ?? label === undefined

  return (
    <span
      className={cn(styles.icon, styles[size], className)}
      // `role="img"` is what makes a named SVG announce as an image with a name,
      // rather than as an unlabelled graphic.
      role={isDecorative ? undefined : 'img'}
      aria-hidden={isDecorative || undefined}
      aria-label={isDecorative ? undefined : label}
    >
      {children}
    </span>
  )
}
