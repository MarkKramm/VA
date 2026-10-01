import { createElement, type ReactNode } from 'react'
import type { CompiledNode, ElementNode } from '@/app/mdx.ts'
import { isSafeUrl } from '@/app/mdx.ts'
import { curriculumComponents, type CurriculumComponent } from './registry.ts'
import styles from './prose.module.css'

/**
 * THE COMPILED-BODY RENDERER (M2.2, moved to `src/components/` at M2.3).
 *
 * Renders the tree produced at build time by `content/mdx/compile.ts`. See
 * `DECISIONS.md` D22 for why content is a tree rather than compiled JavaScript.
 *
 * WHY THIS LIVES IN `src/components/` AND NOT `src/content/`
 *
 * It is a PRESENTATION component: it turns data into DOM, which is the definition
 * of the components layer, and it is used by a feature (the lesson page), which
 * is what makes it cross-feature rather than feature-local. `ARCHITECTURE.md` is
 * explicit that UI code may not import from `content/`; before M2.3 nothing in
 * `src/features/` rendered a body, so the violation was latent. The lesson page
 * is what surfaced it, and the fix is to put the renderer where the architecture
 * says a cross-feature component belongs.
 *
 * The tree FORMAT still lives in `content/mdx/tree.ts` — it is a property of what
 * the build produces, not of the application. This file reads it through the
 * `src/app/mdx.ts` seam, exactly as a feature reads curriculum through
 * `src/app/content.ts`.
 *
 * WHAT THIS FILE'S JOB IS
 *
 * The compiler guarantees the tree's SHAPE; this renderer guarantees its
 * SEMANTICS. Every element the compiler can emit maps to a real HTML element
 * here, so the output is semantic by construction rather than by a wrapper div
 * that happens to contain headings. There is no `dangerouslySetInnerHTML`
 * anywhere: the tree contains text and element nodes only, and React escapes the
 * text.
 *
 * WHY AN UNKNOWN COMPONENT THROWS
 *
 * A component name that is not in the registry cannot be rendered, and pretending
 * otherwise — rendering nothing, or rendering a placeholder — would hide an
 * authoring mistake behind a blank space. Throwing surfaces it in the error
 * boundary the route already has, with the name in the message. This is a
 * render-time counterpart to the compile-time refusal of unknown constructs.
 */
export class UnknownMdxComponentError extends Error {
  constructor(readonly componentName: string) {
    super(
      `Unknown MDX component <${componentName}>. Add it to src/components/mdx/registry.ts to allow it in lesson content.`,
    )
    this.name = 'UnknownMdxComponentError'
  }
}

/**
 * Props that become React props directly, for the elements that take them.
 */
const renderProps = (node: ElementNode, keyPrefix: string): Record<string, unknown> => {
  const props: Record<string, unknown> = { key: keyPrefix }
  for (const [name, value] of Object.entries(node.props)) {
    if (name === 'href' || name === 'src') {
      // Re-validate at render time rather than trusting the compiler. The
      // compiler already refuses an unsafe URL, but the renderer is the last gate
      // before the DOM, and a value that is not a safe string is dropped rather
      // than emitted. Defence in depth for the one attribute class that can
      // execute or navigate.
      if (typeof value === 'string' && isSafeUrl(value)) props[name] = value
      continue
    }
    if (name === 'alt' || name === 'title') {
      props[name] = value
      continue
    }
    if (name === 'data-language') {
      // A CSS hook for a future highlighter. Kept on the element rather than
      // dropped, so syntax highlighting later is a stylesheet change.
      props['data-language'] = value
      continue
    }
    // Any other attribute is dropped rather than spread. Content cannot pass
    // `onClick`, `dangerouslySetInnerHTML` or an arbitrary attribute through.
    // The compiler already refuses expression props; this is the second gate.
  }
  return props
}

const renderNode = (
  node: CompiledNode,
  key: string,
  components: Readonly<Record<string, CurriculumComponent>>,
): ReactNode => {
  if (node.kind === 'text') return node.value

  if (node.kind === 'component') {
    const Component = Object.prototype.hasOwnProperty.call(components, node.name)
      ? components[node.name]
      : undefined
    if (!Component) throw new UnknownMdxComponentError(node.name)
    return createElement(
      Component,
      { key, ...node.props },
      ...node.children.map((child, index) => renderNode(child, `${key}.${index}`, components)),
    )
  }

  const Tag = node.tag
  const children = node.children.map((child, index) =>
    renderNode(child, `${key}.${index}`, components),
  )

  // `img` is void and must not receive children.
  if (Tag === 'img') return createElement('img', renderProps(node, key))

  // Every other tag is an `AllowedElement`, which the compiler guarantees and a
  // test asserts is exactly the set of HTML tags content may produce. Rendering
  // it directly is what keeps the output semantic: a heading is an `<h2>`, not a
  // `<div>` styled to look like one.
  return createElement(Tag, renderProps(node, key), ...children)
}

/**
 * Render a compiled lesson body.
 *
 * `keyPrefix` namespaces React keys, so two bodies on one page cannot collide.
 *
 * THE `.prose` CLASS IS APPLIED HERE, NOT BY THE CALLER
 *
 * The prose stylesheet is what makes a compiled body readable — heading rhythm,
 * list spacing, code blocks. It is attached by the renderer so that ANY caller
 * gets styled body text, and so the typography cannot silently go missing
 * because a page forgot to pass a class name. The `className` prop is ADDITIONAL,
 * for layout the surrounding page owns (a margin, a grid slot); it is combined
 * with the prose class rather than replacing it.
 */
export const MdxContent = ({
  nodes,
  className,
  keyPrefix = 'mdx',
  components = curriculumComponents,
}: {
  readonly nodes: readonly CompiledNode[]
  readonly className?: string
  readonly keyPrefix?: string
  /**
   * The component allowlist to resolve against. Defaults to the curriculum
   * registry. Overriding it is a TESTABILITY seam: the registry is deliberately
   * empty at M2.2, and a test still needs to prove that a registered component
   * renders and an unregistered one throws.
   */
  readonly components?: Readonly<Record<string, CurriculumComponent>>
}): ReactNode =>
  createElement(
    'div',
    { className: className ? `${styles.prose} ${className}` : styles.prose },
    ...nodes.map((node, index) => renderNode(node, `${keyPrefix}.${index}`, components)),
  )
