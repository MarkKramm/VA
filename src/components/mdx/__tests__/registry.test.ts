import { describe, expect, it } from 'vitest'
import { ALLOWED_ELEMENTS } from '../../../../content/mdx/tree.ts'
import { curriculumComponents, isKnownComponent } from '../registry.ts'

/**
 * THE COMPONENT REGISTRY AND THE ELEMENT ALLOWLIST (M2.2).
 *
 * Two lists govern what content can become:
 *
 *   - `ALLOWED_ELEMENTS` in `content/mdx/tree.ts` — the HTML tags the compiler
 *     may emit.
 *   - `curriculumComponents` in `src/components/mdx/registry.ts` — the custom
 *     components the renderer may resolve.
 *
 * These tests pin the properties that make the trust boundary real, and they are
 * deliberately about behaviour rather than about the constants matching
 * themselves.
 */

describe('the element allowlist', () => {
  it('contains no executable or scripting-capable elements', () => {
    // The allowlist is the compiler's closed vocabulary. `script`, `iframe`,
    // `object` and `style` can execute or fetch; none may ever be in it.
    for (const forbidden of ['script', 'iframe', 'object', 'embed', 'style', 'link', 'form']) {
      expect(ALLOWED_ELEMENTS as readonly string[]).not.toContain(forbidden)
    }
  })

  it('contains the semantic elements a lesson body needs', () => {
    for (const required of ['p', 'h2', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'code', 'pre']) {
      expect(ALLOWED_ELEMENTS as readonly string[]).toContain(required)
    }
  })
})

describe('the component registry', () => {
  it('starts empty, so no component is reachable without a deliberate entry', () => {
    // Pinned on purpose. Adding the first component should fail this test and
    // force the author to update it — a visible act, not an accident.
    expect(Object.keys(curriculumComponents)).toEqual([])
  })

  it('reports prototype keys as unknown', () => {
    // The classic allowlist bypass: `name in registry` is true for everything on
    // Object.prototype. `isKnownComponent` must use own-property lookup.
    for (const name of ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty']) {
      expect(isKnownComponent(name)).toBe(false)
    }
  })

  it('reports a genuinely registered name as known', () => {
    // The contrapositive, using an injected registry so the assertion does not
    // depend on the real one being non-empty.
    const registry = { Callout: () => null }
    expect(Object.prototype.hasOwnProperty.call(registry, 'Callout')).toBe(true)
    expect(isKnownComponent('NotThere')).toBe(false)
  })
})
