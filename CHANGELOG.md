# Changelog

All notable changes to this project. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Only meaningful changes.** Typos, whitespace and formatting are not recorded.

---

## [Unreleased]

### Added

- **The exercise entity, and the first practice experience (M2.4).** A new `Exercise`
  content entity (id, title, summary, difficulty, estimatedMinutes, deliverable, a static
  `selfCheck` list, skills, provenance) is loaded from `content/exercises/*.mdx`, validated,
  and rendered on the lesson page in a new **Practice** section: title, summary, difficulty,
  duration, compiled body, deliverable, and the self-check list. The reference is
  **lesson-owned** (`lesson.exercises`), so the registry derives `exerciseLessonIds` and no
  exercise file names a lesson. Exercises are **ungraded and unsaved** — no score, no attempt,
  no persistence — and the UI says so; `exercise.attempted` is deliberately not wired (M3).
  `DECISIONS.md` D25.
- **A dedicated exercise compiler entry point with an `h4` heading floor (M2.4).**
  `compileExerciseMdx` shares the whole compiler with `compileMdx` — same parser, same trust
  boundary — and differs only in the heading floor: an exercise body starts at `h4` because it
  renders under the exercise's `<h3>` inside the lesson's Practice section. The floor follows
  the collection (`content/exercises/`), not a call-site argument. `DECISIONS.md` D26.
- **The first real exercise, connected to a real lesson.** `files-and-folders` now references
  `organise-a-client-folder-structure` (an Acme Co folder-structure task with a deliverable and
  a self-check), so the lesson reaches practice and the `quality/no-practice` warnings fall from
  **4 to 3 by fact** rather than by weakening the rule.
- **The site is deployed.** `https://markkramm.github.io/VA/` is live from
  `https://github.com/MarkKramm/VA`, with CI and Deploy both green on push to `main`. The
  deep-link SPA fallback was verified over HTTP. This closes the M1 deployment exit condition.
- **The lesson experience (M2.3).** The route `/lessons/:lessonId` resolves a lesson by its
  stable id through `lessonContext` in `src/app/content.ts` and renders its title, summary,
  difficulty, time, objectives, advisory prerequisites with reasons, skills, related lessons,
  breadcrumbs, deterministic previous/next navigation in roadmap order, and the compiled MDX
  body through `MdxContent`. Lessons are reachable from the roadmap page and the dashboard. An
  unknown id renders the in-app 404 inside the shell. Includes the first real exercise of the
  long-form prose typography.
- **An `h1` refusal in the compiler.** A lesson body containing `#` (or a setext heading) is
  refused at build time, naming the file, because the lesson page owns the page's single
  heading. `DECISIONS.md` D24.
- **Build-time MDX compilation into a renderable element tree.** Lesson `.mdx` bodies are
  parsed at build time (`unified` + `remark-parse` + `remark-mdx`) and converted into a
  closed vocabulary of `text`/`element`/`component` nodes, then rendered by
  `MdxContent` through an explicit component allowlist. No MDX or compiler package reaches
  the browser. `DECISIONS.md` D22.
- **An enforced MDX trust boundary.** The compiler refuses JavaScript expressions, JSX
  spreads, expression-valued attributes, disallowed HTML elements, unsafe URLs
  (`javascript:`, `data:`, protocol-relative) and reference-style links — each naming the
  source file and failing the build. The renderer re-checks URLs and drops unknown props.
  The URL policy and the alt-text requirement apply to both Markdown and JSX syntaxes.
- **A built-output compiler-leak guard.** `scripts/check-paths.ts` now scans the emitted JS
  for compiler markers, so a dependency that leaks only after bundling fails the build.
  Proven to bite by injecting a marker.
- **Tests: 241 (M1) → 283 (M2.1) → 351 across 21 files (M2.2) → 389 across 23 files (M2.3) →
  435 across 24 files (M2.4).** The M2.3 slice adds lesson-context resolution and ordering,
  route and deep-link behaviour, MDX rendering integration, navigation boundaries,
  missing-content states, heading-outline validity, and the corrected prose-class and
  prerequisite-link behaviours. The M2.4 slice adds the exercise schema, registry and derived
  reverse index, fail-closed lesson → exercise referential integrity, the exercise compiler's
  `h4` floor and unchanged trust boundary, the ingestion of `content/exercises/`, and the
  Practice-section rendering and its "no submit, no score, no save" contract.

### Changed

- **The MDX compiler's heading floor became a policy instead of a hard-coded `h2`.** The shared
  node walk now takes a small `CompilePolicy` (floor + refusal message); `compileMdx` keeps
  floor `2` and the new `compileExerciseMdx` uses floor `4`. No lesson behaviour changed — the
  `h1` refusal and `h2`–`h6` clamping are asserted unchanged. `DECISIONS.md` D26.
- **Content payload now includes exercise bodies** (15.7 KB measured by `content:check`), and the
  client bundle moved from 482 kB / 148 kB to **489 kB / 149 kB gzipped** — the Practice section
  and the first exercise now shipping. Still no compiler in the client.

- **The MDX renderer moved to the components layer.** `MdxContent`, the component allowlist and
  the prose stylesheet moved from `src/content/mdx/` to `src/components/mdx/`, and the compiled
  body format and URL policy are read through a new `src/app/mdx.ts` seam. This closes the
  boundary violation the lesson page would otherwise have introduced, and mirrors the existing
  `src/app/content.ts` seam. `DECISIONS.md` D23.
- **Content frontmatter is parsed at build time, not in the browser.**
  `vite-plugin-content.ts` reads and parses `.mdx` frontmatter in Node and serves the result
  as the virtual module `virtual:content-data`; `content/index.ts` imports that module instead
  of globbing and parsing. `gray-matter` and `js-yaml` are no longer in the client graph.
  **The client JS dropped from 717 kB / 202 kB gzipped to ~482 kB / 148 kB at M2.3** on an
  audience largely using metered mobile connections — a 56 kB gzipped reduction over M1, after
  the lesson page added back ~2 kB. `DECISIONS.md` D21.
- **The raw body text is measured at build time and dropped from the shipped module**, so the
  compiled tree replaces it rather than duplicating it. MDX compilation therefore did not
  regress the M2.1 bundle.
- **`npm run check` is green end to end again.** `opencode.json` (machine-local OpenCode
  runtime config) is now listed in `.gitignore` and `.prettierignore`, so the `format:check`
  failure that had been carried since M1 is closed without touching the file itself
  (`DECISIONS.md` D20).

### Fixed

- **The prose typography stylesheet was never applied.** `MdxContent` relied on the caller to
  pass a `prose` class, and the caller's `.prose` was a layout rule, so headings, lists and
  code in lesson bodies were unstyled. The renderer now applies its own CSS-module class.
- **A prerequisite could render as a dead link** when its lesson did not resolve. Resolved
  prerequisites now carry their reason and an unresolvable one is dropped with it.

## [0.2.0] — 2026-10-01 — M1 Application Shell

The first usable application. M0 built a validated content pipeline with no interface; M1
puts a shell around it — routing, layout, navigation, a dashboard, a design-token layer and
the GitHub Pages deployment path — and deliberately stops there.

### Added

**Application shell.** React 19 + React Router 7, a real Vite application build replacing
the M0 library-mode placeholder. Four routes: the dashboard, the roadmaps index, a roadmap
detail page, and a catch-all in-app 404. Route-level error boundaries sit **inside** the
layout route, so a thrown error keeps the header, the nav and the skip link rather than
replacing the page.

**Layout and navigation.** `AppShell`, `AppHeader`, `AppNav`, `AppFooter`, `SkipLink`, and a
shared `ThemeToggle`. Navigation is **data** (`src/app/navigation.ts`), so the desktop
sidebar and the mobile panel cannot disagree about which destinations exist. The mobile nav
is a real modal dialog: `aria-modal`, focus moves in, Tab is trapped, Escape closes, focus
returns to the toggle, and it closes on navigation. `DECISIONS.md` D18.

**Design system foundation.** `src/styles/tokens.css` and `global.css`, with
`docs/DESIGN_SYSTEM.md` written _before_ the components so the identity was designed rather
than accreted. Colour, type, space, radius, motion and elevation as tokens; light and dark
from day one; CSS Modules; no CSS framework and no webfonts. The identity is deliberately
not a generic SaaS dashboard — `DESIGN_SYSTEM.md` §1 records what was rejected and why.

**A verified-contrast gate.** `npm run check:contrast` computes WCAG ratios from the token
values and fails the build if any pair drops below its required level. 34 pairs, both themes.
`DECISIONS.md` D19.

**Deployment path.** `deploy.yml` with the required Pages permissions and environment,
`public/.nojekyll`, a postbuild step copying `dist/index.html` to `dist/404.html`, and
`scripts/check-paths.ts` asserting the built HTML has no root-relative asset URL.

**Tests: 169 → 241.** Shell landmarks and structure, routing, navigation and active-route
state, breadcrumbs, the mobile dialog's focus behaviour, the dashboard and roadmap pages
against real content, the router's `basename`, the deployment configuration, theme
persistence, and each UI component's accessibility contract.

### Changed

- **`npm run check` now includes `check:contrast` and a subpath-verified build.** It is the
  single gate: format, lint, typecheck, `content:check`, contrast, tests, build, SPA
  fallback, path check.
- **The build is an application build.** `build.lib` and its M0 placeholder comment are
  gone; `index.html` and `src/main.tsx` replace them.
- **Vitest includes `.tsx`** and loads `tests/setup.ts`, which fills two jsdom gaps
  (`matchMedia`, `scrollTo`) the shell depends on.
- **`vite.config.ts`** gained `@vitejs/plugin-react` and a bundle-size budget set from the
  measured M1 size.

### Fixed

Bugs found _during_ M1, each of which would have shipped:

1. **`AppShell` rendered `children`, which react-router never passes.** A layout route is
   rendered empty and delivers content through `<Outlet />`. This typechecked, compiled, and
   produced a blank page on every route. Caught by a test asserting the matched route's
   content renders.
2. **The contrast checker reported 23 failures that were all its own bugs** — WCAG luminance
   is defined on _linear_ light and the script gamma-encoded first, turning a known 10:1 pair
   into 3.2:1; and dark-theme lookups did not fall back to the `:root` primitives. Recorded
   in the script because a checker producing confident wrong numbers is worse than none.
3. **State chips were theme-independent**, putting a 94%-lightness pastel on an 18%-dark
   surface. Dark mode now defines its own soft and strong state variants.
4. **`DESIGN_SYSTEM.md` initially published invented contrast ratios**, replaced with the
   checker's measured output. A "well under a second" claim about Prettier in this file was
   measured at 1.8s and corrected.
5. **`react-router` resolved to v8** when the settled stack recorded v7. Pinned to 7.18.4
   rather than silently deviating from a recorded decision.

### Known limitations, stated rather than buried

- **The bundle is 717 kB / 202 kB gzipped, and ~55 kB of that is `gray-matter` shipping to
  the browser.** Measured by rebuilding with the parser stubbed out (717 kB → 469 kB). The
  fix is a build-time frontmatter transform, which is the M2 MDX pipeline; it was not
  patched here because a hand-rolled YAML parser would duplicate a solved problem. A real
  cost on a phone, so it is a decision rather than an oversight.
- **No live URL.** The repository has no git remote, so the deployment workflow has never
  run, and M1's stated exit condition — a working deployed site with a deep link surviving a
  hard refresh — is **not met**.
- **No browser was driven at 375 / 768 / 1440.** Responsive behaviour is verified by
  construction, not by screenshot.
- **Contrast is verified from token values, not rendered pixels.**

### Not changed

No architecture, no schema semantics, no content, no M0 source file, no test removed. All
curriculum content remains `status: draft`. No lesson pages, quizzes, labs, tool directory,
progress UI, or placeholder routes for them — those are M2 onwards.

### Dependencies

Runtime 1 → 5, against a budget of 20: added `react`, `react-dom`, `react-router` (pinned
7.x) and `lucide-react`. Dev-only: `@vitejs/plugin-react`, `@testing-library/react`,
`@testing-library/user-event`, `@testing-library/jest-dom`, `@types/react`,
`@types/react-dom`. **No Zustand** — `DECISIONS.md` D17 explains why the recorded choice was
deferred rather than rejected.

## [0.1.0-foundation] — 2026-10-01

### Fixed

**Two validation gates that were not actually green**, both found by an independent audit of
M0 rather than by the M0 work itself.

- **The `duplicate-id` check was unreachable.** It iterated the registry's Maps, which
  `indexById` builds with `new Map(items.map(i => [i.id, i]))` — a Map keeps only the last
  entry for a repeated id, so the duplicate was already erased before any check could
  observe it. A check that looks correct and always passes is the worst kind of bug.
  Validation now reads the pre-index entity list, exposed on the registry as `parsed`, with
  each entity's real source file retained so a duplicate error names both files. Map lookup
  behaviour is unchanged and pinned by a test. Six regression tests, including one
  confirming the same id in two different entity types is not a false positive.
  `DECISIONS.md` D15.
- **11 Markdown files failed `npm run format:check`.** Fixed by applying the repository's
  existing Prettier rules, not by hand.

### Changed

**`format:check` is now part of `npm run check`.** It previously was not, while CI did run
it — which is why the formatting regression above survived a full milestone behind a locally
green gate. `check` is now the single gate: format, lint, typecheck, `content:check`, tests,
build. A green `check` means CI will be green, so there is no longer a second command to
remember before committing. The cost is small: `format:check` adds roughly 2 seconds of
wall time to a gate that already runs the full test suite and a production build.

### Documentation

The `check`-versus-CI distinction that this gap created is recorded in `README.md`,
`AGENTS.md`, `docs/WORKFLOWS.md`, `project/CURRENT_STATE.md` and `project/CHECKPOINT.md` as
history, so the next reader does not assume the old split is still the design.

### Not changed

No architecture, no schema semantics, no content, no dependencies, no tests removed. All M0
content remains `status: draft`.

## [0.1.0-foundation] — 2026-10-01

Milestone 0. The project went from an empty repository to a validated content pipeline, a
pure progress model, and mechanically enforced architectural boundaries. **No user
interface exists yet** — that is Milestone 1.

### Added

**Content architecture.** The curriculum as build-time-validated data: 2 roadmaps, 2
modules, 4 lessons, 16 career paths, 19 skills, all real and publishable. Zod schemas for
`CareerPath`, `Skill`, `Module`, `Roadmap` and `Lesson`, with a shared primitives module
holding the id, date, difficulty, status and provenance definitions.

**The registry** (`src/content/registry.ts`) as the only read path to content, deriving
every reverse index — module to roadmaps, lesson to modules, skill to lessons and modules,
lesson to career paths. Nothing hand-maintains an inbound link.

**Cross-roadmap reuse, demonstrated.** Both M0 roadmaps reference both M0 modules. The
reuse model is proven by test rather than asserted in a comment, including the
de-duplication behaviour when a module appears in two stages of one roadmap.

**Selectors** for every read pattern the UI will need, degrading to an empty result for an
unknown id rather than throwing.

**Validation** (`npm run content:check`), runnable without a dev server, test runner or
browser. Schema conformance, referential integrity, duplicate ids, cycle detection,
provenance (published requires a reviewer), orphan detection, and six content-quality
checks: guarantee language, uncited numeric claims, generic titles, lessons with no
practice, duplicate lessons, and near-duplicate lessons within a module.

**The progress model.** 13 event types as a pure fold over an append-only log, with a
rebuildable `derived` cache. Module, roadmap and stage progress; attempt summaries; mastery
levels (stored as a number, rendered as a level, never as a false-precision decimal);
soft-gating advisories; and assessment eligibility, the platform's single hard lock.

**Storage** behind a `StorageAdapter` port, with localStorage and in-memory adapters,
cross-tab event merging that prevents silent progress loss, and import validation that
rejects a malformed or future-version export without destroying existing progress.

**Five architectural invariants**, enforced by a mix of ESLint rules (layer boundaries,
domain purity) and tests (single content entry point, derived-equals-folded, id and
referential integrity).

**Documentation.** `README.md`, `AGENTS.md`, five `docs/` files and five `project/` files,
written in the same pass as the code so they describe what exists rather than what was
planned.

**CI.** A seven-step workflow: lint, typecheck, content validation, tests, architectural
invariants, build, formatting.

### Fixed

Five bugs found by the M0 tests, each of which would otherwise have shipped. Reverse
indexes containing duplicates; cycle detection that followed only the first prerequisite and
so missed most cycles; orphan warnings that did not name the entity; the registry validating
a file wrapper instead of its contents, producing 77 misleading errors; and the boundary
test flagging its own source.

### Decisions

Fourteen recorded in `project/DECISIONS.md`, each with the rejected alternative. The most
consequential: progress is a pure fold over an event log, job readiness is evidence-weighted
rather than completion-weighted, and content is drafted by agents but edited by humans,
enforced by a rule that `published` requires a named reviewer.

### Known limitations

- No user interface, no router, no CSS, no deployment. All Milestone 1.
- All four lessons warn `quality/no-practice`, because the exercise system is Milestone 2.
- The build uses library mode, since there is no `index.html` yet.
- All quiz answers will ship in the client bundle. This is not fixable without a server, and
  is mitigated by anchoring demonstrated competence in labs and portfolio evidence.
- Progress is browser-scoped. Export and import arrive at Milestone 3; accounts are not
  planned.

[Unreleased]: https://github.com/MarkKramm/VA/compare/v0.1.0-foundation...HEAD
[0.1.0-foundation]: https://github.com/MarkKramm/VA/releases/tag/v0.1.0-foundation
