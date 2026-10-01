import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LocalStorageAdapter } from '@/app/storage/localStorage.ts'
import { THEME_STORAGE_KEY, type ThemePreference } from '@/app/storage/theme.ts'

/**
 * THEME BOOTSTRAP CONTRACT.
 *
 * `index.html` contains a small inline script that sets `data-theme` before first
 * paint. It cannot import `src/app/storage/theme.ts`, because that is a module the
 * bundler has not loaded at the point the script runs, so the storage key and the
 * value encoding are written out literally there. That is a deliberate duplication
 * of two facts that live in `theme.ts`.
 *
 * Duplication without a test is a trap. If someone renames the key in `theme.ts`,
 * or changes the adapter to stop JSON-encoding, the inline script keeps reading the
 * old shape, silently finds nothing, and every learner who chose dark mode gets a
 * white flash on navigation - the exact bug the script exists to prevent, and one
 * that is invisible in tests because the tests render the provider, not the HTML.
 *
 * These tests read `index.html` as text and assert that the values it hard-codes
 * still agree with the real implementation. They are source assertions rather than
 * DOM assertions on purpose: the script runs in the browser before any test
 * harness could observe it, so the only honest place to verify it is at the source.
 */

const indexHtml = readFileSync(resolve(import.meta.dirname, '../../../index.html'), 'utf8')

describe('theme bootstrap script — contract with theme.ts', () => {
  it('reads the same storage key the app writes', () => {
    // The adapter namespaces keys as `va:<key>`. The script must use the same
    // namespace and the same key, spelled the same way.
    expect(indexHtml).toContain(`'va:${THEME_STORAGE_KEY}'`)
  })

  it('decodes the value the way LocalStorageAdapter encodes it', () => {
    // The adapter JSON-encodes on write. A stored `dark` preference is the bytes
    // `"dark"` (with quotes) in localStorage. The script calls JSON.parse to undo
    // that. If the adapter ever stopped JSON-encoding, this assertion would fail
    // and force the script to be updated with it.
    expect(indexHtml).toContain('JSON.parse(stored)')

    // Prove the encoding claim against the real adapter rather than restating it.
    const storage = new LocalStorageAdapter()
    storage.write<ThemePreference>(THEME_STORAGE_KEY, 'dark')
    const raw = globalThis.localStorage.getItem(`va:${THEME_STORAGE_KEY}`)
    expect(raw).toBe(JSON.stringify('dark'))
    expect(JSON.parse(raw as string)).toBe('dark')
  })

  it('sets the same attribute the stylesheet and provider use', () => {
    expect(indexHtml).toContain("setAttribute('data-theme', theme)")
  })

  it('does not contain JSX comment syntax, which HTML renders as text', () => {
    // See scripts/check-paths.ts for the built-output version of this check. This
    // one runs earlier, on the source, so the failure is caught before a build.
    //
    // `<script>` and `<style>` contents are removed first: real JavaScript contains
    // a `{` immediately followed by a `/*` block comment, and the bootstrap script
    // below has one. HTML comments are removed too, so a comment that documents the
    // bad syntax does not trigger the check.
    const scannable = indexHtml
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
    expect(scannable).not.toMatch(/\{\s*\/\*/)
  })
})
