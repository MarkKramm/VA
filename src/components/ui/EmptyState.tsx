import type { ReactNode } from 'react'
import { cn } from '@/lib/cn.ts'
import styles from './EmptyState.module.css'

/**
 * EmptyState.
 *
 * For a region that has nothing in it yet.
 *
 * AN HONEST EMPTY STATE IS THE POINT
 *
 * This project is pre-launch and its content is thin — 2 roadmaps, 2 modules, 4
 * lessons, all `draft`. An empty dashboard is therefore the normal case, not an
 * error, and the temptation is to fill it with sample data so it looks finished.
 * `AGENTS.md` and `PLAN.md` §73 both forbid that, and for a specific reason: a
 * learner must be able to tell what exists from what is planned, or the platform
 * makes a claim about itself it cannot keep.
 *
 * So this component explains the state and offers the next real action. It never
 * shows placeholder rows, skeleton cards, or invented counts.
 */

export interface EmptyStateProps {
  readonly title: string
  readonly children?: ReactNode
  /** The one useful thing to do next. Usually a link. */
  readonly action?: ReactNode
  /** Decorative. Should be aria-hidden; the title carries the meaning. */
  readonly icon?: ReactNode
  /** Reduces the vertical padding. For an empty state inside a card. */
  readonly compact?: boolean
  readonly className?: string
}

export const EmptyState = ({
  title,
  children,
  action,
  icon,
  compact = false,
  className,
}: EmptyStateProps) => (
  <div className={cn(styles.empty, compact && styles.compact, className)}>
    {icon ? (
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
    ) : null}
    <p className={styles.title}>{title}</p>
    {children ? <div className={styles.body}>{children}</div> : null}
    {action ? <div className={styles.action}>{action}</div> : null}
  </div>
)
