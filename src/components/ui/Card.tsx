import type { ReactNode } from 'react'
import { cn } from '@/lib/cn.ts'
import styles from './Card.module.css'

/**
 * Card.
 *
 * A surface, not a layout primitive. It exists to group related content with a
 * consistent border, radius and padding — and deliberately does nothing else.
 *
 * `as` is available because a card is sometimes a `<li>` (in a grid of roadmaps,
 * where the parent is a list) or an `<article>`. Getting that wrong costs a list
 * semantics announcement, so the escape hatch is provided rather than left to
 * whoever notices.
 */

type CardTone = 'default' | 'raised' | 'sunken'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps {
  readonly children: ReactNode
  readonly tone?: CardTone
  readonly padding?: CardPadding
  readonly as?: 'div' | 'li' | 'article' | 'section'
  /** Removes the interactive hover affordance, for cards that are not links. */
  readonly interactive?: boolean
  readonly className?: string
}

export const Card = ({
  children,
  tone = 'default',
  padding = 'md',
  as: Element = 'div',
  interactive = false,
  className,
}: CardProps) => (
  <Element
    className={cn(
      styles.card,
      styles[tone],
      styles[`padding-${padding}`],
      interactive && styles.interactive,
      className,
    )}
  >
    {children}
  </Element>
)

export interface CardHeaderProps {
  readonly title: ReactNode
  /** Rendered under the title. Kept separate so a card's title stays a heading. */
  readonly description?: ReactNode
  /** Actions on the right. Wrap in a flex container rather than relying on this. */
  readonly actions?: ReactNode
  /** Heading level. Set deliberately at each call site so the outline stays sane. */
  readonly headingLevel?: 2 | 3 | 4
  readonly className?: string
}

export const CardHeader = ({
  title,
  description,
  actions,
  headingLevel = 3,
  className,
}: CardHeaderProps) => {
  // A dynamic tag keeps the heading level under the caller's control while
  // avoiding four near-identical components.
  const Heading = `h${headingLevel}` as const
  return (
    <div className={cn(styles.header, className)}>
      <div className={styles.headerText}>
        <Heading className={styles.title}>{title}</Heading>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  )
}

export const CardBody = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn(styles.body, className)}>{children}</div>
)

export const CardFooter = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => <div className={cn(styles.footer, className)}>{children}</div>
