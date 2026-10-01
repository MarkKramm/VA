import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { contentPlugin } from './vite-plugin-content.ts'

/**
 * Vite configuration.
 *
 * `base: '/VA/'` is load-bearing and is set here from the very first commit.
 * The project is deployed to GitHub Pages as a project site, so it is served
 * from a subpath. Every asset URL, the router basename, and the 404 SPA
 * fallback all depend on this value. Never hard-code `/VA/` anywhere else —
 * read `import.meta.env.BASE_URL` instead. See ARCHITECTURE.md.
 */
export default defineConfig({
  base: '/VA/',

  /*
   * `contentPlugin()` runs first (`enforce: 'pre'`) so the virtual content module
   * resolves before anything tries to bundle it. It parses `.mdx` frontmatter in
   * Node, at build time, and is the reason `gray-matter` no longer reaches the
   * browser. See vite-plugin-content.ts and DECISIONS.md D12/D21.
   */
  plugins: [contentPlugin(), react()],

  resolve: {
    alias: {
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
      '@domain': fileURLToPath(new URL('./src/domain', import.meta.url)),
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@fixtures': fileURLToPath(new URL('./tests/fixtures', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    /*
     * A normal application build since M1.
     *
     * At M0 there was no `index.html`, so the build ran in library mode over the
     * content registry to prove the toolchain worked and the eager content glob
     * bundled. That placeholder is gone — `index.html` and `src/main.tsx` now
     * exist, and this is a standard SPA build.
     */
    outDir: 'dist',
    emptyOutDir: true,
    // Surfacing the size of the bundled content is the measurement that turns
    // the "eager vs lazy content loading" question from opinion into data.
    // See DECISIONS.md.
    reportCompressedSize: true,
    /*
     * The bundle-size warning budget.
     *
     * RESOLVED AT M2. At M1 the build was 717 kB / 202 kB gzipped, of which about
     * 248 kB raw / 55 kB gzipped was `gray-matter` and `js-yaml`, a Node YAML
     * parser compiled into the browser because `content/index.ts` parsed `.mdx`
     * frontmatter at module scope.
     *
     * `vite-plugin-content.ts` now does that parsing in Node at build time and
     * serves the result as a virtual module, so the parser no longer reaches the
     * client graph. The budget is kept as a regression guard: if the parser ever
     * leaks back in, this limit catches it in review rather than on a learner's
     * phone. See `project/CHECKPOINT.md` for the measured before/after.
     */
    chunkSizeWarningLimit: 750,
  },
})
