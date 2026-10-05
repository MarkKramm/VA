import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { renderApp } from '../../../../tests/harness.tsx'
import { MemoryStorageAdapter } from '@/app/storage/memory.ts'
import { PROGRESS_KEY } from '@/app/storage/merge.ts'
import { createInitialState } from '@domain/progress/reducer.ts'
import type { ProgressEvent, ProgressState } from '@domain/progress/types.ts'

/**
 * QUIZ SUBMISSION, SCORING AND PERSISTED ATTEMPTS (M4.3).
 *
 * These run the REAL route against the REAL quiz — `va-foundations-basics`, three
 * questions, both question types — and the REAL progress store over a memory
 * adapter. So the thing under test is the whole path: answer → submit → score →
 * `quiz.attempted` → fold → the result the learner sees, and the same path read
 * back after a remount.
 *
 * The invariant the whole milestone rests on: AN UNSUBMITTED ANSWER IS NOT
 * PROGRESS. Only a completed submission writes anything, and it writes exactly
 * one event.
 */

const QUIZ = 'va-foundations-basics'

/** The right option in each of the three real questions. */
const RIGHT = [/keeping a client.s inbox organised/i, /confirm what the client wants/i, 'True']
/** A wrong option in each. */
const WRONG = [/Writing and shipping production software/i, /Share it with a friend/i, 'False']

const groups = () => {
  const found = screen.getAllByRole('group')
  if (found.length !== 3) throw new Error(`expected 3 questions, found ${found.length}`)
  return found as [HTMLElement, HTMLElement, HTMLElement]
}

/** Answer every question, right or wrong. */
const answerAll = async (user: UserEvent, correct: boolean) => {
  const wanted = correct ? RIGHT : WRONG
  const [first, second, third] = groups()
  for (const [group, name] of [
    [first, wanted[0]],
    [second, wanted[1]],
    [third, wanted[2]],
  ] as const) {
    await user.click(within(group).getByRole('radio', { name: name as RegExp | string }))
  }
}

const submit = async (user: UserEvent) => {
  await user.click(screen.getByRole('button', { name: /Check answers/i }))
}

const attemptEvents = (storage: MemoryStorageAdapter): readonly ProgressEvent[] =>
  storage
    .read<ProgressState>(PROGRESS_KEY, createInitialState())
    .events.filter((event) => event.type === 'quiz.attempted')

describe('nothing is scored before submission', () => {
  it('shows no result, no score and no correctness', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    await answerAll(user, true)

    expect(screen.queryByRole('heading', { name: /Your result/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Passed$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Correct answer/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Not correct/i)).not.toBeInTheDocument()
    // No percentage anywhere on the page.
    expect(document.body.textContent ?? '').not.toMatch(/\d\s?%/)
  })

  it('does not give away the explanation', () => {
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })
    expect(screen.queryByText(/administrative and organisational work/i)).not.toBeInTheDocument()
  })
})

describe('submitting a perfect attempt', () => {
  it('produces a result with score, percentage and a pass', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    await answerAll(user, true)
    await submit(user)

    expect(screen.getByRole('heading', { name: /Your result/i })).toBeInTheDocument()
    expect(screen.getByText('Passed')).toBeInTheDocument()
    expect(screen.getByText('3 of 3')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.queryByText('Not answered')).not.toBeInTheDocument()
  })

  it('marks every question correct, in words rather than colour alone', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    await answerAll(user, true)
    await submit(user)

    // Scoped to each question, because the result summary also has a "Correct"
    // figure label and an unscoped query would match it.
    for (const group of groups()) {
      expect(within(group).getByText('Correct')).toBeInTheDocument()
      expect(within(group).getByText('Correct answer')).toBeInTheDocument()
    }
  })

  it('reveals the explanation only now', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    await answerAll(user, true)
    await submit(user)

    expect(screen.getByText(/administrative and organisational work/i)).toBeInTheDocument()
  })

  it('freezes the answers, because a result is a record rather than a form', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    await answerAll(user, true)
    await submit(user)

    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
  })
})

describe('submitting a failed attempt', () => {
  it('shows the wrong answers, the right ones and a fail', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    await answerAll(user, false)
    await submit(user)

    expect(screen.getByText('Not passed')).toBeInTheDocument()
    expect(screen.getByText('0 of 3')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getAllByText('Not correct')).toHaveLength(3)
    // The correct answers become visible, which is the point of a result.
    expect(screen.getAllByText('Correct answer')).toHaveLength(3)
    expect(screen.getAllByText('Your answer')).toHaveLength(3)
  })
})

describe('persisting the attempt', () => {
  it('writes exactly one quiz.attempted event for one submission', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorageAdapter()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    await answerAll(user, true)
    await submit(user)

    const events = attemptEvents(storage)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'quiz.attempted',
      quizId: QUIZ,
      score: 3,
      maxScore: 3,
      passed: true,
      evaluatedBy: 'system',
    })
    const attemptId = (events[0] as Extract<ProgressEvent, { type: 'quiz.attempted' }>).attemptId
    expect(attemptId).toBeTypeOf('string')
    expect(attemptId.length).toBeGreaterThan(0)
  })

  it('does not store the learner’s answers', async () => {
    // The data model defines an attempt as a score against a quiz, not an answer
    // sheet. Storing answers the model does not require would put a second source
    // of truth beside the log.
    const user = userEvent.setup()
    const storage = new MemoryStorageAdapter()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    await answerAll(user, true)
    await submit(user)

    const event = attemptEvents(storage)[0]
    expect(event).not.toHaveProperty('answers')
    expect(event).not.toHaveProperty('responses')
  })

  it('writes nothing at all for a quiz that was never submitted', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorageAdapter()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    await answerAll(user, true)

    expect(attemptEvents(storage)).toEqual([])
    expect(storage.read<ProgressState>(PROGRESS_KEY, createInitialState()).events).toEqual([])
  })

  it('writes nothing when the learner navigates away mid-quiz', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorageAdapter()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    await answerAll(user, true)
    await user.click(screen.getByRole('link', { name: 'Home' }))

    expect(attemptEvents(storage)).toEqual([])
    // The dashboard's own controls, so this asserts a real navigation rather than
    // merely the absence of the quiz.
    expect(screen.getByRole('button', { name: /export progress/i })).toBeInTheDocument()
  })

  it('recovers the attempt history after a remount, from storage', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorageAdapter()
    const first = renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    await answerAll(user, true)
    await submit(user)
    first.unmount()

    renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    // The history is read back from the LOG, not from anything the first render
    // kept in memory.
    expect(screen.getByText(/Attempted once/i)).toBeInTheDocument()
    expect(screen.getByText(/best 100%/i)).toBeInTheDocument()
    // And the fresh visit is a fresh attempt: not started, nothing revealed.
    expect(screen.getByText(/0 of 3 answered/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Your result/i })).not.toBeInTheDocument()
  })
})

describe('the answer sheet is transient', () => {
  it('does not survive a remount, and does not become progress', async () => {
    // The M4.2 invariant, restated for M4.3: unsubmitted answers are not saved.
    // Only a completed submission becomes an attempt.
    const user = userEvent.setup()
    const storage = new MemoryStorageAdapter()
    const first = renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    await answerAll(user, true)
    expect(screen.getByText(/3 of 3 answered/i)).toBeInTheDocument()
    first.unmount()

    renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    expect(screen.getByText(/0 of 3 answered/i)).toBeInTheDocument()
    expect(attemptEvents(storage)).toEqual([])
  })
})

describe('retrying', () => {
  it('starts a new attempt and keeps the previous one', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorageAdapter()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    await answerAll(user, false)
    await submit(user)
    expect(attemptEvents(storage)).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: /Try again/i }))
    // Back to an unanswered form, with the result and its feedback gone.
    expect(screen.queryByRole('heading', { name: /Your result/i })).not.toBeInTheDocument()
    expect(screen.getByText(/0 of 3 answered/i)).toBeInTheDocument()
    expect(screen.queryByText(/Correct answer/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Not correct/i)).not.toBeInTheDocument()

    await answerAll(user, true)
    await submit(user)

    const events = attemptEvents(storage)
    expect(events).toHaveLength(2)
    const ids = events.map(
      (event) => (event as Extract<ProgressEvent, { type: 'quiz.attempted' }>).attemptId,
    )
    // Distinct attempts, and the earlier one was not overwritten.
    expect(new Set(ids).size).toBe(2)
    expect(events[0]).toMatchObject({ score: 0, passed: false })
    expect(events[1]).toMatchObject({ score: 3, passed: true })
  })

  it('reports the best result across attempts, deterministically', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorageAdapter()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    await answerAll(user, false)
    await submit(user)
    await user.click(screen.getByRole('button', { name: /Try again/i }))
    await answerAll(user, true)
    await submit(user)

    expect(screen.getByText(/Attempted 2 times/i)).toBeInTheDocument()
    expect(screen.getByText(/best 100%/i)).toBeInTheDocument()
    expect(attemptEvents(storage)).toHaveLength(2)
  })
})

describe('the result on a second visit', () => {
  it('keeps history visible while the quiz itself starts fresh', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorageAdapter()
    const first = renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    await answerAll(user, false)
    await submit(user)
    first.unmount()

    renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    expect(screen.getByText(/best 0%/i)).toBeInTheDocument()
    // The previous result is NOT re-shown as if it had just happened, and no
    // correct answer is revealed on an attempt that has not been submitted.
    expect(screen.queryByRole('heading', { name: /Your result/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Correct answer/i)).not.toBeInTheDocument()
  })
})
