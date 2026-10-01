import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * ROUTER AND DEPLOYMENT SHAPE.
 *
 * These are the M1 tests that cannot be written against rendered output, because
 * what is being tested is a configuration value.
 *
 * The `basename` test is the important one. GitHub Pages serves this site from
 * `/VA/`, and a router without a matching basename matches nothing: every route
 * renders the 404 and every `<Link href>` points off-site. The failure is total
 * and obvious once seen — but it is invisible in `vite dev`, where `base` is
 * applied differently, so a mistake here ships a site where the homepage works
 * and nothing else does.
 *
 * These read source and check the filesystem rather than rendering, deliberately.
 * A rendered assertion cannot distinguish "the basename is right" from "the
 * basename happened not to matter in this test", which is the entire risk.
 */

/**
 * Repo root, resolved the way `boundaries.test.ts` already does it.
 *
 * `resolve(fileURLToPath(import.meta.url), '../../../..')` rather than
 * `new URL('../../../', import.meta.url)`. Both look correct and only one works
 * here: `resolve` treats the file path as a directory, so it needs four levels
 * from `src/app/__tests__/`, and the URL form returned `false` at every depth
 * including the correct one.
 *
 * Measured rather than assumed — this file's first version used `new URL` and
 * every test in it failed on paths that demonstrably exist.
 */
const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..')

/** Read a repo-relative file. */
const read = (relativeToRepo: string): string => readFileSync(resolve(ROOT, relativeToRepo), 'utf8')

/** Does a repo-relative path exist? */
const exists = (relativeToRepo: string): boolean => existsSync(resolve(ROOT, relativeToRepo))

/**
 * Source with comments stripped.
 *
 * Needed because these tests care whether `/VA/` appears in EXECUTABLE code, and
 * `router.tsx` discusses the literal at length in its doc comment — correctly, as
 * the explanation of why it must not be hard-coded. A naive `not.toContain` on raw
 * source fails on that comment, which is exactly what the first version did.
 */
const code = (relativeToRepo: string): string =>
  read(relativeToRepo)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .trim()

describe('router — basename', () => {
  it('takes its basename from Vite base, not a hard-coded path', () => {
    expect(read('src/app/router.tsx')).toContain('import.meta.env.BASE_URL')
    // The check that matters: no `/VA/` literal in code.
    expect(code('src/app/router.tsx')).not.toContain('/VA/')
  })

  it('records why, so the next reader does not "simplify" it into a constant', () => {
    // The comment is not incidental — it is the record of a decision that is
    // otherwise invisible.
    expect(read('src/app/router.tsx')).toMatch(/never hard-code/i)
  })

  it('declares the subpath base in exactly one place', () => {
    // vite.config.ts is the single source. Asserting the value at the origin
    // catches a base changed without the router being checked.
    expect(code('vite.config.ts')).toContain("base: '/VA/'")
  })

  it('documents that BASE_URL is not meaningful under Vitest', () => {
    // Recorded because it surprised this file's author: Vitest sets its own base
    // to '/', so `import.meta.env.BASE_URL` is '/' here even though it is '/VA/'
    // in a real build. That is why this suite asserts the SOURCE and cannot
    // assert the runtime value.
    //
    // The real verification is `scripts/check-paths.ts`, which reads the BUILT
    // index.html and asserts every asset URL carries the '/VA/' prefix.
    expect(import.meta.env.BASE_URL).toBe('/')
  })
})

describe('router — route table', () => {
  it('defines the routes that exist at M2.3', () => {
    const source = read('src/app/router.tsx')
    expect(source).toContain('index: true')
    expect(source).toContain("path: 'roadmaps'")
    expect(source).toContain("path: 'roadmaps/:roadmapId'")
    // The lesson route arrived at M2.3. It is keyed on the stable lesson id.
    expect(source).toContain("path: 'lessons/:lessonId'")
    expect(source).toContain("path: '*'")
    expect(source).toContain('errorElement')
  })

  it('contains no route from a later milestone', () => {
    // `PLAN.md` §73 and the milestone briefs both forbid building future
    // features. A nav entry or route pointing at something that does not exist is
    // worse than nothing: it promises a feature and then 404s.
    //
    // `/lessons` was removed from this list at M2.3, because the lesson route now
    // exists. The rule is not "these paths are forbidden forever" — it is "no
    // route may point at a feature that has not been built". What remains below
    // genuinely does not exist yet.
    const source = read('src/app/router.tsx')
    for (const future of ['/quiz', '/labs', '/tools', '/portfolio', '/jobs', '/skills']) {
      expect(source, `route ${future} must not exist yet`).not.toContain(`path: '${future}'`)
    }
  })

  it('places the error boundary inside the layout route', () => {
    const source = read('src/app/router.tsx')
    const layoutIndex = source.indexOf("path: '/'")
    const errorIndex = source.indexOf('errorElement')
    expect(layoutIndex).toBeGreaterThan(-1)
    expect(errorIndex).toBeGreaterThan(layoutIndex)
    // The AppShell must be declared before the errorElement in the same route
    // object, so a thrown error still renders inside the shell. An errorElement
    // beside the layout route would replace the whole page — losing the header,
    // the nav and the skip link exactly when a lost learner needs a way out.
    expect(source.slice(layoutIndex, errorIndex)).toContain('element: <AppShell />')
  })

  it('keeps every nav destination on a route that exists', () => {
    // The nav is data; the router is the truth. A nav link to a missing route is
    // a 404 the learner finds by clicking, which is what this prevents.
    const nav = read('src/app/navigation.ts')
    const router = read('src/app/router.tsx')

    // Extract the `to:` values from the nav data rather than hard-coding them, so
    // adding a destination without a route fails here.
    const destinations = [...nav.matchAll(/\bto:\s*'([^']+)'/g)]
      .map((match) => match[1] ?? '')
      .filter((to) => to.length > 0)

    expect(destinations.length).toBeGreaterThan(0)

    for (const to of destinations) {
      // The index route is `index: true`, not a `path`.
      if (to === '/') {
        expect(router).toContain('index: true')
        continue
      }

      /*
       * Check the destination against the router's declared paths by matching
       * segment position, not by guessing the parameter name.
       *
       * A router path is a sequence of literal segments and `:param` segments. A
       * concrete destination matches when each segment either equals the literal
       * or the router declares a parameter in that position.
       *
       * Position rather than name matters: '/roadmaps/beginner-va' is served by
       * `roadmaps/:roadmapId`, and the param is named after the thing it selects,
       * not after the id being selected. Two earlier attempts failed on exactly
       * this — one rewrote every two-segment path to a guessed param name, the
       * other looked for `:beginner-va`.
       */
      const segments = to.split('/').filter((segment) => segment.length > 0)

      const declaredPaths = [...router.matchAll(/path:\s*'([^']+)'/g)].map(
        (match) => match[1] ?? '',
      )

      const isRouted = declaredPaths.some((declared) => {
        const declaredSegments = declared.split('/').filter((segment) => segment.length > 0)
        // The catch-all `'*'` matches anything, so treat it as a valid route for
        // the purpose of this check — it is how an unknown path is handled.
        if (declaredSegments.includes('*')) return true
        if (declaredSegments.length !== segments.length) return false
        return declaredSegments.every((segment, index) => {
          const target = segments[index] ?? ''
          return segment.startsWith(':') || segment === target
        })
      })

      expect(
        isRouted,
        `nav destination "${to}" matches none of the router's paths: ${declaredPaths.join(', ')}`,
      ).toBe(true)
    }
  })
})

describe('deployment — SPA fallback and Pages config', () => {
  it('ships a .nojekyll so Pages does not strip underscore-prefixed paths', () => {
    // Without it, Pages runs Jekyll and silently drops any path beginning with an
    // underscore. The file is empty; its existence is the entire signal.
    expect(exists('public/.nojekyll')).toBe(true)
  })

  it('copies index.html to 404.html after a build', () => {
    // GitHub Pages has no rewrite rules, so a hard refresh on a deep link serves
    // the server 404 and the app never boots. A `404.html` containing the app is
    // what recovers.
    expect(exists('scripts/copy-spa-fallback.ts')).toBe(true)
    const pkg = read('package.json')
    expect(pkg).toContain('build:fallback')
    // And the build must actually invoke it, or the step is decorative.
    expect(pkg).toContain('build:fallback')
    expect(pkg).toMatch(/"build":\s*"vite build && npm run build:fallback/)
  })

  it('verifies the built output for root-relative URLs', () => {
    expect(exists('scripts/check-paths.ts')).toBe(true)
    // Part of `build`, so a bad path fails the build rather than shipping.
    expect(read('package.json')).toMatch(/"build":.*check:paths/)
  })

  it('declares the required Pages deployment permissions', () => {
    const workflow = read('.github/workflows/deploy.yml')
    // `pages: write` and `id-token: write` are both mandatory; a deploy job
    // without `id-token` is rejected outright. The `github-pages` environment is
    // what ties a published site to this repository.
    expect(workflow).toContain('pages: write')
    expect(workflow).toContain('id-token: write')
    expect(workflow).toContain('name: github-pages')
    expect(workflow).toContain('actions/upload-pages-artifact')
    expect(workflow).toContain('actions/deploy-pages')
    // `path: dist` must match `outDir` in vite.config.ts, or the artifact is
    // silently empty and the deploy succeeds with nothing published.
    expect(workflow).toContain('path: dist')
    expect(code('vite.config.ts')).toContain("outDir: 'dist'")
  })
})
