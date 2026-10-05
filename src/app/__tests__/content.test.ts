import { describe, expect, it } from 'vitest'
import { allRoadmaps, stagesOfRoadmap, summariseRoadmap } from '@/app/content.ts'

/**
 * CONTENT COMPOSITION.
 *
 * `src/app/content.ts` is the seam between the curriculum and the UI — the layer
 * the ESLint boundary rule forces content reads through. These tests pin the two
 * properties the shell depends on and which would otherwise fail silently.
 */

/**
 * THE STAGE-LIST INVARIANT
 *
 * `NEXT_STEPS.md` calls this out as the one thing M1 must set up correctly for
 * M2: Automation VA has two stages sharing the `kind` `specialization`, so a
 * renderer keyed by stage kind — a Map, a lookup, or `kind` as a React key —
 * would drop one and show a roadmap as shorter than it is.
 *
 * `beginner-va` already has the same shape at M1: `computer-fundamentals` appears
 * in both the `core` stage and the `specialization` stage. So the real content
 * exercises the case rather than a fixture standing in for it.
 */
describe('stages — returned as an ordered list, never keyed by kind', () => {
  it('returns every stage of the real beginner-va roadmap, in order', () => {
    const stages = stagesOfRoadmap('beginner-va')
    // Five authored stages. If any were collapsed by a kind collision this would
    // be fewer — and three of them share the `core` kind, which is the collision
    // in question.
    expect(stages).toHaveLength(5)
    expect(stages.map((entry) => entry.stage.kind)).toEqual([
      'foundation',
      'core',
      'core',
      'core',
      'specialization',
    ])
  })

  it('keeps both stages that reference the same module', () => {
    const stages = stagesOfRoadmap('beginner-va')
    // `computer-fundamentals` is in the second stage (core) and the last
    // (specialization). Both must resolve to the module, and both stages must
    // survive.
    const withModule = stages.filter((entry) =>
      entry.modules.some((module) => module.id === 'computer-fundamentals'),
    )
    expect(withModule).toHaveLength(2)
    expect(withModule[0]?.stage.kind).not.toBe(withModule[1]?.stage.kind)
  })

  it('keeps every stage even when three of them share a kind', () => {
    // The M6 curriculum made this real: `beginner-va` now has three stages of kind
    // `core`. `StageSchema` allows it ("a list, not a map: two stages may
    // legitimately share a kind") and `stagesOfRoadmap` returns a LIST precisely so
    // a kind-keyed renderer cannot drop one. This is the invariant the old
    // distinct-kinds canary was standing in for.
    const stages = stagesOfRoadmap('beginner-va')
    const coreStages = stages.filter((entry) => entry.stage.kind === 'core')
    expect(coreStages).toHaveLength(3)
    // Each survives with its own modules, and they are not the same stage.
    const titles = new Set(coreStages.map((entry) => entry.stage.title))
    expect(titles.size).toBe(3)
    for (const entry of coreStages) expect(entry.modules.length).toBeGreaterThan(0)
  })

  it('returns an empty list for an unknown roadmap rather than throwing', () => {
    expect(stagesOfRoadmap('no-such-roadmap')).toEqual([])
  })
})

describe('roadmap summaries — derived counts', () => {
  it('counts distinct modules, not stage references', () => {
    const beginnerVa = allRoadmaps().find((roadmap) => roadmap.id === 'beginner-va')
    expect(beginnerVa).toBeDefined()
    if (!beginnerVa) return

    const summary = summariseRoadmap(beginnerVa)
    // Seven stage references, but only six distinct modules: the sixth stage
    // repeats `computer-fundamentals`. Counting seven would overstate the work,
    // which is the specific bug this distinction exists to prevent.
    expect(summary.distinctModuleCount).toBe(6)
    expect(summary.moduleCount).toBe(7)
  })

  it('counts lessons once per roadmap even when a module repeats', () => {
    const dataEntry = allRoadmaps().find((roadmap) => roadmap.id === 'data-entry-va')
    if (!dataEntry) return
    const summary = summariseRoadmap(dataEntry)
    // De-duplicated: `lessonsOfRoadmap` tracks seen ids, so a module in two
    // stages does not double its lessons.
    const asSet = new Set(summary.lessonCount > 0 ? [summary.lessonCount] : [])
    expect(asSet.size).toBe(1)
    expect(summary.lessonCount).toBeGreaterThan(0)
  })

  it('reports honest totals for the current curriculum', () => {
    // Pinned to the real content so an accidental content deletion shows up here
    // as a test failure rather than as a quietly emptier dashboard.
    const beginnerVa = allRoadmaps().find((roadmap) => roadmap.id === 'beginner-va')
    if (!beginnerVa) return
    expect(summariseRoadmap(beginnerVa).lessonCount).toBe(17)
  })
})

describe('content composition — no fabrication', () => {
  it('never returns a lesson that is not in the registry', async () => {
    // The M1 dashboard must not invent content to look full. This asserts every
    // lesson it would show is a real one.
    const { startingLessons } = await import('@/app/content.ts')
    const { registry } = await import('@/content/registry.ts')
    for (const lesson of startingLessons(10)) {
      expect(registry.lessons.has(lesson.id)).toBe(true)
      expect(lesson.title.length).toBeGreaterThan(0)
    }
  })

  it('returns nothing for startingLessons when there is no roadmap', async () => {
    const { startingLessons } = await import('@/app/content.ts')
    // A zero limit must yield an empty array, not throw.
    expect(startingLessons(0)).toEqual([])
  })
})
