# Checkpoint

The last verified stable state. This is what an agent reads to know it is resuming from
something that works.

---

## Checkpoint: v0.2.0-application-shell

**Date:** 2026-10-01
**Milestone:** M1 — Application Shell
**Tag:** none — the previous tag `v0.1.0-foundation` remains on M0
**Branch:** `main`

### What this checkpoint is

M0's content pipeline and domain model now have a user interface around them: a real
application build, four routes, a responsive shell, a design-token layer with a working dark
mode, and the GitHub Pages deployment path. It is deliberately a **shell**, not an LMS — no
lesson rendering, no progress UI, nothing from M2 onwards.

### Verified working

- `npm run check` passes end to end: `format:check`, lint, typecheck, content validation,
  `check:contrast`, **241 tests**, architectural invariants, and a build that includes the
  SPA fallback and the subpath verification.
- Four routes render real content: `/` (dashboard), `/roadmaps`,
  `/roadmaps/:roadmapId`, and a catch-all in-app 404. Route-level error boundaries sit
  **inside** the layout route, so a thrown error keeps the header, nav and skip link.
- **The subpath deployment is verified, not assumed.** The built site was served and probed
  over HTTP at `/VA/`: status 200, `#root` present, both assets resolving, `404.html`
  present. `check-paths` was then given a deliberately broken build and **failed** as
  intended, naming both root-relative URLs — so the check is known to catch the bug it
  exists for rather than merely passing.
- The router's `basename` comes from `import.meta.env.BASE_URL`, and a test asserts no
  `/VA/` literal appears in the router's _executable code_ (comments excluded, since the
  file legitimately quotes the value it is avoiding).
- **Every content read goes through `src/app/content.ts`.** Verified by probe: a file
  importing `@/content/registry.ts` from `src/features/` fails lint. This seam did not exist
  at M0 and is the thing most likely to be accidentally bypassed at M2.
- **The stage renderer iterates a list, not a map keyed by `kind`.** `beginner-va` really
  does have two stages sharing a module across different kinds, so the M2 hazard is
  exercised by real content and pinned by a test asserting all three stages survive.
- Contrast: 34 foreground/background pairs computed from the token values, all meeting their
  required WCAG level in both themes.
- The theme preference persists through `StorageAdapter` — asserted by reading it back out
  of the adapter _and_ separately asserting `localStorage` was never touched.
- The mobile nav is a real modal dialog: `aria-modal`, focus moves in, Tab is trapped,
  Escape closes, focus returns to the toggle, and it closes on navigation.

### Bugs caught during M1, and fixed

Each of these would have shipped, and three were found only because a check was written
rather than a claim:

1. **`AppShell` rendered `children`, but react-router never passes any.** A layout route is
   rendered empty and delivers content through `<Outlet />`. This typechecked, compiled,
   and produced a **completely blank page on every route**. Found by a test asserting the
   matched route's content renders — the reason that test exists.
2. **The contrast checker reported 23 failures, all of them its own bugs.** WCAG luminance
   is defined on _linear_ light and the script was gamma-encoding first, turning a known
   10:1 pair into 3.2:1; and dark-theme lookups did not fall back to the `:root`
   primitives. Both are recorded in the script and in `DECISIONS.md` D19, because a checker
   that produces confident wrong numbers is worse than no checker.
3. **`DESIGN_SYSTEM.md` initially published invented contrast ratios.** Replaced with the
   script's measured output. The claim "Prettier takes well under a second" in `CHANGELOG.md`
   was likewise measured, found to be 1.8s, and corrected.
4. **State chips were theme-independent**, putting a 94%-lightness pastel on an 18%-dark
   surface. Dark mode now defines its own soft and strong state variants.
5. **`react-router` resolved to v8** when the settled stack recorded v7. Pinned back to
   7.18.4 rather than silently deviating from a recorded decision.

### Not done, deliberately

No lesson pages, no MDX pipeline, no exercises, no search, no progress UI, no quizzes, no
tool directory, no labs, no career preparation. Also deliberately absent: **no placeholder
routes** for later milestones. A nav entry pointing at a non-functional page is worse than
no nav entry.

### Not verified — read this before deploying

- **There is no live URL.** The repository has no git remote, so `deploy.yml` has never run.
  The M1 exit condition in `NEXT_STEPS.md` — a working deployed URL with a deep link
  surviving a hard refresh — is **not met**. Everything needed for it is committed and
  locally proven; what is missing is a remote and a push.
- **No browser was driven at 375 / 768 / 1440.** Responsive behaviour is verified by
  construction (fluid `clamp()` and `auto-fit` grids, one structural breakpoint) rather than
  by screenshot.
- **The bundle is 717 kB / 202 kB gzipped, of which ~55 kB is `gray-matter` shipping to the
  browser.** Measured, not estimated. The fix belongs to the M2 MDX pipeline.

### Files that must be understood before changing anything

| File                                      | Why it matters                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/content/registry.ts`                 | The only read path to content. `asEntry` and `parseAll` encode a non-obvious wrapper distinction |
| `src/domain/progress/reducer.ts`          | The single pass that derives all progress state                                                  |
| `src/app/storage/merge.ts`                | The multi-tab fix. Read the comment block before changing event handling                         |
| `src/app/content.ts`                      | The M1 seam between content and UI. Features cannot import `@/content/`; see D16                 |
| `src/app/router.tsx`                      | `basename` from `BASE_URL`, and the error boundary placed inside the layout route                |
| `src/components/layout/AppShell.tsx`      | `<Outlet />`, not `children`. See bug 1 above                                                    |
| `src/components/layout/AppHeader.tsx`     | The hand-rolled focus trap for the mobile dialog. See D18                                        |
| `src/styles/tokens.css`                   | Every colour, size and duration. Read `DESIGN_SYSTEM.md` first                                   |
| `eslint.config.js`                        | Two of the five architectural invariants live here                                               |
| `src/domain/__tests__/boundaries.test.ts` | The other three, plus the self-exclusion rule                                                    |
| `vite.config.ts`                          | `base: '/VA/'` is load-bearing for GitHub Pages                                                  |

### Do not change without a decision

Everything in the M0 list — the four boundaries, the id-reference model, the event-log
design, the `StorageAdapter` port, `lane` as a field, soft gating, the single assessment
lock — plus the M1 additions: the `src/app/content.ts` seam (D16), the absence of a
state-management library at M1 (D17), the hand-rolled dialog (D18), and the contrast check
as a build gate (D19).

### Recommended next task

**Review M1, then either push and verify the deployment, or start M2.** M2's first job is
the MDX pipeline, which also removes `gray-matter` from the client bundle.

---

## Earlier checkpoint: v0.1.0-foundation

**Date:** 2026-10-01
**Milestone:** M0 — Foundation
**Tag:** `v0.1.0-foundation`
**Branch:** `main`

### What this checkpoint is

The project went from an empty repository to a working, validated content pipeline with a
pure progress model and mechanically enforced architectural boundaries. There was no user
interface. That is correct for M0.

### Verified working

- 2 roadmaps, 2 modules, 4 lessons, 16 career paths, 19 skills load and validate. Zero
  content errors.
- **Cross-roadmap reuse is proven by test, not assertion.** Both M0 roadmaps reference both
  M0 modules; the registry derives `module -> [beginner-va, data-entry-va]`, and the
  de-duplication behaviour (a module twice in one roadmap yields that roadmap once) is
  covered.
- Progress folds and re-derives correctly for a mixed event sequence, and recovers from a
  deliberately corrupted `derived` cache.
- Roadmap progress averages over **stages**, not lessons, so a learner cannot reach 90% by
  completing only the short introductory stages. Tested directly.
- Soft gating warns without locking; assessment eligibility is the single hard lock, and it
  requires practice rather than merely reading. Both tested.
- The multi-tab storage race is fixed: a concurrent write from a second store instance
  survives, tested.
- A malformed, truncated or future-version export is rejected with a readable message and
  leaves existing progress untouched. Tested.
- Five architectural invariants fail loudly when violated. Three are tested; two are
  enforced as ESLint rules that fail `npm run lint`.

### Bugs caught during M0, and fixed

Worth recording, because each would have shipped:

1. **Reverse indexes contained duplicates.** A module referenced in two stages of one
   roadmap produced that roadmap twice, so every consumer would have had to de-duplicate.
2. **Cycle detection missed most cycles.** The prerequisite check followed only each node's
   _first_ prerequisite, so any cycle not passing through it went undetected. Replaced with
   a real iterative DFS.
3. **Orphan warnings did not name the entity**, making them hard to act on.
4. **`parseAll` validated the file wrapper instead of its contents** for `.mdx` entities,
   which produced 77 confusing "expected string, received undefined" errors that looked
   like a frontmatter bug.
5. **Content leaked into the boundary test's own expectations** — the invariant test was
   flagging itself. Now excluded explicitly, with the reason documented.

### Files that must be understood before changing anything

See the M1 table above; the M0-only entries are `src/content/registry.ts`,
`src/domain/progress/reducer.ts`, `src/app/storage/merge.ts`, `eslint.config.js`,
`src/domain/__tests__/boundaries.test.ts` and `vite.config.ts`.

### Do not change without a decision

The four boundaries, the id-reference model, the event-log design, the `StorageAdapter`
port, `lane` as a field, soft gating, and the single assessment lock. Each is recorded in
`DECISIONS.md` with the alternative that was rejected.
