/**
 * The compiled-body format.
 *
 * A lesson body is compiled at BUILD time (D22) into the closed set of node
 * shapes below, and crosses the virtual-module boundary as plain JSON. This file
 * defines that format, and it is deliberately the whole vocabulary: if a node
 * kind is not here, it cannot reach the renderer.
 *
 * It lives in `content/` — the data side — because the format is what the BUILD
 * produces; it is a property of the content, not of the application. `content/`
 * may not import from `src/` (ARCHITECTURE.md), so the definition has to live
 * here, and `src/` imports it through the alias. `src/content/mdx/tree.ts`
 * re-exports these names for convenience inside `src/`.
 *
 * The names are ALSO declared globally, in the block at the bottom of this file.
 * That is what lets `content/virtual-content.d.ts` stay a script (no top-level
 * `import`), which in turn is what makes its `declare module
 * 'virtual:content-data'` a true ambient declaration rather than an augmentation
 * of a module that does not exist. A `.d.ts` containing an import is a module,
 * and a `declare module` inside a module augments rather than declares.
 */

/** The HTML elements a lesson body may contain. */
export const ALLOWED_ELEMENTS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
  'strong',
  'em',
  'code',
  'pre',
  'blockquote',
  'hr',
  'br',
  'img',
  // The renderer maps these to a table, but no current content produces them:
  // base `remark-parse` leaves GFM tables as text. They are listed so enabling
  // `remark-gfm` later is a compiler change, not a schema change.
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
] as const

export type AllowedElement = (typeof ALLOWED_ELEMENTS)[number]

/**
 * A serializable property value.
 *
 * Deliberately narrower than React's `unknown`. A content attribute can be a
 * string, a number or a boolean — never a function, never an object. `onClick={fn}`
 * is an expression and is rejected by the compiler, so a function can never reach
 * this type.
 */
export type ElementProp = string | number | boolean

/** A plain text run. */
export interface TextNode {
  readonly kind: 'text'
  readonly value: string
}

/** An HTML element. `tag` is always one of `ALLOWED_ELEMENTS`. */
export interface ElementNode {
  readonly kind: 'element'
  readonly tag: AllowedElement
  readonly props: Readonly<Record<string, ElementProp>>
  readonly children: readonly CompiledNode[]
}

/**
 * A custom curriculum component.
 *
 * `name` is resolved against the render-time allowlist. The compiler does not
 * know whether a name is allowed — it only records it — so the build can emit a
 * component and the renderer can refuse an unknown one with a clear error. Keeping
 * the two lists separate means a component can be added to content before the
 * renderer knows it, and the failure is "unknown component Foo" rather than
 * "the build will not run".
 */
export interface ComponentNode {
  readonly kind: 'component'
  readonly name: string
  readonly props: Readonly<Record<string, ElementProp>>
  readonly children: readonly CompiledNode[]
}

export type CompiledNode = TextNode | ElementNode | ComponentNode

/** A compiled lesson body: an ordered list of block-level nodes. */
export type CompiledBody = readonly CompiledNode[]

/**
 * Whether a URL is safe to place in an `href` or `src`.
 *
 * Lives HERE, beside the tree format, rather than in the compiler. The compiler
 * uses it to refuse unsafe links at build time, and the RENDERER uses it to
 * re-check at render time — and the renderer must not import the compiler, which
 * pulls in `unified`/`remark-*` and would put an MDX parser in the client bundle.
 * A parser-free module is the only place both sides can share it.
 *
 * Policy: relative paths, in-page anchors, `http(s):` and `mailto:` are allowed;
 * everything else is refused, including `javascript:`, `data:`, and
 * protocol-relative `//host` (which silently inherits the page scheme).
 */
const SAFE_URL_SCHEMES = ['http:', 'https:', 'mailto:']

export const isSafeUrl = (raw: string): boolean => {
  const trimmed = raw.trim()
  if (trimmed.startsWith('//')) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return SAFE_URL_SCHEMES.some((scheme) => trimmed.toLowerCase().startsWith(scheme))
  }
  return true
}

/**
 * The same types, declared globally.
 *
 * This exists so `content/virtual-content.d.ts` can reference the compiled-body
 * format without a top-level import. A `.d.ts` with an import is a MODULE, and a
 * `declare module 'x'` inside a module AUGMENTS `x` — it does not declare it. The
 * virtual module does not exist as a real module, so an augmentation declares
 * nothing and `content/index.ts` fails to resolve it. Keeping that file a script
 * (no imports) and reading the type from here is the standard way out.
 *
 * The names are prefixed to avoid any chance of colliding with an application
 * type, and they are the SAME types rather than copies: an alias, not a
 * restatement, so there is still one definition.
 */
declare global {
  type GlobalCompiledBody = CompiledBody
  type GlobalCompiledNode = CompiledNode
}
