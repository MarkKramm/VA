import { Compass, Library, Map } from 'lucide-react'
import { NavLink } from 'react-router'
import { Icon } from '@/components/icons/Icon.tsx'
import { PRIMARY_NAV } from '@/app/navigation.ts'
import type { NavItem } from '@/app/navigation.ts'
import { cn } from '@/lib/cn.ts'
import styles from './AppNav.module.css'

/**
 * Primary navigation.
 *
 * One list, rendered for both layouts. The responsive difference is CSS
 * (`display: none` / `display: flex` at the `md` breakpoint), not a second
 * component tree — so the mobile drawer and the desktop sidebar can never
 * disagree about what destinations exist.
 *
 * Accessibility:
 *
 *  - `<nav aria-label="Primary">` — a named landmark.
 *  - `NavLink` gives `aria-current="page"` on the active route automatically.
 *    That is the accessible active state; the visual one below is additional.
 *  - The active item is signalled by THREE things: background, a weight change,
 *    and an `aria-current`. Never by colour alone (`DESIGN_SYSTEM.md` §2.1).
 *  - Group labels are `<h2>` inside the nav, so the nav's own outline reads as
 *    "Start: Dashboard / Learn: Roadmaps, Getting started".
 */

const ICONS = {
  compass: Compass,
  map: Map,
  library: Library,
} as const

export interface AppNavProps {
  /** Adds a bottom border. Off when the nav sits inside an already-bordered panel. */
  readonly bordered?: boolean
  readonly className?: string
}

export const AppNav = ({ bordered = false, className }: AppNavProps) => (
  <nav aria-label="Primary" className={cn(styles.nav, bordered && styles.bordered, className)}>
    {PRIMARY_NAV.map((group) => (
      <div key={group.id} className={styles.group}>
        <h2 className={styles.groupLabel}>{group.label}</h2>
        <ul className={styles.list}>
          {group.items.map((item) => {
            const IconComponent = ICONS[item.icon]
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(styles.link, isActive && styles.active)}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size="sm">
                        <IconComponent />
                      </Icon>
                      <span className={styles.linkLabel}>{item.label}</span>
                      {isActive ? <span className={styles.activeDot} aria-hidden="true" /> : null}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </div>
    ))}
  </nav>
)

/**
 * A single nav item, for the mobile drawer where the full nav is not used.
 *
 * Exported because the drawer shows descriptions, which the sidebar does not, and
 * duplicating the `NavLink` + active-styling logic there would be how the two
 * drift apart.
 */
export const NavRow = ({ item }: { item: NavItem }) => {
  const IconComponent = ICONS[item.icon]
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => cn(styles.row, isActive && styles.rowActive)}
    >
      {({ isActive }) => (
        <>
          <span className={styles.rowIcon} aria-hidden="true">
            <IconComponent size="md" />
          </span>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>{item.label}</span>
            <span className={styles.rowDescription}>{item.description}</span>
          </span>
          {isActive ? <span className={styles.srOnly}>(current page)</span> : null}
        </>
      )}
    </NavLink>
  )
}
