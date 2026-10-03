import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { buildRegistryFromSource } from '../registry.ts'
import { validateRegistry } from '../validation.ts'
import {
  leafSkill,
  rootSkill,
  validCareerPath,
  validExercise,
  validLesson,
  validModule,
  validRoadmap,
} from '@fixtures/content.ts'

/**
 * THE VALIDATION GATE (M2).
 *
 * `npm run content:check` is the step in `npm run check` that turns invalid
 * content into a non-zero exit code. Everything else about validation — which
 * rules exist, what they name — is covered by `validation.test.ts` and
 * `duplicate-ids.test.ts`.
 *
 * What is NOT covered anywhere else is the CONTRACT ITSELF: that a registry with
 * errors makes the gate fail, and that a registry without errors makes it pass.
 * That contract is the whole reason the validator exists, and it is the kind of
 * wiring that breaks silently — a script that always exits 0 would pass every
 * rule test in this suite while letting broken content ship.
 *
 * Two halves:
 *
 *   1. A unit test on the condition the gate branches on (`summary.errors`).
 *   2. An end-to-end run of the REAL script, proving the wiring between that
 *      condition and `process.exit`, and that the real content currently passes.
 */

describe('the validation summary a gate branches on', () => {
  it('reports errors for content that does not validate', () => {
    // A roadmap pointing at a module that does not exist. Referential integrity
    // must turn this into an error, which is the condition `content:check` maps
    // to a non-zero exit code.
    const registry = buildRegistryFromSource({
      careerPaths: [validCareerPath()],
      skills: [],
      lessons: [],
      modules: [],
      roadmaps: [
        {
          path: 'content/roadmaps/data-entry-va.mdx',
          data: validRoadmap({ stages: [{ kind: 'core', modules: ['does-not-exist'] }] }),
        },
      ],
    })
    const summary = validateRegistry(registry)
    expect(summary.errors).toBeGreaterThan(0)
    expect(summary.issues.some((issue) => issue.severity === 'error')).toBe(true)
  })

  it('reports no errors for content that validates', () => {
    // The contrapositive. Without this, a validator that always reports an error
    // would satisfy the test above and block every legitimate build.
    const registry = buildRegistryFromSource({
      careerPaths: [validCareerPath()],
      skills: [rootSkill(), leafSkill()],
      lessons: [{ path: 'content/lessons/x/cleaning-a-spreadsheet.mdx', data: validLesson() }],
      exercises: [{ path: 'content/exercises/x/clean-a-sheet.mdx', data: validExercise() }],
      modules: [{ path: 'content/modules/data-cleaning.mdx', data: validModule() }],
      roadmaps: [{ path: 'content/roadmaps/data-entry-va.mdx', data: validRoadmap() }],
    })
    expect(validateRegistry(registry).errors).toBe(0)
  })
})

describe('the content:check script wiring', () => {
  /**
   * Runs the real script the way `npm run check` does. This is slower than a unit
   * test and is worth it here: it is the only assertion that the exit code is
   * actually wired to the summary, which is the gate's entire job.
   *
   * A generous timeout, because it starts a Node process and parses the tree.
   */
  const runContentCheck = () =>
    spawnSync('npm', ['run', '--silent', 'content:check'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      shell: true,
    })

  it('exits 0 for the real content, which is the current committed state', () => {
    const result = runContentCheck()
    // Warnings (the four `quality/no-practice` ones) must NOT fail the build.
    // That distinction is deliberate: a build that blocks on a human judgement
    // teaches authors to work around the check.
    expect(result.stdout).toContain('0 error(s)')
    expect(result.status).toBe(0)
  }, 120_000)
})
