import { Link } from 'react-router'
import { cn } from '@/lib/cn.ts'
import styles from './Breadcrumbs.module.css'

/**
 * Breadcrumbs.
 *
 * Shows the position of the current page within the information architecture:
 *
 *     Home / Roadmaps / Beginner VA
 *
 * WHY THIS MATTERS HERE SPECIFICALLY
 *
 * The eventual platform is deep — roadmap, then stage, then module, then lesson,
 * then topic — and a learner arriving from a search result at M2 needs to know
 * where they are. Building this at M1 means the shell's depth is visible from the
 * start, and the shell grows into it rather than acquiring a second navigation
 * concept later.
 *
 * Accessibility notes, which are the fiddly part:
 *
 *  - Wrapped in `<nav aria-label="Breadcrumb">` — a named landmark, so a
 *    screen-reader user can jump straight to it.
 *  - The current page is `<span aria-current="page">`, NOT a link. Linking the
 *    page you are already on is a dead control.
 *  - Separators are CSS `::before` content, so they are never announced. A
 *    literal "/" between items is read as "slash" by some screen readers, and an
 *    icon element would need `aria-hidden` on every instance to avoid the same
 *    problem.
 *  - Only the final crumb may truncate. The ancestors are the context, so losing
 *    them on a narrow screen is the wrong thing to optimise for.
 */

export interface Crumb {
  readonly label: string
  /** Omit on the current page — that is what marks it as `aria-current`. */
  readonly to?: string
}

export interface BreadcrumbsProps {
  readonly items: readonly Crumb[]
  readonly className?: string
}

export const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
  // A single crumb is not a trail. Rendering "Home / Home" is noise, and a
  // breadcrumb bar of one item wastes the vertical space it occupies.
  if (items.length < 2) return null

  return (
    <nav aria-label="Breadcrumb" className={cn(styles.breadcrumbs, className)}>
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className={styles.item}>
              {item.to && !isLast ? (
                <Link to={item.to} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(styles.current, isLast && styles.last)}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
