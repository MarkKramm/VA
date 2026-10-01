/// <reference types="vite/client" />

/**
 * Vite client types.
 *
 * Provides `import.meta.glob`, `import.meta.env.BASE_URL` and friends.
 *
 * `BASE_URL` matters architecturally: the project is deployed to GitHub Pages
 * under /VA/, and the router basename and every asset URL derive from it. Never
 * hard-code `/VA/` — see vite.config.ts and ARCHITECTURE.md.
 */
