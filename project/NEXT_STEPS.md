# Next Steps

**At most three items.** This is the whole task list. Everything not here is either
already done or in `BACKLOG.md`.

If this file ever has more than three items, something has gone wrong: either the milestone
is too large or work is not being closed out.

---

## Current milestone: M1 — Application Shell

### 1. Design tokens and the base style layer

Create `src/styles/tokens.css` and `global.css`. Tokens for colour, type scale, spacing,
radius, and the five state colours (complete, in-progress, available, recommended, locked).
Light and dark from day one, driven by `prefers-color-scheme` plus a manual toggle — the
toggle state itself is a new storage key behind the existing `StorageAdapter`.

Then write `docs/DESIGN_SYSTEM.md` **before** building components on top of the tokens. The
visual identity should be designed rather than accreted.

The twelve design principles are in `PLAN.md` section 12. The non-negotiables: colour is
never the only signal, 4.5:1 body contrast, visible focus, and every data-visualising
graphic has a text equivalent.

### 2. The application shell

`src/components/layout/`: `AppShell`, `AppHeader`, `AppNav`, `AppFooter`, `SkipLink`.
`src/components/ui/`: `Button`, `Card`, `Badge`, `Callout`, `ProgressBar`, `Breadcrumbs`,
`EmptyState`. `src/components/icons/Icon.tsx` wrapping `lucide-react`.

Keep the initial set small. A component used by one feature lives in that feature. The M0
boundary test checks that curriculum strings never appear in these directories, and it will
start having something to check.

### 3. The router, with GitHub Pages subpath handling

`src/app/router.tsx` with `createBrowserRouter` and **`basename` from
`import.meta.env.BASE_URL`** — never the literal `/VA/`. Real routes, an in-app 404, and
route-level error boundaries.

Then the deployment piece, which is the part most likely to be got wrong:

- `public/.nojekyll`, so the Pages build does not strip underscore-prefixed paths.
- A postbuild step copying `dist/index.html` to `dist/404.html`. GitHub Pages has no
  rewrite rules, so without this a refresh on `/VA/lessons/anything` 404s.
- `scripts/check-paths.ts`, asserting the built HTML has no root-relative `/assets/…` URL.
  A subpath site that works on the homepage and 404s on every deep link is the classic
  failure this catches.
- `.github/workflows/deploy.yml` with `actions/configure-pages`, `upload-pages-artifact`,
  `deploy-pages`, and the `github-pages` environment.

**Exit condition for M1:** a live URL at `https://markkramm.github.io/VA/`, navigable,
keyboard-operable, responsive at 375 / 768 / 1440, with a deep link surviving a hard
refresh on the real deployed site — not just locally.

---

## After M1

M2 (content engine) is scoped in `PLAN.md` section 16: MDX pipeline and component registry,
the remaining entity schemas, lesson and roadmap pages, exercises, and search.

Two things M1 should set up for M2 without building them:

- The stage renderer must **iterate a list**, because roadmaps will have two stages sharing
  a `kind` (Automation VA does). Do not key a component by stage kind.
- The MDX component registry should be a small, reviewed set. It is the one place content can
  become code, so its size is a governance decision, not a convenience one.
