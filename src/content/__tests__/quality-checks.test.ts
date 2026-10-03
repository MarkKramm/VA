import { describe, expect, it } from 'vitest'
import { buildRegistryFromSource } from '../registry.ts'
import { runQualityChecks } from '../quality-checks.ts'
import type { CompiledBody } from '@content/mdx/tree.ts'
import { validExercise, validLesson, validSkill } from '../../../tests/fixtures/content.ts'

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

/**
 * COMPILED PROSE IS INSPECTED (pre-M3 hardening, F3).
 *
 * Before this pass the scanned text was `summary + objectives`, so a claim in the
 * lesson or exercise BODY was invisible to the gate. These tests build a registry
 * with a hand-made compiled tree — the same `CompiledBody` shape the build
 * produces — and assert the previously-missed case now fails.
 *
 * The trees are written by hand rather than compiled so the test isolates the
 * QUALITY CHECK, not the compiler.
 */

/** A compiled body containing one paragraph of prose. */
const proseBody = (text: string): CompiledBody => [
  { kind: 'element', tag: 'p', props: {}, children: [{ kind: 'text', value: text }] },
]

/** A registry built from fixture entities with compiled bodies attached by path. */
const registryWithProse = (args: {
  lessons?: readonly { path: string; data: unknown; body?: CompiledBody }[]
  exercises?: readonly { path: string; data: unknown; body?: CompiledBody }[]
}) => {
  const bodies = new Map<string, CompiledBody>()
  for (const entry of [...(args.lessons ?? []), ...(args.exercises ?? [])]) {
    if (entry.body) bodies.set(entry.path, entry.body)
  }
  return buildRegistryFromSource({
    careerPaths: [],
    skills: [validSkill({ id: 'data', parent: undefined })],
    lessons: (args.lessons ?? []).map(({ path, data }) => ({ path, data })),
    exercises: (args.exercises ?? []).map(({ path, data }) => ({ path, data })),
    modules: [],
    roadmaps: [],
    bodies,
  })
}

describe('compiled lesson prose is inspected (F3)', () => {
  const lessonWith = (body: CompiledBody) =>
    registryWithProse({
      lessons: [
        {
          path: 'content/lessons/x/body-claim.mdx',
          data: validLesson({
            summary: 'A plain summary with no figures in it.',
            objectives: ['Do the thing'],
          }),
          body,
        },
      ],
    })

  it('flags a numeric claim that appears ONLY in the compiled body', () => {
    // The regression: this claim is absent from summary/objectives, so the old
    // gate never saw it.
    const issues = runQualityChecks(lessonWith(proseBody('Most VAs charge $30 per hour for this.')))
    expect(issues.some((i) => i.rule === 'quality/numeric-claim' && i.entity === 'lesson')).toBe(
      true,
    )
  })

  it('flags guarantee language that appears ONLY in the compiled body', () => {
    const issues = runQualityChecks(lessonWith(proseBody('This is guaranteed to get you hired.')))
    expect(issues.some((i) => i.rule === 'quality/language' && i.entity === 'lesson')).toBe(true)
  })

  it('does not treat element names or attribute values as prose', () => {
    // A URL containing "50-percent" and a component prop that looks like a claim
    // must NOT be scanned: only text nodes are prose. Folding props in would make
    // the gate noisy without catching anything a learner reads.
    const body: CompiledBody = [
      {
        kind: 'element',
        tag: 'a',
        props: { href: 'https://example.com/50-percent' },
        children: [{ kind: 'text', value: 'a link' }],
      },
      { kind: 'component', name: 'Callout', props: { title: 'earn $5000' }, children: [] },
    ]
    const issues = runQualityChecks(lessonWith(body))
    expect(issues.some((i) => i.rule === 'quality/numeric-claim')).toBe(false)
    expect(issues.some((i) => i.rule === 'quality/language')).toBe(false)
  })

  it('still passes a body with no claims', () => {
    const issues = runQualityChecks(lessonWith(proseBody('Create four folders and three files.')))
    expect(issues.some((i) => i.rule === 'quality/numeric-claim')).toBe(false)
    expect(issues.some((i) => i.rule === 'quality/language')).toBe(false)
  })
})

describe('compiled exercise prose is inspected (F3)', () => {
  const exerciseWith = (body: CompiledBody) =>
    registryWithProse({
      exercises: [
        {
          path: 'content/exercises/x/claim.mdx',
          data: validExercise({
            summary: 'A plain summary with no figures in it.',
            deliverable: 'Produce the thing described above.',
            selfCheck: ['The thing is done'],
          }),
          body,
        },
      ],
    })

  it('flags a numeric claim that appears ONLY in the compiled exercise body', () => {
    const issues = runQualityChecks(exerciseWith(proseBody('Charge the client $25 an hour.')))
    expect(issues.some((i) => i.rule === 'quality/numeric-claim' && i.entity === 'exercise')).toBe(
      true,
    )
  })

  it('flags guarantee language in the exercise prose', () => {
    const issues = runQualityChecks(exerciseWith(proseBody('A risk-free way to win clients.')))
    expect(issues.some((i) => i.rule === 'quality/language' && i.entity === 'exercise')).toBe(true)
  })

  it('passes a clean exercise, so the new checks are not noisy', () => {
    const issues = runQualityChecks(exerciseWith(proseBody('Create four folders and three files.')))
    expect(issues.filter((i) => i.entity === 'exercise')).toEqual([])
  })
})
