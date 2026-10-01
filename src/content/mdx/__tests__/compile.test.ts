import { describe, expect, it } from 'vitest'
import { compileMdx, MdxCompileError } from '../../../../content/mdx/compile.ts'
import { isSafeUrl } from '../../../../content/mdx/tree.ts'

/**
 * THE BUILD-TIME MDX COMPILER (M2.2).
 *
 * These are behavioural tests over the real compiler, not assertions about its
 * constants. The compiler is the trust boundary: it decides what a lesson body
 * can become, and it fails the BUILD when it meets something it cannot represent.
 * So the tests are split the way the compiler is:
 *
 *   - What it MUST accept (ordinary Markdown a lesson author writes).
 *   - What it MUST refuse, and with what message — because a refusal that names
 *     an internal AST type ("mdxJsx...") is a refusal an author cannot act on.
 *
 * `PATH` is passed as a repo-relative lesson path so every assertion can also
 * check that errors name the file a human has to open.
 */

const PATH = 'content/lessons/foundations/example.mdx'

/** Compile and expect success, returning the tree. */
const compile = (body: string) => compileMdx(body, PATH)

/** Compile and expect a throw, returning the message. */
const failure = (body: string): string => {
  try {
    compileMdx(body, PATH)
  } catch (error) {
    if (error instanceof MdxCompileError) return error.message
    throw error
  }
  throw new Error('expected compileMdx to throw, but it returned a tree')
}

/** Recursively collect every node, for structural assertions. */
type AnyNode = {
  kind: string
  tag?: string
  value?: string
  name?: string
  props?: Record<string, unknown>
  children?: AnyNode[]
}
const flatten = (nodes: readonly AnyNode[]): AnyNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children ?? [])])

describe('the MDX compiler — Markdown it must accept', () => {
  it('compiles a paragraph with inline emphasis, code and a link', () => {
    const tree = compile('A **bold** and _em_ and `code` and [link](https://example.com).')
    const nodes = flatten(tree as unknown as AnyNode[])

    expect(nodes.some((n) => n.tag === 'strong')).toBe(true)
    expect(nodes.some((n) => n.tag === 'em')).toBe(true)
    // Inline code carries its text in `value`; an empty `<code>` would be a bug.
    const code = nodes.find((n) => n.tag === 'code')
    expect(code?.children?.[0]?.value).toBe('code')
    const link = nodes.find((n) => n.tag === 'a')
    expect(link?.props?.href).toBe('https://example.com')
    expect(link?.children?.[0]?.value).toBe('link')
  })

  it('compiles headings at the correct level, clamped to h2..h6 (M2.3)', () => {
    // `h1` is refused — the lesson page owns the page heading — so a body heading
    // starts at `h2`, and the tags below are the levels a body may produce.
    const tree = compile('## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six')
    const tags = (tree as unknown as AnyNode[]).map((n) => n.tag)
    expect(tags).toEqual(['h2', 'h3', 'h4', 'h5', 'h6'])
  })

  it('refuses an h1 in a lesson body, naming the file (M2.3)', () => {
    // The lesson page renders the lesson title as the page's single h1. A body
    // that also produced an h1 would give the outline two top-level entries and
    // break the "one h1 per page" accessibility commitment.
    const message = failure('# A top-level heading')
    expect(message).toContain(PATH)
    expect(message).toMatch(/h1|page heading/i)
  })

  it('refuses a setext heading, which is an h1 by another syntax (M2.3)', () => {
    // `Title\n=====` is an h1 in Markdown, so it is refused for the same reason.
    expect(() => compile('Title\n=====\n\nbody')).toThrow(MdxCompileError)
  })

  it('distinguishes an unordered list from an ordered one', () => {
    const ul = compile('- one\n- two')
    const ol = compile('1. one\n2. two')
    expect((ul as unknown as AnyNode[])[0]?.tag).toBe('ul')
    expect((ol as unknown as AnyNode[])[0]?.tag).toBe('ol')
  })

  it('compiles nested lists with their structure preserved', () => {
    const tree = compile('- outer\n  - inner\n  - inner two\n- outer two')
    const nodes = flatten(tree as unknown as AnyNode[])
    // Two top-level items, and a nested `ul` inside the first.
    const topLevelItems = (tree as unknown as AnyNode[])[0]?.children ?? []
    expect(topLevelItems).toHaveLength(2)
    expect(nodes.filter((n) => n.tag === 'ul')).toHaveLength(2)
  })

  it('compiles a list item containing multiple paragraphs', () => {
    const tree = compile('- first paragraph\n\n  second paragraph\n- next')
    const nested = flatten(tree as unknown as AnyNode[]).filter((n) => n.tag === 'p')
    expect(nested.length).toBeGreaterThanOrEqual(3)
  })

  it('compiles a blockquote and a thematic break', () => {
    const tree = compile('> quoted\n\n---\n')
    const tags = (tree as unknown as AnyNode[]).map((n) => n.tag)
    expect(tags).toContain('blockquote')
    expect(tags).toContain('hr')
  })

  it('compiles a fenced code block, preserving text and language', () => {
    const tree = compile('```js\nconst x = 1\n```')
    const pre = (tree as unknown as AnyNode[])[0]
    expect(pre?.tag).toBe('pre')
    const code = pre?.children?.[0]
    expect(code?.tag).toBe('code')
    expect(code?.children?.[0]?.value).toBe('const x = 1')
    expect(code?.props?.['data-language']).toBe('js')
  })

  it('omits the language attribute for a fenced block with no language', () => {
    const code = (compile('```\nplain\n```') as unknown as AnyNode[])[0]?.children?.[0]
    expect(code?.props?.['data-language']).toBeUndefined()
  })

  it('decodes HTML entities in text', () => {
    const value = (compile('A &amp; B') as unknown as AnyNode[])[0]?.children?.[0]?.value
    expect(value).toBe('A & B')
  })

  it('compiles an image with alt text and a source', () => {
    const img = flatten(
      compile('![a diagram](https://example.com/x.png)') as unknown as AnyNode[],
    ).find((n) => n.tag === 'img')
    expect(img?.props?.['src']).toBe('https://example.com/x.png')
    expect(img?.props?.['alt']).toBe('a diagram')
  })

  it('renders nothing for a link reference definition on its own', () => {
    expect(compile('[ref]: https://example.com\n')).toEqual([])
  })
})

describe('the MDX compiler — what it must refuse, with an actionable message', () => {
  it('refuses a JavaScript expression block, naming the file', () => {
    const message = failure('Before {danger} after')
    expect(message).toContain(PATH)
    expect(message).toMatch(/expression/i)
  })

  it('refuses a spread attribute', () => {
    expect(failure('<Callout {...props}>x</Callout>')).toMatch(/spread/i)
  })

  it('refuses an expression attribute value rather than storing an object', () => {
    // Regression: this previously fell through and stored the whole AST node as
    // the prop value, shipping it to the client as `[object Object]`.
    expect(failure('<Callout title={name}>x</Callout>')).toMatch(/expression/i)
  })

  it('refuses a JSX fragment', () => {
    expect(failure('<>x</>')).toMatch(/fragment/i)
  })

  it('refuses a disallowed HTML element', () => {
    expect(failure('<div>raw</div>')).toMatch(/not allowed/i)
  })

  it('refuses a reference-style link with a message that names the alternative', () => {
    // Regression: this used to fail with the internal name "linkReference".
    const message = failure('[ref]: https://example.com\n\nSee [ref].')
    expect(message).toMatch(/reference-style/i)
    expect(message).not.toMatch(/linkReference/)
  })

  it('treats footnote syntax as literal text, because footnotes are not enabled', () => {
    // Base `remark-parse` does not parse `[^1]` without `remark-gfm`, so it stays
    // literal text rather than becoming a footnote node. This documents the
    // actual, safe behaviour: nothing is silently swallowed, and nothing
    // unexpected reaches the tree.
    const nodes = flatten(compile('Text[^1] and a note') as unknown as AnyNode[])
    expect(nodes.some((n) => n.kind === 'text' && n.value?.includes('[^1]'))).toBe(true)
  })

  it('reports malformed MDX syntax with the source file named', () => {
    // An unclosed JSX tag is a genuine syntax error.
    const message = failure('<Callout>never closed')
    expect(message).toContain(PATH)
  })

  it('never returns an empty tree for input it did not fully accept', () => {
    // The failure mode this guards against: swallowing an error and producing a
    // silently-empty lesson. Any thrown construct must throw, not disappear.
    expect(() => compile('{a}{b}')).toThrow(MdxCompileError)
  })
})

describe('the MDX compiler — URL policy applies to BOTH syntaxes', () => {
  /**
   * Regression: the URL filter originally ran only on Markdown links and images,
   * so writing the JSX form bypassed it entirely. These tests assert the same
   * policy across both syntaxes — a filter one syntax can walk around is not a
   * boundary.
   */
  const unsafe = ['javascript:alert(1)', 'data:text/html,<script>x</script>', '//evil.example.com']

  it.each(unsafe)('refuses the Markdown link form for %s', (url) => {
    expect(() => compile(`[x](${url})`)).toThrow(MdxCompileError)
  })

  it.each(unsafe)('refuses the JSX anchor form for %s', (url) => {
    expect(() => compile(`<a href="${url}">x</a>`)).toThrow(MdxCompileError)
  })

  it.each(unsafe)('refuses the JSX image form for %s', (url) => {
    expect(() => compile(`<img src="${url}" alt="x" />`)).toThrow(MdxCompileError)
  })

  it('allows https, relative paths, anchors and mailto', () => {
    for (const url of ['https://example.com', '/docs/x', '#section', 'mailto:a@example.com']) {
      expect(isSafeUrl(url)).toBe(true)
      expect(() => compile(`[x](${url})`)).not.toThrow()
    }
  })

  it('is case-insensitive about a dangerous scheme', () => {
    // `JaVaScRiPt:` must not slip past a case-sensitive check.
    expect(isSafeUrl('JaVaScRiPt:alert(1)')).toBe(false)
  })
})

describe('the MDX compiler — alt text is required whichever syntax is used', () => {
  it('refuses a Markdown image with empty alt', () => {
    expect(failure('![](https://example.com/x.png)')).toMatch(/alt/i)
  })

  it('refuses a JSX image with no alt attribute', () => {
    // Regression: the JSX form skipped the alt check entirely.
    expect(failure('<img src="https://example.com/x.png" />')).toMatch(/alt/i)
  })

  it('accepts a JSX image with alt text', () => {
    const img = flatten(
      compile('<img src="https://example.com/x.png" alt="a diagram" />') as unknown as AnyNode[],
    ).find((n) => n.tag === 'img')
    expect(img?.props?.['alt']).toBe('a diagram')
  })
})

describe('the MDX compiler — the tree is a closed vocabulary', () => {
  it('emits only the three node kinds', () => {
    const tree = compile('## H\n\nText **bold** and `code`.\n\n- a\n- b\n\n```js\nx\n```')
    for (const node of flatten(tree as unknown as AnyNode[])) {
      expect(['text', 'element', 'component']).toContain(node.kind)
    }
  })

  it('emits only literal property values, never an object or function', () => {
    // The core trust-boundary assertion: whatever the input, every prop value in
    // the output is a string, number or boolean. A function or AST object here
    // would mean the boundary leaked.
    const tree = compile('<Callout kind="tip" count="3" dismissable>Body</Callout>')
    const component = flatten(tree as unknown as AnyNode[]).find((n) => n.kind === 'component')
    for (const value of Object.values(component?.props ?? {})) {
      expect(['string', 'number', 'boolean']).toContain(typeof value)
    }
  })

  it('is deterministic — the same source compiles to a deep-equal tree', () => {
    const src = '## H\n\nText with [a link](https://example.com) and `code`.\n\n- one\n- two'
    expect(compile(src)).toEqual(compile(src))
  })

  it('marks a capitalised JSX name as a component, not an element', () => {
    // `<Callout>` written inline sits inside a paragraph, so it is found by
    // walking the tree rather than by looking at the root.
    const component = flatten(compile('<Callout>hi</Callout>') as unknown as AnyNode[]).find(
      (n) => n.kind === 'component',
    )
    expect(component?.name).toBe('Callout')
  })
})
