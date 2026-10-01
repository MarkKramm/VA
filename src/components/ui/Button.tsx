import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn.ts'
import styles from './Button.module.css'

/**
 * Button.
 *
 * THE ONE RULE IN THIS FILE: if it navigates, it is a link.
 *
 * A `<button>` that goes somewhere is a real accessibility bug, not a style
 * choice. Screen-reader users open the link list to review where a page can take
 * them, and a navigation button simply is not in it. It also breaks middle-click,
 * open-in-new-tab, and the browser's back button in ways that are tedious to
 * discover. So `href` renders an `<a>` via react-router's `Link`, and only a
 * genuine action renders a `<button>`.
 *
 * `Button` and `LinkButton` therefore share one stylesheet and one visual language
 * rather than being two components that happen to look alike.
 */

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

/**
 * The minimum comfortable touch target.
 *
 * 44x44 px is the WCAG 2.2 target-size guidance and is what thumbs get on a
 * phone. Enforced here rather than per-instance because every button in the
 * product should meet it, and a `size="sm"` that is 32 px tall is fine for a
 * desktop toolbar and unacceptable as the only control on a mobile screen — so
 * the padding grows to compensate at small sizes.
 */
export const BUTTON_MIN_HEIGHT = '2.75rem'

interface CommonProps {
  readonly variant?: Variant
  readonly size?: Size
  readonly fullWidth?: boolean
  readonly className?: string
  readonly children: ReactNode
}

export type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

export const Button = ({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={cn(
      styles.button,
      styles[variant],
      styles[size],
      fullWidth && styles.fullWidth,
      className,
    )}
    {...rest}
  >
    {children}
  </button>
)

export interface LinkButtonProps extends CommonProps {
  readonly to: string
  /** Passed to the anchor; use for download or external targets. */
  readonly target?: string
  readonly rel?: string
  readonly 'aria-label'?: string
}

/**
 * A link that looks like a button.
 *
 * Separate component rather than a `href` prop on `Button`, because the two
 * render different elements and pretending otherwise is how the navigation bug
 * above gets reintroduced.
 */
export const LinkButton = ({
  to,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  target,
  rel,
  ...rest
}: LinkButtonProps) => (
  <Link
    to={to}
    target={target}
    rel={rel}
    className={cn(
      styles.button,
      styles[variant],
      styles[size],
      fullWidth && styles.fullWidth,
      className,
    )}
    {...rest}
  >
    {children}
  </Link>
)
