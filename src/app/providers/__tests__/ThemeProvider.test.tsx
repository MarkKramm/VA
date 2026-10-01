import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '@/app/providers/ThemeProvider.tsx'
import { MemoryStorageAdapter } from '@/app/storage/memory.ts'
import {
  isThemePreference,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writeThemePreference,
} from '@/app/storage/theme.ts'

/**
 * THEME.
 *
 * The point of these tests is not that the toggle works — it is that the
 * preference is persisted THROUGH THE STORAGE PORT rather than through
 * `localStorage` directly.
 *
 * That distinction is the whole reason `StorageAdapter` exists (D4). A theme
 * preference that called `localStorage.setItem` would be the one thing in the app
 * that a future `HttpStorageAdapter` could not move, which is exactly the kind of
 * quiet exception that makes a port stop being a port.
 */

/** Renders the current preference and a button that sets an explicit one. */
const Probe = () => {
  const { preference, theme, setPreference } = useTheme()
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setPreference('dark')}>go dark</button>
      <button onClick={() => setPreference('light')}>go light</button>
    </div>
  )
}

let storage: MemoryStorageAdapter

beforeEach(() => {
  storage = new MemoryStorageAdapter()
  // Reset the document attribute between tests, since ThemeProvider writes to it
  // and it is global state that outlives a render.
  document.documentElement.removeAttribute('data-theme')
})

describe('theme — storage behind the port', () => {
  it('writes the preference through the adapter, not localStorage', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider storage={storage}>
        <Probe />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'go dark' }))

    // Readable from the adapter under the namespaced key...
    expect(storage.read(THEME_STORAGE_KEY, 'unset')).toBe('dark')
    // ...and provably NOT written to raw localStorage, which is the assertion
    // that would catch someone "simplifying" this into a direct call.
    expect(globalThis.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('reads a stored preference back on mount', () => {
    writeThemePreference(storage, 'dark')
    render(
      <ThemeProvider storage={storage}>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('preference')).toHaveTextContent('dark')
  })

  it('defaults to following the system when nothing is stored', () => {
    render(
      <ThemeProvider storage={storage}>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('preference')).toHaveTextContent('system')
  })

  it('applies the resolved theme to the document', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider storage={storage}>
        <Probe />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'go dark' }))
    // The attribute the CSS keys off. Without it the tokens never change and the
    // toggle appears to do nothing.
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    await user.click(screen.getByRole('button', { name: 'go light' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
})

describe('theme — preference resolution', () => {
  it('resolves system through matchMedia', () => {
    // The jsdom stub in tests/setup.ts reports no dark preference.
    expect(resolveTheme('system')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme('light')).toBe('light')
  })

  it('rejects an unrecognised stored value and falls back to system', () => {
    // Corrupt or hand-edited storage must not crash the app or apply a nonsense
    // theme. This is the storage adapter's guarded-parse principle applied to the
    // value itself.
    storage.write(THEME_STORAGE_KEY, 'neon')
    expect(readThemePreference(storage)).toBe('system')
  })

  it('recognises exactly the three supported preferences', () => {
    expect(isThemePreference('light')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('system')).toBe(true)
    expect(isThemePreference('neon')).toBe(false)
    expect(isThemePreference(null)).toBe(false)
    expect(isThemePreference(undefined)).toBe(false)
  })
})

describe('theme — applied on mount, not only on toggle', () => {
  /**
   * These tests cover the second writer of `data-theme`.
   *
   * The inline script in `index.html` sets the attribute before first paint and is
   * the only thing that prevents a flash. But it is not guaranteed to run: a strict
   * Content-Security-Policy blocks inline scripts, an extension can strip them, and
   * a render that does not go through `index.html` never had one. In that situation
   * the provider must still put the resolved theme on the document, or the React
   * state (`theme === 'dark'`) and the DOM (`data-theme` absent) disagree and the
   * learner sees the wrong palette.
   *
   * Before the mount effect existed, the attribute was written ONLY inside
   * `setPreference`, so this exact case was broken and no test caught it.
   */

  it('writes the resolved theme on mount when a dark preference is stored', () => {
    writeThemePreference(storage, 'dark')
    // Simulate the bootstrap script never having run.
    expect(document.documentElement).not.toHaveAttribute('data-theme')

    render(
      <ThemeProvider storage={storage}>
        <Probe />
      </ThemeProvider>,
    )

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('writes the resolved theme on mount when a light preference is stored', () => {
    writeThemePreference(storage, 'light')
    render(
      <ThemeProvider storage={storage}>
        <Probe />
      </ThemeProvider>,
    )
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('resolves an absent preference to the system theme on mount', () => {
    // Nothing stored, and the jsdom stub in tests/setup.ts reports no dark
    // preference, so `system` resolves to `light`. The point is that the attribute
    // is SET at all: an explicit `'light'` string on the document is what makes the
    // CSS fallback (`:root:not([data-theme])`) stop applying, so the two writers
    // agree rather than fighting.
    render(
      <ThemeProvider storage={storage}>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('preference')).toHaveTextContent('system')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('leaves an identical attribute untouched on mount, so there is no flash', () => {
    // The realistic case: the inline script already set the correct value. The
    // provider must re-apply it idempotently rather than write something different.
    // A mutation observer would see zero changes if the value were applied twice;
    // asserting the final value proves the mount effect did not change it.
    writeThemePreference(storage, 'dark')
    document.documentElement.setAttribute('data-theme', 'dark')

    render(
      <ThemeProvider storage={storage}>
        <Probe />
      </ThemeProvider>,
    )

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })
})

describe('theme — explicit choice overrides a dark system preference', () => {
  /**
   * The system-dark case, with a `matchMedia` that actually reports dark.
   *
   * The default stub reports light, so without swapping it here the system branch
   * is never exercised in the dark direction — which is the only direction in which
   * the `:root:not([data-theme])` fallback and the provider could disagree.
   */
  const originalMatchMedia = globalThis.matchMedia

  const setSystemDark = (isDark: boolean) => {
    Object.defineProperty(globalThis, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: isDark,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }

  afterEach(() => {
    Object.defineProperty(globalThis, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    })
  })

  it('resolves `system` to dark when the operating system asks for dark', () => {
    setSystemDark(true)
    render(
      <ThemeProvider storage={storage}>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('lets an explicit light choice win over a dark system preference', async () => {
    setSystemDark(true)
    writeThemePreference(storage, 'light')
    const user = userEvent.setup()
    render(
      <ThemeProvider storage={storage}>
        <Probe />
      </ThemeProvider>,
    )

    // Still light despite the OS asking for dark.
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')

    // And toggling to dark explicitly keeps it dark rather than being overridden
    // back. This is the case the CSS `:not([data-theme])` guard exists to protect.
    await user.click(screen.getByRole('button', { name: 'go dark' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('lets an explicit dark choice win over a light system preference', () => {
    setSystemDark(false)
    writeThemePreference(storage, 'dark')
    render(
      <ThemeProvider storage={storage}>
        <Probe />
      </ThemeProvider>,
    )
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })
})

describe('theme — provider contract', () => {
  it('throws when used outside a provider rather than defaulting silently', () => {
    // A silent default would mean a component rendered in the wrong place looks
    // fine until someone notices the toggle does nothing.
    const Consumer = () => {
      useTheme()
      return null
    }
    // React logs the error it re-throws; the spy keeps the test output readable.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow(/ThemeProvider/)
    consoleError.mockRestore()
  })
})
