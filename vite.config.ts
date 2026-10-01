import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

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
    /**
     * M0 has no application: there is no index.html, no router, and no UI.
     * The M0 build therefore bundles the content registry, which is the only
     * meaningful artefact at this stage. Building it proves three things at
     * once — the toolchain works, the eager content glob actually bundles, and
     * `base` is configured.
     *
     * M1 replaces this with a normal application build once index.html exists.
     * This is not a library we intend to publish; `private: true` in
     * package.json is the real guarantee.
     */
    lib: {
      entry: fileURLToPath(new URL('./src/content/registry.ts', import.meta.url)),
      formats: ['es' as const],
      fileName: 'content-registry',
    },
    outDir: 'dist',
    emptyOutDir: true,
    // Surfacing the size of the bundled content is the measurement that turns
    // the "eager vs lazy content loading" question from opinion into data.
    // See DECISIONS.md.
    reportCompressedSize: true,
  },
})
