import type { CompiledBody, CompiledNode, ElementNode, ElementProp } from '@content/mdx/tree.ts'
import { isSafeUrl } from '@content/mdx/tree.ts'

/**
 * The compiled-content seam for the UI (M2.3).
 *
 * WHY THIS FILE EXISTS
 *
 * The compiled-tree format and its URL policy live in `content/mdx/tree.ts`,
 * which is the data layer. `src/app/` is the only UI-side layer allowed to read
 * from `content/` (see `ARCHITECTURE.md`, "The content/UI seam"), so the pieces a
 * PRESENTATION component needs are re-exported here and imported from `@/app/`
 * rather than from `content/` directly.
 *
 * The renderer itself lives in `src/components/mdx/` — it is a cross-feature
 * presentation component, which is where the placement table puts it. It imports
 * `isSafeUrl` and its node types from this module, so the ESCAPE HATCH a feature
 * would otherwise need ("just this once, import from content/") does not exist.
 *
 * THE TYPES ARE RE-EXPORTED AS TYPES, AND THAT IS DELIBERATE
 *
 * `type` re-exports are erased at build time, so they add nothing to the bundle.
 * The one runtime value here is `isSafeUrl`, a few bytes and no dependencies. The
 * MDX parser and the compiler stay in `content/mdx/` and never reach this module,
 * which is what keeps them out of the client.
 */

export type { CompiledBody, CompiledNode, ElementNode, ElementProp }

/**
 * Whether a URL is safe to place in an `href` or `src`.
 *
 * Re-exported so the renderer can re-check at render time without importing the
 * data layer directly. The compiler applies the same function at build time; the
 * renderer applying it again is the defence-in-depth described in D22.
 */
export { isSafeUrl }
