import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../../../tests/harness.tsx'

/**
 * THE LESSON PAGE (M2.3).
 *
 * These render the REAL route with the REAL compiled content, through the test
 * harness. What they assert is what a learner would notice, or what broke
 * silently once already:
 *
 *   - the compiled MDX body actually appears as semantic HTML (not raw markdown,
 *     and not an empty page);
 *   - the heading outline is intact (one h1, no skipped level);
 *   - previous/next follow the roadmap order and are absent at the ends;
 *   - an unknown id is a 404, not an error, and keeps the shell;
 *   - a deep link renders on first load (the SPA-fallback case).
 *
 * They deliberately do NOT assert on the M2.2 renderer's internals — that has its
 * own suite in `src/components/mdx/__tests__/`. What is new here is the
 * INTEGRATION: a route that resolves a lesson by id and renders its body.
 */

const FIRST = 'what-is-a-virtual-assistant'
const SECOND = 'who-hires-virtual-assists'
/** The first lesson to reach practice (M2.4). */
const PRACTICE = 'files-and-folders'
const LAST = 'browser-basics'

describe('lesson page — content resolution', () => {
  it('renders the lesson title as the page h1', () => {
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    expect(
      screen.getByRole('heading', { level: 1, name: /what is a virtual assistant/i }),
    ).toBeInTheDocument()
  })

  it('renders the compiled MDX body as real HTML, not raw markdown', () => {
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    // The body contains an `##` heading, which must render as an `<h2>` — a
    // screen reader navigates by it, and raw `##` text would mean the compiler or
    // the renderer silently did nothing.
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0)
    // And the markdown syntax must NOT be visible as literal text.
    expect(screen.queryByText(/^##\s/)).not.toBeInTheDocument()
  })

  it('applies prose typography to the body via the renderer, not the page', () => {
    // Regression guard: the prose stylesheet used to be applied only if the
    // caller passed a class, and the caller's `.prose` was a layout rule — so the
    // typography never loaded. The body wrapper must carry a hashed `prose` class
    // that comes from the renderer's own CSS module.
    const { container } = renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    const bodyWrapper = container.querySelector('[class*="prose"]')
    expect(bodyWrapper).not.toBeNull()
    // The paragraph inside the body sits under that wrapper.
    expect(bodyWrapper?.querySelector('p')).not.toBeNull()
  })

  it('shows the lesson summary and objectives', () => {
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    const objectives = screen.getByRole('heading', { name: /what you will learn/i })
    expect(objectives).toBeInTheDocument()
    // The objectives list is a real list.
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0)
  })

  it('keeps exactly one h1 on the page', () => {
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    // A body that began with `#` would add a second h1 and break the outline.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('renders a lesson’s prerequisite as a link to that lesson', () => {
    renderApp({ initialEntries: [`/lessons/${SECOND}`] })
    const heading = screen.getByRole('heading', { name: /before this lesson/i })
    expect(heading).toBeInTheDocument()
    // Scope to the prerequisites section: the "previous" pager also links to the
    // same lesson, so an unscoped query would be ambiguous for the wrong reason.
    const section = heading.closest('section')
    expect(section).not.toBeNull()
    const link = within(section as HTMLElement).getByRole('link', {
      name: /what is a virtual assistant/i,
    })
    expect(link).toHaveAttribute('href', `/lessons/${FIRST}`)
  })

  it('renders a lesson with no prerequisite without an empty section', () => {
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    expect(screen.queryByRole('heading', { name: /before this lesson/i })).not.toBeInTheDocument()
  })
})

describe('lesson page — navigation', () => {
  it('links to the previous and next lessons in roadmap order', () => {
    renderApp({ initialEntries: [`/lessons/${SECOND}`] })
    const nav = screen.getByRole('navigation', { name: /lesson navigation/i })
    expect(within(nav).getByRole('link', { name: /previous/i })).toHaveAttribute(
      'href',
      `/lessons/${FIRST}`,
    )
    expect(within(nav).getByRole('link', { name: /next/i })).toHaveAttribute(
      'href',
      '/lessons/files-and-folders',
    )
  })

  it('offers no previous link on the first lesson', () => {
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    const nav = screen.getByRole('navigation', { name: /lesson navigation/i })
    expect(within(nav).queryByRole('link', { name: /previous/i })).not.toBeInTheDocument()
    // But next is present, because there IS a next.
    expect(within(nav).getByRole('link', { name: /next/i })).toBeInTheDocument()
  })

  it('offers no next link on the last lesson of the sequence', () => {
    renderApp({ initialEntries: [`/lessons/${LAST}`] })
    const nav = screen.getByRole('navigation', { name: /lesson navigation/i })
    expect(within(nav).queryByRole('link', { name: /next/i })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /previous/i })).toBeInTheDocument()
  })

  it('navigates to the next lesson on click', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    await user.click(screen.getByRole('link', { name: /next/i }))
    expect(
      screen.getByRole('heading', { level: 1, name: /who hires virtual assistants/i }),
    ).toBeInTheDocument()
  })

  it('reports the position within the roadmap', () => {
    renderApp({ initialEntries: [`/lessons/${SECOND}`] })
    expect(screen.getByText(/lesson 2 of/i)).toBeInTheDocument()
  })
})

describe('lesson page — breadcrumbs and context', () => {
  it('shows the full trail down to the lesson', () => {
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(nav).getByRole('link', { name: 'Roadmaps' })).toHaveAttribute('href', '/roadmaps')
    expect(within(nav).getByRole('link', { name: 'Beginner VA' })).toHaveAttribute(
      'href',
      '/roadmaps/beginner-va',
    )
    // The current page is the leaf, marked aria-current, and NOT a link.
    const current = within(nav).getByText(/what is a virtual assistant/i)
    expect(current.tagName).toBe('SPAN')
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('names the module the lesson sits in', () => {
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    expect(screen.getByText(/VA Foundations/i)).toBeInTheDocument()
  })
})

describe('lesson page — missing content', () => {
  it('renders the in-app 404 for an unknown lesson id, not an error', () => {
    renderApp({ initialEntries: ['/lessons/does-not-exist'] })
    expect(screen.getByText(/that page does not exist/i)).toBeInTheDocument()
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
  })

  it('keeps the shell chrome on the lesson 404, so there is a way out', () => {
    renderApp({ initialEntries: ['/lessons/does-not-exist'] })
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })
})

describe('lesson page — deep links', () => {
  it('renders a lesson directly from a deep link, without visiting a roadmap first', () => {
    // The SPA-fallback case: a learner opens a bookmarked lesson URL and the app
    // boots straight into it. This is the reason `createBrowserRouter` is only
    // safe with a `404.html` fallback, and the reason the route is keyed on the
    // lesson id rather than a path.
    renderApp({ initialEntries: [`/lessons/${LAST}`] })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/browser basics/i)
  })
})

describe('lesson page — accessibility', () => {
  it('has a valid heading outline with no skipped level', () => {
    // The page owns the h1; sections are h2; the body starts at h2 (an h1 in a
    // body is refused by the compiler). This asserts the outline never jumps a
    // level, which is a `DESIGN_SYSTEM.md` §7 commitment.
    //
    // Scoped to `<main>`, because the shell's sidebar nav has its own h2 group
    // headings that are not part of the lesson's outline.
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    const main = screen.getByRole('main')
    const levels = within(main)
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName.slice(1)))
    expect(levels[0]).toBe(1)
    let max = 1
    for (const level of levels) {
      expect(level, `skipped from h${max} to h${level}`).toBeLessThanOrEqual(max + 1)
      max = Math.max(max, level)
    }
  })

  it('marks the lesson navigation and breadcrumb as named landmarks', () => {
    renderApp({ initialEntries: [`/lessons/${SECOND}`] })
    expect(screen.getByRole('navigation', { name: /lesson navigation/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
  })

  it('puts the lesson body inside the main landmark', () => {
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    const main = screen.getByRole('main')
    // The h1 lives in main; if the page escaped the shell it would not.
    expect(within(main).getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('gives the previous and next controls an accessible name from their text', () => {
    renderApp({ initialEntries: [`/lessons/${SECOND}`] })
    const nav = screen.getByRole('navigation', { name: /lesson navigation/i })
    for (const link of within(nav).getAllByRole('link')) {
      // Each control has a non-empty accessible name, not just an arrow glyph.
      expect(link).toHaveAccessibleName(/\w/)
    }
  })
})

describe('lesson page — practice (M2.4)', () => {
  const practiceSection = (): HTMLElement => {
    const heading = screen.getByRole('heading', { level: 2, name: /^practice$/i })
    const section = heading.closest('section')
    if (!section) throw new Error('the Practice heading is not inside a section')
    return section
  }

  it('renders the lesson’s exercise in a Practice section', () => {
    renderApp({ initialEntries: [`/lessons/${PRACTICE}`] })
    expect(screen.getByRole('heading', { level: 2, name: /^practice$/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: /organise folders for a new client/i }),
    ).toBeInTheDocument()
  })

  it('renders the compiled exercise body as real HTML, not raw markdown', () => {
    renderApp({ initialEntries: [`/lessons/${PRACTICE}`] })
    // The body contains an `####` heading, which must render as an `<h4>` under
    // the exercise's `<h3>` title. Raw `####` text would mean compilation or
    // rendering silently did nothing.
    expect(within(practiceSection()).getAllByRole('heading', { level: 4 }).length).toBeGreaterThan(
      0,
    )
    expect(screen.queryByText(/^####\s/)).not.toBeInTheDocument()
  })

  it('shows the deliverable and the self-check list', () => {
    renderApp({ initialEntries: [`/lessons/${PRACTICE}`] })
    const section = practiceSection()
    expect(
      within(section).getByRole('heading', { level: 4, name: /what to hand in/i }),
    ).toBeInTheDocument()
    expect(
      within(section).getByRole('heading', { level: 4, name: /check your own work/i }),
    ).toBeInTheDocument()
    // The self-check criteria render as a real list.
    expect(within(section).getAllByRole('listitem').length).toBeGreaterThan(0)
  })

  it('records practice but offers no way to submit, score or grade it', () => {
    renderApp({ initialEntries: [`/lessons/${PRACTICE}`] })
    const section = practiceSection()
    // M3 records an ATTEMPT (a self-report), so there is exactly one control and
    // it says what it does. What must NOT exist is anything that grades: no
    // checkbox to tick per criterion, no free-text answer, no score.
    expect(within(section).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(within(section).queryByRole('textbox')).not.toBeInTheDocument()
    const buttons = within(section).getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName(/i have done this exercise/i)
  })

  it('says plainly that the work is not scored or graded', () => {
    renderApp({ initialEntries: [`/lessons/${PRACTICE}`] })
    expect(screen.getByText(/nothing is scored or graded/i)).toBeInTheDocument()
  })

  it('renders no Practice section for a lesson with no exercises', () => {
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })
    expect(screen.queryByRole('heading', { level: 2, name: /^practice$/i })).not.toBeInTheDocument()
  })

  it('keeps a valid heading outline on the page that has practice', () => {
    // The exercise body uses an h4 floor, and the exercise title is an h3, so the
    // outline must step 1 -> 2 -> 3 -> 4 without skipping.
    renderApp({ initialEntries: [`/lessons/${PRACTICE}`] })
    const main = screen.getByRole('main')
    const levels = within(main)
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName.slice(1)))
    expect(levels[0]).toBe(1)
    let max = 1
    for (const level of levels) {
      expect(level, `skipped from h${max} to h${level}`).toBeLessThanOrEqual(max + 1)
      max = Math.max(max, level)
    }
  })
})

/**
 * The quiz link (M4.2).
 *
 * `lesson.quiz` existed from M0 but nothing rendered it, so a lesson could name a
 * quiz and a learner would never see it. These pin the two halves: the link
 * appears when the lesson declares a quiz, and it does not appear when it does
 * not — a "Check your understanding" heading over nothing would promise a quiz
 * that is not there.
 */
describe('the quiz link (M4.2)', () => {
  it('links to the quiz the lesson declares', () => {
    renderApp({ initialEntries: [`/lessons/${FIRST}`] })

    expect(
      screen.getByRole('heading', { level: 2, name: /Check your understanding/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/3 questions on what this lesson covers/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Virtual Assistant Foundations' })).toHaveAttribute(
      'href',
      '/quizzes/va-foundations-basics',
    )
  })

  it('renders no quiz section for a lesson that declares none', () => {
    renderApp({ initialEntries: [`/lessons/${LAST}`] })
    expect(
      screen.queryByRole('heading', { name: /Check your understanding/i }),
    ).not.toBeInTheDocument()
  })
})
