/**
 * The single entry point to the curriculum.
 *
 * RULE: this is the only file in the repository allowed to glob or import
 * content. Everything else reads the curriculum through the registry in
 * src/content/, which is what makes the layer boundaries in ARCHITECTURE.md
 * mechanically enforceable rather than aspirational. Enforced by
 * `npm run test:arch`.
 *
 * This file imports nothing from `src/`. The dependency arrow points one way:
 * app → registry → content. Content is DATA and knows nothing about schemas,
 * types, or the application.
 *
 * At M0 the MDX *body* is read as raw text and is deliberately not compiled.
 * Frontmatter is parsed and validated; the body is opaque until the MDX pipeline
 * lands at M2. The bodies are kept separate from the validated metadata so that
 * nothing in the application layer can accidentally start depending on lesson
 * prose.
 */
import matter from 'gray-matter'
import { careerPaths } from './career-paths.ts'
import { skills } from './skills/skill-tree.ts'

/** One content file, before validation. */
export interface RawContentFile {
  /** Repo-relative path, e.g. "content/lessons/foundations/what-is-a-virtual-assistant.mdx" */
  readonly path: string
  /** Parsed YAML frontmatter. Unvalidated. */
  readonly data: Record<string, unknown>
  /** File body, opaque text. Not used at M0. */
  readonly body: string
}

const parse = (path: string, source: string): RawContentFile => {
  const { data, content } = matter(source)
  return { path, data: data as Record<string, unknown>, body: content }
}

/**
 * Vite's glob import. Eager by design — the registry needs synchronous access to
 * the whole curriculum to build its reverse indexes, and correctness before
 * performance. Revisit when the content payload report in `content:check` says
 * the bundle is a problem. See DECISIONS.md.
 */
const roadmapFiles = import.meta.glob('./roadmaps/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const moduleFiles = import.meta.glob('./modules/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const lessonFiles = import.meta.glob('./lessons/**/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const toFiles = (files: Record<string, string>): RawContentFile[] =>
  Object.entries(files)
    .map(([relative, source]) => parse(`content/${relative.replace(/^\.\//, '')}`, source))
    .sort((a, b) => a.path.localeCompare(b.path))

export const rawContent = {
  roadmaps: toFiles(roadmapFiles),
  modules: toFiles(moduleFiles),
  lessons: toFiles(lessonFiles),
  /** Plain data arrays. The registry validates these against their schemas. */
  careerPaths: careerPaths as readonly unknown[],
  skills: skills as readonly unknown[],
} as const

/**
 * Total byte size of every content body. Reported by `content:check` so the
 * "eager vs lazy content loading" question can be decided on a measurement
 * rather than on an opinion. See DECISIONS.md.
 *
 * Uses TextEncoder rather than Buffer so the same code runs in the browser at M1
 * without pulling in a Node shim.
 */
const utf8Length = (value: string): number => new TextEncoder().encode(value).length

export const contentPayloadBytes = [
  ...rawContent.roadmaps,
  ...rawContent.modules,
  ...rawContent.lessons,
].reduce((total, file) => total + utf8Length(file.body), 0)
