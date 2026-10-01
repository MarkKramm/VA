import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

  plugins: [react()],

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
     * Set from the M1 build's MEASURED size (717 kB raw / 202 kB gzipped) plus
     * headroom, not a guess. Its job is to catch an unanticipated jump in review,
     * and it has done that already — see the note below.
     *
     * KNOWN AND MEASURED: roughly 248 kB raw / 55 kB gzipped of this bundle is
     * `gray-matter`, a Node YAML parser, shipping to the browser. It is included
     * because `content/index.ts` parses `.mdx` frontmatter at module scope, and
     * that module is in the client graph.
     *
     * The correct fix is a build-time transform that pre-parses frontmatter into
     * plain data, which is exactly the MDX pipeline scheduled for M2. It is NOT
     * patched here: M1 is explicitly scoped to the shell, and a half-fix (a
     * hand-rolled YAML parser in `content/`) would duplicate a solved problem and
     * risk disagreeing with `gray-matter` on an edge case. Recorded in
     * `project/BACKLOG.md` with the measurement.
     *
     * This matters because the audience is largely on mobile connections, where
     * 55 kB of unused parser is a real cost on every first load.
     */
    chunkSizeWarningLimit: 750,
  },
})
