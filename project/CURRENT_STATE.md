# Current State

**As of:** 2026-10-01
**Milestone:** M2 — Content Engine · **ingestion + MDX compilation foundation done; lesson pages not started**
**Next:** M2 continued — lesson and roadmap pages, then exercises

This file describes the state _as it is_, rewritten each session. It is not a history. For
the history, see `CHANGELOG.md`.

---

## What exists and works

**The content pipeline, end to end, parsed AND compiled at build time.** 2 roadmaps,
2 modules, 4 lessons, 16 career paths and 19 skills load from `content/`, validate against
Zod schemas, and are readable through a derived-index registry. `npm run content:check`
reports 0 errors.

**The build-time ingestion pipeline.** `vite-plugin-content.ts` reads and parses `.mdx`
frontmatter in Node, at build/dev/`vite-node` time, and serves the result as the virtual
module `virtual:content-data`. `content/index.ts` imports that module instead of globbing and
parsing. The YAML parser now runs only in Node; the browser receives plain JSON.

**Build-time MDX compilation into a serializable element tree (new at M2.2).**
`content/mdx/compile.ts` parses each lesson body with the real MDX parser (`unified` +
`remark-parse` + `remark-mdx`) and converts it into a **closed vocabulary** of node kinds —
`text`, `element` (from a fixed HTML allowlist) and `component` (a name plus literal props).
The tree crosses the virtual-module boundary as JSON and is attached to lessons **by id**.
`src/content/mdx/render.ts` renders that tree in React through an explicit component
allowlist. No MDX or compiler package reaches the browser.

**The MDX trust boundary is enforced, not documented.** The compiler **refuses** JavaScript
expressions (`{…}`), JSX spreads, expression-valued attributes (`title={x}`), disallowed HTML
elements, unsafe URLs (`javascript:`, `data:`, protocol-relative) and reference-style links —
each with the source file named, each failing the build. The renderer **also** re-checks URLs
and drops unknown props, so a value the compiler missed cannot reach the DOM. The first
component allowlist is empty on purpose.

**The client bundle dropped by 56 kB gzipped (28%) as a direct result of build-time
parsing, and MDX compilation did not give it back.** 717 kB raw / 202 kB gzipped (M1) →
468 kB / 146 kB (M2.1) → **473 kB raw / 146 kB gzipped** (M2.2). `gray-matter`, `js-yaml`,
`unified`, `remark-*`, `micromark` and every compiler marker are absent from the built JS;
the compiled content tree is present. Measured, not estimated (`DECISIONS.md` D21/D22).

**Cross-roadmap reuse, demonstrated.** `va-foundations` and `computer-fundamentals` are
each referenced by both roadmaps. Neither roadmap declares that relationship; the registry
derives it.

**The progress model, as a pure fold.** 13 event types, a reducer with a rebuildable
`derived` cache, and selectors for module, roadmap and stage progress, attempt summaries,
mastery levels, soft gating and assessment eligibility. All testable with no DOM.

**Storage, behind a port.** `StorageAdapter` with `localStorage`, memory, and cross-tab
merge implementations. Import validation rejects malformed exports without destroying
existing progress.

**A working application shell.** React 19 + React Router 7, a real Vite application build,
four routes, a responsive sidebar/mobile-dialog layout, a dashboard and a roadmaps index, a
dark-mode-aware design token layer, and the GitHub Pages deployment path including the SPA
fallback.

**The architectural invariants, now six, with the sixth strengthened at M2.2.** Invariant 6
("the compiler stays out of the client") asserts nothing under `src/` or `content/` imports
`gray-matter` or any MDX/compiler package, that `content/index.ts` no longer globs or parses,
that the compiler lives at the build edge, and that `virtual:content-data` has one importer.
A **built-output** guard in `scripts/check-paths.ts` scans the emitted JS for compiler
markers, catching a leak that only appears after bundling. Both were proven to bite.

## What does not exist yet

No lesson page (the compiled body is renderable, but no route renders it), no roadmap page
completion, no search, no progress UI, no quizzes, no tool directory, no labs, no career
preparation.

Not implemented, by milestone: lesson and roadmap pages, exercises and search (M2, in
progress), progress UI (M3), quizzes (M4), the tool directory (M5), labs (M6), career
preparation (M7), the remaining roadmaps and skill visualisation (M8), polish (M9).

Deliberately **not** built: no placeholder routes, no recommendations, no streaks or
achievements, no backend/auth, no state-management library.

## Verification state

| Gate                     | Result                                                               |
| ------------------------ | -------------------------------------------------------------------- |
| `npm run format:check`   | clean, including the full `prettier --check .` glob                  |
| `npm run lint`           | clean                                                                |
| `npm run typecheck`      | clean, app and tooling configs separately                            |
| `npm run content:check`  | 0 errors, 4 warnings (all `quality/no-practice`, expected until M2)  |
| `npm run check:contrast` | 34 pairs pass, computed from tokens                                  |
| `npm run test`           | 351 passing across 21 files                                          |
| `npm run test:arch`      | 16 passing                                                           |
| `npm run build`          | succeeds; 473 kB / 146 kB gzipped — no compiler in the client        |
| `npm run check:paths`    | base `/VA/`, assets present, SPA fallback in place, no compiler leak |

**`npm run check` is the single gate and passes end to end**, so CI will be green.

`opencode.json` is machine-local OpenCode runtime configuration. It is listed in
`.gitignore` and `.prettierignore`, so it can neither be committed by accident nor fail the
format check, and it is never touched, moved or reformatted (`DECISIONS.md` D20).

## Known limitations, stated honestly

- **There is no lesson page yet.** The compiler produces a renderable tree and the renderer
  renders it, but no route displays a lesson, so the renderer is not in the built bundle
  (it is tree-shaken until something imports it). This is the next M2 step, and it is what
  will exercise the prose styles and the type scale against real long-form text.
- **Tables and reference-style links are unsupported.** Tables need `remark-gfm`;
  reference links are refused with a clear message. Both are in `BACKLOG.md`.
- **The deployment has not been exercised.** No live URL exists: the repository has no git
  remote. The M1 exit condition in `NEXT_STEPS.md` is still not met.
- **Responsive behaviour is verified by construction, not by screenshot.** No browser was
  driven at 375 / 768 / 1440.
- **The type scale is still unvalidated against long-form prose**, though `prose.module.css`
  now styles every construct the compiler can emit.
- **Contrast is verified from token values, not rendered pixels.**
- **The mobile dialog's focus trap is hand-rolled** (D18).
- **Four content warnings.** Every M0 lesson lacks an exercise. Correct until the exercise
  system lands.
- **All content is `status: draft`.** Nothing has been human-reviewed.

## The one thing to know before continuing M2

The content pipeline now has **two build-time stages**, both in `content/`:

```
content/**/*.mdx
  → vite-plugin-content.ts        (frontmatter via gray-matter)
  → content/mdx/compile.ts        (body via unified + remark-parse + remark-mdx)
  → virtual:content-data          (frontmatter + compiled tree, as JSON)
  → src/content/registry.ts       (Zod validation + lessonBodies keyed by id)
  → src/app/content.ts            (the UI seam: findLesson)
  → src/content/mdx/render.ts     (MdxContent + the component allowlist)
```

Rules that are enforced, not advisory: `content/` may not import from `src/`; only
`content/index.ts` imports the virtual module; only `content/mdx/compile.ts` imports the MDX
parser; `src/features/` and `src/components/` may not import `@content/` and must read through
`src/app/content.ts`. Invariant 6 and the built-output guard in `check-paths` enforce the
compiler boundary. Adding a component means adding one entry to
`src/content/mdx/registry.ts` — never a dynamic import keyed by a content string.
