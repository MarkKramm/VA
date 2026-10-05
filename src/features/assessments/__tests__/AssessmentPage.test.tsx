import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../../../tests/harness.tsx'
import { MemoryStorageAdapter } from '@/app/storage/memory.ts'
import { PROGRESS_KEY } from '@/app/storage/merge.ts'
import { createInitialState } from '@domain/progress/reducer.ts'
import type { ProgressEvent, ProgressState } from '@domain/progress/types.ts'

/**
 * THE PRACTICAL ASSESSMENT LIFECYCLE (M5).
 *
 * Runs the REAL route against the REAL assessment, over the REAL progress store.
 * The invariant the milestone rests on: MARKING CRITERIA IS NOT PROGRESS. Only a
 * submission writes anything, and it writes exactly one `assessment.attempted`
 * event marked `evaluatedBy: 'self'` — because the platform has no evaluator and
 * saying otherwise would be the dishonest thing.
 */

const ASSESSMENT = 'client-file-organisation'
const ROADMAP = 'beginner-va'

/** The events that make the learner eligible: both prerequisites done, one practised. */
const eligibleEvents: readonly ProgressEvent[] = [
  {
    id: 'e1',
    at: '2026-10-05T09:00:00.000Z',
    type: 'lesson.completed',
    lessonId: 'files-and-folders',
    source: 'manual',
  },
  {
    id: 'e2',
    at: '2026-10-05T09:01:00.000Z',
    type: 'exercise.attempted',
    exerciseId: 'organise-a-client-folder-structure',
    lessonId: 'files-and-folders',
    selfChecked: true,
  },
  {
    id: 'e3',
    at: '2026-10-05T09:02:00.000Z',
    type: 'lesson.completed',
    lessonId: 'what-is-a-virtual-assistant',
    source: 'manual',
  },
]

const storageWith = (events: readonly ProgressEvent[]): MemoryStorageAdapter => {
  const adapter = new MemoryStorageAdapter()
  adapter.write(PROGRESS_KEY, { version: 1, events })
  return adapter
}

const attemptEvents = (adapter: MemoryStorageAdapter): readonly ProgressEvent[] =>
  adapter
    .read<ProgressState>(PROGRESS_KEY, createInitialState())
    .events.filter((event) => event.type === 'assessment.attempted')

/** Tick every rubric line and record the result. */
const completeAndSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
  for (const box of screen.getAllByRole('checkbox')) await user.click(box)
  await user.click(screen.getByRole('button', { name: /Record my result/i }))
}

describe('the assessment route', () => {
  it('renders a known assessment with its brief', () => {
    renderApp({ initialEntries: [`/assessments/${ASSESSMENT}`] })
    expect(
      screen.getByRole('heading', { level: 1, name: /Organise a New Client.s Shared Drive/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /The situation/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /What it has to satisfy/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /How to work through it/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /What you hand over/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /How it is judged/i })).toBeInTheDocument()
  })

  it('reaches the product’s not-found page for an unknown id', () => {
    renderApp({ initialEntries: ['/assessments/no-such-assessment'] })
    expect(screen.getByText(/That page does not exist/i)).toBeInTheDocument()
  })

  it('is reachable from the roadmap that declares it', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/roadmaps/${ROADMAP}`] })
    const link = screen.getByRole('link', { name: /Open the assessment/i })
    expect(link).toHaveAttribute('href', `/assessments/${ASSESSMENT}`)
    await user.click(link)
    expect(
      screen.getByRole('heading', { level: 1, name: /Organise a New Client/i }),
    ).toBeInTheDocument()
  })
})

describe('the gate', () => {
  it('refuses to record a result until the prerequisites are met, and says why', () => {
    renderApp({ initialEntries: [`/assessments/${ASSESSMENT}`] })
    expect(
      screen.getByRole('heading', { name: /Not ready to record a result yet/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Complete the lesson "files-and-folders" first/i)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('still shows the task while locked, because a wall is not a gate', () => {
    renderApp({ initialEntries: [`/assessments/${ASSESSMENT}`] })
    expect(screen.getByRole('heading', { name: /The situation/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /How it is judged/i })).toBeInTheDocument()
  })

  it('does not demand practice from a lesson that has nothing to practise', () => {
    // `what-is-a-virtual-assistant` declares no exercise, so completion is the
    // only requirement it can carry — otherwise the gate would be unsatisfiable.
    renderApp({
      initialEntries: [`/assessments/${ASSESSMENT}`],
      storage: storageWith(eligibleEvents),
    })
    expect(screen.queryByText(/Not ready to record a result yet/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0)
  })

  it('still demands practice from a lesson that has an exercise', () => {
    const withoutPractice = eligibleEvents.filter((event) => event.type !== 'exercise.attempted')
    renderApp({
      initialEntries: [`/assessments/${ASSESSMENT}`],
      storage: storageWith(withoutPractice),
    })
    expect(screen.getByText(/Practise at least one activity/i)).toBeInTheDocument()
  })
})

describe('submitting', () => {
  it('records nothing while the criteria are being marked', async () => {
    const user = userEvent.setup()
    const storage = storageWith(eligibleEvents)
    renderApp({ initialEntries: [`/assessments/${ASSESSMENT}`], storage })

    const boxes = screen.getAllByRole('checkbox')
    for (const box of boxes) await user.click(box)

    expect(screen.getByText(/5 of 5 criteria marked as met/i)).toBeInTheDocument()
    // The invariant: marking is not progress.
    expect(attemptEvents(storage)).toEqual([])
  })

  it('records exactly one attempt, evaluated by the learner', async () => {
    const user = userEvent.setup()
    const storage = storageWith(eligibleEvents)
    renderApp({ initialEntries: [`/assessments/${ASSESSMENT}`], storage })

    await completeAndSubmit(user)

    const events = attemptEvents(storage)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'assessment.attempted',
      assessmentId: ASSESSMENT,
      score: 5,
      maxScore: 5,
      passed: true,
      // The honest part. No automated evaluator exists, and the event says so.
      evaluatedBy: 'self',
    })
  })

  it('shows the result, and says plainly that it is a self-assessment', async () => {
    const user = userEvent.setup()
    renderApp({
      initialEntries: [`/assessments/${ASSESSMENT}`],
      storage: storageWith(eligibleEvents),
    })

    await completeAndSubmit(user)

    expect(screen.getByRole('heading', { name: /Your result/i })).toBeInTheDocument()
    expect(screen.getByText('Recorded as passed')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText(/This is a self-assessment/i)).toBeInTheDocument()
    expect(screen.getByText(/did not inspect your work/i)).toBeInTheDocument()
  })

  it('does not pass when a criterion is left unmet, and lists what is left', async () => {
    const user = userEvent.setup()
    const storage = storageWith(eligibleEvents)
    renderApp({ initialEntries: [`/assessments/${ASSESSMENT}`], storage })

    const boxes = screen.getAllByRole('checkbox')
    for (const box of boxes.slice(0, 4)) await user.click(box)
    await user.click(screen.getByRole('button', { name: /Record my result/i }))

    expect(screen.getByText('Not passed yet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Still to do/i })).toBeInTheDocument()
    expect(attemptEvents(storage)[0]).toMatchObject({ score: 4, maxScore: 5, passed: false })
  })

  it('cannot be submitted with nothing marked', () => {
    renderApp({
      initialEntries: [`/assessments/${ASSESSMENT}`],
      storage: storageWith(eligibleEvents),
    })
    expect(screen.getByRole('button', { name: /Record my result/i })).toBeDisabled()
  })

  it('does not store the learner’s work', async () => {
    const user = userEvent.setup()
    const storage = storageWith(eligibleEvents)
    renderApp({ initialEntries: [`/assessments/${ASSESSMENT}`], storage })

    await completeAndSubmit(user)

    const event = attemptEvents(storage)[0]
    expect(event).not.toHaveProperty('payload')
    expect(event).not.toHaveProperty('files')
  })
})

describe('retrying', () => {
  it('adds a second attempt and leaves the first intact', async () => {
    const user = userEvent.setup()
    const storage = storageWith(eligibleEvents)
    renderApp({ initialEntries: [`/assessments/${ASSESSMENT}`], storage })

    // A first, incomplete attempt.
    const boxes = screen.getAllByRole('checkbox')
    await user.click(boxes[0] as HTMLElement)
    await user.click(screen.getByRole('button', { name: /Record my result/i }))
    expect(attemptEvents(storage)).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: /Try again/i }))
    expect(screen.queryByRole('heading', { name: /Your result/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Record my result/i })).toBeDisabled()

    await completeAndSubmit(user)

    const events = attemptEvents(storage)
    expect(events).toHaveLength(2)
    const ids = events.map(
      (event) => (event as Extract<ProgressEvent, { type: 'assessment.attempted' }>).attemptId,
    )
    expect(new Set(ids).size).toBe(2)
    expect(events[0]).toMatchObject({ score: 1, passed: false })
    expect(events[1]).toMatchObject({ score: 5, passed: true })
  })
})

describe('the dashboard skills panel', () => {
  it('shows no skills before anything has been met', () => {
    renderApp({ initialEntries: ['/'] })
    expect(screen.getByText(/No skills yet/i)).toBeInTheDocument()
  })

  it('separates reading from demonstrating, in words', async () => {
    const storage = storageWith(eligibleEvents)
    renderApp({ initialEntries: ['/'], storage })

    // `administration-organisation` was read (files-and-folders) and practised
    // (its exercise), but nothing scored covers it yet.
    expect(screen.getByRole('heading', { name: /Your skills/i })).toBeInTheDocument()
    expect(screen.getByText('Practised')).toBeInTheDocument()
    expect(
      screen.getByText(/Only .Demonstrated. means a scored check was passed/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Demonstrated')).not.toBeInTheDocument()
  })

  it('shows a demonstrated skill once a scored check has been passed', async () => {
    const passed = [
      ...eligibleEvents,
      {
        id: 'e4',
        at: '2026-10-05T09:03:00.000Z',
        type: 'quiz.attempted',
        quizId: 'va-foundations-basics',
        attemptId: 'q1',
        score: 3,
        maxScore: 3,
        passed: true,
        evaluatedBy: 'system',
      } as ProgressEvent,
    ]
    renderApp({ initialEntries: ['/'], storage: storageWith(passed) })

    const panel = screen.getByRole('heading', { name: /Your skills/i }).closest('section')
    if (!panel) throw new Error('expected the skills section')
    // The quiz's questions cover three skills, so several badges are expected —
    // what matters is that at least one is at the top tier.
    expect(within(panel).getAllByText('Demonstrated').length).toBeGreaterThan(0)
  })
})
