/**
 * The primary navigation.
 *
 * Navigation is DATA, not JSX.
 *
 * Why: the same list is needed in three places — the desktop sidebar, the mobile
 * drawer, and the tests that assert active-route behaviour. Writing it three
 * times guarantees they drift, and a nav where the mobile drawer is missing a
 * destination the desktop sidebar has is a bug nobody catches until a learner on
 * a phone cannot find a page.
 *
 * It is also where the scope discipline of M1 is enforced. `PLAN.md` §42–46 lists
 * a large future feature set — quizzes, labs, tool directory, portfolio, job
 * applications. None of it appears here, because none of it exists, and a nav
 * entry pointing at a non-functional page is worse than no nav entry: it
 * promises something and then fails.
 *
 * The information architecture is communicated through GROUPING rather than
 * through links to unwritten features. "Learn / Roadmaps / How it works" tells a
 * learner where things will live without pretending they already do.
 */

export interface NavItem {
  readonly to: string
  readonly label: string
  /**
   * A short description used by the mobile drawer and by tests. Not rendered in
   * the sidebar, where it would add noise.
   */
  readonly description: string
  /**
   * `end: true` makes the link match only the exact path. Required for `/`,
   * which would otherwise be active on every route because it is a prefix of
   * everything.
   */
  readonly end?: boolean
  /** lucide icon name, resolved by AppNav. Keeps this file free of JSX. */
  readonly icon: 'compass' | 'map' | 'library'
}

export interface NavGroup {
  readonly id: string
  readonly label: string
  readonly items: readonly NavItem[]
}

export const PRIMARY_NAV: readonly NavGroup[] = [
  {
    id: 'start',
    label: 'Start',
    items: [
      {
        to: '/',
        label: 'Dashboard',
        description: 'Where you left off and what to do next',
        icon: 'compass',
        // Without this, `/` is a prefix of every path and the Dashboard link
        // would be permanently highlighted.
        end: true,
      },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    items: [
      {
        to: '/roadmaps',
        label: 'Roadmaps',
        description: 'Structured paths from beginner to job-ready',
        icon: 'map',
      },
      {
        to: '/roadmaps/beginner-va',
        label: 'Getting started',
        description: 'The first roadmap, for people new to the work',
        icon: 'library',
      },
    ],
  },
]

/** Every nav destination, flattened. Used by tests and by the router. */
export const allNavItems = (): readonly NavItem[] => PRIMARY_NAV.flatMap((group) => group.items)

/**
 * Is this path inside the section a nav item leads to?
 *
 * Used for the "expanded" state of a group heading and for the section-level
 * highlight on a dashboard-style link. `NavLink`'s own `isActive` is per-item, so
 * this exists for the cases where the question is about the section rather than
 * the exact destination.
 */
export const isWithinSection = (pathname: string, to: string): boolean => {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}
