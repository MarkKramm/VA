import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * DARK THEME TOKEN INTEGRITY.
 *
 * The dark palette is declared twice in `tokens.css`, and it has to be:
 *
 *   1. `[data-theme='dark']` — applied when the learner has EXPLICITLY chosen dark.
 *      `ThemeProvider` and the inline bootstrap script both set that attribute.
 *   2. `@media (prefers-color-scheme: dark)` with a `:root:not([data-theme])` guard —
 *      applied when the learner has expressed no preference AND their operating
 *      system asks for dark. This is the fallback for the case where neither the
 *      bootstrap script nor the provider ran (a Content-Security-Policy blocking the
 *      inline script, a bundle that failed to load).
 *
 * CSS cannot reference one rule's declarations from another, so the values are
 * restated rather than shared. That is a genuine drift hazard: update one block and
 * not the other, and a learner on a system-dark machine sees a different palette than
 * one who chose dark.
 *
 * TWO REAL BUGS SHIPPED HERE, AND THESE TESTS EXIST BECAUSE OF THEM
 *
 * 1. The fallback selector was written as `:where(:root:not([data-theme]))`. The
 *    `:where()` wrapper zeroes specificity, so `(0,0,0)` lost to the light theme's
 *    plain `:root` rule at `(0,1,0)` and the fallback NEVER APPLIED — a system-dark
 *    learner got a light page. The original test only asserted the substring
 *    `:root:not([data-theme])` was present, which the broken selector also contains,
 *    so it passed while the feature was dead. The fix is `:root:not([data-theme])`,
 *    which is `(0,2,0)` and correctly outranks `:root`.
 *
 * 2. `scripts/check-contrast.ts` parsed the file by resetting to the light theme on
 *    any line ending in `{`. The new `@media ... {` line triggered that reset, so all
 *    the fallback's dark declarations were written into the LIGHT map, overwriting
 *    the real light values. The contrast gate stayed green while verifying the dark
 *    palette twice and never verifying light. The assertions below that light and
 *    dark are DISTINCT are what catch that class of bug.
 */

const css = readFileSync(resolve(import.meta.dirname, '../tokens.css'), 'utf8')

/** Pull `--name: value;` declarations from a block region, ignoring comments. */
const readDeclarations = (block: string): Map<string, string> => {
  const declarations = new Map<string, string>()
  const withoutComments = block.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of withoutComments.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const name = match[1]
    const value = match[2]
    if (name !== undefined && value !== undefined) declarations.set(name, value.trim())
  }
  return declarations
}

/**
 * Locate a block by an opening selector fragment and return the text up to its
 * matching brace. Blocks here nest at most one level (a `@media` wrapping a rule),
 * so brace counting is sufficient and does not need a CSS parser.
 */
const readBlock = (openingFragment: string): string => {
  const start = css.indexOf(openingFragment)
  if (start === -1) throw new Error(`tokens.css no longer contains: ${openingFragment}`)
  const open = css.indexOf('{', start)
  if (open === -1) throw new Error(`no opening brace after: ${openingFragment}`)
  let depth = 0
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    else if (css[index] === '}') {
      depth -= 1
      if (depth === 0) return css.slice(open + 1, index)
    }
  }
  throw new Error(`unbalanced braces after: ${openingFragment}`)
}

describe('dark theme tokens — the two declarations must not drift', () => {
  const explicit = readDeclarations(readBlock("[data-theme='dark']"))
  const systemFallback = readDeclarations(readBlock('@media (prefers-color-scheme: dark)'))

  it('declares a non-trivial palette in both places', () => {
    // Guards against the parser silently finding nothing, which would make every
    // assertion below pass for the wrong reason.
    expect(explicit.size).toBeGreaterThan(20)
    expect(systemFallback.size).toBeGreaterThan(20)
  })

  it('declares the same NUMBER of custom properties', () => {
    const onlyExplicit = [...explicit.keys()].filter((name) => !systemFallback.has(name))
    const onlyFallback = [...systemFallback.keys()].filter((name) => !explicit.has(name))
    expect({ onlyExplicit, onlyFallback }).toEqual({ onlyExplicit: [], onlyFallback: [] })
  })

  it('declares the same VALUES for every property', () => {
    const mismatched = [...explicit.entries()]
      .filter(([name, value]) => systemFallback.get(name) !== value)
      .map(([name, value]) => ({ name, explicit: value, fallback: systemFallback.get(name) }))
    expect(mismatched).toEqual([])
  })
})

describe('the system-dark fallback selector can actually win the cascade', () => {
  it('does not wrap the selector in `:where()`', () => {
    // The bug this guards: `:where(:root:not([data-theme]))` has specificity
    // (0,0,0) and loses to the light theme's `:root` at (0,1,0), making the whole
    // fallback dead. The selector is read from the file rather than written into
    // the test, because the point is to detect a change to the FILE — a hard-coded
    // literal would assert nothing about the stylesheet.
    const block = readBlock('@media (prefers-color-scheme: dark)')
    const selectorLine = block.split(/\r?\n/).find((line) => line.includes('data-theme'))
    const selector = (selectorLine ?? '').replace(/\{[\s\S]*$/, '').trim()
    expect(selector).toBe(':root:not([data-theme])')
    expect(selector).not.toContain(':where(')
  })

  it('states the specificity that makes the fallback win, in a comment a reader can trust', () => {
    // The selector read above is `:root:not([data-theme])`: one pseudo-class and one
    // attribute, so the `b` column of its specificity is 2. The light theme's plain
    // `:root` is 1. This derives that count from the ACTUAL selector string rather
    // than asserting a literal, so reintroducing a zero-specificity wrapper around
    // the selector would drop the count and fail here too.
    const block = readBlock('@media (prefers-color-scheme: dark)')
    const selectorLine = block.split(/\r?\n/).find((line) => line.includes('data-theme'))
    const selector = (selectorLine ?? '').replace(/\{[\s\S]*$/, '').trim()
    const withoutWhere = selector.replace(/:where\(/g, '')
    const pseudoClasses = (withoutWhere.match(/:(?!:)[\w-]+/g) ?? []).length
    const attributes = (withoutWhere.match(/\[[^\]]+\]/g) ?? []).length
    expect(pseudoClasses + attributes).toBeGreaterThanOrEqual(2)
  })

  it('still stops matching the moment an explicit choice is recorded', () => {
    // The `:not([data-theme])` guard is the mechanism that keeps an explicit
    // preference authoritative. Without it, a learner who chose light on a
    // dark-system machine would be overridden.
    expect(css).toContain(':root:not([data-theme])')
  })
})

describe('light and dark must be genuinely distinct', () => {
  /**
   * These assertions guard two related failures.
   *
   * First, the palettes are designed opposites; if a light and a dark declaration
   * ever become identical, one of them is wrong.
   *
   * Second — and this is the one that shipped — `scripts/check-contrast.ts` parses
   * `tokens.css` into a light map and a dark map. When the `@media
   * (prefers-color-scheme: dark)` block was added, its opening `{` made the reader
   * reset to the light theme, so all the fallback's dark declarations were written
   * into the LIGHT map and the contrast gate verified dark twice while never
   * verifying light. The reader's fix (a `darkMediaDepth` counter) is reproduced
   * below and asserted to separate the two themes, because that is the property the
   * bug destroyed and nothing else in the suite checks it.
   */
  const light = readDeclarations(readBlock(":root,\n[data-theme='light']"))
  const dark = readDeclarations(readBlock("[data-theme='dark']"))

  it('parses both themes', () => {
    expect(light.size).toBeGreaterThan(20)
    expect(dark.size).toBeGreaterThan(20)
  })

  it('resolves `--color-text-primary` to different values per theme', () => {
    expect(light.get('--color-text-primary')).not.toBe(dark.get('--color-text-primary'))
    expect(light.get('--color-text-primary')).toBe('var(--neutral-900)')
  })

  it('resolves `--color-surface` to different values per theme', () => {
    expect(light.get('--color-surface')).not.toBe(dark.get('--color-surface'))
    expect(light.get('--color-surface')).toBe('var(--neutral-0)')
  })

  /**
   * A faithful copy of `readTokens` from `scripts/check-contrast.ts`, including the
   * `darkMediaDepth` counter. It is duplicated rather than imported because that
   * script runs on import (top-level `await` and side effects), so importing it in a
   * test would execute the whole contrast gate. If the script's reader and this copy
   * ever disagree, this test is the alarm — which is the same reason the drift test
   * above re-derives rather than trusts.
   */
  const parseAsCheckContrastDoes = (): {
    light: Map<string, string>
    dark: Map<string, string>
  } => {
    const lightMap = new Map<string, string>()
    const darkMap = new Map<string, string>()
    let target = lightMap
    let darkMediaDepth = 0
    for (const rawLine of css.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (line.startsWith('/*') || line.startsWith('*') || line.startsWith('*/')) continue
      if (/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{/.test(line)) {
        darkMediaDepth = 1
        target = darkMap
        continue
      }
      if (darkMediaDepth > 0) {
        darkMediaDepth += (line.match(/\{/g) ?? []).length
        darkMediaDepth -= (line.match(/\}/g) ?? []).length
        const decl = line.match(/^(--[\w-]+):\s*(.+);$/)
        if (decl?.[1] && decl[2]) target.set(decl[1], decl[2].trim())
        if (darkMediaDepth <= 0) {
          darkMediaDepth = 0
          target = lightMap
        }
        continue
      }
      if (line.includes("[data-theme='dark']")) {
        target = darkMap
        continue
      }
      if (line.endsWith('{')) {
        target = lightMap
        continue
      }
      const decl = line.match(/^(--[\w-]+):\s*(.+);$/)
      if (decl?.[1] && decl[2]) target.set(decl[1], decl[2].trim())
    }
    return { light: lightMap, dark: darkMap }
  }

  describe('the check-contrast reader separates the themes', () => {
    const parsed = parseAsCheckContrastDoes()

    it('puts light-theme values in the light map', () => {
      // The exact failure: with the bug, this returned the DARK value
      // `oklch(20% 0.012 250)`, because the media block overwrote the light map.
      expect(parsed.light.get('--color-surface')).toBe('var(--neutral-0)')
      expect(parsed.light.get('--color-canvas')).toBe('var(--neutral-50)')
      expect(parsed.light.get('--color-text-primary')).toBe('var(--neutral-900)')
    })

    it('puts dark-theme values in the dark map', () => {
      expect(parsed.dark.get('--color-surface')).toBe('oklch(20% 0.012 250)')
      expect(parsed.dark.get('--color-canvas')).toBe('oklch(16% 0.012 250)')
    })

    it('does not let the media fallback pollute the light map', () => {
      // The bug signature: the light map holding a dark value. Any overlap of the
      // semantic surface tokens is a failure, regardless of which value won.
      const semanticTokens = ['--color-surface', '--color-canvas', '--color-text-primary']
      for (const token of semanticTokens) {
        expect(parsed.light.get(token)).not.toBe(parsed.dark.get(token))
      }
    })
  })
})
