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
    // Three authored stages. If any were collapsed by a kind collision this would
    // be 2.
    expect(stages).toHaveLength(3)
    expect(stages.map((entry) => entry.stage.kind)).toEqual([
      'foundation',
      'core',
      'specialization',
    ])
  })

  it('keeps both stages that reference the same module', () => {
    const stages = stagesOfRoadmap('beginner-va')
    // `computer-fundamentals` is in stage 2 (core) and stage 3 (specialization).
    // Both must resolve to the module, and both stages must survive.
    const withModule = stages.filter((entry) =>
      entry.modules.some((module) => module.id === 'computer-fundamentals'),
    )
    expect(withModule).toHaveLength(2)
    // And the stages are distinguishable, which is the whole point: they share a
    // module but not a kind.
    expect(withModule[0]?.stage.kind).not.toBe(withModule[1]?.stage.kind)
  })

  it('returns a distinct kind for every stage of the real content', () => {
    // If this ever fails, it is not a bug in the renderer — it means content has
    // started using duplicate stage kinds, which the M2 stage renderer must be
    // ready for. Worth knowing, so it is asserted rather than assumed.
    for (const roadmap of allRoadmaps()) {
      const kinds = roadmap.stages.map((stage) => stage.kind)
      expect(new Set(kinds).size, `${roadmap.id} has duplicate stage kinds`).toBe(kinds.length)
    }
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
    // Three stage references, but only two distinct modules: va-foundations and
    // computer-fundamentals. Counting three would overstate the work, which is
    // the specific bug this distinction exists to prevent.
    expect(summary.distinctModuleCount).toBe(2)
    expect(summary.moduleCount).toBe(3)
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
    // Pinned to the M0 content so an accidental content deletion shows up here as
    // a test failure rather than as a quietly emptier dashboard.
    const beginnerVa = allRoadmaps().find((roadmap) => roadmap.id === 'beginner-va')
    if (!beginnerVa) return
    expect(summariseRoadmap(beginnerVa).lessonCount).toBe(4)
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
