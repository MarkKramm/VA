# Current State

**As of:** 2026-10-01
**Milestone:** M0 — Foundation · **complete**
**Next:** M1 — Application Shell · **not started**

This file describes the state *as it is*, rewritten each session. It is not a history. For
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

**The architectural invariants, enforced.** Five, split between ESLint (layer boundaries,
domain purity) and `test:arch` (single content entry point, derived-equals-folded, id and
referential integrity).

**Documentation and CI.** `README.md`, `AGENTS.md`, five `docs/` files, five `project/`
files, `CHANGELOG.md`, and a seven-step `ci.yml`.

## What does not exist yet

No user interface of any kind. No React components, no router, no CSS, no Tailwind. The
M0 build bundles the content registry in library mode because there is no application to
build.

Not implemented, by milestone: exercises and MDX rendering (M2), search (M2), progress UI
(M3), quizzes (M4), the tool directory (M5), labs (M6), career preparation (M7), the
remaining roadmaps and skill visualisation (M8), polish (M9). Deployment arrives at M1.

## Verification state

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm run typecheck` | clean, app and tooling configs separately |
| `npm run content:check` | 0 errors, 4 warnings (all `quality/no-practice`, expected until M2) |
| `npm run test` | 163 passing across 8 files |
| `npm run test:arch` | 11 passing |
| `npm run build` | succeeds; 407 kB / 92.6 kB gzipped |
| `npm run format:check` | clean |

## Known rough edges

- **The build is a placeholder.** No `index.html`, so `vite build` uses library mode. M1
  replaces it.
- **Four content warnings.** Every M0 lesson lacks an exercise. Correct for M0, resolved at
  M2.
- **Skill ids use hyphens, not dots.** `communication-written-english`. The hierarchy lives
  in `parent` alone. This is a v5 correction and it is already applied everywhere, including
  test fixtures.
- **No shared topics yet.** `content/topics/` is M2. The schema supports both inline and
  shared forms now so no lesson needs re-authoring later.
- **The stale-tool report is not implemented.** It needs the tools collection, which is M5.
  It is a derivation over the existing reverse indexes, so it is a few lines once the
  collection exists.
- **`Roadmap.outcomes[].evidence` is empty in all M0 roadmaps.** The shape exists and is
  validated; there is nothing yet that can provide evidence, because quizzes and
  assessments arrive at M4 and M6.

## The one thing to know before starting M1

`base: '/VA/'` in `vite.config.ts` is load-bearing and was set in the first commit. The
site is served from a subpath on GitHub Pages. M1 must add the router `basename` from
`import.meta.env.BASE_URL` and the `404.html` SPA fallback, and must not hard-code `/VA/`
anywhere.
