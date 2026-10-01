import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { LocalStorageAdapter } from '@/app/storage/localStorage.ts'
import type { StorageAdapter } from '@/app/storage/port.ts'
import {
  readThemePreference,
  resolveTheme,
  systemTheme,
  writeThemePreference,
} from '@/app/storage/theme.ts'
import type { ResolvedTheme, ThemePreference } from '@/app/storage/theme.ts'

/**
 * Theme provider.
 *
 * WHY A CONTEXT AND NOT ZUSTAND
 *
 * `ARCHITECTURE.md` records Zustand as the state-management choice over Redux,
 * XState and TanStack Query, so it is not being rejected here. It is simply not
 * needed yet: at M1 the only shared client state is the theme preference, which is
 * one string with one writer and a handful of readers. A context plus
 * `useState` handles that in twenty lines and no dependency.
 *
 * Zustand earns its place at M3, when the progress event log arrives and genuinely
 * needs a store outside React's render cycle. Pulling it in now to hold a theme
 * string would be paying a dependency for nothing.
 *
 * Note that the theme is still persisted through the `StorageAdapter` port, so the
 * decision to use context does not leak persistence into a component.
 */

interface ThemeContextValue {
  /** What the learner chose, including "follow the system". */
  readonly preference: ThemePreference
  /** What is actually applied right now, with `system` already resolved. */
  readonly theme: ResolvedTheme
  readonly setPreference: (next: ThemePreference) => void
  /** Cycles light -> dark -> system. Used by the single toggle control. */
  readonly cycle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** The cycle order. System last, because it is the least committal choice. */
const CYCLE: readonly ThemePreference[] = ['light', 'dark', 'system']

export interface ThemeProviderProps {
  readonly children: ReactNode
  /**
   * Injected in tests. Production uses the localStorage adapter, which itself
   * falls back to memory when storage is unavailable, so there is no error path
   * to handle here.
   */
  readonly storage?: StorageAdapter
}

const applyToDocument = (theme: ResolvedTheme): void => {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

export const ThemeProvider = ({ children, storage }: ThemeProviderProps) => {
  // The adapter is created once. Creating it per render would re-probe
  // localStorage on every render, and the probe writes and removes a key.
  const [adapter] = useState<StorageAdapter>(() => storage ?? new LocalStorageAdapter())

  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readThemePreference(adapter),
  )
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolveTheme(preference))

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next)
      writeThemePreference(adapter, next)
      const resolved = resolveTheme(next)
      setTheme(resolved)
      applyToDocument(resolved)
    },
    [adapter],
  )

  const cycle = useCallback(() => {
    const index = CYCLE.indexOf(preference)
    const next = CYCLE[(index + 1) % CYCLE.length] ?? 'system'
    setPreference(next)
  }, [preference, setPreference])

  // Sync the resolved theme to the document on mount.
  //
  // WHY THIS IS NECESSARY even though `index.html` already sets the attribute:
  //
  // The inline bootstrap script and this provider are two writers of one value, and
  // they can disagree. The script runs before first paint and is the only thing that
  // prevents a flash; but it can be blocked by a Content-Security-Policy or an
  // extension, and it does not exist at all in a test or a non-`index.html` render
  // context. Before this effect, the provider set the attribute only inside
  // `setPreference`, so a learner whose bootstrap script did not run saw a light page
  // until they touched the toggle - and the React state and the DOM attribute
  // genuinely disagreed, which is a correctness bug rather than a cosmetic one.
  //
  // Re-applying the same value on mount is idempotent: when the script did run, this
  // writes the identical string and nothing changes, so there is no flash. When it
  // did not, this corrects the page. Either way React and the DOM agree afterwards.
  useEffect(() => {
    applyToDocument(theme)
  }, [theme])

  // Follow the operating system while the preference is "system".
  //
  // This is the one subscription in the app, and it is what makes "follow the
  // system" mean it rather than sampling the preference once at load.
  useEffect(() => {
    if (preference !== 'system') return
    if (typeof globalThis.matchMedia !== 'function') return

    const query = globalThis.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const resolved = systemTheme()
      setTheme(resolved)
      applyToDocument(resolved)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [preference])

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, theme, setPreference, cycle }),
    [preference, theme, setPreference, cycle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Read the theme.
 *
 * Throws outside a provider rather than returning a default. A silent default
 * would mean a component rendered in the wrong place looks fine until someone
 * notices the toggle does nothing.
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
