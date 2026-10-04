import { describe, expect, it } from 'vitest'
import { QuestionSchema, QuizSchema } from '../schemas/index.ts'
import { buildRegistryFromSource, registry } from '../registry.ts'
import { getQuestion, getQuiz, questionsOfQuiz, quizzesUsingQuestion } from '../selectors.ts'
import { validateRegistry } from '../validation.ts'
import {
  leafSkill,
  rootSkill,
  validQuestion,
  validQuiz,
  validTrueFalseQuestion,
} from '@fixtures/content.ts'

/**
 * THE QUESTION AND QUIZ CONTENT ARCHITECTURE (M4.1).
 *
 * These cover the three things M4.1 actually claims: the schemas accept what they
 * should and refuse what they should, the registry treats questions and quizzes
 * as first-class collections with a derived reverse index, and the validator
 * fails closed on a broken reference. They deliberately do NOT test rendering,
 * scoring or attempts — none of that exists yet.
 *
 * The schema tests build entities directly rather than through a registry,
 * because that is the only practical way to test the INVALID cases, which are the
 * ones that matter. The registry tests use fixture content for the same reason.
 */

const QUESTION = 'va-role-core-tasks'
const QUIZ = 'va-foundations-basics'

/**
 * A registry built from fixture content, with the new collections supplied.
 *
 * Bare fixture data is wrapped as a content FILE, because that is what the build
 * pipeline hands the registry for these collections — one file per question and
 * per quiz, so a validation error can name the file to open.
 */
const asFile = (data: unknown, path: string) => ({ path, data })

const registryWith = (args: {
  questions?: readonly unknown[]
  quizzes?: readonly unknown[]
  skills?: readonly unknown[]
}) =>
  buildRegistryFromSource({
    careerPaths: [],
    skills: args.skills ?? [],
    lessons: [],
    exercises: [],
    modules: [],
    roadmaps: [],
    questions: (args.questions ?? []).map((data, index) =>
      asFile(data, `content/questions/fixture-${index}.mdx`),
    ),
    quizzes: (args.quizzes ?? []).map((data, index) =>
      asFile(data, `content/quizzes/fixture-${index}.mdx`),
    ),
  })

const referentialIssues = (built: ReturnType<typeof registryWith>) =>
  validateRegistry(built).issues.filter((issue) => issue.rule === 'referential-integrity')

describe('the question schema', () => {
  it('accepts a single-choice question and defaults the optional collections', () => {
    const { skills: _skills, ...withoutSkills } = validQuestion()
    const parsed = QuestionSchema.parse(withoutSkills)
    expect(parsed.type).toBe('single-choice')
    expect(parsed.skills).toEqual([])
    expect(parsed.deprecatedIds).toEqual([])
  })

  it('accepts a true/false question', () => {
    const parsed = QuestionSchema.parse(validTrueFalseQuestion())
    expect(parsed.type).toBe('true-false')
    if (parsed.type === 'true-false') expect(parsed.answer).toBe(true)
  })

  it('rejects a type that is not in the union', () => {
    // The initial scope is two types on purpose. A future `multi-select` is a new
    // variant, not a widening of an existing one — and until it exists it is
    // refused rather than silently accepted as an untyped object.
    expect(QuestionSchema.safeParse({ ...validQuestion(), type: 'multi-select' }).success).toBe(
      false,
    )
  })

  it('rejects a correct answer that names no choice', () => {
    const result = QuestionSchema.safeParse(validQuestion({ correctChoiceId: 'no-such-choice' }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('choices[]'))).toBe(true)
    }
  })

  it('rejects duplicate choice ids', () => {
    const result = QuestionSchema.safeParse(
      validQuestion({
        choices: [
          { id: 'same', text: 'First option' },
          { id: 'same', text: 'Second option' },
        ],
        correctChoiceId: 'same',
      }),
    )
    expect(result.success).toBe(false)
  })

  it('requires at least two choices', () => {
    expect(
      QuestionSchema.safeParse(
        validQuestion({ choices: [{ id: 'only', text: 'One' }], correctChoiceId: 'only' }),
      ).success,
    ).toBe(false)
  })

  it('requires a prompt and a stable id', () => {
    const { prompt: _prompt, ...withoutPrompt } = validQuestion()
    expect(QuestionSchema.safeParse(withoutPrompt).success).toBe(false)
    expect(QuestionSchema.safeParse(validQuestion({ id: 'Not A Slug' })).success).toBe(false)
  })

  it('preserves deprecatedIds, like every other entity', () => {
    // The field is carried for parity. Nothing RESOLVES it yet — the project has
    // no alias-resolution mechanism at all — so this only pins the contract.
    const parsed = QuestionSchema.parse(validQuestion({ deprecatedIds: ['old-question-id'] }))
    expect(parsed.deprecatedIds).toEqual(['old-question-id'])
  })

  it('drops an unknown field rather than storing it', () => {
    // Scoring is M4.3. Zod strips unknown keys, so a `points` field cannot be
    // staged in content before there is a decision about what it means.
    const parsed = QuestionSchema.parse(validQuestion({ points: 5 }))
    expect(parsed).not.toHaveProperty('points')
  })
})

describe('the quiz schema', () => {
  it('accepts a quiz and defaults deprecatedIds', () => {
    const parsed = QuizSchema.parse(validQuiz())
    expect(parsed.questionIds).toEqual(['what-does-a-va-do'])
    expect(parsed.deprecatedIds).toEqual([])
  })

  it('rejects an empty quiz', () => {
    // A quiz with no questions is not a quiz, so this is a schema failure rather
    // than a warning.
    expect(QuizSchema.safeParse(validQuiz({ questionIds: [] })).success).toBe(false)
  })

  it('rejects a repeated question reference', () => {
    const result = QuizSchema.safeParse(validQuiz({ questionIds: ['q-one', 'q-one'] }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('at most once'))).toBe(true)
    }
  })

  it('requires a title and a summary', () => {
    const { title: _title, ...withoutTitle } = validQuiz()
    expect(QuizSchema.safeParse(withoutTitle).success).toBe(false)
    const { summary: _summary, ...withoutSummary } = validQuiz()
    expect(QuizSchema.safeParse(withoutSummary).success).toBe(false)
  })

  it('does not carry a scoring field', () => {
    const parsed = QuizSchema.parse(validQuiz({ passMark: 80 }))
    expect(parsed).not.toHaveProperty('passMark')
  })
})

describe('quiz → question references through the registry', () => {
  it('resolves a quiz to its questions in the DECLARED order', () => {
    const built = registryWith({
      questions: [
        validQuestion({ id: 'second', skills: [] }),
        validQuestion({ id: 'first', skills: [] }),
      ],
      quizzes: [validQuiz({ questionIds: ['second', 'first'] })],
    })
    // The array order is the order asked. Nothing sorts it on the way in.
    expect(questionsOfQuiz(built, 'cleaning-basics').map((question) => question.id)).toEqual([
      'second',
      'first',
    ])
  })

  it('records which quizzes ask a question, so a question is genuinely reusable', () => {
    const built = registryWith({
      questions: [validQuestion({ skills: [] }), validQuestion({ id: 'another', skills: [] })],
      quizzes: [
        validQuiz({ id: 'quiz-a', questionIds: ['what-does-a-va-do', 'another'] }),
        validQuiz({ id: 'quiz-b', questionIds: ['what-does-a-va-do'] }),
      ],
    })
    expect(quizzesUsingQuestion(built, 'what-does-a-va-do').map((quiz) => quiz.id)).toEqual([
      'quiz-a',
      'quiz-b',
    ])
    expect(quizzesUsingQuestion(built, 'another').map((quiz) => quiz.id)).toEqual(['quiz-a'])
  })

  it('fails referential integrity when a quiz names a question that does not exist', () => {
    const built = registryWith({ quizzes: [validQuiz({ questionIds: ['does-not-exist'] })] })
    const issues = referentialIssues(built)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.entity).toBe('quiz')
    expect(issues[0]?.message).toContain('does-not-exist')
    expect(issues[0]?.path).toContain('content/quizzes/')
  })

  it('fails when the question bank is absent entirely', () => {
    // Omitting the collection is not a way to skip the reference.
    const built = registryWith({ quizzes: [validQuiz()] })
    expect(referentialIssues(built).length).toBeGreaterThan(0)
  })

  it('passes when every reference resolves', () => {
    const built = registryWith({
      skills: [rootSkill(), leafSkill()],
      questions: [validQuestion()],
      quizzes: [validQuiz()],
    })
    expect(referentialIssues(built)).toEqual([])
  })

  it('fails when a question names a skill that does not exist', () => {
    const built = registryWith({ questions: [validQuestion()], quizzes: [validQuiz()] })
    const questionIssues = validateRegistry(built).issues.filter(
      (issue) => issue.entity === 'question',
    )
    expect(questionIssues.some((issue) => issue.message.includes('data-cleaning'))).toBe(true)
  })
})

describe('duplicate ids across the new collections', () => {
  it('detects a duplicate question id', () => {
    const built = registryWith({ questions: [validQuestion(), validQuestion()] })
    const issues = validateRegistry(built).issues.filter((issue) => issue.rule === 'duplicate-id')
    expect(issues).toHaveLength(1)
    expect(issues[0]?.entity).toBe('question')
  })

  it('detects a duplicate quiz id', () => {
    const built = registryWith({ quizzes: [validQuiz(), validQuiz()] })
    const issues = validateRegistry(built).issues.filter((issue) => issue.rule === 'duplicate-id')
    expect(issues).toHaveLength(1)
    expect(issues[0]?.entity).toBe('quiz')
  })
})

describe('the real question bank and quiz', () => {
  it('is discovered through the normal registry', () => {
    expect(getQuestion(registry, QUESTION)).toBeDefined()
    expect(getQuiz(registry, QUIZ)).toBeDefined()
  })

  it('exposes both initial question types', () => {
    const types = new Set([...registry.questions.values()].map((question) => question.type))
    expect(types).toEqual(new Set(['single-choice', 'true-false']))
  })

  it('connects the quiz to its questions, in order', () => {
    expect(questionsOfQuiz(registry, QUIZ).map((question) => question.id)).toEqual([
      'va-role-core-tasks',
      'client-data-handling',
      'confirm-deadline-before-starting',
    ])
  })

  it('leaves questions and quizzes out of pendingCollections', () => {
    expect(registry.pendingCollections).not.toContain('questions')
    expect(registry.pendingCollections).not.toContain('quizzes')
  })

  it('validates with no errors, so the existing M0–M3 content is still valid', () => {
    expect(validateRegistry(registry).errors).toBe(0)
  })

  it('reads the validated entity itself — there is no second registry or view copy', () => {
    expect(registry.questions.get(QUESTION)).toBe(getQuestion(registry, QUESTION))
    expect(registry.quizzes.get(QUIZ)).toBe(getQuiz(registry, QUIZ))
  })

  it('is plain data: every question and quiz round-trips through JSON', () => {
    // Content, not code. A function, a class instance or a rendered element would
    // not survive this, which is what proves nothing presentational leaked in and
    // that the data is serializable for the build pipeline.
    for (const entity of [...registry.questions.values(), ...registry.quizzes.values()]) {
      expect(JSON.parse(JSON.stringify(entity))).toEqual(entity)
    }
  })

  it('names the source file of a malformed question, so an error is actionable', () => {
    // The payoff of one file per entity: the issue points at the file to open,
    // rather than at a line inside a shared bank.
    const built = buildRegistryFromSource({
      careerPaths: [],
      skills: [],
      lessons: [],
      exercises: [],
      modules: [],
      roadmaps: [],
      questions: [
        {
          path: 'content/questions/x/broken.mdx',
          data: { ...validQuestion(), prompt: 'short' },
        },
      ],
    })
    const issues = validateRegistry(built).issues.filter((issue) => issue.rule === 'schema')
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0]?.path).toBe('content/questions/x/broken.mdx')
  })
})
