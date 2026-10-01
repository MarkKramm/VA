import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Badge } from '../Badge.tsx'
import { Button, LinkButton } from '../Button.tsx'
import { Callout } from '../Callout.tsx'
import { Card, CardHeader } from '../Card.tsx'
import { EmptyState } from '../EmptyState.tsx'
import { ProgressBar } from '../ProgressBar.tsx'
import { Breadcrumbs } from '../Breadcrumbs.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import { Compass } from 'lucide-react'

/**
 * UI COMPONENT CONTRACTS.
 *
 * These assert the accessibility commitments in `DESIGN_SYSTEM.md` §7 rather than
 * that components render. A test asserting `expect(screen.getByText('x')).toBeTruthy()`
 * passes on markup that is inaccessible; every test below would fail if the
 * specific commitment it names were broken.
 */

/** Wraps in a router, for the components that render links. */
const withRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Button — a button that navigates is a link', () => {
  it('renders a real button element for an action', () => {
    render(<Button>Do the thing</Button>)
    expect(screen.getByRole('button', { name: 'Do the thing' })).toBeInTheDocument()
  })

  it('defaults to type="button" so it cannot submit a form by accident', () => {
    // A submit-by-default button is the classic bug: a button added to a form
    // later submits it without anyone choosing to.
    render(<Button>Do the thing</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('renders an anchor for a destination, not a button', () => {
    withRouter(<LinkButton to="/roadmaps">Browse</LinkButton>)
    const link = screen.getByRole('link', { name: 'Browse' })
    // A navigation control must be a link so it appears in a screen reader's link
    // list and supports open-in-new-tab and middle-click.
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/roadmaps')
  })

  it('marks a disabled button with the disabled attribute, not just styling', () => {
    render(<Button disabled>Do the thing</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('Badge — colour is never the only signal', () => {
  it('renders the label as text, which is what carries the meaning', () => {
    render(<Badge label="Complete" state="complete" />)
    // The accessible name is the word. A coloured pill with no text would pass a
    // snapshot test and fail every real user.
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('exposes the state as data, so the colour comes from the tokens', () => {
    const { container } = render(<Badge label="In progress" state="in-progress" />)
    expect(container.querySelector('[data-state="in-progress"]')).toBeInTheDocument()
  })

  it('renders without a state, for non-progression labels', () => {
    const { container } = render(<Badge label="Freelance" tone="accent" />)
    expect(container.querySelector('[data-state]')).toBeNull()
  })
})

describe('ProgressBar — the number is always available', () => {
  it('exposes progressbar semantics with the value', () => {
    render(<ProgressBar value={0.375} label="3 of 8 lessons" />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '38')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('states the human phrasing in aria-valuetext, not just a number', () => {
    render(<ProgressBar value={0.375} label="3 of 8 lessons" />)
    // "38" alone does not tell a screen-reader user what the 38 is a percentage of.
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '3 of 8 lessons')
  })

  it('shows the label as visible text, not only to assistive tech', () => {
    render(<ProgressBar value={0.375} label="3 of 8 lessons" />)
    // A bar whose only label is in an aria attribute is a bar a sighted learner
    // cannot read.
    expect(screen.getByText('3 of 8 lessons')).toBeInTheDocument()
    expect(screen.getByText('38%')).toBeInTheDocument()
  })

  it('clamps an out-of-range value instead of rendering an invalid bar', () => {
    const { rerender } = render(<ProgressBar value={-1} label="under" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')

    rerender(<ProgressBar value={4} label="over" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('treats a non-finite value as zero rather than rendering NaN%', () => {
    render(<ProgressBar value={Number.NaN} label="broken" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })
})

describe('Callout', () => {
  it('is a labelled note, not an alert', () => {
    render(
      <Callout tone="warning" title="Draft content">
        <p>Not reviewed yet.</p>
      </Callout>,
    )
    // `role="note"`, not `role="alert"`: nothing here is urgent, and an alert
    // would interrupt a screen reader for what is usually a footnote.
    expect(screen.getByRole('note')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders its title as text, so severity is not colour-only', () => {
    render(
      <Callout tone="danger" title="Something is wrong">
        <p>Details.</p>
      </Callout>,
    )
    expect(screen.getByText('Something is wrong')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('states the empty condition and offers the next action', () => {
    // The M1 dashboard's normal case is thin content, so this is a load-bearing
    // component, not an edge case.
    withRouter(
      <EmptyState title="No roadmaps yet" action={<LinkButton to="/roadmaps">Browse</LinkButton>}>
        <p>They will appear here once written.</p>
      </EmptyState>,
    )
    expect(screen.getByText('No roadmaps yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse' })).toBeInTheDocument()
  })
})

describe('Card', () => {
  it('renders the title as a real heading at the requested level', () => {
    render(
      <Card>
        <CardHeader title="A module" headingLevel={3} />
      </Card>,
    )
    // A card title that is a `<div>` disappears from the document outline, which
    // is the main way a screen-reader user navigates a long page.
    expect(screen.getByRole('heading', { level: 3, name: 'A module' })).toBeInTheDocument()
  })

  it('renders as the requested element, so list semantics can be preserved', () => {
    const { container } = render(<Card as="li">content</Card>)
    expect(container.querySelector('li')).toBeInTheDocument()
  })
})

describe('Breadcrumbs', () => {
  it('marks the final crumb as the current page and does not link it', () => {
    withRouter(
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Roadmaps', to: '/roadmaps' },
          { label: 'Beginner VA' },
        ]}
      />,
    )
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    // The current page is a span with aria-current, NOT a link. Linking the page
    // you are on is a dead control.
    const current = screen.getByText('Beginner VA')
    expect(current.tagName).toBe('SPAN')
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('renders nothing for a single crumb, because a trail of one is noise', () => {
    const { container } = withRouter(<Breadcrumbs items={[{ label: 'Home', to: '/' }]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('has an accessible name, so it is distinguishable from the primary nav', () => {
    withRouter(<Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Current' }]} />)
    // Two unnamed navs are indistinguishable in a landmark list.
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
  })
})

describe('Icon — hidden unless it carries meaning', () => {
  it('is hidden from assistive tech by default', () => {
    // The safe default: an icon beside a text label should say nothing. Getting
    // this wrong means every decorative icon is announced.
    const { container } = render(
      <Icon>
        <Compass />
      </Icon>,
    )
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('becomes an announced image when given a label', () => {
    // An icon-only control has no other way to be named.
    render(
      <Icon label="Compass">
        <Compass />
      </Icon>,
    )
    expect(screen.getByRole('img', { name: 'Compass' })).toBeInTheDocument()
  })
})
