import { describe, expect, it } from 'vitest'
import { buildRegistryFromSource } from '../registry.ts'
import { runQualityChecks } from '../quality-checks.ts'
import { validLesson, validSkill } from '../../../tests/fixtures/content.ts'

/**
 * Quality checks are the mechanical half of content governance. The judgement
 * half lives in docs/CONTENT_GUIDELINES.md and cannot be automated — but the
 * failure modes tested here are exactly what an AI agent generating content in
 * parallel produces reliably.
 */

const rulesFor = (lessons: unknown[]): string[] => {
  const registry = buildRegistryFromSource({
    careerPaths: [],
    skills: [validSkill({ id: 'data', parent: undefined })],
    lessons: lessons.map((data) => ({ path: 'content/test.mdx', data })),
    modules: [],
    roadmaps: [],
  })
  return runQualityChecks(registry).map((issue) => issue.rule)
}

describe('forbidden guarantee language', () => {
  it.each([
    ['This is guaranteed to work', /guarantee/i],
    ['We will get you hired in six months', /hired/i],
    ['You can earn $2,000 per month', /earn \$/i],
    ['Build passive income while you sleep', /passive income/i],
    ['A risk-free way to start', /risk[- ]free/i],
  ])('flags %j', (summary) => {
    const rules = rulesFor([validLesson({ summary, objectives: ['Understand the basics'] })])
    expect(rules).toContain('quality/language')
  })

  it('does not flag honest, hedged phrasing', () => {
    const rules = rulesFor([
      validLesson({
        summary:
          'Rates vary widely by specialisation, client size and country, so treat any figure as an estimate.',
        objectives: ['Understand why rates vary'],
      }),
    ])
    expect(rules).not.toContain('quality/language')
  })
})

describe('numeric claims without a citation', () => {
  it('flags a currency amount with no resource', () => {
    const rules = rulesFor([
      validLesson({
        summary: 'Most VAs charge between $15 and $40 per hour.',
        objectives: ['Know the range'],
      }),
    ])
    expect(rules).toContain('quality/numeric-claim')
  })

  it('flags a percentage with no resource', () => {
    const rules = rulesFor([
      validLesson({
        summary: 'Roughly 60% of client work happens over email.',
        objectives: ['Know the channel mix'],
      }),
    ])
    expect(rules).toContain('quality/numeric-claim')
  })

  it('does not flag a numeric claim that cites a resource', () => {
    const rules = rulesFor([
      validLesson({
        summary: 'Industry surveys put typical entry rates between $15 and $40 per hour.',
        objectives: ['Know the range'],
        resources: ['some-source'],
      }),
    ])
    expect(rules).not.toContain('quality/numeric-claim')
  })

  it('is a warning, not an error — a human still has to look', () => {
    const registry = buildRegistryFromSource({
      careerPaths: [],
      skills: [validSkill({ id: 'data', parent: undefined })],
      lessons: [
        { path: 'content/test.mdx', data: validLesson({ summary: 'VAs earn $30 an hour.' }) },
      ],
      modules: [],
      roadmaps: [],
    })
    expect(runQualityChecks(registry).every((issue) => issue.severity === 'warning')).toBe(true)
  })
})

describe('generic titles', () => {
  it.each(['Introduction', 'Overview', 'Getting Started', 'Lesson 4', 'Untitled'])(
    'flags %j',
    (title) => {
      expect(rulesFor([validLesson({ title })])).toContain('quality/generic-title')
    },
  )

  it('does not flag a real title', () => {
    expect(rulesFor([validLesson({ title: 'What Is a Virtual Assistant?' })])).not.toContain(
      'quality/generic-title',
    )
  })
})

describe('every lesson must reach practice', () => {
  it('flags a lesson with no exercise, quiz or lab', () => {
    // This is the strongest structural guarantee that the platform teaches rather
    // than hosts articles: a lesson a learner only reads is a content page.
    const rules = rulesFor([validLesson({ exercises: [], quiz: undefined, lab: undefined })])
    expect(rules).toContain('quality/no-practice')
  })

  it('accepts a lesson with an exercise', () => {
    expect(rulesFor([validLesson({ exercises: ['ex-1'] })])).not.toContain('quality/no-practice')
  })

  it('accepts a lesson with a lab but no exercise', () => {
    expect(rulesFor([validLesson({ exercises: [], quiz: undefined, lab: 'lab-1' })])).not.toContain(
      'quality/no-practice',
    )
  })
})

describe('duplicate and near-duplicate lessons', () => {
  it('flags two lessons with the same title', () => {
    const rules = rulesFor([validLesson({ id: 'lesson-one' }), validLesson({ id: 'lesson-two' })])
    expect(rules).toContain('quality/duplicate')
  })

  it('flags two lessons with the same summary but different titles', () => {
    const rules = rulesFor([
      validLesson({ id: 'lesson-one', title: 'First Title Here' }),
      validLesson({ id: 'lesson-two', title: 'Second Title Here' }),
    ])
    expect(rules).toContain('quality/duplicate')
  })

  it('does not flag genuinely different lessons', () => {
    const rules = rulesFor([
      validLesson({ id: 'files-and-folders', title: 'Files and Folders That Stay Organised' }),
      validLesson({
        id: 'browser-basics',
        title: 'Browser Basics for Everyday Work',
        summary: 'The browser habits that make web work faster and safer.',
      }),
    ])
    expect(rules).not.toContain('quality/duplicate')
  })
})

describe('objectives', () => {
  it('flags a single objective that merely restates the title', () => {
    const rules = rulesFor([
      validLesson({ title: 'Data Cleaning Basics', objectives: ['Data cleaning basics'] }),
    ])
    expect(rules).toContain('quality/objective-restates-title')
  })

  it('accepts behavioural objectives', () => {
    const rules = rulesFor([
      validLesson({ objectives: ['Remove duplicate rows from a spreadsheet'] }),
    ])
    expect(rules).not.toContain('quality/objective-restates-title')
  })
})

describe('the real M0 content', () => {
  it('passes every check except the expected "no practice yet" warnings', async () => {
    const { registry } = await import('../registry.ts')
    const issues = runQualityChecks(registry)
    const unexpected = issues.filter(
      (issue) => !['quality/no-practice', 'quality/numeric-claim'].includes(issue.rule),
    )
    expect(
      unexpected,
      unexpected.map((i) => `${i.path} ${i.field}: ${i.message}`).join('\n'),
    ).toEqual([])
  })
})
