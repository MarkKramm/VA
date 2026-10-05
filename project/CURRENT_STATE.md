# Current State

**As of:** 2026-10-05
**Milestone:** M5 — Learning & Assessment Foundation · **complete**
**Next:** the tool directory and search — previously labelled M5 in `PLAN.md`, and unbuilt. See
`NEXT_STEPS.md`.

This file describes the state _as it is_, rewritten each session. It is not a history. For
the history, see `CHANGELOG.md`.

## Milestone status

| Milestone                  | State                                                                       |
| -------------------------- | --------------------------------------------------------------------------- |
| M0 — Foundation            | ✅ complete (`v0.1.0-foundation`)                                           |
| M1 — Application Shell     | ✅ complete                                                                 |
| M2 — Content Engine        | ✅ complete (`v0.3.0-content-engine`)                                       |
| M3 — Progress              | ✅ complete (not tagged) — local-first progress, dashboard, export/import   |
| M4 — Quiz Engine           | ✅ complete (not tagged) — content, renderer, scoring, persisted attempts   |
| M5 — Learning & Assessment | ✅ complete (not tagged) — practical assessments, skill evidence, readiness |

**Not built:** labs, search, the tool directory, career preparation, bookmarks, notes,
achievements, XP, streaks, portfolio, resume or interview tooling. Nothing below claims otherwise.

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
recorded and `exercise.attempted` is deliberately **not** wired (M3). `files-and-folders` was the
first lesson to reach practice, and the quiz link on `what-is-a-virtual-assistant` (M4.2) is the
second — the `quality/no-practice` warnings have fallen from 4 to 2 **by fact**, not by loosening
the rule. `DECISIONS.md` D25/D26.

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
mastery levels, soft gating and assessment eligibility. All testable with no DOM.

**Storage, behind a port.** `StorageAdapter` with `localStorage`, memory, and cross-tab
merge implementations. Import validation rejects malformed exports without destroying
existing progress, and `serializeProgressExport` produces an export in the same format the
validator reads, so the round trip is complete.

**The learner progress layer (new at M3).** `src/app/progress/` is the React-facing store:
`LearnerProgress` owns the state, persists through `StorageAdapter`, merges cross-tab writes,
and is read through `useSyncExternalStore` (`DECISIONS.md` D29). The lesson page records a VIEW
on open and offers explicit completion with undo; the Practice section records an ungraded
`exercise.attempted`; the dashboard shows lessons completed, exercises practised, overall and
per-roadmap progress, "continue learning", and the learner's own export/import. **Opening a
lesson never completes it.** Roadmap progress shown to a learner is a completed-lesson count;
the domain's stage-mean stays the gating policy (`DECISIONS.md` D27).

**The question and quiz content layer (new at M4.1).** `Question` and `Quiz` are first-class
content entities, one file per entity in `content/questions/` and `content/quizzes/`. A question
is a discriminated union on `type` (`single-choice`, `true-false`), so a future type is a new
variant rather than a widening of an existing one; a quiz is an ORDERED list of canonical
question ids, with an empty list and a repeated reference both rejected at parse time. The
registry derives `questionQuizIds` (question → quizzes), and referential integrity fails closed
on a missing question. **Content only** — there is no quiz page, no route, no scoring and no
attempt (`DECISIONS.md` D30).

**The learner quiz renderer (new at M4.2).** `/quizzes/:quizId` renders a validated quiz: its
title, summary, and its questions **in the order the quiz declares**. `single-choice` and
`true-false` questions render as accessible radio groups — one group per question, so selecting
an answer to one cannot clear another — with a live "N of M answered" count and a completion
control that says plainly that nothing is scored or saved yet. Answers are **transient component
state**: no storage, no progress event, no attempt, no score. `quizContext` in `src/app/content.ts`
**strips the correct answers** (`correctChoiceId`, `answer`, `explanation`) before the renderer
sees them, so the page could not reveal one even by accident — that boundary is structural, not a
convention. A lesson links to the quiz it declares through `lesson.quiz`, which is now a
**fail-closed** reference (`DECISIONS.md` D31). An unknown quiz id renders the normal in-shell 404.

**Quiz scoring and saved attempts (new at M4.3).** Submitting a quiz marks it against the
canonical content and records the attempt, so a quiz is now a real check rather than a form.
`scoreQuestions` in `src/app/quiz/score.ts` is **pure** — canonical questions in, deterministic
result out, no registry, no clock, no randomness — at **one point per question**, with a pass at
`QUIZ_PASS_THRESHOLD` (0.8, matching the domain's stage threshold). Unanswered and malformed
submissions score zero and are reported **separately** from wrong ones, so the UI can say "you
skipped 2" rather than calling a skipped question incorrect. The result shows score, max score,
percentage, pass/fail and per-question correctness, and the **correct answer and explanation
appear only after submission** — before it, the renderer still holds the stripped view. One
submission emits exactly **one** `quiz.attempted` event (`evaluatedBy: 'system'`) through the
existing store; the answers themselves are **not** stored. "Try again" starts a new attempt and
keeps the old one, and history and best score are read back from the event log. **Answers stay
transient until submitted**: answering everything and navigating away, or reloading, records
nothing (`DECISIONS.md` D32).

**The static-site limitation, on the record.** The canonical answers necessarily ship in the
client bundle (`docs/DATA_MODEL.md`), so a quiz score is computed in the browser and is
inspectable. That is inherent to a backendless site, and it is why job readiness is weighted on
evidence rather than on quiz scores — a quiz score is a check that the learner did the reading,
not high-stakes evidence.

**Practical assessments (new at M5).** `Assessment` is a first-class content entity —
scenario, requirements, instructions, deliverable, a published rubric, hints and common mistakes
(`PLAN.md` §52) — one file per entity in `content/assessments/`. It is **composite**: reached
from the roadmap that declares it (`roadmap.finalAssessment` and `roadmap.outcomes[].evidence`,
both now validated fail-closed), not from a lesson. `/assessments/:assessmentId` walks the
learner through the task, then lets them mark each rubric line they met. The result is recorded
as the existing `assessment.attempted` event with **`evaluatedBy: 'self'`** — the platform has no
automated evaluator and no way to receive a learner's work, and the page says so before and after
submission. **All criteria are needed to pass**: a practical deliverable is finished or it is
not. Retrying adds an attempt and never replaces one. `DECISIONS.md` D33.

**The one hard lock, and its fix.** An assessment cannot be _passed_ until its prerequisite
lessons are complete and practised — `assessmentEligibility`, the only refusal in the product.
A lesson that declares no activity could never satisfy the practice requirement, which made the
gate unsatisfiable, so a lesson with nothing to practise now requires completion only. The task
itself stays readable while locked: hiding the work would be a wall, hiding the outcome is a gate.

**Skill evidence (new at M5).** The three tiers `docs/DATA_MODEL.md` defines — **read**,
**practised**, **demonstrated** — are now derived in `src/app/learning/evidence.ts` from the
content references and the event log. Nothing is stored: no `skillEvidence` field, because a
second source of truth can always disagree with the log. A quiz declares no skills, so its skills
are derived through its questions. The dashboard shows the tiers in words and states plainly that
only "Demonstrated" means a scored check was passed — reading a lesson is not competence, and the
platform does not pretend otherwise. Readiness is **counts and states, not a score**: no
percentage, no "job readiness" number, no recommendation engine.

**Known limitation, restated for assessments.** A self-assessment is self-reported. The learner is
the only user, so it is inherently unverified — which is why the event carries `evaluatedBy`,
why the UI labels it everywhere, and why it is weighted lower than a marked result would be.
No schema change removes this; only a backend with a human evaluator would.

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

No search, no tool directory, no labs, no career preparation, no bookmarks or notes. Lessons,
roadmaps, the progress UI, a scored quiz, and a self-assessed practical task with skill evidence
now exist.

Not implemented, by milestone: quizzes (M4), the tool directory and search (M5), labs (M6),
career preparation (M7), the remaining roadmaps and skill visualisation (M8), polish (M9).

Deliberately **not** built: no placeholder routes, no recommendations, no streaks or
achievements, no backend/auth, no state-management library.

## Verification state

| Gate                     | Result                                                               |
| ------------------------ | -------------------------------------------------------------------- |
| `npm run format:check`   | clean, including the full `prettier --check .` glob                  |
| `npm run lint`           | clean                                                                |
| `npm run typecheck`      | clean, app and tooling configs separately                            |
| `npm run content:check`  | 0 errors, 2 warnings (both `quality/no-practice`)                    |
| `npm run check:contrast` | 34 pairs pass, computed from tokens                                  |
| `npm run test`           | 676 across 38 files — **675 pass**, 1 sandbox-only spawn failure     |
| `npm run test:arch`      | 16 passing                                                           |
| `npm run build`          | succeeds; 539 kB / 163 kB gzipped — no compiler in the client        |
| `npm run check:paths`    | base `/VA/`, assets present, SPA fallback in place, no compiler leak |

**`npm run check` is the single gate.** Every step is green except one test:
`src/content/__tests__/content-gate.test.ts` runs `npm run content:check` in a child process,
and this sandbox cannot spawn `cmd.exe` (`spawnSync … EBUSY`). `content:check` itself is green
when run directly (0 errors, 2 warnings) and the test is deliberately left unchanged — it is an
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

## The one thing to know before continuing M4

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
