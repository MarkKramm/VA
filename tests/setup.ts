import '@testing-library/jest-dom/vitest'

/**
 * Test setup.
 *
 * `jest-dom` adds the accessible-role matchers (`toHaveAccessibleName`,
 * `toBeInTheDocument`) and the `toHaveFocus` matcher. Without it the shell tests
 * would have to assert on class names and text content, which is how a test ends
 * up passing while the markup is wrong.
 *
 * Two jsdom gaps are filled here, and both matter for this shell specifically:
 *
 *  1. **`matchMedia`.** jsdom does not implement it. The theme provider calls it
 *     to resolve `system`, and the header's focus-trap logic depends on real
 *     focus behaviour. Returning a stub that reports "light" and supports
 *     add/removeEventListener keeps the provider honest without pulling in a
 *     polyfill dependency.
 *
 *  2. **`scrollTo`.** jsdom throws "not implemented" for it, and it is called on
 *     route changes by anything that scrolls. Stubbed to a no-op.
 *
 * Both are filled with the minimum that works. A fuller DOM emulation is a
 * dependency, and `DESIGN_SYSTEM.md` §9 and D11 set the bar for adding one.
 */

if (typeof globalThis.matchMedia !== 'function') {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
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

if (typeof globalThis.scrollTo !== 'function') {
  Object.defineProperty(globalThis, 'scrollTo', {
    writable: true,
    value: () => {},
  })
}
