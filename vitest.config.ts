import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

/**
 * Test configuration.
 *
 * `jsdom` is used rather than `node` because the localStorage adapter and the
 * cross-tab merge logic are the parts most likely to break silently, and they
 * can only be tested against a real Storage implementation.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
      restoreMocks: true,
      clearMocks: true,
    },
  }),
)
