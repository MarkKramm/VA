import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../../../tests/harness.tsx'
import { MemoryStorageAdapter } from '@/app/storage/memory.ts'
import { PROGRESS_KEY } from '@/app/storage/merge.ts'
import { foldEvents } from '@domain/progress/reducer.ts'
import { completed, viewed } from '@fixtures/progress.ts'

/**
 * DASHBOARD PROGRESS (M3).
 *
 * What a learner sees on the landing page: an honest empty state before they have
 * done anything, and real state afterwards. Both matter — a dashboard that shows
 * a 0% bar to a brand-new learner implies tracking that has noticed them doing
 * nothing.
 */

const LESSON = 'what-is-a-virtual-assistant'

const withProgress = (events: Parameters<typeof foldEvents>[0]): MemoryStorageAdapter => {
  const storage = new MemoryStorageAdapter()
  storage.write(PROGRESS_KEY, foldEvents(events))
  return storage
}

describe('dashboard — a brand-new learner', () => {
  it('shows an honest empty state, not a 0% bar', () => {
    renderApp({ initialEntries: ['/'] })
    expect(screen.getByText(/no progress to show yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('still offers export and import, so a backup can be restored', () => {
    renderApp({ initialEntries: ['/'] })
    expect(screen.getByRole('button', { name: /export progress/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import progress/i })).toBeInTheDocument()
  })
})

describe('dashboard — real progress', () => {
  it('shows completed lessons and a progress bar once there are events', () => {
    renderApp({ initialEntries: ['/'], storage: withProgress([completed(LESSON)]) })

    // The overall bar states the count in words; a roadmap bar states it too.
    expect(screen.getAllByText(/1 of 4 lessons complete/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/lessons completed/i)).toBeInTheDocument()
    expect(screen.queryByText(/no progress to show yet/i)).not.toBeInTheDocument()
  })

  it('offers to continue a lesson that was opened but not completed', () => {
    renderApp({ initialEntries: ['/'], storage: withProgress([viewed(LESSON)]) })
    expect(screen.getByText(/continue learning/i)).toBeInTheDocument()
  })

  it('does not offer to continue a lesson that is complete', () => {
    renderApp({
      initialEntries: ['/'],
      storage: withProgress([viewed(LESSON), completed(LESSON)]),
    })
    expect(screen.queryByText(/continue learning/i)).not.toBeInTheDocument()
  })
})

describe('dashboard — export feedback', () => {
  it('confirms the export in words', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: ['/'] })

    await user.click(screen.getByRole('button', { name: /export progress/i }))

    // The download itself is a browser API that no-ops under jsdom; the learner-
    // facing confirmation is what is asserted here.
    expect(screen.getByText(/progress exported/i)).toBeInTheDocument()
  })
})
