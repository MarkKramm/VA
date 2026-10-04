/**
 * Ambient types for the generated content module.
 *
 * `virtual:content-data` has no file on disk. It is produced at build time by
 * `vite-plugin-content.ts`, which parses `.mdx` frontmatter and compiles lesson
 * bodies in Node, then emits a module of plain data. TypeScript cannot see that
 * generated module, so the shape is declared here.
 *
 * This file has NO top-level `import`, and that is load-bearing. A `.d.ts` with
 * an import is a module, and a `declare module 'x'` inside a module augments `x`
 * rather than declaring it — which would silently declare nothing, because
 * `virtual:content-data` does not exist as a real module. The compiled-body type
 * is therefore read from the global alias declared in `content/mdx/tree.ts`.
 *
 * This declaration is the CONTRACT between the plugin and `content/index.ts`. If
 * the plugin stops emitting one of these names, `content/index.ts` fails to
 * typecheck rather than silently importing `undefined` -- which is the failure
 * mode worth guarding against, because it would look like missing content rather
 * than a broken build.
 *
 * Frontmatter is typed loosely (`Record<string, unknown>`) on purpose: it is
 * unvalidated by definition, and schemas in `src/content/schemas/` are what turn
 * it into typed entities. Declaring a precise frontmatter type here would move
 * validation into the type layer, where it would be erased at runtime and could
 * disagree with the Zod schemas -- two sources of truth for the same shape.
 */
declare module 'virtual:content-data' {
  /**
   * A raw content file as it SHIPS: frontmatter, and (for lessons and
   * exercises) the compiled body tree.
   *
   * The raw body text is deliberately absent. It is measured at build time for
   * the payload report and then dropped, because shipping it beside `rendered`
   * would put two copies of every lesson in the bundle (DECISIONS.md D22).
   */
  interface RawContentFile {
    readonly path: string
    readonly data: Record<string, unknown>
    readonly rendered?: GlobalCompiledBody
  }

  export const roadmaps: readonly RawContentFile[]
  export const modules: readonly RawContentFile[]
  export const lessons: readonly RawContentFile[]
  /** Exercises carry a compiled body too, with an `h4` heading floor (M2.4). */
  export const exercises: readonly RawContentFile[]
  export const careerPaths: readonly unknown[]
  export const skills: readonly unknown[]
  /**
   * Questions and quizzes are one file per entity (M4.1), like lessons and
   * exercises, so they arrive as file wrappers rather than bare data. Neither
   * collection has a prose body, so neither carries `rendered`.
   */
  export const questions: readonly RawContentFile[]
  export const quizzes: readonly RawContentFile[]
  export const contentPayloadBytes: number
}
