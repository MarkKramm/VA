import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, renderWithTheme } from '../../../../tests/harness.tsx'
import { quizContext, type QuizQuestionView } from '@/app/content.ts'
import { MemoryStorageAdapter } from '@/app/storage/memory.ts'
import { PROGRESS_KEY } from '@/app/storage/merge.ts'
import { createInitialState } from '@domain/progress/reducer.ts'
import type { ProgressState } from '@domain/progress/types.ts'
import { QuestionCard } from '../QuestionCard.tsx'

/**
 * THE QUIZ RENDERER (M4.2).
 *
 * These run against the REAL quiz — `va-foundations-basics`, three questions,
 * both initial types — through the real route, because the properties that
 * matter are about content and routing, not about a fixture written to match the
 * component. Fixtures appear only where an edge case has no real content: an
 * unknown question type, and an unknown quiz id.
 *
 * What is deliberately NOT tested here: scoring, attempts and persistence,
 * because none of them exist. Test 10 asserts their ABSENCE, which is the
 * honest form of that test at M4.2.
 */

const QUIZ = 'va-foundations-basics'

const PROMPT_1 = /core virtual assistant responsibility/i
const PROMPT_2 = /A client sends you a spreadsheet/i
const PROMPT_3 = /confirm a task.s deadline and scope/i

const CHOICE_A = /keeping a client.s inbox organised/i
const CHOICE_B = /Writing and shipping production software/i

/** The progress events a run wrote, if any. M4.2 must write none. */
const eventsOf = (storage: MemoryStorageAdapter) =>
  storage.read<ProgressState>(PROGRESS_KEY, createInitialState()).events

describe('the quiz route', () => {
  it('renders a known quiz', () => {
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Virtual Assistant Foundations' }),
    ).toBeInTheDocument()
  })

  it('renders the quiz metadata', () => {
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })
    expect(screen.getByText(/A short check on what the work involves/i)).toBeInTheDocument()
    expect(screen.getByText('3 questions')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Your answers/i })).toBeInTheDocument()
  })

  it('reaches the product’s not-found page for an unknown quiz id', () => {
    renderApp({ initialEntries: ['/quizzes/no-such-quiz'] })
    expect(screen.getByText(/That page does not exist/i)).toBeInTheDocument()
    // Inside the shell, not a bare error page: the way out is still there.
    expect(screen.getByRole('link', { name: /Go to the dashboard/i })).toBeInTheDocument()
  })

  it('renders the questions in the quiz’s DECLARED order', () => {
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    const groups = screen.getAllByRole('group')
    expect(groups).toHaveLength(3)

    // A fieldset is named by its legend, which carries the position and the prompt.
    expect(groups[0]).toHaveAccessibleName(/Question 1 of 3/)
    expect(groups[0]).toHaveAccessibleName(PROMPT_1)
    expect(groups[1]).toHaveAccessibleName(/Question 2 of 3/)
    expect(groups[1]).toHaveAccessibleName(PROMPT_2)
    expect(groups[2]).toHaveAccessibleName(/Question 3 of 3/)
    expect(groups[2]).toHaveAccessibleName(PROMPT_3)
  })
})

describe('answering a single-choice question', () => {
  it('selects exactly one option', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    await user.click(screen.getByRole('radio', { name: CHOICE_A }))

    expect(screen.getByRole('radio', { name: CHOICE_A })).toBeChecked()
  })

  it('replaces the previous selection rather than adding to it', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    await user.click(screen.getByRole('radio', { name: CHOICE_A }))
    await user.click(screen.getByRole('radio', { name: CHOICE_B }))

    expect(screen.getByRole('radio', { name: CHOICE_B })).toBeChecked()
    expect(screen.getByRole('radio', { name: CHOICE_A })).not.toBeChecked()
    // One answer, not two — the count is the proof that it replaced.
    expect(screen.getByText(/1 of 3 answered/i)).toBeInTheDocument()
  })
})

describe('answering a true/false question', () => {
  it('offers exactly two options and records the choice', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    const third = screen.getAllByRole('group')[2]
    if (!third) throw new Error('expected a third question')
    const options = within(third).getAllByRole('radio')
    expect(options.map((option) => option.getAttribute('value'))).toEqual(['true', 'false'])

    await user.click(within(third).getByRole('radio', { name: 'True' }))
    expect(within(third).getByRole('radio', { name: 'True' })).toBeChecked()
  })
})

describe('the answer state', () => {
  it('keeps every answer as the learner moves between questions', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })
    const [first, second, third] = screen.getAllByRole('group')
    if (!first || !second || !third) throw new Error('expected three questions')

    await user.click(within(first).getByRole('radio', { name: CHOICE_A }))
    await user.click(within(third).getByRole('radio', { name: 'True' }))
    await user.click(within(second).getByRole('radio', { name: /confirm what the client wants/i }))

    // All three survive, in the order they were answered — nothing resets.
    expect(within(first).getByRole('radio', { name: CHOICE_A })).toBeChecked()
    expect(within(third).getByRole('radio', { name: 'True' })).toBeChecked()
    expect(
      within(second).getByRole('radio', { name: /confirm what the client wants/i }),
    ).toBeChecked()
    expect(screen.getByText(/3 of 3 answered/i)).toBeInTheDocument()
  })

  it('reports what is still unanswered', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    expect(screen.getByText(/0 of 3 answered/i)).toBeInTheDocument()
    expect(screen.getByText(/3 questions still to answer/i)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: CHOICE_A }))

    expect(screen.getByText(/1 of 3 answered/i)).toBeInTheDocument()
    expect(screen.getByText(/2 questions still to answer/i)).toBeInTheDocument()
  })

  it('names the selected state in words, not only in colour', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })
    const first = screen.getAllByRole('group')[0]
    if (!first) throw new Error('expected a first question')

    expect(within(first).queryByText('Answered')).not.toBeInTheDocument()
    await user.click(within(first).getByRole('radio', { name: CHOICE_A }))
    expect(within(first).getByText('Answered')).toBeInTheDocument()
  })
})

describe('keyboard operation', () => {
  it('groups each question’s options separately, so arrow keys move within one question', () => {
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    const radios = screen.getAllByRole('radio')
    const names = new Set(radios.map((radio) => radio.getAttribute('name')))
    // Four single-choice options twice, plus true/false: three groups, not one.
    expect(names).toEqual(
      new Set([
        'question-va-role-core-tasks',
        'question-client-data-handling',
        'question-confirm-deadline-before-starting',
      ]),
    )
    // Every option is focusable and enabled, which is what the browser's own
    // arrow-key navigation between radios requires. jsdom does not implement that
    // navigation, so this asserts the structure it depends on.
    for (const radio of radios) expect(radio).toBeEnabled()
  })

  it('activates a focused option with the keyboard', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    const option = screen.getByRole('radio', { name: CHOICE_A })
    option.focus()
    expect(option).toHaveFocus()

    await user.keyboard(' ')
    expect(option).toBeChecked()
  })
})

describe('the completion control', () => {
  it('stays disabled until every question has an answer', async () => {
    const user = userEvent.setup()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })

    const button = screen.getByRole('button', { name: /Check answers/i })
    expect(button).toBeDisabled()

    for (const group of screen.getAllByRole('group')) {
      const [firstOption] = within(group).getAllByRole('radio')
      if (firstOption) await user.click(firstOption)
    }

    expect(screen.getByRole('button', { name: /Check answers/i })).toBeEnabled()
  })

  it('does not score, grade or save anything', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorageAdapter()
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`], storage })

    for (const group of screen.getAllByRole('group')) {
      const [firstOption] = within(group).getAllByRole('radio')
      if (firstOption) await user.click(firstOption)
    }
    await user.click(screen.getByRole('button', { name: /Check answers/i }))

    // It says what it does not do, rather than implying a result was recorded.
    expect(screen.getByText(/Nothing is scored or saved yet/i)).toBeInTheDocument()
    // No score, no percentage, no pass/fail anywhere on the page.
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\bscore\b|\bpassed\b|\bfailed\b|\d\s?%/i)
    // And nothing was written to progress: no event, so no attempt.
    expect(eventsOf(storage)).toEqual([])
  })
})

describe('the correct answers', () => {
  it('are not given to the renderer at all', () => {
    // The structural guarantee: the view has no field to leak, so a component
    // cannot reveal the answer even by accident.
    const context = quizContext(QUIZ)
    expect(context?.questions).toHaveLength(3)
    for (const question of context?.questions ?? []) {
      expect(question).not.toHaveProperty('correctChoiceId')
      expect(question).not.toHaveProperty('answer')
      expect(question).not.toHaveProperty('explanation')
    }
  })

  it('are not revealed by anything the page renders', () => {
    renderApp({ initialEntries: [`/quizzes/${QUIZ}`] })
    expect(screen.queryByText(/correct answer/i)).not.toBeInTheDocument()
    expect(document.body.innerHTML).not.toMatch(/correctChoiceId/)
  })
})

describe('a question type this build cannot render', () => {
  it('fails safely instead of drawing the wrong control', () => {
    // Only reachable by a future content type, which the schema rejects today —
    // so this is the defensive path, exercised directly.
    const unknown = {
      type: 'multiple-select',
      id: 'future-question',
      prompt: 'Select every option that applies.',
    } as unknown as QuizQuestionView

    renderWithTheme(
      <QuestionCard
        question={unknown}
        position={1}
        total={1}
        answer={undefined}
        onAnswer={() => {}}
      />,
    )

    expect(screen.getByText(/cannot show yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })
})
