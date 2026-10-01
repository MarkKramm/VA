import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import matter from 'gray-matter'
import type { Plugin, ResolvedConfig } from 'vite'
import { compileMdx } from './content/mdx/compile.ts'
import type { CompiledBody } from './content/mdx/tree.ts'

/**
 * BUILD-TIME CONTENT INGESTION.
 *
 * WHY THIS IS A PLUGIN AND NOT A MODULE
 *
 * At M0 and M1, `content/index.ts` imported `gray-matter` and called it at module
 * scope, then globbed the `.mdx` files with `import.meta.glob`. That file is in
 * the CLIENT graph -- `DashboardPage -> src/app/content.ts -> registry.ts ->
 * content/index.ts` -- so a Node YAML parser and its dependency `js-yaml` were
 * compiled into the browser bundle. Measured at M1: roughly 248 kB raw / 55 kB
 * gzipped of a 717 kB / 202 kB bundle, on an audience the platform itself says is
 * mostly on mid-range phones and metered connections.
 *
 * `DECISIONS.md` D12 and `vite.config.ts` both name the fix: parse frontmatter at
 * BUILD time and hand the browser plain data. This plugin is that fix.
 *
 * HOW IT WORKS
 *
 * The plugin runs in Node during `vite build`, `vite dev` and `vite-node` (which
 * is how `content:check`, the architecture tests and the validators import the
 * registry). It watches `content/`, reads and parses every `.mdx` file, and
 * serves the result as a VIRTUAL MODULE. The browser receives a JSON object
 * literal. It never sees `gray-matter`, and it never sees a glob.
 *
 * The dependency arrow is unchanged and still points one way:
 *   app -> registry -> content/index.ts -> virtual:content-data <- (this plugin)
 * `content/` remains data that knows nothing about `src/`. The parser lives at the
 * build edge, which is the only place it was ever needed.
 *
 * WHY ONE VIRTUAL MODULE AND NOT ONE PER FILE
 *
 * The registry builds reverse indexes over the whole curriculum synchronously, so
 * the content must be available eagerly. One module is also what makes the glob
 * rule in ARCHITECTURE.md still meaningful: `content/index.ts` stays the single
 * entry point, and this plugin stays the single place content is read from disk.
 *
 * WHY `gray-matter` IS STILL THE PARSER
 *
 * D12 rejected a hand-rolled YAML parser: it would duplicate a solved problem and
 * could disagree with `gray-matter` on an edge case. Nothing here hand-parses
 * anything. The only change is WHERE the parser runs.
 */

/** The id the virtual module is imported by. Namespaced so it cannot collide. */
export const VIRTUAL_CONTENT_MODULE_ID = 'virtual:content-data'

/**
 * A resolved id Vite hands to `load`. The `\0` prefix is the Vite convention for
 * a virtual module: it cannot be resolved from disk, and it is excluded from
 * source maps and from the module graph's file-watching heuristics.
 */
const RESOLVED_ID = '\0' + VIRTUAL_CONTENT_MODULE_ID

/** One raw content file, matching `RawContentFile` in `content/index.ts`. */
export interface RawContentFile {
  readonly path: string
  readonly data: Record<string, unknown>
  /**
   * The body as written, retained for the payload measurement and for tests that
   * assert nothing was lost in compilation. It is NOT rendered: `rendered` is.
   */
  readonly body: string
  /**
   * The compiled body, or `undefined` for non-lesson content (roadmaps and
   * modules render no prose). `undefined` rather than an empty array so "not a
   * lesson" and "a lesson with an empty body" stay distinguishable.
   */
  readonly rendered?: CompiledBody
}

export const CONTENT_DIR = 'content'

/** Every `.mdx` file under `dir`, recursively, as repo-relative paths. */
export const findMdxFiles = (root: string, dir: string): string[] => {
  const absolute = join(root, dir)
  const out: string[] = []
  const walk = (current: string): void => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry.endsWith('.mdx')) out.push(full)
    }
  }
  walk(absolute)
  // Sorted so the generated module is byte-stable across machines and runs. A
  // registry that iterates in filesystem order would produce different output on
  // a different OS, which makes the bundle non-reproducible and diffs noisy.
  return out.map((file) => relative(root, file).split(sep).join('/')).sort()
}

/**
 * Parse one `.mdx` file: frontmatter, body, and -- for lessons -- the compiled
 * body tree.
 *
 * A malformed file throws here, at build time, with the file named -- which is
 * the whole point. At M0 a YAML syntax error surfaced as a runtime validation
 * message in the browser; now it fails the build. The same is true of malformed
 * MDX and of any construct outside the allowed vocabulary (D22).
 *
 * `rendered` is produced only for lessons. Roadmap and module files carry no
 * prose, and compiling them would both waste work and blur the guarantee that a
 * `rendered` field means "this is a lesson body".
 */
export const parseContentFile = (root: string, path: string): RawContentFile => {
  const source = readFileSync(join(root, path), 'utf8')
  return parseSourceIntoFile(path, source)
}

/** Parse an in-memory source string. Exported for tests; the walkers use files. */
export const parseContentSource = (path: string, source: string): RawContentFile =>
  parseSourceIntoFile(path, source)

const parseSourceIntoFile = (path: string, source: string): RawContentFile => {
  const { data, content } = matter(source)
  const base = { path, data: data as Record<string, unknown>, body: content }
  // Compilation is attempted for anything under `content/lessons/`. The
  // alternative -- compiling every `.mdx` -- would give roadmap and module files
  // a `rendered: []` that means nothing, and would make a broken construct in a
  // roadmap fail a build for a field no one reads.
  if (isLessonPath(path)) return { ...base, rendered: compileMdx(content, path) }
  return base
}

/** True for a repo-relative path under `content/lessons/`. */
export const isLessonPath = (path: string): boolean => path.startsWith(`${CONTENT_DIR}/lessons/`)

/** UTF-8 byte length, matching `contentPayloadBytes`'s definition in M1. */
export const utf8Length = (value: string): number => new TextEncoder().encode(value).length

/**
 * Static imports for the two hand-authored curricula.
 *
 * These are `.ts` data files, not `.mdx`, so there is no frontmatter to parse and
 * nothing to gain from routing them through the virtual module's file walk. They
 * are imported through the virtual module anyway so that `content/index.ts` has
 * exactly one import for all content, which keeps the "single entry point"
 * invariant legible.
 *
 * The importer path is emitted as a root-relative specifier, which Vite resolves
 * to the same file in `build`, `dev` and `vite-node`.
 */
const DATA_IMPORTS = [
  { binding: 'careerPaths', importer: '/content/career-paths.ts' },
  { binding: 'skills', importer: '/content/skills/skill-tree.ts' },
] as const

const buildModuleSource = (root: string): string => {
  const roadmapPaths = findMdxFiles(root, join(CONTENT_DIR, 'roadmaps'))
  const modulePaths = findMdxFiles(root, join(CONTENT_DIR, 'modules'))
  const lessonPaths = findMdxFiles(root, join(CONTENT_DIR, 'lessons'))

  const toFiles = (paths: readonly string[]): RawContentFile[] =>
    paths.map((path) => parseContentFile(root, path))

  const roadmaps = toFiles(roadmapPaths)
  const modules = toFiles(modulePaths)
  const lessons = toFiles(lessonPaths)
  const payloadBytes = [...roadmaps, ...modules, ...lessons].reduce(
    (total, file) => total + utf8Length(file.body),
    0,
  )

  /*
   * The raw `body` is measured above and then DROPPED from what ships. Nothing in
   * the application reads it — the payload figure is a build-time number — and
   * shipping it beside `rendered` would put two copies of every lesson in the
   * bundle, which is exactly the duplicate representation DECISIONS.md D22 warns
   * against. The measurement stays honest because it is computed here, in Node.
   */
  const shipped = (files: readonly RawContentFile[]) =>
    files.map(({ path, data, rendered }) => (rendered ? { path, data, rendered } : { path, data }))

  const imports = DATA_IMPORTS.map(
    ({ binding, importer }) =>
      `import { ${binding} as __${binding} } from ${JSON.stringify(importer)}`,
  ).join('\n')
  const exports = DATA_IMPORTS.map(({ binding }) => `export const ${binding} = __${binding}`).join(
    '\n',
  )

  /*
   * The data is emitted as a JSON literal rather than as parsed JS. JSON is a
   * subset of JS here, it cannot execute anything from a content file, and it
   * makes the generated module trivially auditable in a dev-tools network panel:
   * a reviewer can see exactly what crossed into the browser.
   */
  return `/* Generated by vite-plugin-content.ts. Do not edit. */
${imports}

export const roadmaps = ${JSON.stringify(shipped(roadmaps))}
export const modules = ${JSON.stringify(shipped(modules))}
export const lessons = ${JSON.stringify(shipped(lessons))}
${exports}
export const contentPayloadBytes = ${JSON.stringify(payloadBytes)}
`
}

/**
 * The plugin.
 *
 * `apply` is deliberately unset: the pipeline must behave identically in `build`,
 * in `dev`, and under `vite-node`, because the tests and `content:check` import
 * the same registry the browser does. A plugin that only ran at build time would
 * make the tests exercise a different content-loading path than production, which
 * is exactly the class of divergence this project checks for elsewhere.
 */
export const contentPlugin = (): Plugin => {
  let root = process.cwd()

  return {
    name: 'va:content',
    enforce: 'pre',

    configResolved(config: ResolvedConfig) {
      root = config.root
    },

    resolveId(id) {
      if (id === VIRTUAL_CONTENT_MODULE_ID) return RESOLVED_ID
      return null
    },

    load(id) {
      if (id !== RESOLVED_ID) return null
      return buildModuleSource(root)
    },

    /**
     * Re-generate when any content file changes, so `vite dev` reflects an edit
     * without a restart. The virtual module has no file of its own, so Vite needs
     * to be told what it depends on.
     */
    configureServer(server) {
      const watched = join(root, CONTENT_DIR)
      server.watcher.add(watched)
      server.watcher.on('change', (file) => {
        if (!file.includes(`${sep}${CONTENT_DIR}${sep}`)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
      })
    },
  }
}
