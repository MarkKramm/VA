# Current State

**As of:** 2026-10-01
**Milestone:** M1 — Application Shell · **complete, pending review**
**Next:** M2 — Content Engine · **not started**

This file describes the state _as it is_, rewritten each session. It is not a history. For
the history, see `CHANGELOG.md`.

---

## What exists and works

**The content pipeline, end to end.** 2 roadmaps, 2 modules, 4 lessons, 16 career paths and
19 skills load from `content/`, validate against Zod schemas, and are readable through a
derived-index registry. `npm run content:check` reports 0 errors.

**Cross-roadmap reuse, demonstrated.** `va-foundations` and `computer-fundamentals` are
each referenced by both roadmaps. Neither roadmap declares that relationship; the registry
derives it. A module referenced twice within one roadmap yields that roadmap once.

**The progress model, as a pure fold.** 13 event types, a reducer with a rebuildable
`derived` cache, and selectors for module, roadmap and stage progress, attempt summaries,
mastery levels, soft gating and assessment eligibility. All testable with no DOM.

**Storage, behind a port.** `StorageAdapter` with `localStorage`, memory, and cross-tab
merge implementations. The multi-tab write race — which would silently lose learner
progress — is fixed and tested. Import validation rejects malformed exports without
destroying existing progress.

**A working application shell (new at M1).** React 19 + React Router 7, a real Vite
application build replacing the M0 library-mode placeholder, four routes, a responsive
sidebar/mobile-dialog layout, a dashboard and a roadmaps index, a dark-mode-aware design
token layer, and the GitHub Pages deployment path including the SPA fallback.

**The architectural invariants, still enforced.** Five, split between ESLint (layer
boundaries, domain purity) and `test:arch` (single content entry point, derived-equals-
folded, id and referential integrity). Verified at M1 to still bite: a probe importing
`@/content/registry.ts` from `src/features/` fails lint.

## What does not exist yet

No lesson rendering, no MDX pipeline, no search, no progress UI, no quizzes, no tool
directory, no labs, no career preparation.

Not implemented, by milestone: exercises and MDX rendering (M2), search (M2), progress UI
(M3), quizzes (M4), the tool directory (M5), labs (M6), career preparation (M7), the
remaining roadmaps and skill visualisation (M8), polish (M9).

Deliberately **not** built at M1 despite the shell making room for it: no lesson routes, no
placeholder routes for later milestones, no recommendations, no streaks or achievements.
A nav entry pointing at a non-functional page is worse than no nav entry.

## Verification state

| Gate                     | Result                                                              |
| ------------------------ | ------------------------------------------------------------------- |
| `npm run format:check`   | clean                                                               |
| `npm run lint`           | clean                                                               |
| `npm run typecheck`      | clean, app and tooling configs separately                           |
| `npm run content:check`  | 0 errors, 4 warnings (all `quality/no-practice`, expected until M2) |
| `npm run check:contrast` | 34 pairs pass, computed from tokens                                 |
| `npm run test`           | 241 passing across 14 files                                         |
| `npm run test:arch`      | 11 passing                                                          |
| `npm run build`          | succeeds; 717 kB / 202 kB gzipped — see the honest note below       |
| `npm run check:paths`    | base `/VA/`, all assets present, SPA fallback in place              |

**`npm run check` is the single gate and includes `format:check`, `check:contrast` and the
subpath verification**, so a green `check` means CI will be green.

## Known limitations, stated honestly

- **The bundle is 717 kB / 202 kB gzipped, and ~55 kB of that is `gray-matter`.** This is
  a Node YAML parser shipping to the browser, included because `content/index.ts` parses
  frontmatter at module scope. Measured by rebuilding with the parser stubbed out: 717 kB →
  469 kB. The correct fix is a build-time frontmatter transform, which is the M2 MDX
  pipeline; it is **not** patched here, because a hand-rolled YAML parser would duplicate a
  solved problem and risk disagreeing with `gray-matter` on an edge case. This matters
  because the audience is largely on mobile connections. Recorded in `BACKLOG.md`.
- **The deployment has not been exercised.** `deploy.yml`, `public/.nojekyll`, the `404.html`
  fallback and `check-paths` are all written and locally verified — `check-paths` was proven
  to fail on a deliberately broken build — but **no live URL exists yet**, because the
  repository has no git remote configured. The M1 exit condition in `NEXT_STEPS.md` is a
  working deployed URL, and that is not met.
- **Responsive behaviour is verified by construction, not by screenshot.** The layout is
  fluid via `clamp()` and `auto-fit` grids with one structural breakpoint at `md`. The
  `check-paths` HTTP probe confirmed the subpath build serves correctly at `/VA/`, but no
  browser was driven at 375 / 768 / 1440. Worth doing before M2.
- **The type scale is unvalidated against long-form prose.** Tuned against UI text; M2
  brings lesson content that will prove or break it.
- **Contrast is verified from token values, not rendered pixels.** A component that puts a
  good token on an unintended background would not be caught.
- **The mobile dialog's focus trap is hand-rolled** and covered by tests, but it is the one
  piece of interaction logic with no reusable primitive behind it. Revisit when a second
  dialog exists (`DECISIONS.md` D18).
- **`public/.nojekyll` is an empty file**, and empty files are easy to lose in review. A
  test asserts it exists.
- **Four content warnings.** Every M0 lesson lacks an exercise. Correct for now, resolved at
  M2.
- **All content is `status: draft`.** Nothing has been human-reviewed. Per `AGENTS.md`, the
  agent drafts and the human edits; this is the one piece of M0/M1 that only the owner can
  close.

## The one thing to know before starting M2

The content read path has a seam that did not exist at M0. `src/features/` and
`src/components/` **cannot import `@/content/`** — the ESLint boundary pattern also matches
the alias — so every content read goes through `src/app/content.ts`, which uses
`selectors.ts`. Adding a new query means adding a selector, not reaching into the registry
from a component. See `DECISIONS.md` D16.
