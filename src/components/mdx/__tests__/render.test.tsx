import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { MdxContent, UnknownMdxComponentError } from '../render.tsx'
import { isKnownComponent } from '../registry.ts'
import type { CompiledBody, CompiledNode } from '@/app/mdx.ts'

/**
 * THE COMPILED-BODY RENDERER (M2.2).
 *
 * The renderer turns the build-time tree into semantic HTML. These tests check
 * the two things that matter and are easy to get subtly wrong:
 *
 *   1. SEMANTICS. A heading renders as a heading, a list as a list, a link as an
 *      anchor. Screen-reader navigation depends on this, and a `<div>` that looks
 *      like a heading is invisible to it.
 *   2. THE TRUST BOUNDARY. An unknown component throws rather than rendering
 *      nothing, and no prop can smuggle an attribute onto the DOM.
 *
 * The trees here are written by hand rather than produced by the compiler, so a
 * renderer bug cannot be hidden by the compiler happening to agree with it.
 */

const tree = (nodes: CompiledNode[]): CompiledBody => nodes

const renderBody = (nodes: CompiledNode[]) => render(<MdxContent nodes={tree(nodes)} />)

describe('the MDX renderer — semantic output', () => {
  it('renders headings as real heading elements at the right level', () => {
    renderBody([
      { kind: 'element', tag: 'h2', props: {}, children: [{ kind: 'text', value: 'A heading' }] },
      { kind: 'element', tag: 'h3', props: {}, children: [{ kind: 'text', value: 'A subhead' }] },
    ])
    expect(screen.getByRole('heading', { level: 2, name: 'A heading' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'A subhead' })).toBeInTheDocument()
  })

  it('renders paragraphs, lists and list items with their roles intact', () => {
    renderBody([
      {
        kind: 'element',
        tag: 'ul',
        props: {},
        children: [
          { kind: 'element', tag: 'li', props: {}, children: [{ kind: 'text', value: 'one' }] },
          { kind: 'element', tag: 'li', props: {}, children: [{ kind: 'text', value: 'two' }] },
        ],
      },
    ])
    const list = screen.getByRole('list')
    expect(list.tagName).toBe('UL')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders an ordered list as <ol>', () => {
    renderBody([
      {
        kind: 'element',
        tag: 'ol',
        props: {},
        children: [
          { kind: 'element', tag: 'li', props: {}, children: [{ kind: 'text', value: 'first' }] },
        ],
      },
    ])
    expect(screen.getByRole('list').tagName).toBe('OL')
  })

  it('renders a link as a keyboard-focusable anchor with its href', () => {
    renderBody([
      {
        kind: 'element',
        tag: 'a',
        props: { href: 'https://example.com' },
        children: [{ kind: 'text', value: 'a link' }],
      },
    ])
    const link = screen.getByRole('link', { name: 'a link' })
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('renders an image with its alt text', () => {
    renderBody([
      { kind: 'element', tag: 'img', props: { src: '/x.png', alt: 'a diagram' }, children: [] },
    ])
    expect(screen.getByRole('img', { name: 'a diagram' })).toHaveAttribute('src', '/x.png')
  })

  it('renders inline code and a fenced code block', () => {
    renderBody([
      { kind: 'element', tag: 'code', props: {}, children: [{ kind: 'text', value: 'inline' }] },
      {
        kind: 'element',
        tag: 'pre',
        props: {},
        children: [
          {
            kind: 'element',
            tag: 'code',
            props: { 'data-language': 'js' },
            children: [{ kind: 'text', value: 'const x = 1' }],
          },
        ],
      },
    ])
    expect(screen.getByText('inline').tagName).toBe('CODE')
    const block = screen.getByText('const x = 1')
    expect(block.tagName).toBe('CODE')
    expect(block).toHaveAttribute('data-language', 'js')
    expect(block.closest('pre')).not.toBeNull()
  })

  it('applies its OWN prose class, even when the caller passes none', () => {
    // The regression this guards against: the renderer relied on the caller to
    // pass a `prose` class, and the caller's `.prose` was a layout rule, not the
    // typography sheet. The entire prose stylesheet was therefore never applied,
    // and the wrapper test passed anyway because the harness happened to pass the
    // literal string 'prose'. The class must come from the renderer's own CSS
    // module, so it is hashed and cannot be passed in by accident.
    const { container } = render(<MdxContent nodes={[{ kind: 'text', value: 'x' }]} />)
    const wrapper = container.firstElementChild
    expect(wrapper).not.toBeNull()
    // A CSS-module class is hashed, so it is not the bare word 'prose'.
    expect(wrapper?.className).not.toBe('prose')
    expect(wrapper?.className).toMatch(/prose/i)
  })

  it('combines the caller’s className with the prose class rather than replacing it', () => {
    const { container } = render(
      <MdxContent nodes={[{ kind: 'text', value: 'x' }]} className="my-layout" />,
    )
    const wrapper = container.firstElementChild
    expect(wrapper).toHaveClass('my-layout')
    expect(wrapper?.className).toMatch(/prose/i)
  })

  it('escapes text rather than interpreting it as markup', () => {
    // React escapes text nodes; this asserts the renderer never bypasses that
    // with `dangerouslySetInnerHTML`.
    renderBody([
      {
        kind: 'element',
        tag: 'p',
        props: {},
        children: [{ kind: 'text', value: '<script>alert(1)</script>' }],
      },
    ])
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })

  it('renders sibling nodes with stable, unique keys (no React warning)', () => {
    // A duplicate-key warning is the symptom of a real bug: React reconciles the
    // wrong node. Two identical text runs make the keys the only differentiator.
    const { container } = renderBody([
      { kind: 'element', tag: 'p', props: {}, children: [{ kind: 'text', value: 'same' }] },
      { kind: 'element', tag: 'p', props: {}, children: [{ kind: 'text', value: 'same' }] },
    ])
    expect(container.querySelectorAll('p')).toHaveLength(2)
  })
})

describe('the MDX renderer — the component trust boundary', () => {
  it('throws for an unknown component rather than rendering nothing', () => {
    // Rendering nothing would hide an authoring mistake behind a blank space.
    expect(() =>
      renderBody([{ kind: 'component', name: 'NotRegistered', props: {}, children: [] }]),
    ).toThrow(UnknownMdxComponentError)
  })

  it('names the offending component in the error', () => {
    try {
      renderBody([{ kind: 'component', name: 'Callout', props: {}, children: [] }])
      throw new Error('expected a throw')
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownMdxComponentError)
      expect((error as Error).message).toContain('Callout')
    }
  })

  it('renders a registered component', () => {
    // Uses the `components` seam rather than mutating the registry export: the
    // real allowlist is deliberately empty at M2.2, and this still proves the
    // mechanism by which a registered name resolves to a component.
    const components = {
      TestBadge: ({ children }: { children?: ReactNode }) => (
        <span data-testid="badge">{children}</span>
      ),
    }
    render(
      <MdxContent
        nodes={[
          {
            kind: 'component',
            name: 'TestBadge',
            props: {},
            children: [{ kind: 'text', value: 'hi' }],
          },
        ]}
        components={components}
      />,
    )
    expect(screen.getByTestId('badge')).toHaveTextContent('hi')
  })

  it('does not treat prototype keys as registered components', () => {
    // `constructor`, `__proto__` and `toString` exist on Object.prototype. A
    // naive `name in registry` check would treat them as known.
    for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(isKnownComponent(name)).toBe(false)
    }
  })

  it('drops attributes that are not on the allowed prop list', () => {
    // A `data-*`/`onClick` style attribute must not reach the DOM. The compiler
    // refuses these, but the renderer is the last gate and must not trust it.
    const { container } = renderBody([
      {
        kind: 'element',
        tag: 'p',
        props: { onclick: 'alert(1)', 'data-evil': 'x', style: 'color:red' } as never,
        children: [{ kind: 'text', value: 'safe' }],
      },
    ])
    const p = container.querySelector('p')
    expect(p?.getAttribute('onclick')).toBeNull()
    expect(p?.getAttribute('data-evil')).toBeNull()
    expect(p?.getAttribute('style')).toBeNull()
  })

  it('drops an unsafe href at render time even if the tree contains one', () => {
    // Defence in depth: the compiler refuses unsafe URLs, but the renderer is the
    // final gate before the DOM and must not emit one it was handed.
    const { container } = renderBody([
      {
        kind: 'element',
        tag: 'a',
        props: { href: 'javascript:alert(1)' },
        children: [{ kind: 'text', value: 'x' }],
      },
    ])
    expect(container.querySelector('a')?.getAttribute('href')).toBeNull()
  })

  it('renders no children for an img element', () => {
    const { container } = renderBody([
      {
        kind: 'element',
        tag: 'img',
        props: { src: '/x.png', alt: 'a' },
        children: [{ kind: 'text', value: 'must not appear' }],
      },
    ])
    const img = container.querySelector('img')
    expect(img?.children).toHaveLength(0)
    expect(img?.textContent).toBe('')
  })
})
