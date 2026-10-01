import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Assert the built site is safe to serve from a SUBPATH.
 *
 * THE FAILURE THIS CATCHES
 *
 * The site is deployed to `https://markkramm.github.io/VA/`. If any asset URL in
 * the built HTML is root-relative — `/assets/index-abc123.js` — it resolves
 * against the domain ROOT, i.e. `https://markkramm.github.io/assets/…`, which
 * does not exist. The page renders unstyled and inert.
 *
 * This is the classic subpath deployment bug, and it is nasty for a specific
 * reason: the homepage often still looks correct, because a missing stylesheet
 * plus working HTML can be mistaken for "plain but fine", and every click that
 * triggers a lazy import fails. It is also invisible in `vite dev`, which applies
 * `base` differently.
 *
 * So it is checked mechanically, against the ACTUAL built output, as part of the
 * build. A check that only inspects source can be fooled by a plugin or a
 * transform that introduces the problem later.
 *
 * Run: npm run check:paths   (invoked by `npm run build`)
 */

const DIST = resolve(import.meta.dirname, '..', 'dist')
const INDEX = join(DIST, 'index.html')
const FALLBACK = join(DIST, '404.html')

const failures: string[] = []

if (!existsSync(INDEX)) {
  console.error(`[check-paths] ${INDEX} does not exist. Run the Vite build first.`)
  process.exit(1)
}

const html = readFileSync(INDEX, 'utf8')

/**
 * The expected base, read from the built HTML rather than from the config.
 *
 * Reading it from the output means this check validates what was actually built,
 * so a config change that did not take effect is caught rather than assumed away.
 */
const baseMatch = html.match(/<script[^>]+src="([^"]+)"/)
const builtBase = baseMatch?.[1]?.replace(/assets\/.*$/, '') ?? null

if (builtBase === null) {
  failures.push('could not determine the built base path from the module script src')
}

/*
 * Root-relative URLs that are NOT under the base.
 *
 * `/assets/index-abc.js` is a failure. `/VA/assets/index-abc.js` is correct, and
 * the leading slash is what makes it subpath-safe.
 *
 * The filter skips:
 *  - the `xmlns` on the SVG namespace (always root-relative by definition)
 *  - `//` protocol-relative URLs (external, not our concern)
 *  - `data:` URIs
 */
const offenders: string[] = []
for (const match of html.matchAll(/(?:src|href)="(\/[^"]*)"/g)) {
  const url = match[1]
  if (url === undefined) continue
  if (url.startsWith('//')) continue
  if (url.startsWith('/VA/')) continue
  offenders.push(url)
}

if (offenders.length > 0) {
  failures.push(
    `found ${offenders.length} root-relative URL(s) that ignore the '/VA/' base:\n` +
      offenders.map((url) => `    ${url}`).join('\n') +
      `\n  These resolve against the domain root and 404 in production.`,
  )
}

/*
 * The SPA fallback must exist. GitHub Pages serves 404.html for unmatched paths,
 * so without it every hard refresh on a deep link breaks — a failure that never
 * reproduces locally, because `vite preview` does the fallback itself.
 */
if (!existsSync(FALLBACK)) {
  failures.push(
    'dist/404.html is missing. GitHub Pages has no rewrite rules, so a hard refresh on\n' +
      '    any deep link will serve a server 404 instead of the app. Run the fallback copy step.',
  )
}

/*
 * Vite emits a CSS file per entry chunk. Verify the referenced assets actually
 * exist on disk: a stale or renamed asset produces HTML that looks correct and a
 * blank page.
 */
const referencedAssets = [...html.matchAll(/(?:src|href)="\/VA\/assets\/([^"]+)"/g)]
  .map((match) => match[1])
  .filter((name): name is string => name !== undefined)

if (referencedAssets.length === 0) {
  failures.push(
    'no /VA/assets/ references found in index.html — the build may have failed silently',
  )
}

for (const asset of referencedAssets) {
  if (!existsSync(join(DIST, 'assets', asset))) {
    failures.push(`index.html references assets/${asset}, which is not in dist/assets`)
  }
}

/* --- report -------------------------------------------------------------- */

const assetFiles = existsSync(join(DIST, 'assets')) ? readdirSync(join(DIST, 'assets')).length : 0

if (failures.length > 0) {
  console.error(`\n[check-paths] ${failures.length} problem(s) with the built site:\n`)
  for (const failure of failures) console.error(`  - ${failure}`)
  console.error('')
  process.exit(1)
}

console.log(
  `[check-paths] OK — base ${builtBase}, ${referencedAssets.length} referenced asset(s) present, ` +
    `${assetFiles} file(s) in dist/assets, SPA fallback in place.`,
)
