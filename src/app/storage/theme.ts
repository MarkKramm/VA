import type { StorageAdapter } from './port.ts'

/**
 * Theme preference, stored behind the storage port.
 *
 * Why this is not `localStorage.setItem` in a component: the port exists so that
 * persistence is swappable, and a theme preference that bypasses it would be the
 * one thing in the app that could not survive a future `HttpStorageAdapter`. The
 * whole point of D4 is that nothing above the port knows where bytes live.
 *
 * `theme: stored preferences, derived: no dark-mode flash`
 *
 * The flash is the reason this file exists as more than a constant. A learner who
 * has chosen dark mode should not see a white screen for one frame on every
 * navigation. The inline script in `index.html` reads this same key and sets the
 * attribute before first paint, and it is duplicated there deliberately — see the
 * note on `THEME_STORAGE_KEY`.
 */

export const THEME_STORAGE_KEY = 'theme'

export type ThemePreference = 'light' | 'dark' | 'system'

/** The value actually applied to `<html data-theme>`, with `system` resolved. */
export type ResolvedTheme = 'light' | 'dark'

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'

/** Read the stored preference, defaulting to following the operating system. */
export const readThemePreference = (storage: StorageAdapter): ThemePreference => {
  const stored = storage.read<unknown>(THEME_STORAGE_KEY, 'system')
  return isThemePreference(stored) ? stored : 'system'
}

export const writeThemePreference = (storage: StorageAdapter, preference: ThemePreference): void =>
  storage.write(THEME_STORAGE_KEY, preference)

/**
 * What the operating system currently asks for.
 *
 * Returns `light` when `matchMedia` is unavailable rather than throwing. jsdom
 * does not implement it, and a test environment is a legitimate place for this to
 * be unavailable — the alternative is a component that cannot be rendered at all
 * without a browser polyfill.
 */
export const systemTheme = (): ResolvedTheme => {
  if (typeof globalThis.matchMedia !== 'function') return 'light'
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const resolveTheme = (preference: ThemePreference): ResolvedTheme =>
  preference === 'system' ? systemTheme() : preference
