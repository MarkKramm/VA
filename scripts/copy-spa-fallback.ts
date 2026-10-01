import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Copy `dist/index.html` to `dist/404.html`.
 *
 * WHY THIS FILE IS NECESSARY
 *
 * GitHub Pages has no rewrite rules. It serves static files and nothing else, so
 * when a learner hard-refreshes a deep link — `/VA/roadmaps/beginner-va` — the
 * server looks for a file at that path, finds none, and returns its own 404.
 * The React app never loads, so the in-app 404 route never runs either.
 *
 * The result is the worst possible failure for this platform: the homepage works,
 * every internal link works, and every refresh on any deep link breaks. It looks
 * like a working site and is not, and it is invisible in local development
 * because `vite preview` does SPA fallback itself.
 *
 * The fix is a Pages "feature" rather than a workaround: Pages serves `404.html`
 * for any unmatched path, so if that file contains the app, the app boots and the
 * client-side router renders the right route. It is not a redirect and not a
 * rewrite — the request genuinely 404s, and the application recovers from it.
 *
 * WHY A SCRIPT AND NOT A CONFIG PLUGIN
 *
 * A Vite plugin would be more integrated, and `closeBundle` would be the natural
 * hook. But this is a deployment concern, not a bundling concern, and keeping it
 * as a separate step means it can be reasoned about, run alone, and tested
 * independently of the bundler.
 *
 * Run: npm run build:fallback   (invoked by `npm run build`)
 */

const DIST = resolve(import.meta.dirname, '..', 'dist')
const SOURCE = resolve(DIST, 'index.html')
const TARGET = resolve(DIST, '404.html')

if (!existsSync(SOURCE)) {
  console.error(
    `[spa-fallback] ${SOURCE} does not exist. Run the Vite build first — this step only copies its output.`,
  )
  process.exit(1)
}

copyFileSync(SOURCE, TARGET)

// Confirm the copy rather than trusting it. A silently missing 404.html produces
// a site that looks fine and breaks on refresh, which is exactly the failure this
// exists to prevent — so it should not be possible to miss.
if (!existsSync(TARGET)) {
  console.error('[spa-fallback] copy reported success but 404.html is not present.')
  process.exit(1)
}

const { statSync } = await import('node:fs')
const bytes = statSync(TARGET).size
console.log(`[spa-fallback] dist/404.html written (${bytes} bytes) for GitHub Pages SPA fallback.`)
