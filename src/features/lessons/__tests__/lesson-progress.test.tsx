import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../../../tests/harness.tsx'
import { MemoryStorageAdapter } from '@/app/storage/memory.ts'
import { PROGRESS_KEY } from '@/app/storage/merge.ts'
import { createInitialState, foldEvents } from '@domain/progress/reducer.ts'
import { completed, practise } from '@fixtures/progress.ts'
import type { ProgressState } from '@domain/progress/types.ts'

/**
 * LESSON PROGRESS END TO END (M3).
 *
 * The real route, the real store, the real adapter — the only thing that is not
 * production is that the bytes live in memory. These protect the seam that
 * matters: UI → progress store → domain event → storage → reload → UI.
 */

const PLAIN = 'what-is-a-virtual-assistant' // no exercise
const WITH_EXERCISE = 'files-and-folders' // the lesson with the M2.4 exercise

const eventsOf = (storage: MemoryStorageAdapter) =>
  storage.read<ProgressState>(PROGRESS_KEY, createInitialState()).events

describe('lesson completion', () => {
  it('shows a not-completed state for a fresh learner', () => {
    renderApp({ initialEntries: [`/lessons/${PLAIN}`] })
    expect(screen.getByText(/you have not completed this lesson yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark lesson complete/i })).toBeInTheDocument()
  })

  it('records a manual completion when the learner marks it complete', async () => {
    const user = userEvent.setup()
    const { storage } = renderApp({ initialEntries: [`/lessons/${PLAIN}`] })

    await user.click(screen.getByRole('button', { name: /mark lesson complete/i }))

    expect(screen.getByText(/you have completed this lesson/i)).toBeInTheDocument()
    const event = eventsOf(storage).find((candidate) => candidate.type === 'lesson.completed')
    expect(event).toBeDefined()
    expect(event?.type === 'lesson.completed' ? event.source : undefined).toBe('manual')
  })

  it('restores a persisted completion on load', () => {
    const storage = new MemoryStorageAdapter()
    storage.write(PROGRESS_KEY, foldEvents([completed(PLAIN)]))

    renderApp({ initialEntries: [`/lessons/${PLAIN}`], storage })

    expect(screen.getByText(/you have completed this lesson/i)).toBeInTheDocument()
  })

  it('allows undoing a completion', async () => {
    const user = userEvent.setup()
    const { storage } = renderApp({ initialEntries: [`/lessons/${PLAIN}`] })

    await user.click(screen.getByRole('button', { name: /mark lesson complete/i }))
    await user.click(screen.getByRole('button', { name: /mark as not complete/i }))

    expect(screen.getByText(/you have not completed this lesson yet/i)).toBeInTheDocument()
    expect(eventsOf(storage).some((event) => event.type === 'lesson.uncompleted')).toBe(true)
  })

  it('does NOT complete the lesson merely because it was opened', () => {
    const { storage } = renderApp({ initialEntries: [`/lessons/${PLAIN}`] })
    const events = eventsOf(storage)
    expect(events.some((event) => event.type === 'lesson.completed')).toBe(false)
    // A view IS recorded — a different event with a different meaning.
    expect(events.some((event) => event.type === 'lesson.viewed')).toBe(true)
  })
})

describe('exercise practice', () => {
  it('records an ungraded attempt when the learner marks the exercise done', async () => {
    const user = userEvent.setup()
    const { storage } = renderApp({ initialEntries: [`/lessons/${WITH_EXERCISE}`] })

    await user.click(screen.getByRole('button', { name: /i have done this exercise/i }))

    expect(screen.getByText(/practice recorded/i)).toBeInTheDocument()
    const attempt = eventsOf(storage).find((event) => event.type === 'exercise.attempted')
    expect(attempt).toBeDefined()
    if (attempt?.type === 'exercise.attempted') {
      expect(attempt.selfChecked).toBe(true)
      expect(attempt.lessonId).toBe(WITH_EXERCISE)
    }
    // No grading anywhere on the event.
    expect(attempt).not.toHaveProperty('score')
    expect(attempt).not.toHaveProperty('passed')
  })

  it('restores a persisted practice on load', () => {
    const storage = new MemoryStorageAdapter()
    storage.write(PROGRESS_KEY, foldEvents([practise(WITH_EXERCISE)]))

    renderApp({ initialEntries: [`/lessons/${WITH_EXERCISE}`], storage })

    expect(screen.getByText(/practice recorded/i)).toBeInTheDocument()
  })
})

describe('persistence survives a remount', () => {
  it('keeps the completion after the page is re-rendered from the same storage', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorageAdapter()
    const first = renderApp({ initialEntries: [`/lessons/${PLAIN}`], storage })
    await user.click(screen.getByRole('button', { name: /mark lesson complete/i }))
    first.unmount()

    renderApp({ initialEntries: [`/lessons/${PLAIN}`], storage })
    expect(screen.getByText(/you have completed this lesson/i)).toBeInTheDocument()
  })
})
