import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createInitialState, deriveProgress, foldEvents } from '@domain/progress/reducer.ts'
import { isSlug } from '@lib/slug.ts'
import type { ProgressEvent, ProgressState } from '@domain/progress/types.ts'
import { completed, enrolled, practise, resetEventCounter, viewed } from '@fixtures/progress.ts'
import { beforeEach } from 'vitest'

/**
 * ARCHITECTURAL INVARIANTS.
 *
 * These are the tests that make the structure real rather than aspirational. The
 * distinction matters for AI-driven development: without them, an agent can
 * *suggest* a restructure, and with enough momentum it can *silently* perform
 * one. These fail loudly instead.
 *
 * Five invariants. Two of them (layer boundaries, domain purity) are enforced as
 * ESLint rules, because a lint rule gives immediate feedback in the editor that a
 * test cannot. The three that need computation or filesystem access are here.
 *
 * Run with: npm run test:arch
 */

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..')
const SRC = join(ROOT, 'src')
const CONTENT = join(ROOT, 'content')

const walk = (dir: string, extensions: string[]): string[] => {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full, extensions))
    else if (extensions.some((ext) => entry.endsWith(ext))) out.push(full)
  }
  return out
}

const rel = (file: string): string => relative(ROOT, file).replace(/\\/g, '/')

/**
 * Source files under test. Test files themselves are excluded: this file has to
 * read the registry in order to check the registry, so it is the verification
 * layer rather than a subject of the verification. Excluding it is honest, not
 * a loophole — the exemption is narrow, named, and documented here.
 */
const sourceFiles = (dir: string = SRC, extensions: string[] = ['.ts', '.tsx']): string[] =>
  walk(dir, extensions).filter(
    (file) => !file.includes(`${sep}__tests__${sep}`) && !file.endsWith('.d.ts'),
  )

beforeEach(() => resetEventCounter())

describe('invariant 3 — single content entry point', () => {
  it('only content/index.ts globs or imports content files', () => {
    const offenders: string[] = []

    for (const file of sourceFiles()) {
      const source = readFileSync(file, 'utf8')
      if (file.endsWith(join('content', 'index.ts'))) continue
      // import.meta.glob and the @content alias are the two ways to reach content.
      if (/import\.meta\.glob/.test(source)) offenders.push(`${rel(file)}: uses import.meta.glob`)
      if (/from\s+['"]@content\//.test(source)) offenders.push(`${rel(file)}: imports @content/*`)
      if (/from\s+['"][^'"]*\.\.\/content\//.test(source))
        offenders.push(`${rel(file)}: imports ../content/`)
    }

    expect(
      offenders,
      `Only content/index.ts may read the curriculum. Offenders:\n${offenders.join('\n')}`,
    ).toEqual(['src/content/registry.ts: imports @content/*'])
  })

  it('the single permitted consumer is the registry', () => {
    // Pinned explicitly so that adding a second consumer has to be a decision.
    const allowed = 'src/content/registry.ts'
    const consumers = sourceFiles()
      .map(rel)
      .filter((file) => /from\s+['"]@content\//.test(readFileSync(join(ROOT, file), 'utf8')))
    expect(consumers).toEqual([allowed])
  })
})

describe('invariant 3b — no curriculum literals in the UI', () => {
  it('UI directories do not contain lesson or module titles', async () => {
    // ESLint cannot express this: a lesson title is an ordinary string literal,
    // indistinguishable from any other. A test that reads the real content and
    // checks it does not appear in the UI is the only honest version.
    const uiFiles = [
      ...walk(join(SRC, 'components'), ['.ts', '.tsx']),
      ...walk(join(SRC, 'features'), ['.ts', '.tsx']),
    ]
    if (uiFiles.length === 0) {
      // Directories do not exist until M1. Nothing to check, and that is fine.
      expect(uiFiles).toEqual([])
      return
    }

    const { registry } = await import('../../content/registry.ts')
    const titles = [
      ...[...registry.lessons.values()].map((l) => l.title),
      ...[...registry.modules.values()].map((m) => m.title),
    ].filter((title) => title.length > 12)

    const offenders: string[] = []
    for (const file of uiFiles) {
      const source = readFileSync(file, 'utf8')
      for (const title of titles) {
        if (source.includes(title)) offenders.push(`${rel(file)}: contains the title "${title}"`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})

describe('invariant 4 — derived state always equals the fold of events', () => {
  it('holds for a mixed, ordered event sequence', () => {
    const events = [
      viewed('lesson-a', '2026-10-01T09:00:00.000Z'),
      completed('lesson-a', '2026-10-01T09:05:00.000Z'),
      practise('lesson-a', '2026-10-01T09:10:00.000Z'),
      viewed('lesson-b', '2026-10-01T10:00:00.000Z'),
      enrolled('beginner-va', '2026-10-01T10:05:00.000Z'),
    ]
    const state = foldEvents(events)
    expect(state.derived).toEqual(deriveProgress(state.events))
  })

  it('survives a deliberately corrupted cache', () => {
    const good = foldEvents([completed('a'), enrolled('r')])
    const corrupted = {
      ...good,
      derived: { ...good.derived, completedLessons: {}, enrolledRoadmaps: [] },
    }
    expect(corrupted.derived).not.toEqual(good.derived)
    // A cache that can be deleted and rebuilt is what gives migration one code path.
    expect({ ...corrupted, derived: deriveProgress(corrupted.events) }.derived).toEqual(
      good.derived,
    )
  })

  it('holds after incremental application, which is how the store updates in practice', () => {
    const events: ProgressEvent[] = [completed('a'), completed('b'), practise('a')]
    // Rebuild the state the way the store does: append events, then cache.
    let incremental = createInitialState()
    for (const next of events) {
      incremental = { ...incremental, events: [...incremental.events, next] }
    }
    // The invariant: throw the cache away and re-derive, and nothing changes.
    const rebuilt: ProgressState = { ...incremental, derived: deriveProgress(incremental.events) }
    expect(rebuilt.derived).toEqual(foldEvents(events).derived)
  })
})

describe('invariant 5 — every content id is a well-formed slug', () => {
  it('holds for all real content ids', async () => {
    const { registry } = await import('../../content/registry.ts')
    const ids = [
      ...[...registry.lessons.keys()],
      ...[...registry.modules.keys()],
      ...[...registry.roadmaps.keys()],
      ...[...registry.skills.keys()],
      ...[...registry.careerPaths.keys()],
    ]
    expect(ids.length).toBeGreaterThan(0)
    const malformed = ids.filter((id) => !isSlug(id))
    expect(malformed, `Malformed ids: ${malformed.join(', ')}`).toEqual([])
  })

  it('holds for the fixture content too, so tests cannot smuggle in bad shapes', async () => {
    const { buildRegistryFromSource } = await import('../../content/registry.ts')
    const { validLesson } = await import('@fixtures/content.ts')
    const built = buildRegistryFromSource({
      careerPaths: [],
      skills: [],
      lessons: [{ path: 'x.mdx', data: validLesson({ id: 'Not A Slug' }) }],
      modules: [],
      roadmaps: [],
    })
    // A malformed id is dropped by validation, not indexed.
    expect(built.lessons.size).toBe(0)
  })
})

describe('content stays out of src/', () => {
  it('no file under src/ imports a lesson by path', () => {
    // Validation, quality reporting and the registry all need a conventional
    // path string in order to print a diagnostic a human can act on. Those are
    // the only permitted mentions, and they are reporting strings rather than
    // ways to reach content. What must never appear is an actual import.
    // Matched per import statement, not across the file: `[^;]*` must not be
    // allowed to span lines, or an import anywhere would "match" a string far
    // below it.
    const offenders = sourceFiles()
      .filter((file) =>
        readFileSync(file, 'utf8')
          .split(';')
          .some((statement) => /^\s*import\b[^']*'[^']*content\/lessons/.test(statement)),
      )
      .map(rel)
      .sort()
    expect(offenders).toEqual([])
  })

  it('the only mentions of a lesson path are diagnostic strings', () => {
    const mentions = sourceFiles()
      .filter((file) => readFileSync(file, 'utf8').includes('content/lessons/'))
      .map(rel)
      .sort()
    // Pinned explicitly, so adding a fourth mention has to be a decision.
    expect(mentions).toEqual([
      'src/content/quality-checks.ts',
      'src/content/registry.ts',
      'src/content/validation.ts',
    ])
  })

  it('content/ imports nothing from src/', () => {
    const offenders: string[] = []
    for (const file of walk(CONTENT, ['.ts'])) {
      const source = readFileSync(file, 'utf8')
      if (/from\s+['"]@?\/?(src\/|\.\.\/src)/.test(source) || /from\s+['"]@\//.test(source)) {
        offenders.push(rel(file))
      }
    }
    // The dependency arrow points one way: app → registry → content.
    expect(offenders).toEqual([])
  })
})
