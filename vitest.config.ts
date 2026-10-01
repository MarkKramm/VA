import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

/**
 * Test configuration.
 *
 * `jsdom` is used rather than `node` because the localStorage adapter and the
 * cross-tab merge logic are the parts most likely to break silently, and they
 * can only be tested against a real Storage implementation. The M1 shell tests
 * need it too, obviously.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      // `.tsx` is included from M1. The M0 glob was `.ts` only, because there
      // was no React to test.
      include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
      setupFiles: ['./tests/setup.ts'],
      restoreMocks: true,
      clearMocks: true,
    },
  }),
)
