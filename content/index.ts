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
 * WHERE THE FRONTMATTER IS PARSED (M2.1) AND THE BODY IS COMPILED (M2.2)
 *
 * At M0 and M1 this file globbed the `.mdx` files itself (`import.meta.glob`) and
 * parsed their frontmatter with `gray-matter` at module scope. Because this file
 * is in the client graph, that shipped a Node YAML parser to the browser -- about
 * 55 kB gzipped of the M1 bundle, for an audience mostly on phones.
 *
 * Both stages now happen at BUILD time, in `vite-plugin-content.ts` (frontmatter)
 * and `content/mdx/compile.ts` (body), and this file reads the result from a
 * virtual module. They run in Node under `vite build`, `vite dev` and
 * `vite-node`, so they are available everywhere needed and reach the browser
 * nowhere.
 *
 * The raw body TEXT does not ship: it is measured at build time for the payload
 * report and then dropped, so there is one representation of each lesson in the
 * bundle rather than two. What ships is `rendered`, the compiled element tree,
 * which is validated metadata-adjacent data rather than lesson prose the
 * application layer could start depending on.
 */
import {
  careerPaths as rawCareerPaths,
  contentPayloadBytes,
  exercises as rawExercises,
  lessons as rawLessons,
  modules as rawModules,
  roadmaps as rawRoadmaps,
  skills as rawSkills,
} from 'virtual:content-data'

/**
 * The compiled-body type is declared once, in `content/mdx/tree.ts`, and aliased
 * globally there so this file can reference it without turning the ambient
 * declaration above into a module augmentation. See that file for why.
 */
type CompiledBody = GlobalCompiledBody

/**
 * One content file, as it ships to the application.
 *
 * The raw body text is NOT here: it is measured at build time for the payload
 * report and then dropped, because shipping it beside `rendered` would put two
 * copies of every lesson in the bundle (see DECISIONS.md D22 and the `shipped`
 * step in vite-plugin-content.ts).
 */
export interface RawContentFile {
  /** Repo-relative path, e.g. "content/lessons/foundations/what-is-a-virtual-assistant.mdx" */
  readonly path: string
  /** Parsed YAML frontmatter. Unvalidated. */
  readonly data: Record<string, unknown>
  /**
   * The compiled body tree (M2.2, extended to exercises at M2.4), present only
   * on lesson and exercise files.
   *
   * The compiler that produces this lives at the build edge
   * (`content/mdx/compile.ts`), so this field arrives already-built and the
   * browser never sees `unified`, `remark-parse` or any MDX package.
   */
  readonly rendered?: CompiledBody
}

export const rawContent = {
  roadmaps: rawRoadmaps as readonly RawContentFile[],
  modules: rawModules as readonly RawContentFile[],
  lessons: rawLessons as readonly RawContentFile[],
  exercises: rawExercises as readonly RawContentFile[],
  /** Plain data arrays. The registry validates these against their schemas. */
  careerPaths: rawCareerPaths as readonly unknown[],
  skills: rawSkills as readonly unknown[],
  /**
   * Compiled bodies, keyed by source path (M2.2; exercises added at M2.4).
   *
   * The registry joins these to validated lessons and exercises by path and
   * re-keys each result by the entity's id. Building the map here rather than in
   * the registry keeps the "only this file reads the virtual module" rule intact.
   */
  bodies: new Map(
    ([...rawLessons, ...rawExercises] as readonly RawContentFile[])
      .filter(
        (file): file is RawContentFile & { rendered: CompiledBody } => file.rendered !== undefined,
      )
      .map((file) => [file.path, file.rendered]),
  ),
} as const

/**
 * Total byte size of every content body. Reported by `content:check` so the
 * "eager vs lazy content loading" question can be decided on a measurement
 * rather than on an opinion. See DECISIONS.md.
 *
 * Computed by the plugin, at build time, from the same files it parsed.
 */
export { contentPayloadBytes }
