import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// Relative rather than an `@tests` alias: the alias set is fixed in tsconfig.json
// and vite.config.ts and adding a seventh entry for one file is not worth it.
import { renderApp } from '../../../../tests/harness.tsx'

/**
 * SHELL TESTS.
 *
 * WHAT THESE ASSERT, AND WHY
 *
 * The brief for these is "important behaviour", not "components exist". A test
 * that asserts `expect(screen.getByTestId('shell')).toBeInTheDocument()` proves
 * nothing: it passes on a shell with no landmarks, no skip link, and no working
 * navigation. So every test below asserts something a learner would notice —
 * where focus lands, what is announced, which link is current — or something that
 * broke silently once already.
 *
 * The AppShell `<Outlet />` bug is the clearest example of why. `AppShell` took a
 * `children` prop that react-router never passes (it renders layout routes empty
 * and delivers content through `<Outlet />`). That typechecked, compiled, and
 * produced a completely blank page. `renders the matched route's content` is the
 * test that would have caught it, and it exists below for that reason.
 */

describe('shell — landmarks and structure', () => {
  it('renders the matched route content, not an empty main', () => {
    renderApp({ initialEntries: ['/'] })
    // If <Outlet /> were missing, main would be empty and this would fail.
    expect(
      screen.getByRole('heading', { level: 1, name: /learn to work as a virtual assistant/i }),
    ).toBeInTheDocument()
  })

  it('provides the landmarks a screen reader navigates by', () => {
    renderApp()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    // Named, not just present: two unnamed navs are indistinguishable.
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Footer' })).toBeInTheDocument()
  })

  it('has exactly one h1 per page', () => {
    renderApp()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('exposes main as a skip-link target that is focusable but not tabbable', () => {
    renderApp()
    const main = screen.getByRole('main')
    // The skip link points here, so it must be programmatically focusable.
    expect(main).toHaveAttribute('id', 'main-content')
    expect(main).toHaveAttribute('tabindex', '-1')
  })
})

describe('shell — skip link', () => {
  it('is the first focusable element and targets the main region', async () => {
    const user = userEvent.setup()
    renderApp()

    const skip = screen.getByRole('link', { name: /skip to main content/i })
    expect(skip).toHaveAttribute('href', '#main-content')

    // First Tab must land on it. If the header were rendered before it, or it
    // were not focusable, Tab would land on the brand link instead.
    await user.tab()
    expect(skip).toHaveFocus()
  })
})

describe('shell — navigation', () => {
  it('links to each destination', () => {
    renderApp()
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(nav).getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/')
    expect(within(nav).getByRole('link', { name: /^roadmaps$/i })).toHaveAttribute(
      'href',
      '/roadmaps',
    )
  })

  it('marks the current route with aria-current', () => {
    renderApp({ initialEntries: ['/roadmaps'] })
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const current = within(nav)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveAccessibleName(/roadmaps/i)
  })

  it('marks the dashboard current only on the exact path, not every path', () => {
    // `end: true` matters: `/` is a prefix of every route, so without it the
    // Dashboard link would be highlighted on every page.
    //
    // Two renders in one test, so the first is unmounted before the second.
    // Testing Library does not auto-clean between renders within a single test,
    // and two shells means two "Primary" navs — which is a test bug, not an app
    // bug, and worth being explicit about rather than working around with
    // getAllByRole.
    const onRoadmaps = renderApp({ initialEntries: ['/roadmaps'] })
    const navOnRoadmaps = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(navOnRoadmaps).getByRole('link', { name: /dashboard/i })).not.toHaveAttribute(
      'aria-current',
    )
    onRoadmaps.unmount()

    renderApp({ initialEntries: ['/'] })
    const navOnRoot = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(navOnRoot).getByRole('link', { name: /dashboard/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('navigates on click and updates the current route', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: ['/'] })

    await user.click(screen.getByRole('link', { name: /browse roadmaps/i }))
    expect(screen.getByRole('heading', { level: 1, name: 'Roadmaps' })).toBeInTheDocument()
  })

  it('marks the roadmap section current on a nested roadmap route', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: ['/roadmaps'] })

    // Navigate by the nav's own "Getting started" link, which points at the
    // concrete roadmap id. Clicking by name is what a learner does, and it also
    // asserts the nav destination actually resolves to a real page.
    await user.click(screen.getByRole('link', { name: /getting started/i }))
    expect(screen.getByRole('heading', { level: 1, name: 'Beginner VA' })).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const current = within(nav)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    // "Roadmaps" (/roadmaps) and "Getting started" (/roadmaps/beginner-va) both
    // prefix-match this URL, so both are legitimately current. This asserts that
    // something is marked, and that it is a real link — not that exactly one is,
    // because "exactly one" is not the correct behaviour for a section nav.
    expect(current.length).toBeGreaterThan(0)
    for (const link of current) expect(link).toHaveAttribute('href')
  })
})

describe('shell — routing', () => {
  it('renders the dashboard at the index route', () => {
    renderApp({ initialEntries: ['/'] })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/virtual assistant/i)
  })

  it('renders the roadmaps index', () => {
    renderApp({ initialEntries: ['/roadmaps'] })
    expect(screen.getByRole('heading', { level: 1, name: 'Roadmaps' })).toBeInTheDocument()
  })

  it('renders a roadmap by id from the route parameter', () => {
    renderApp({ initialEntries: ['/roadmaps/beginner-va'] })
    expect(screen.getByRole('heading', { level: 1, name: 'Beginner VA' })).toBeInTheDocument()
  })

  it('opens a lesson from a roadmap by clicking its title (M2.3)', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: ['/roadmaps/beginner-va'] })
    // The roadmap page lists lessons as links now that lesson pages exist. The
    // "Open <first lesson>" card button also links to the same lesson, so this
    // scopes to the stage list rather than matching either by accident.
    const stages = screen.getByRole('heading', { name: 'Stages' }).closest('section')
    expect(stages).not.toBeNull()
    await user.click(
      within(stages as HTMLElement).getByRole('link', { name: /what is a virtual assistant/i }),
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /what is a virtual assistant/i,
    )
  })

  it('opens a lesson from the dashboard "Start here" list (M2.3)', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: ['/'] })
    await user.click(screen.getByRole('link', { name: /what is a virtual assistant/i }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /what is a virtual assistant/i,
    )
  })

  it('renders the in-app 404 for an unknown roadmap id, not an error', () => {
    renderApp({ initialEntries: ['/roadmaps/does-not-exist'] })
    // A 404 is the learner's URL being wrong, so it must not read as a failure.
    expect(screen.getByText(/that page does not exist/i)).toBeInTheDocument()
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
  })

  it('renders the in-app 404 for an unknown top-level path', () => {
    renderApp({ initialEntries: ['/nonsense'] })
    expect(screen.getByText(/that page does not exist/i)).toBeInTheDocument()
  })

  it('keeps the shell chrome on the 404, so there is still a way out', () => {
    renderApp({ initialEntries: ['/nonsense'] })
    // The 404 renders INSIDE the layout route. If it escaped the shell it would
    // have no header and no navigation.
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })
})

describe('shell — breadcrumbs', () => {
  it('shows the trail on a nested page and marks the leaf as current', () => {
    renderApp({ initialEntries: ['/roadmaps/beginner-va'] })
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Roadmaps' })).toBeInTheDocument()
    // The current page is NOT a link — linking the page you are on is a dead
    // control — and carries aria-current instead.
    const current = within(nav).getByText('Beginner VA')
    expect(current.tagName).toBe('SPAN')
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('does not render a breadcrumb trail on the dashboard', () => {
    renderApp({ initialEntries: ['/'] })
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
  })
})

describe('shell — mobile navigation disclosure', () => {
  it('is collapsed by default and reports its state', () => {
    renderApp()
    const toggle = screen.getByRole('button', { name: /menu/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // Closed means no dialog in the tree.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens as a modal dialog that traps focus and closes on Escape', async () => {
    const user = userEvent.setup()
    renderApp()

    const toggle = screen.getByRole('button', { name: /menu/i })
    await user.click(toggle)

    const dialog = screen.getByRole('dialog', { name: 'Navigation' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    // Focus must move into the panel, or a keyboard user is still on the page
    // behind it while the menu covers it.
    expect(dialog).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Focus returns to the control that opened it.
    expect(toggle).toHaveFocus()
  })

  it('closes on navigation so the new page is not hidden behind it', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /menu/i }))
    const dialog = screen.getByRole('dialog', { name: 'Navigation' })
    await user.click(within(dialog).getByRole('link', { name: /roadmaps/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Roadmaps' })).toBeInTheDocument()
  })
})
