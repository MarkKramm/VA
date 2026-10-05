import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from '../../../../tests/harness.tsx'

/**
 * Roadmap evidence links (M6).
 *
 * The content schema makes an evidence reference resolve-or-error; the app seam
 * resolves it to a link and the page renders it. This checks the full path against
 * the real curriculum so a roadmap outcome cannot quietly name evidence that a
 * learner cannot reach.
 */

describe('roadmap outcome evidence', () => {
  it('links a research outcome to its practical assessment', () => {
    renderApp({ initialEntries: ['/roadmaps/beginner-va'] })

    const link = screen.getByRole('link', {
      name: /Practical task: Produce a Verified Research Brief/i,
    })
    expect(link).toHaveAttribute('href', '/assessments/verified-research-brief')
  })

  it('links a foundation outcome to its quiz', () => {
    renderApp({ initialEntries: ['/roadmaps/beginner-va'] })

    expect(
      screen.getByRole('link', { name: /Quiz: Virtual Assistant Foundations/i }),
    ).toHaveAttribute('href', '/quizzes/va-foundations-basics')
  })

  it('links the data entry outcome to its assessment', () => {
    renderApp({ initialEntries: ['/roadmaps/data-entry-va'] })

    expect(
      screen.getByRole('link', {
        name: /Practical task: Clean and Organise a Small Client Dataset/i,
      }),
    ).toHaveAttribute('href', '/assessments/clean-and-organise-a-dataset')
  })

  it('does not invent evidence links for a roadmap outcome with no evidence', () => {
    renderApp({ initialEntries: ['/roadmaps/non-voice-va'] })

    expect(
      screen.getByRole('link', { name: /Quiz: Non-Voice Support Basics/i }),
    ).toBeInTheDocument()
    // The non-voice roadmap's "queue" outcome has a quiz; no assessment is
    // fabricated for it. The only practical assessment linked on this roadmap is
    // the final file-organisation task declared in finalAssessment.
    expect(
      screen.getByRole('link', { name: /Practical task: Organise a New Client/i }),
    ).toHaveAttribute('href', '/assessments/client-file-organisation')
  })
})
