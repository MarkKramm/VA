import { describe, expect, it } from 'vitest'
import { QuestionSchema, type Question } from '@/content/schemas/index.ts'
import { validQuestion, validTrueFalseQuestion } from '@fixtures/content.ts'
import type { AnswerMap } from '../answers.ts'
import { QUIZ_PASS_THRESHOLD, scoreQuestions } from '../score.ts'

/**
 * QUIZ SCORING (M4.3).
 *
 * The scorer is pure, so these need no DOM, no registry and no store — which is
 * the point of it being a separate seam. They cover both supported question
 * types, both outcomes, the boundaries of the pass mark, and the two ways a
 * submission can be unusable (skipped, or malformed).
 *
 * The questions are built through the REAL schema rather than cast, so a fixture
 * that stopped being valid content would fail here rather than quietly scoring a
 * shape the application cannot produce.
 */

const CHOICE_A = 'managing-an-inbox'
const CHOICE_B = 'writing-production-code'

const choice = (id: string, correctChoiceId: string): Question =>
  QuestionSchema.parse(validQuestion({ id, correctChoiceId, skills: [] }))

const trueFalse = (id: string, answer: boolean): Question =>
  QuestionSchema.parse(validTrueFalseQuestion({ id, answer, skills: [] }))

const pick = (choiceId: string): AnswerMap => ({ q1: { kind: 'choice', choiceId } })
const say = (value: boolean): AnswerMap => ({ q1: { kind: 'boolean', value } })

/** A quiz of `count` single-choice questions, all with the same right answer. */
const allCorrect = (count: number): readonly Question[] =>
  Array.from({ length: count }, (_, index) => choice(`q${index}`, CHOICE_A))

describe('single-choice questions', () => {
  it('scores a correct choice as a point', () => {
    const result = scoreQuestions([choice('q1', CHOICE_A)], pick(CHOICE_A))
    expect(result.score).toBe(1)
    expect(result.correctCount).toBe(1)
    expect(result.questions[0]?.correct).toBe(true)
  })

  it('scores a wrong choice as zero, and says it was answered', () => {
    const result = scoreQuestions([choice('q1', CHOICE_A)], pick(CHOICE_B))
    expect(result.score).toBe(0)
    expect(result.questions[0]?.answered).toBe(true)
    expect(result.questions[0]?.correct).toBe(false)
    expect(result.incorrectCount).toBe(1)
    expect(result.unanswered).toEqual([])
  })
})

describe('true/false questions', () => {
  it('scores a correct answer as a point', () => {
    const result = scoreQuestions([trueFalse('q1', true)], say(true))
    expect(result.score).toBe(1)
    expect(result.questions[0]?.correct).toBe(true)
  })

  it('scores a wrong answer as zero', () => {
    const result = scoreQuestions([trueFalse('q1', true)], say(false))
    expect(result.score).toBe(0)
    expect(result.questions[0]?.answered).toBe(true)
    expect(result.incorrectCount).toBe(1)
  })
})

describe('the whole quiz', () => {
  it('scores every question correct', () => {
    const questions = [choice('q0', CHOICE_A), choice('q1', CHOICE_A)]
    const result = scoreQuestions(questions, {
      q0: { kind: 'choice', choiceId: CHOICE_A },
      q1: { kind: 'choice', choiceId: CHOICE_A },
    })
    expect(result.score).toBe(2)
    expect(result.maxScore).toBe(2)
    expect(result.percentage).toBe(100)
    expect(result.passed).toBe(true)
    expect(result.incorrectCount).toBe(0)
  })

  it('scores every question wrong', () => {
    const questions = [choice('q0', CHOICE_A), choice('q1', CHOICE_A)]
    const result = scoreQuestions(questions, {
      q0: { kind: 'choice', choiceId: CHOICE_B },
      q1: { kind: 'choice', choiceId: CHOICE_B },
    })
    expect(result.score).toBe(0)
    expect(result.percentage).toBe(0)
    expect(result.passed).toBe(false)
    expect(result.incorrectCount).toBe(2)
  })

  it('scores a mix, with the percentage rounded', () => {
    // One of three correct is 33.33…%, which must render as 33 rather than a long
    // decimal or a rounded-up lie.
    const questions = [choice('q0', CHOICE_A), choice('q1', CHOICE_A), choice('q2', CHOICE_A)]
    const result = scoreQuestions(questions, {
      q0: { kind: 'choice', choiceId: CHOICE_A },
      q1: { kind: 'choice', choiceId: CHOICE_B },
      q2: { kind: 'choice', choiceId: CHOICE_B },
    })
    expect(result.score).toBe(1)
    expect(result.maxScore).toBe(3)
    expect(result.percentage).toBe(33)
    expect(result.correctCount).toBe(1)
    expect(result.incorrectCount).toBe(2)
    expect(result.passed).toBe(false)
  })

  it('preserves the declared question order in the result', () => {
    const questions = [choice('first', CHOICE_A), choice('second', CHOICE_A)]
    const result = scoreQuestions(questions, {})
    expect(result.questions.map((entry) => entry.questionId)).toEqual(['first', 'second'])
  })

  it('is deterministic: the same inputs always give the same result', () => {
    const questions = [choice('q0', CHOICE_A), trueFalse('q1', true)]
    const answers: AnswerMap = {
      q0: { kind: 'choice', choiceId: CHOICE_B },
      q1: { kind: 'boolean', value: true },
    }
    expect(scoreQuestions(questions, answers)).toEqual(scoreQuestions(questions, answers))
  })
})

describe('the pass mark', () => {
  it('passes at exactly the threshold and fails just below it', () => {
    // Five questions, so 4/5 is exactly 0.8 and 3/5 is below it — the boundary
    // rather than a comfortable margin.
    const questions = allCorrect(5)
    const answered = (correct: number): AnswerMap =>
      Object.fromEntries(
        questions.map((question, index) => [
          question.id,
          { kind: 'choice' as const, choiceId: index < correct ? CHOICE_A : CHOICE_B },
        ]),
      )

    expect(scoreQuestions(questions, answered(4)).passed).toBe(true)
    expect(scoreQuestions(questions, answered(3)).passed).toBe(false)
  })

  it('cannot be passed by an empty quiz', () => {
    const result = scoreQuestions([], {})
    expect(result.maxScore).toBe(0)
    expect(result.percentage).toBe(0)
    expect(result.passed).toBe(false)
  })

  it('is the documented ratio', () => {
    expect(QUIZ_PASS_THRESHOLD).toBe(0.8)
  })
})

describe('submissions that cannot be marked', () => {
  it('treats a skipped question as unanswered, not wrong', () => {
    const result = scoreQuestions([choice('q1', CHOICE_A)], {})
    expect(result.questions[0]?.answered).toBe(false)
    expect(result.questions[0]?.correct).toBe(false)
    expect(result.unanswered).toEqual(['q1'])
    // Skipped is not counted as incorrect — the two are different things to tell
    // a learner, and the UI says so.
    expect(result.incorrectCount).toBe(0)
  })

  it('treats an answer of the wrong shape as unanswered rather than throwing', () => {
    // A boolean answer to a single-choice question is not a wrong choice; it is a
    // submission the platform cannot read. It must score zero and be reported, not
    // crash the page a learner is looking at.
    const result = scoreQuestions([choice('q1', CHOICE_A)], {
      q1: { kind: 'boolean', value: true },
    })
    expect(result.questions[0]?.answered).toBe(false)
    expect(result.unanswered).toEqual(['q1'])
  })

  it('ignores an answer for a question that is not in the quiz', () => {
    const result = scoreQuestions([choice('q1', CHOICE_A)], {
      q1: { kind: 'choice', choiceId: CHOICE_A },
      'not-in-this-quiz': { kind: 'choice', choiceId: CHOICE_A },
    })
    expect(result.maxScore).toBe(1)
    expect(result.score).toBe(1)
    expect(result.questions).toHaveLength(1)
  })
})

describe('the canonical answers in the result', () => {
  it('reports the correct choice and the explanation for a single-choice question', () => {
    const result = scoreQuestions([choice('q1', CHOICE_A)], pick(CHOICE_B))
    expect(result.questions[0]?.correctChoiceId).toBe(CHOICE_A)
    expect(result.questions[0]?.correctAnswer).toBeUndefined()
    expect(result.questions[0]?.explanation).toBeTypeOf('string')
  })

  it('reports the canonical answer for a true/false question', () => {
    const result = scoreQuestions([trueFalse('q1', false)], say(true))
    expect(result.questions[0]?.correctAnswer).toBe(false)
    expect(result.questions[0]?.correctChoiceId).toBeUndefined()
  })

  it('omits the explanation when the content has none', () => {
    const withoutExplanation = QuestionSchema.parse(
      validQuestion({ id: 'q1', skills: [], explanation: undefined }),
    )
    const result = scoreQuestions([withoutExplanation], pick(CHOICE_A))
    expect(result.questions[0]?.explanation).toBeUndefined()
  })
})
