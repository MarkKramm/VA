# Current State

**As of:** 2026-10-04
**Milestone:** M2 — Content Engine · **COMPLETE** (`v0.3.0-content-engine`)
**Next:** M3 — Progress · **not started** (after the pre-M3 hardening pass; see `NEXT_STEPS.md`)

This file describes the state _as it is_, rewritten each session. It is not a history. For
the history, see `CHANGELOG.md`.

## Milestone status

| Milestone              | State                                                                      |
| ---------------------- | -------------------------------------------------------------------------- |
| M0 — Foundation        | ✅ complete (`v0.1.0-foundation`)                                          |
| M1 — Application Shell | ✅ complete                                                                |
| M2 — Content Engine    | ✅ complete (`v0.3.0-content-engine`) — M2.1, M2.2, M2.3 and M2.4 all done |
| M3 — Progress          | ⏳ not started                                                             |

**Not built:** progress UI, quizzes, labs, assessments, search, the tool directory, career
preparation. Nothing below claims otherwise.

---

## What exists and works

**The content pipeline, end to end, parsed AND compiled at build time.** 2 roadmaps,
2 modules, 4 lessons, 1 exercise, 16 career paths and 19 skills load from `content/`, validate
against Zod schemas, and are readable through a derived-index registry. `npm run content:check`
reports 0 errors.

**The build-time ingestion pipeline.** `vite-plugin-content.ts` reads and parses `.mdx`
frontmatter in Node, at build/dev/`vite-node` time, and serves the result as the virtual
module `virtual:content-data`. `content/index.ts` imports that module instead of globbing and
parsing. The YAML parser now runs only in Node; the browser receives plain JSON.

**Build-time MDX compilation into a serializable element tree.** `content/mdx/compile.ts`
parses each lesson body with the real MDX parser (`unified` + `remark-parse` + `remark-mdx`)
and converts it into a **closed vocabulary** of node kinds — `text`, `element` (from a fixed
HTML allowlist) and `component` (a name plus literal props). The tree crosses the
virtual-module boundary as JSON and is attached to lessons **by id**. An `h1` in a body is
refused (the lesson page owns the page heading). No MDX or compiler package reaches the
browser.

**The rendered body and the lesson experience (new at M2.3).** `src/components/mdx/render.tsx`
renders a compiled tree into semantic HTML through an explicit component allowlist. The
lesson route `/lessons/:lessonId` resolves a lesson by its **stable id** through
`lessonContext` in `src/app/content.ts` and presents it: title, summary, difficulty, time,
objectives, advisory prerequisites (with reasons), skills, related lessons, deterministic
previous/next navigation in roadmap order, and breadcrumbs. Lessons are reachable from the
roadmap page and the dashboard. Unknown ids render the in-app 404 inside the shell.

**The exercise entity and practice (new at M2.4).** `content/exercises/*.mdx` load, validate
against an `Exercise` schema, and compile at build time through a dedicated entry point
(`compileExerciseMdx`) whose heading floor is `h4` — an exercise body renders under the
exercise's `<h3>` inside the lesson's Practice section, so its headings start at `h4` (D26).
The **lesson owns the reference** (`lesson.exercises`), so the registry derives
`exerciseLessonIds` and no exercise file names a lesson; a reference that does not resolve is a
**build error** (fail-closed). The lesson page renders a **Practice** section — title, summary,
difficulty, duration, compiled body, deliverable and a static self-check list — and says
plainly that nothing is scored or saved. Exercises are ungraded and unsaved: no attempt is
recorded and `exercise.attempted` is deliberately **not** wired (M3). `files-and-folders` is the
first lesson to reach practice, which is what drops the `quality/no-practice` warnings from 4
to 3. `DECISIONS.md` D25/D26.

**Long-form prose typography.** `src/components/mdx/prose.module.css` styles every construct
the compiler can emit, from design tokens, and the renderer applies it to every body — so the
type scale is now exercised by real lesson text, which was the open question from M1.

**The MDX trust boundary is enforced, not documented.** The compiler **refuses** JavaScript
expressions (`{…}`), JSX spreads, expression-valued attributes (`title={x}`), disallowed HTML
elements, unsafe URLs (`javascript:`, `data:`, protocol-relative) and reference-style links —
each with the source file named, each failing the build. The renderer **also** re-checks URLs
and drops unknown props, so a value the compiler missed cannot reach the DOM. The first
component allowlist is empty on purpose.

**The client bundle dropped by 56 kB gzipped (28%) as a direct result of build-time
parsing.** 717 kB raw / 202 kB gzipped (M1) → 468 kB / 146 kB (M2.1) → 473 kB / 146 kB
(M2.2) → **482 kB raw / 148 kB gzipped (M2.3)** → **489 kB raw / 149 kB gzipped (M2.4)**.
The M2.3 increase (~9 kB raw / ~2 kB gzipped) is the lesson page and the renderer now actually
shipping — the renderer was tree-shaken out at M2.2 because nothing rendered a body. The M2.4
increase (~7 kB raw / ~1 kB gzipped) is the Practice section and the first exercise now
shipping. `gray-matter`, `js-yaml`, `unified`, `remark-*`, `micromark` and every compiler
marker remain absent from the built JS; the compiled content tree, the lesson page and the
exercise body are present. Measured, not estimated (D21/D22).

**Cross-roadmap reuse, demonstrated.** `va-foundations` and `computer-fundamentals` are
each referenced by both roadmaps. Neither roadmap declares that relationship; the registry
derives it.

**The progress model, as a pure fold.** 13 event types, a reducer with a rebuildable
`derived` cache, and selectors for module, roadmap and stage progress, attempt summaries,
mastery levels, soft gating and assessment eligibility. All testable with no DOM. **The UI
for it does not exist yet.**

**Storage, behind a port.** `StorageAdapter` with `localStorage`, memory, and cross-tab
merge implementations. Import validation rejects malformed exports without destroying
existing progress, and `serializeProgressExport` produces an export in the same format the
validator reads, so the round trip is complete.

**A working application shell.** React 19 + React Router 7, a real Vite application build,
five routes, a responsive sidebar/mobile-dialog layout, a dashboard, a roadmaps index and the
lesson pages, a dark-mode-aware design token layer, and the GitHub Pages deployment path
including the SPA fallback.

**The architectural invariants, now six, extended at M2.3.** Invariant 3 (single content entry
point) permits the two non-data seams: a `type`-only import, and the compiled-body **format**
module `content/mdx/tree.ts` (a contract, not curriculum). The renderer moved to
`src/components/mdx/` precisely so no feature or component imports `content/` — the seam is
`src/app/mdx.ts`, mirroring `src/app/content.ts`. Invariant 6 ("the compiler stays out of the
client") still asserts nothing under `src/` or `content/` imports `gray-matter` or any
MDX/compiler package, that the compiler lives at the build edge, and that
`virtual:content-data` has one importer. A **built-output** guard in `scripts/check-paths.ts`
scans the emitted JS for compiler markers. Both were proven to bite.

## What does not exist yet

No search, no progress UI, no quizzes, no tool directory, no labs, no career preparation.
Lesson pages, roadmap-to-lesson navigation and practice exercises now exist.

Not implemented, by milestone: progress UI (M3), quizzes (M4), the tool directory and search
(M5), labs (M6), career preparation (M7), the remaining roadmaps and skill visualisation (M8),
polish (M9).

Deliberately **not** built: no placeholder routes, no recommendations, no streaks or
achievements, no backend/auth, no state-management library.

## Verification state

| Gate                     | Result                                                               |
| ------------------------ | -------------------------------------------------------------------- |
| `npm run format:check`   | clean, including the full `prettier --check .` glob                  |
| `npm run lint`           | clean                                                                |
| `npm run typecheck`      | clean, app and tooling configs separately                            |
| `npm run content:check`  | 0 errors, 3 warnings (all `quality/no-practice`)                     |
| `npm run check:contrast` | 34 pairs pass, computed from tokens                                  |
| `npm run test`           | 452 across 25 files — **451 pass**, 1 sandbox-only spawn failure     |
| `npm run test:arch`      | 16 passing                                                           |
| `npm run build`          | succeeds; 489 kB / 149 kB gzipped — no compiler in the client        |
| `npm run check:paths`    | base `/VA/`, assets present, SPA fallback in place, no compiler leak |

**`npm run check` is the single gate.** Every step is green except one test:
`src/content/__tests__/content-gate.test.ts` runs `npm run content:check` in a child process,
and this sandbox cannot spawn `cmd.exe` (`spawnSync … EBUSY`). `content:check` itself is green
when run directly (0 errors, 3 warnings) and the test is deliberately left unchanged — it is an
environment limitation, not a code failure. On a normal machine `check` is green end to end, so
CI will be green.

`opencode.json` is machine-local OpenCode runtime configuration. It is listed in
`.gitignore` and `.prettierignore`, so it can neither be committed by accident nor fail the
format check, and it is never touched, moved or reformatted (`DECISIONS.md` D20).

## Known limitations, stated honestly

- **Tables and reference-style links are unsupported.** Tables need `remark-gfm`;
  reference links are refused with a clear message. Both are in `BACKLOG.md`.
- **The site is deployed.** `https://markkramm.github.io/VA/` is live; the deep-link SPA
  fallback is verified over HTTP. The repository has a remote
  (`https://github.com/MarkKramm/VA`), and CI and Deploy run green on push to `main`.
- **Responsive behaviour is verified by construction, not by screenshot.** No browser was
  driven at 375 / 768 / 1440.
- **Contrast is verified from token values, not rendered pixels.**
- **The mobile dialog's focus trap is hand-rolled** (D18).
- **A lesson has no "mark complete" action.** The previous/next navigation is the honest
  equivalent until M3 gives progress a home; adding a button now would write to nowhere.
- **A lesson belongs to more than one roadmap, and the page shows one.** Breadcrumb, position
  and previous/next use the lesson's PRIMARY roadmap (the first, deterministically). All four
  current lessons sit in both `beginner-va` and `data-entry-va`, so the page always shows
  `beginner-va`; "in both Beginner VA and Data Entry VA" would be the fuller statement and is
  a candidate for a later slice.
- **Three content warnings.** Three M0 lessons still lack an exercise; `files-and-folders` now
  has one. The remaining three are honest — they are reading-only lessons.
- **An exercise is ungraded and unsaved.** No attempt is recorded and `exercise.attempted` is
  not wired; the Practice section says so. Recording practice is M3.
- **All content is `status: draft`.** Nothing has been human-reviewed.

## Before M3: the pre-M3 hardening pass · **DONE**

M2 closed with nine findings from the post-M2 architectural audit. The five that mattered before
M3 are fixed: `AGENTS.md` orientation (F1), `syncFrom` change detection by event identity (F2),
compiled-prose quality checks for lessons and exercises (F3), event-type completeness derived
from the `ProgressEvent` union (F5), and the export producer (F9). The items still listed in
`BACKLOG.md` → "Pre-M3 hardening (post-M2 audit)" are a small, optional cleanup batch, not
blockers.

**A note on `PLAN.md` §69.** The long-term constitution lists M2 as "Lesson data / Lesson
pages / Modules / Categories / Roadmaps" and puts _Exercises_ under M6 "Practice". The
repository's internal M2 slicing (M2.1–M2.4) extended M2 to include the first, **ungraded**
exercise entity, because the content engine is not complete without a way for a lesson to reach
practice. `PLAN.md` is the constitution and was not edited; this note records the mapping so the
two do not read as a contradiction.

## The one thing to know before continuing M3

The content pipeline now has **two build-time stages**, both in `content/`:

```
content/**/*.mdx
  → vite-plugin-content.ts        (frontmatter via gray-matter; picks the compiler by path)
  → content/mdx/compile.ts        (body via unified + remark-parse + remark-mdx;
                                   compileMdx floor h2, compileExerciseMdx floor h4)
  → virtual:content-data          (frontmatter + compiled tree, as JSON)
  → src/content/registry.ts       (Zod validation + lessonBodies/exerciseBodies keyed by id)
  → src/app/content.ts            (the UI seam: findLesson, lessonContext incl. exercises)
  → src/components/mdx/render.tsx (MdxContent + the component allowlist)
```

Rules that are enforced, not advisory: `content/` may not import from `src/`; only
`content/index.ts` imports the virtual module; only `content/mdx/compile.ts` imports the MDX
parser; `src/features/` and `src/components/` may not import `@content/` and must read through
`src/app/content.ts` (data) and `src/app/mdx.ts` (the compiled-body format and URL policy).
Invariant 6 and the built-output guard in `check-paths` enforce the compiler boundary. Adding
a component means adding one entry to `src/components/mdx/registry.ts` — never a dynamic
import keyed by a content string.
