import { unified, type Plugin } from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import {
  ALLOWED_ELEMENTS,
  isSafeUrl,
  type AllowedElement,
  type CompiledBody,
  type CompiledNode,
  type ElementProp,
} from './tree.ts'

/**
 * BUILD-TIME MDX COMPILATION (M2.2).
 *
 * Compiles a lesson `.mdx` body into a serializable element tree. See
 * `DECISIONS.md` D22 for why this is a tree and not a JavaScript module, and
 * `src/content/mdx/tree.ts` for the output format.
 *
 * WHY IT IS HERE AND NOT IN `src/`
 *
 * This module imports `unified`, `remark-parse` and `remark-mdx`. Those are
 * build-time dependencies, and `src/` is the tree the client is built from, so
 * importing one from `src/` would eventually reach a learner. It lives beside
 * the ingestion plugin instead, which is the build edge, and `boundaries.test.ts`
 * asserts the separation.
 *
 * THE THREAT MODEL
 *
 * Curriculum MDX is authored application content, not user input. The risk is
 * not a stranger writing MDX; it is an AUTHORED file — or a future agent editing
 * one — introducing a construct that either executes code or bypasses the
 * component allowlist. So the compiler does not try to sanitise an arbitrary
 * tree. It refuses to emit anything outside a closed vocabulary, and it fails
 * the build when it meets a construct it does not understand. A construct that is
 * understood but disallowed (`{expression}`, an unknown component) is also a
 * build failure, never a silent drop: a dropped expression looks exactly like an
 * author who wrote nothing.
 */

/** Raised for any `mdx-flow.mdx` error. Carries the file and, when known, the line. */
export class MdxCompileError extends Error {
  constructor(
    readonly path: string,
    readonly detail: string,
    readonly line?: number,
  ) {
    super(line === undefined ? `${path}: ${detail}` : `${path}:${line}: ${detail}`)
    this.name = 'MdxCompileError'
  }
}

/** The subset of an mdast node this compiler reads. */
interface MdastNode {
  type: string
  value?: string
  name?: string
  depth?: number
  url?: string
  alt?: string | null
  title?: string | null
  lang?: string | null
  ordered?: boolean
  attributes?: readonly MdastAttribute[]
  children?: readonly MdastNode[]
  position?: { start: { line: number } }
}

interface MdastAttribute {
  type: string
  name: string
  value?: string | boolean | null
}

/**
 * Markdown block and inline constructs, mapped to the element they render as.
 *
 * An unlisted construct is a compile error rather than a fallback, so a new
 * Markdown feature has to be added here on purpose. That is the same posture the
 * component allowlist takes, and for the same reason: the default should be
 * "refuse and report", not "render something approximately right".
 */
const NODE_TAGS: Readonly<Record<string, AllowedElement>> = {
  paragraph: 'p',
  blockquote: 'blockquote',
  listItem: 'li',
  emphasis: 'em',
  strong: 'strong',
  thematicBreak: 'hr',
  break: 'br',
}

/**
 * Elements whose tag depends on other properties rather than being fixed.
 *
 * Headings are clamped to `h2`–`h6`: an `h1` in a lesson body is refused in the
 * `heading` case below, because the lesson page owns the page heading. The clamp
 * is a belt-and-braces floor; the refusal is what actually prevents an `h1`.
 */
const headingTag = (depth: number | undefined): AllowedElement => {
  const level = Math.min(Math.max(depth ?? 2, 2), 6)
  return `h${level}` as AllowedElement
}

const isAllowedElement = (tag: string): tag is AllowedElement =>
  (ALLOWED_ELEMENTS as readonly string[]).includes(tag)

/**
 * A URL that is safe to place in an `href` or `src`.
 *
 * The policy lives in `tree.ts` beside the format, because the RENDERER also
 * needs it and must not import this file (which would pull the parser into the
 * client). This wrapper adds the build-time failure.
 */
const safeUrl = (raw: string, path: string, line: number | undefined): string => {
  if (!isSafeUrl(raw)) {
    throw new MdxCompileError(path, `refusing unsafe URL in "${raw.trim()}"`, line)
  }
  return raw.trim()
}

/**
 * Convert one mdast node to zero or more compiled nodes.
 *
 * Returning an array, not a single node, because `root` and a fenced `code`
 * block both fan out (a `pre` wrapping a `code`). Everything else returns one.
 */
const compileNode = (node: MdastNode, path: string, line: number | undefined): CompiledNode[] => {
  const at = node.position?.start.line ?? line

  switch (node.type) {
    case 'root':
      return compileChildren(node.children ?? [], path, at)

    case 'text':
      return [{ kind: 'text', value: node.value ?? '' }]

    case 'inlineCode':
      // Inline code carries its text in `value`, not in children, so it does not
      // go through the generic child walk. Getting this wrong yields an empty
      // `<code></code>`, which renders as a blank gap rather than an error.
      return [
        {
          kind: 'element',
          tag: 'code',
          props: {},
          children: node.value ? [{ kind: 'text', value: node.value }] : [],
        },
      ]

    case 'heading': {
      /*
       * A lesson body may not contain an `h1`.
       *
       * The lesson PAGE owns the single `<h1>` — it is the lesson title, and the
       * outline a screen-reader user navigates by must have exactly one top-level
       * entry. A body that began with `# Heading` (or contained one anywhere)
       * would add a second, producing a page whose structure says two different
       * things are the title.
       *
       * This is a refusal rather than a silent demotion for the same reason as
       * every other refusal here: silently rewriting an author's `#` into an
       * `##` would hide a real authoring mistake, and the author would not learn
       * that headings in a lesson body start at `##`.
       */
      const depth = node.depth ?? 1
      if (depth <= 1) {
        throw new MdxCompileError(
          path,
          'lesson bodies must not contain an h1; the lesson title is the page heading, so body headings start at h2',
          at,
        )
      }
      return [
        {
          kind: 'element',
          tag: headingTag(depth),
          props: {},
          children: compileChildren(node.children ?? [], path, at),
        },
      ]
    }

    case 'list': {
      // `ordered` is an mdast property, not a child; infer from it the same way
      // the parser sets it. A list keeps its own children (list items).
      const ordered = node.ordered === true
      return [
        {
          kind: 'element',
          tag: ordered ? 'ol' : 'ul',
          props: {},
          children: compileChildren(node.children ?? [], path, at),
        },
      ]
    }

    case 'code': {
      const props: Record<string, ElementProp> = {}
      // `lang` becomes a class so a future highlighter has a hook. It is NOT a
      // dynamic class string built from user input: the value comes from content
      // and is only ever used as a CSS hook.
      if (node.lang) props['data-language'] = node.lang
      return [
        {
          kind: 'element',
          tag: 'pre',
          props: {},
          children: [
            {
              kind: 'element',
              tag: 'code',
              props,
              children: node.value ? [{ kind: 'text', value: node.value }] : [],
            },
          ],
        },
      ]
    }

    case 'link':
      return [
        {
          kind: 'element',
          tag: 'a',
          props: { href: safeUrl(node.url ?? '', path, at) },
          children: compileChildren(node.children ?? [], path, at),
        },
      ]

    case 'image': {
      if (!node.url) {
        // An image with no source has no accessible presentation. Refusing is
        // more honest than emitting an `img` with a broken file path.
        throw new MdxCompileError(path, 'an image must have a source URL', at)
      }
      const alt = node.alt ?? ''
      if (alt.trim() === '') {
        // Alt text is an accessibility requirement, not a nicety. An image whose
        // alt is empty is decorative at best; in a lesson it is almost always a
        // mistake, so it is a build error rather than a warning.
        throw new MdxCompileError(path, `an image must have alt text (src: ${node.url})`, at)
      }
      const props: Record<string, ElementProp> = { src: safeUrl(node.url, path, at), alt }
      if (node.title) props['title'] = node.title
      return [{ kind: 'element', tag: 'img', props, children: [] }]
    }

    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement':
      return [compileJsx(node, path, at)]

    case 'definition':
      // A `[ref]: url` line. It produces no output on its own; the references that
      // use it are handled below. Kept as a no-op so a definition does not fail.
      return []

    /**
     * Reference-style links and footnotes.
     *
     * `[text][ref]`, `[ref]`, and `[^1]` are parsed to `linkReference` /
     * `imageReference` / `footnoteReference`, and resolving them needs a remark
     * pass this compiler does not run. Rather than emit an internal AST type name
     * to an author who wrote valid Markdown, refuse them with a message that
     * names the construct and the supported alternative. Supporting them is a
     * small, deliberate addition later — see BACKLOG.md.
     */
    case 'linkReference':
    case 'imageReference':
      throw new MdxCompileError(
        path,
        'reference-style links and images are not supported yet; use inline links like [text](https://example.com)',
        at,
      )

    case 'footnoteReference':
      throw new MdxCompileError(path, 'footnotes are not supported in lesson content', at)

    // --- explicitly refused -------------------------------------------------

    case 'mdxFlowExpression':
    case 'mdxTextExpression':
      throw new MdxCompileError(
        path,
        'JavaScript expressions ({ … }) are not allowed in lesson content',
        at,
      )

    case 'html':
      // Effectively unreachable under `remark-mdx`, which parses raw HTML as JSX
      // elements rather than `html` nodes — those are refused by the
      // lowercase-tag branch of `compileJsx`. Kept so that if the parser ever
      // emits `html`, it is refused here rather than reaching the tree.
      throw new MdxCompileError(
        path,
        'raw HTML is not allowed in lesson content; use Markdown or an allowed component',
        at,
      )

    case 'footnoteDefinition':
      throw new MdxCompileError(path, 'footnotes are not supported in lesson content', at)

    case 'table':
    case 'tableRow':
    case 'tableCell':
      // Unreachable with base `remark-parse` (tables stay as text) but listed so
      // the intent is explicit if `remark-gfm` is ever enabled.
      throw new MdxCompileError(path, 'GFM tables are not supported yet', at)

    default: {
      // `NODE_TAGS` covers the common block/inline nodes whose tag is fixed.
      const tag = NODE_TAGS[node.type]
      if (!tag) {
        throw new MdxCompileError(path, `unsupported MDX construct "${node.type}"`, at)
      }
      return [
        {
          kind: 'element',
          tag,
          props: {},
          children: compileChildren(node.children ?? [], path, at),
        },
      ]
    }
  }
}

/** Compile an MDX JSX element into either an element or a component node. */
const compileJsx = (node: MdastNode, path: string, line: number | undefined): CompiledNode => {
  const name = node.name
  if (!name) {
    // `<></>` — a fragment. Content has no use for one, since a fragment has no
    // semantics and the compiler already flattens children.
    throw new MdxCompileError(path, 'JSX fragments are not allowed in lesson content', line)
  }

  const props = compileAttributes(node.attributes ?? [], path, line)
  const children = compileChildren(node.children ?? [], path, line)

  // A lowercase name is an HTML element written directly in the MDX. It is
  // allowed only if it is in the element allowlist, so `<div class="...">` in
  // content is a build error rather than an arbitrary element in the tree.
  if (name[0] === name[0]?.toLowerCase() && name[0] !== undefined) {
    if (!isAllowedElement(name)) {
      throw new MdxCompileError(
        path,
        `HTML element <${name}> is not allowed in lesson content`,
        line,
      )
    }
    return {
      kind: 'element',
      tag: name,
      props: enforceElementRules(name, props, path, line),
      children,
    }
  }

  // A capitalised name is a custom curriculum component. The compiler records it
  // without judging it; the render-time allowlist decides whether it exists.
  return { kind: 'component', name, props, children }
}

/**
 * Compile JSX attributes, refusing anything that is not a literal value.
 *
 * Three things are refused, and all three matter:
 *
 *  1. A SPREAD (`{...props}`) is an `mdxJsxExpressionAttribute`. It can inject
 *     arbitrary properties, so it cannot be represented in the tree at all.
 *  2. An EXPRESSION value (`title={name}`) is an `mdxJsxAttribute` whose `value`
 *     is an object, not a string. The earlier version fell through to the final
 *     assignment and stored the whole AST node as the prop value — it shipped to
 *     the client and rendered as `[object Object]`. Any non-string, non-boolean
 *     value is now refused.
 *  3. An UNSAFE URL, on the `href`/`src` of any element. The URL policy has to run
 *     here as well as on the Markdown path, or writing `<a href="javascript:…">`
 *     instead of `[x](javascript:…)` bypasses it.
 */
const compileAttributes = (
  attributes: readonly MdastAttribute[],
  path: string,
  line: number | undefined,
): Record<string, ElementProp> => {
  const props: Record<string, ElementProp> = {}
  for (const attribute of attributes) {
    if (attribute.type === 'mdxJsxExpressionAttribute') {
      throw new MdxCompileError(
        path,
        'JSX spread and expression props are not allowed in lesson content',
        line,
      )
    }
    const value = attribute.value

    // A bare attribute, e.g. `<Callout dismissable>`.
    if (value === undefined || value === null) {
      props[attribute.name] = true
      continue
    }
    if (typeof value === 'boolean') {
      props[attribute.name] = value
      continue
    }
    if (typeof value !== 'string') {
      // An expression value arrives as an object (`mdxJsxAttributeValueExpression`).
      // It is not a literal, so it cannot be a prop.
      throw new MdxCompileError(
        path,
        `attribute "${attribute.name}" uses an expression; only literal values are allowed in lesson content`,
        line,
      )
    }

    // URL-bearing attributes go through the same policy as Markdown links.
    if (attribute.name === 'href' || attribute.name === 'src') {
      props[attribute.name] = safeUrl(value, path, line)
      continue
    }
    props[attribute.name] = value
  }
  return props
}

/**
 * Validate the props of an element produced by the JSX path against the same
 * rules the Markdown path applies.
 *
 * The two paths converge here so that accessibility and URL policy cannot be
 * bypassed by choosing one syntax over the other. Only `<img>` needs a rule
 * today, but it belongs in one place rather than in the JSX branch.
 */
const enforceElementRules = (
  tag: AllowedElement,
  props: Record<string, ElementProp>,
  path: string,
  line: number | undefined,
): Record<string, ElementProp> => {
  if (tag === 'img') {
    const alt = props['alt']
    if (typeof alt !== 'string' || alt.trim() === '') {
      throw new MdxCompileError(
        path,
        'an image must have alt text (every <img> needs an alt attribute)',
        line,
      )
    }
    if (typeof props['src'] !== 'string') {
      throw new MdxCompileError(path, 'an image must have a source URL', line)
    }
  }
  return props
}

const compileChildren = (
  children: readonly MdastNode[],
  path: string,
  line: number | undefined,
): CompiledNode[] => children.flatMap((child) => compileNode(child, path, line))

/**
 * Parse and compile a lesson body.
 *
 * `path` is the repo-relative source path and is used only to make errors
 * actionable. Throws `MdxCompileError` for malformed MDX and for any construct
 * outside the allowed vocabulary; a caller that does not catch it fails the
 * build, which is the intended behaviour.
 */
export const compileMdx = (body: string, path: string): CompiledBody => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx as unknown as Plugin)
  let mdast: MdastNode
  try {
    mdast = processor.parse(body) as unknown as MdastNode
  } catch (error) {
    // A syntax error from the parser. The parser's own message already carries
    // the line and column; it is prefixed with the file so a human can open it.
    const message = error instanceof Error ? error.message : String(error)
    throw new MdxCompileError(path, message)
  }
  return compileChildren([mdast], path, undefined)
}
