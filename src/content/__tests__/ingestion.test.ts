import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import {
  CONTENT_DIR,
  findMdxFiles,
  parseContentSource,
  utf8Length,
} from '../../../vite-plugin-content.ts'

/**
 * THE BUILD-TIME CONTENT INGESTION PIPELINE (M2).
 *
 * What this file protects, and why it exists at all:
 *
 * At M0 and M1 the frontmatter parser ran in the BROWSER, because
 * `content/index.ts` imported `gray-matter` and called it at module scope. That
 * shipped a Node YAML parser to every learner — about 55 kB gzipped — on an
 * audience the platform itself describes as mostly on phones.
 *
 * M2 moved parsing to build time, in `vite-plugin-content.ts`. These tests pin
 * the two things that make that fix real:
 *
 *   1. The parser runs over the REAL `content/` tree and finds the real files.
 *      If the glob roots or extensions drift, the virtual module would silently
 *      emit empty arrays, the registry would be empty, and the site would render
 *      with no curriculum — a failure that looks like "no content yet" rather
 *      than a broken build.
 *   2. Frontmatter parsing behaves: it separates YAML from the body, and a
 *      malformed file throws AT PARSE TIME with the file named, rather than
 *      degrading into an undefined field somewhere downstream.
 */

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..')

describe('content ingestion — the file walk finds the real curriculum', () => {
  it('finds the roadmap, module and lesson files that exist on disk', () => {
    const roadmaps = findMdxFiles(ROOT, `${CONTENT_DIR}/roadmaps`)
    const modules = findMdxFiles(ROOT, `${CONTENT_DIR}/modules`)
    const lessons = findMdxFiles(ROOT, `${CONTENT_DIR}/lessons`)

    // The counts are the real M0 content, pinned deliberately. A content addition
    // updates this test, which is correct: the point is that the pipeline cannot
    // silently stop seeing files. `>= 1` would pass with a broken walk.
    expect(roadmaps).toHaveLength(2)
    expect(modules).toHaveLength(2)
    expect(lessons).toHaveLength(4)
  })

  it('walks lessons recursively, so a nested domain folder is included', () => {
    // Lessons live under `content/lessons/<domain>/<slug>.mdx`. A non-recursive
    // walk would find zero lesson files while still returning an array.
    const lessons = findMdxFiles(ROOT, `${CONTENT_DIR}/lessons`)
    expect(lessons.some((path) => path.includes('/foundations/'))).toBe(true)
    expect(lessons.some((path) => path.includes('/computer-fundamentals/'))).toBe(true)
  })

  it('returns deterministic, sorted, repo-relative paths', () => {
    // Unsorted filesystem order would make the generated module — and therefore
    // the bundle — differ between machines and between runs, which makes every
    // build diff noisy and non-reproducible.
    const lessons = findMdxFiles(ROOT, `${CONTENT_DIR}/lessons`)
    expect(lessons).toEqual([...lessons].sort())
    for (const path of lessons) {
      expect(path.startsWith(`${CONTENT_DIR}/`)).toBe(true)
      expect(path).not.toContain('\\')
    }
  })

  it('ignores non-.mdx files, so a stray README is not parsed as content', () => {
    // `content/` is allowed to hold `.ts` data (career paths, skills) and notes.
    // The walker must not try to parse those as frontmatter.
    const found = [
      ...findMdxFiles(ROOT, `${CONTENT_DIR}/roadmaps`),
      ...findMdxFiles(ROOT, `${CONTENT_DIR}/modules`),
      ...findMdxFiles(ROOT, `${CONTENT_DIR}/lessons`),
    ]
    expect(found.every((path) => path.endsWith('.mdx'))).toBe(true)
    // `content/index.ts` and `content/career-paths.ts` are real files that the
    // lesson walk must not pick up.
    expect(found.some((path) => path.endsWith('.ts'))).toBe(false)
  })
})

describe('content ingestion — frontmatter parsing', () => {
  const source = `---
id: example-lesson
title: An Example
estimatedMinutes: 5
tags:
  - one
  - two
---
# Heading

Body text.
`

  it('separates YAML frontmatter from the opaque body', () => {
    const parsed = parseContentSource('content/lessons/x/example.mdx', source)

    expect(parsed.path).toBe('content/lessons/x/example.mdx')
    expect(parsed.data.id).toBe('example-lesson')
    expect(parsed.data.title).toBe('An Example')
    // Nested YAML must parse to a real array, not a string.
    expect(parsed.data.tags).toEqual(['one', 'two'])
    // The body keeps the markdown, and does NOT contain the frontmatter.
    expect(parsed.body).toContain('# Heading')
    expect(parsed.body).not.toContain('id: example-lesson')
    expect(parsed.body).not.toContain('---')
  })

  it('coerces unquoted scalars the way YAML does, which is what schemas assume', () => {
    // `estimatedMinutes: 5` must be the number 5, not the string "5", or every
    // lesson would fail its schema with a message that looks like an author error.
    const parsed = parseContentSource('x.mdx', source)
    expect(parsed.data.estimatedMinutes).toBe(5)
    expect(typeof parsed.data.estimatedMinutes).toBe('number')
  })

  it('handles a file with no frontmatter at all without throwing', () => {
    // `gray-matter` returns an empty `data` and the whole file as the body. The
    // registry then drops the entity for failing its schema, which is the correct
    // failure: loud, at validation, named against the file.
    const parsed = parseContentSource('plain.mdx', '# Just a body\n')
    expect(parsed.data).toEqual({})
    expect(parsed.body).toContain('# Just a body')
  })

  it('throws on malformed YAML, at parse time, so the build fails rather than shipping', () => {
    // The whole reason parsing moved to build time: a syntax error must break the
    // build, not become an undefined field the learner discovers.
    const malformed = '---\nid: broken\ntitle: "unterminated\n---\nbody\n'
    expect(() => parseContentSource('content/lessons/broken.mdx', malformed)).toThrow()
  })

  it('throws on a duplicated key, which is a realistic copy-paste authoring mistake', () => {
    // `gray-matter` raises on a duplicate mapping key rather than silently keeping
    // the last one, which is the honest behaviour: a duplicated `id` or `title`
    // means the file says two different things about itself.
    const duplicated = '---\nid: x\nid: y\n---\nbody\n'
    expect(() => parseContentSource('content/lessons/dup.mdx', duplicated)).toThrow()
  })
})

describe('content ingestion — payload measurement', () => {
  it('measures UTF-8 bytes, not code units', () => {
    // The payload figure is compared against bundle sizes, so it must be bytes.
    // An em dash is one code unit but three UTF-8 bytes; the M0 content is full
    // of them, so counting code units would understate the payload.
    expect(utf8Length('—')).toBe(3)
    expect(utf8Length('abc')).toBe(3)
    expect(utf8Length('—'.repeat(10))).toBe(30)
  })

  it('counts every real body, so the eager-vs-lazy question stays measurable', () => {
    const files = [
      ...findMdxFiles(ROOT, `${CONTENT_DIR}/roadmaps`),
      ...findMdxFiles(ROOT, `${CONTENT_DIR}/modules`),
      ...findMdxFiles(ROOT, `${CONTENT_DIR}/lessons`),
    ]
    const total = files
      .map((path) => parseContentSource(path, readFileSync(resolve(ROOT, path), 'utf8')))
      .reduce((sum, file) => sum + utf8Length(file.body), 0)

    // Non-zero, because the real content has bodies. The registry test asserts the
    // same invariant through the virtual module; this asserts it at the source of
    // the number.
    expect(total).toBeGreaterThan(0)
  })
})

describe('content ingestion — lesson bodies compile at ingestion (M2.2)', () => {
  const source = [
    '---',
    'id: example-lesson',
    'title: An Example',
    '---',
    'A paragraph with **bold** text.',
    '',
    '## A heading',
    '',
    '- one',
    '- two',
  ].join('\n')

  it('attaches a compiled tree to a lesson file', () => {
    const parsed = parseContentSource('content/lessons/x/example.mdx', source)
    expect(parsed.rendered).toBeDefined()
    // The heading survives compilation as a real `h2`, not as a paragraph.
    const tags = (parsed.rendered ?? []).map((node) =>
      node.kind === 'element' ? node.tag : node.kind,
    )
    expect(tags).toContain('h2')
    expect(tags).toContain('ul')
  })

  it('does NOT compile a non-lesson file, so a roadmap carries no body tree', () => {
    // Compiling roadmaps and modules would both waste work and blur the guarantee
    // that a `rendered` field means "this is a lesson body".
    const parsed = parseContentSource('content/roadmaps/beginner-va.mdx', source)
    expect(parsed.rendered).toBeUndefined()
  })

  it('keeps the raw body at build time, so the payload number stays computable', () => {
    const parsed = parseContentSource('content/lessons/x/example.mdx', source)
    expect(parsed.body).toContain('A paragraph with')
  })

  it('fails ingestion for a lesson whose MDX is not compilable', () => {
    // A broken construct must fail the BUILD, identically to malformed YAML.
    const broken = '---\nid: x\ntitle: X\n---\nA {dangerous} expression.\n'
    expect(() => parseContentSource('content/lessons/x/broken.mdx', broken)).toThrow()
  })
})

describe('content ingestion — ids survive a rename', () => {
  /**
   * Ids are the join key for everything, including a learner's local progress.
   * Renaming one orphans that progress silently, so a rename is expressed as a
   * new id plus the old value in `deprecatedIds`, and the old value must be
   * preserved through the pipeline rather than dropped by the schema.
   *
   * This is the `deprecatedIds` field's contract at the point M2 first parses it
   * out of real frontmatter. Nothing has been renamed yet, which is exactly why
   * the behaviour needs a test now: the first rename will be done under
   * production pressure, and that is the wrong moment to discover the field is
   * not carried through.
   */
  it('preserves deprecatedIds parsed from frontmatter', () => {
    const source = `---
id: cleaning-a-spreadsheet
title: Cleaning a Spreadsheet
deprecatedIds:
  - cleaning-a-sheet
  - spreadsheet-cleanup
---
body
`
    const parsed = parseContentSource('content/lessons/x/cleaning-a-spreadsheet.mdx', source)
    expect(parsed.data.deprecatedIds).toEqual(['cleaning-a-sheet', 'spreadsheet-cleanup'])
  })

  it('defaults deprecatedIds to an empty list when the field is absent', () => {
    // The default is applied by the SCHEMA, not the parser, so the parser must
    // leave it absent rather than inventing one. A parser that defaulted it would
    // make "no old ids" indistinguishable from "author wrote nothing".
    const parsed = parseContentSource('x.mdx', '---\nid: x\ntitle: X\n---\nbody\n')
    expect(parsed.data).not.toHaveProperty('deprecatedIds')
  })
})
