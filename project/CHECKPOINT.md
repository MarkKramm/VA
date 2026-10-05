# Checkpoint

The last verified stable state. This is what an agent reads to know it is resuming from
something that works.

---

## Checkpoint: M5 — Learning and assessment foundation

**Date:** 2026-10-05
**Milestone:** M5 — Learning & Assessment Foundation · complete
**Tag:** none — `v0.3.0-content-engine` remains the latest
**Branch:** `main`

### What this checkpoint is

The layer above quizzes: a practical assessment the learner does in their own tools and reports
against a published rubric, the skill evidence that produces, and a conservative readiness view.
It is **self-evaluated and says so** — there is no automated evaluator and no backend to receive
work, so nothing here claims to have inspected anything.

### Verified working

- `npm run content:check` — **0 errors, 2 `quality/no-practice` warnings**; 1 assessment loaded.
- `npm run typecheck`, `npm run lint`, `npm run check:contrast` (34 pairs) — clean.
- `npm run test` — **676 across 38 files; 675 pass.** The single failure is the environmental
  `content-gate.test.ts` child-process spawn (`cmd.exe EBUSY`); the test is unchanged.
- `npm run test:arch` — 16 passing.
- `npm run build` — 539 kB / 163 kB gzipped; SPA fallback written; `check:paths` clean; no
  compiler in the client; no dependency added.

### What was added

- `content/assessments/client-file-organisation.mdx` — a real practical task with a five-line
  rubric, wired to `beginner-va` as its `finalAssessment` and as outcome evidence.
- `src/content/schemas/assessment.ts` + registry, validation, selectors, reverse indexes
  (`assessmentSkillIds`, `assessmentRoadmapIds`, `skillQuizIds`) and quality checks.
- `/assessments/:assessmentId` — the brief, the published rubric, a self-evaluation, a result and
  retry; the gate states its reasons rather than showing a dead end.
- `src/app/learning/` — the self-assessment model and the derived skill evidence.
- The dashboard's **Your skills** panel; the roadmap page's final-assessment card.
- `roadmap.finalAssessment` and `roadmap.outcomes[].evidence` are now validated fail-closed.
- 71 new tests, and a fix to `assessmentEligibility` for a lesson with nothing to practise.

### Not done, deliberately

No automated or AI grading, no file upload, no portfolio, resume, interview or job-board tooling,
no search, no XP or streaks, and no readiness score. See `BACKLOG.md` → "M5 — deferred".

### Recommended next task

**The tool directory and search** — the work `PLAN.md` previously labelled M5. See
`NEXT_STEPS.md`.

---

## Checkpoint: M4.3 — Quiz scoring, results and persisted attempts

**Date:** 2026-10-05
**Milestone:** M4 — Quiz Engine · M4.3 complete
**Tag:** none — `v0.3.0-content-engine` remains the latest
**Branch:** `main`

### What this checkpoint is

A quiz can be taken, scored, passed or failed, and the attempt is saved. `PLAN.md` §Milestone 4
(quiz data, question rendering, scoring, results) is now delivered end to end.

### Verified working

- `npm run content:check` — **0 errors, 2 `quality/no-practice` warnings** (unchanged).
- `npm run typecheck`, `npm run lint`, `npm run check:contrast` (34 pairs) — clean.
- `npm run test` — **605 across 34 files; 604 pass.** The single failure is the environmental
  `content-gate.test.ts` child-process spawn (`cmd.exe EBUSY`); the test is unchanged.
- `npm run test:arch` — 16 passing.
- `npm run build` — 519 kB / 158 kB gzipped; SPA fallback written; `check:paths` clean; no
  compiler in the client.

### What was added

- `src/app/quiz/score.ts` — the pure scorer: one point per question, a `never` guard over the
  question union, unanswered reported separately from incorrect.
- `src/app/quiz/answers.ts` — the answer model, moved out of the feature so the scorer and the
  renderer both import downward.
- `quizScoringInput` in `src/app/content.ts` — the canonical questions, read only at submission.
- `LearnerProgress.submitQuizAttempt` — the one write, as the existing `quiz.attempted` event.
- The quiz page: submit, result (score / max / percentage / pass), per-question feedback, the
  explanation after submission, a history line, and "Try again" that adds an attempt.
- 18 scorer tests, 16 submission/persistence tests, 4 store tests, and a discriminating mutation
  check that broke 20 tests across three deliberate defects.

### Not done, deliberately

No XP, achievements or streaks; no mastery claim for a quiz; no `assessmentEligibility` gating;
no shuffling; no additional question types; no answer persistence; no roadmap evidence linkage.
See `BACKLOG.md` → "M4.3 — deferred".

### Recommended next task

**M5 — search and the tool directory**, unless further M4 scope is defined. See `NEXT_STEPS.md`.

---

## Checkpoint: M4.2 — Learner quiz renderer

**Date:** 2026-10-05
**Milestone:** M4 — Quiz Engine · M4.2 complete (M4.3 not started)
**Tag:** none — `v0.3.0-content-engine` remains the latest
**Branch:** `main`

### What this checkpoint is

A learner can open a quiz and answer it. Nothing is scored, graded, recorded or saved — that is
M4.3 — and the page says so rather than implying otherwise.

### Verified working

- `npm run content:check` — **0 errors, 2 `quality/no-practice` warnings**. Down from three
  because `what-is-a-virtual-assistant` now links a quiz, so it reaches practice **by fact**.
- `npm run typecheck`, `npm run lint`, `npm run check:contrast` (34 pairs) — clean.
- `npm run test` — **567 across 32 files; 566 pass.** The single failure is the environmental
  `content-gate.test.ts` child-process spawn (`cmd.exe EBUSY`); the test is unchanged.
- `npm run test:arch` — 16 passing.
- `npm run build` — 515 kB / 157 kB gzipped; SPA fallback written; `check:paths` clean; no
  compiler in the client.

### What was added

- `/quizzes/:quizId` (`src/features/quizzes/`) — `QuizPage`, `QuestionCard`, `answers.ts` and
  their stylesheets. One radio group per question, a live "N of M answered" count, and a
  completion control that states nothing is scored or saved.
- `quizContext` in `src/app/content.ts` — the renderer's view, with `correctChoiceId`, `answer`
  and `explanation` **stripped**, so the page cannot reveal a correct answer.
- `lesson.quiz` is now a **fail-closed** reference, and the lesson page links the quiz it
  declares (`DECISIONS.md` D31).
- `content/lessons/foundations/what-is-a-virtual-assistant.mdx` declares
  `quiz: va-foundations-basics`, so the quiz is reachable in the real content.
- 17 renderer/interaction tests plus a lesson-link test; the harness route table and
  `router.test.ts` were kept in sync.

### Not done, deliberately

No scoring, no pass/fail, no mastery, no attempt, no `quiz.attempted`, no progress integration,
no storage of answers, no shuffling, no additional question types, and no roadmap evidence
linkage. See `BACKLOG.md` → "M4.2 — deferred".

### Recommended next task

**M4.3 — scoring, attempts and progress integration.**

---

## Checkpoint: M4.1 — Question and quiz content architecture

**Date:** 2026-10-05
**Milestone:** M4 — Quiz Engine · M4.1 complete (M4.2 not started)
**Tag:** none — `v0.3.0-content-engine` remains the latest
**Branch:** `main`

### What this checkpoint is

Questions and quizzes are first-class content entities. This is the CONTENT foundation for the
quiz engine: no renderer, no route, no scoring, no attempt, and no new progress event.

### Verified working

- `npm run content:check` — **0 errors, 3 `quality/no-practice` warnings** (unchanged); the
  report now reads "3 questions, 1 quizzes".
- `npm run typecheck`, `npm run lint`, `npm run check:contrast` (34 pairs) — clean.
- `npm run test` — **548 across 31 files; 547 pass.** The single failure is the environmental
  `content-gate.test.ts` child-process spawn (`cmd.exe EBUSY`); the test is unchanged.
- `npm run test:arch` — 16 passing.
- `npm run build` — 510 kB / 156 kB gzipped; SPA fallback written; `check:paths` clean; no
  compiler in the client.

### What was added

- `content/questions/*.mdx` — one file per question (three: two `single-choice`, one
  `true-false`).
- `content/quizzes/*.mdx` — one file per quiz (one, referencing all three questions).
- `src/content/schemas/question.ts` and `quiz.ts`, exported from the schemas index.
- Registry: `questions` / `quizzes` maps, `parsed.questions` / `parsed.quizzes`, and the
  derived `questionQuizIds`. Both collections left `pendingCollections`.
- Validation: fail-closed quiz → question referential integrity, question → skills, duplicate
  ids, and provenance — all through the existing gates.
- Selectors: `getQuestion` / `getQuiz` / `questionsOfQuiz` / `quizzesUsingQuestion`, exposed to
  the app layer as `allQuestions` / `findQuestion` / `allQuizzes` / `findQuiz`.
- Quality checks: question prose (prompt, explanation, options) is scanned for guarantee
  language and uncited numeric claims, exactly as lesson and exercise prose is.
- **Post-audit hardening.** Quiz prose (`title`/`summary`) joined the quality gate; a
  frontmatter-only question or quiz file with a body now warns at build time instead of dropping
  it in silence; the `content:check` summary pluralises its counts; the quiz ordering fixture
  test and three negative cases were strengthened; `AGENTS.md` §2 and two `docs/` lines were
  corrected. No client code changed — the build hash is identical.

### Not done, deliberately

No quiz page, route, renderer, scoring, attempt or progress event. `lesson.quiz` and
`roadmap.outcomes[].evidence` remain unvalidated pending the M4.2/M4.3 linkage decision, and
`Quiz.shuffle` is deferred with the renderer. See `BACKLOG.md` → "M4.1 — deferred".

### Recommended next task

**M4.2 — the quiz renderer.**

---

## Checkpoint: pre-M4 hardening pass

**Date:** 2026-10-04
**Milestone:** M3 (hardening) · M4 not started
**Tag:** none — `v0.3.0-content-engine` remains the latest
**Branch:** `main`

### What this checkpoint is

The two P2 findings from the post-M3 adversarial audit are fixed. No M3 architecture changed.

- **A1 — validation now covers every read of persisted progress.** It previously ran only at
  initialization; `append`, `mergeEvents` and `syncFrom` re-read storage RAW, so a corrupted
  event reached the merge's sort and threw on the next interaction. The event-shape predicate
  moved to the storage boundary (`export-validate.ts`) and `ProgressStore.load` sanitizes, so
  initialization, write and cross-tab sync all get the same treatment. Sanitizing is
  **structural** (A1-R): an event whose `type` this build does not know is PRESERVED, because the
  sanitized state is what gets written back and filtering by known type would delete a newer
  build's data. The known-type filter remains on the import path, where it is reported.
- **A2 — the cross-tab `storage`-event wiring is now tested.** The existing tests called
  `syncExternal()` directly, so a listener that was never registered would still pass. A unit
  test now dispatches a real `StorageEvent` for `va:progress`, and an integration test asserts
  the dashboard updates through the real provider → store → React path — plus no write-back (no
  loop) and no reaction to an unrelated key.

### Verified working

- `npm run content:check` — **0 errors, 3 `quality/no-practice` warnings** (unchanged).
- `npm run typecheck`, `npm run lint`, `npm run check:contrast` (34 pairs) — clean.
- `npm run test` — **507 across 30 files; 506 pass.** The single failure is the environmental
  `content-gate.test.ts` child-process spawn (`cmd.exe` EBUSY); the test is unchanged.
- `npm run test:arch` — 16 passing.
- `npm run build` — 504 kB / 154 kB gzipped (unchanged); SPA fallback written; `check:paths`
  clean; no compiler in the client.

### Not done, deliberately

The lower-priority audit findings (A3–A11) are recorded in `BACKLOG.md` → "Post-M3 audit
(deferred)". No M4 work, and no release tag.

### Recommended next task

**M4 — Quiz Engine.**

---

## Checkpoint: M3 — Progress

**Date:** 2026-10-04
**Milestone:** M3 — Progress · **COMPLETE**
**Tag:** none — `v0.3.0-content-engine` remains the latest
**Branch:** `main`

### What this checkpoint is

Progress is real and local-first. `src/app/progress/` is the React-facing layer over the M0
progress model and the `StorageAdapter` port: a store that persists, merges cross-tab writes and
is read through `useSyncExternalStore`. Lesson completion, exercise attempts, a dashboard with
real progress, per-roadmap progress, and export/import all work end to end.

### Verified working

- `npm run content:check` — **0 errors, 3 `quality/no-practice` warnings** (unchanged).
- `npm run typecheck`, `npm run lint`, `npm run check:contrast` (34 pairs) — clean.
- `npm run test` — **497 across 29 files; 496 pass.** The single failure is the environmental
  `content-gate.test.ts` child-process spawn (`cmd.exe` EBUSY); the test is unchanged.
- `npm run test:arch` — 16 passing.
- `npm run build` — **504 kB / 154 kB gzipped**; SPA fallback written; `check:paths` clean; no
  compiler in the client.

### What was added

- `src/app/progress/store.ts` — `LearnerProgress`: record, persist, cross-tab sync, export,
  merge-on-import, clear. Framework-free and DOM-free, so it is unit tested directly.
- `src/app/progress/ProgressProvider.tsx` — context plus `useSyncExternalStore` (D29).
- `src/app/progress/composition.ts` — the content↔progress join (curriculum and per-roadmap
  progress, continue-learning, recently-completed).
- `src/app/progress/file-io.ts` — the browser download/read adapters, isolated so the logic is
  testable without a browser.
- Lesson page: view recording plus `CompletionControl` (explicit completion, with undo).
- Practice section: an ungraded `exercise.attempted` self-report.
- Dashboard: `ProgressPanel` (real progress) plus `DataTransfer` (export/import).
- Roadmap page: a completed-lesson bar and per-lesson "Completed" badges.

### Bugs found and fixed during M3

- **Same-millisecond event ordering.** Two events appended in the same millisecond shared an
  `at` and fell back to a random-id tiebreak, so "mark complete, then mark not complete" was a
  coin flip. Generated timestamps are now strictly increasing (`DECISIONS.md` D28). Found by a
  flaky test, fixed in the storage layer, and pinned by a regression test.

### Not done, deliberately

No quizzes, labs, assessments, search, tool directory, bookmarks, notes, achievements, XP,
streaks, recommendations, weak-area detection, job readiness, portfolio evidence, auth or
backend. No release tag.

### Recommended next task

**M4 — Quiz Engine.**

---

## Checkpoint: pre-M3 hardening pass

**Date:** 2026-10-04
**Milestone:** M2 (hardening) · M3 not started
**Tag:** none — `v0.3.0-content-engine` remains the latest
**Branch:** `main`

### What this checkpoint is

The five findings from the post-M2 audit that mattered before M3 are fixed, with no M3 feature
and no architectural change. See `BACKLOG.md` → "Pre-M3 hardening (post-M2 audit)".

### Verified working

- `npm run content:check` — **0 errors, 3 `quality/no-practice` warnings** (unchanged: the new
  prose checks found no claim in the current content).
- `npm run typecheck`, `npm run lint`, `npm run check:contrast` (34 pairs) — clean.
- `npm run test` — **452 across 25 files; 451 pass.** The single failure is the environmental
  `content-gate.test.ts` child-process spawn (`cmd.exe` EBUSY); the test is unchanged.
- `npm run test:arch` — 16 passing.
- `npm run build` — 489 kB / 149 kB gzipped; SPA fallback written; `check:paths` clean; no
  compiler in the client.

### What changed

- **F5** — `PROGRESS_EVENT_TYPES` in `src/domain/progress/types.ts` is tied to the
  `ProgressEvent` union by `satisfies Record<ProgressEventType, true>`, and the import
  validator derives its known set from it, so drift is a compile error.
- **F2** — `ProgressStore.syncFrom` detects change by event identity, not event count.
- **F9** — `serializeProgressExport` added; round-trips through `parseProgressExport` for every
  event variant.
- **F3** — quality checks flatten and scan the compiled body for lessons AND exercises.
- **F1** — `AGENTS.md` §2/§4/§7 refreshed to the actual M2 state.

### Not done, deliberately

The remaining cleanup batch (`BACKLOG.md` → "Pre-M3 hardening"): duplicated `roadmapProgress`,
the no-op shared-topic branch, the `@/content` boundary-test alias gap, the tautological
content test, dead `ProgressStore.refresh()`, and the stale M2.4 checkpoint wording. None
blocks M3.

### Recommended next task

**M3 — Progress.**

---

## Checkpoint: M2 close-out — v0.3.0-content-engine

**Date:** 2026-10-04
**Milestone:** M2 — Content Engine · **CLOSED**
**Tag:** `v0.3.0-content-engine` (annotated), on this close-out commit
**Branch:** `main`

### What this checkpoint is

M2 is closed. M2.1–M2.4 are complete, documented and verified; the orientation files now state
**M2 complete / M3 next**, and the release is tagged `v0.3.0-content-engine`. This is a
documentation-and-release close-out — **no product code changed**, beyond ignoring the local
agent workspace in `.gitignore`/`.prettierignore` so the single gate does not fail on
machine-local files (the same reasoning as `DECISIONS.md` D20).

### Verified working

- `npm run content:check` — **0 errors, 3 `quality/no-practice` warnings**; 16 career paths,
  2 roadmaps, 2 modules, 4 lessons, **1 exercise**, 19 skills; `exercises` is not pending.
- `npm run typecheck`, `npm run lint`, `npm run check:contrast` (34 pairs) — clean.
- `npm run test` — **435 across 24 files; 434 pass.** The single failure is environmental:
  `content-gate.test.ts` runs `npm run content:check` in a child process and this sandbox
  returns `spawnSync … EBUSY`. The test is deliberately unchanged; `content:check` is green run
  directly.
- `npm run test:arch` — **16 passing**.
- `npm run build` — **489 kB / 149 kB gzipped**; SPA fallback written; `check:paths` clean
  (base `/VA/`, assets present, **no compiler in the client**).

### Audit result

M2.1–M2.4 are all present and validated. The M2.4 detail is in the checkpoint below; the M2.3,
M2.2 and M2.1 checkpoints follow it. One documentation discrepancy was found and **recorded
rather than "fixed"**: `PLAN.md` §69 lists M2 as lesson data/pages/modules/categories/roadmaps
and puts _Exercises_ under M6 "Practice", whereas the repository's internal M2.4 slice extended
M2 to include the first **ungraded** exercise entity. See `CURRENT_STATE.md` → "A note on
`PLAN.md` §69".

### Do not change without a decision

Everything in the M2.4 list below, plus the milestone boundary itself: M2 is closed at
`v0.3.0-content-engine`.

### Recommended next task

**The pre-M3 hardening pass** (`NEXT_STEPS.md` item 1; the nine findings in `BACKLOG.md`), then
**M3 — Progress**.

---

## Checkpoint: M2.4 exercise entity and practice

**Date:** 2026-10-01
**Milestone:** M2 — Content Engine (fourth slice)
**Tag:** none — `v0.1.0-foundation` remains the only tag
**Branch:** `main` · **HEAD:** `35dd3fa` with the M2.4 slice committed on top

### What this checkpoint is

The first PRACTICE entity. `content/exercises/*.mdx` load, validate against an `Exercise`
schema, and compile at build time through a dedicated entry point (`compileExerciseMdx`,
heading floor `h4`). The **lesson owns the reference** (`lesson.exercises`), so the registry
derives `exerciseLessonIds`. The lesson page renders a **Practice** section, and
`files-and-folders` is the first lesson to reach practice — the `quality/no-practice` warnings
fall from **4 to 3 by fact**, not by weakening the rule.

### Verified working

- **Content validation:** 0 errors, 3 `quality/no-practice` warnings; `content:check` loads
  16 career paths, 2 roadmaps, 2 modules, 4 lessons, **1 exercise**, 19 skills; `exercises` is
  no longer a pending collection.
- **Types, lint, contrast:** `typecheck` clean (app and tooling configs); `lint` clean;
  `check:contrast` 34 pairs pass.
- **Tests:** **435 across 24 files** — the new `exercises.test.ts` plus extended content,
  compiler, ingestion, registry, validation, duplicate-id, selector, lesson-context and lesson
  page suites. `test:arch` 16 passing, including invariant 3b extended to exercise titles.
- **Build:** succeeds; **489 kB raw / 149 kB gzipped** (M2.3 was 482 / 148). The ~7 kB raw /
  ~1 kB gzipped increase is the Practice section and the first exercise now shipping. SPA
  fallback written, `check:paths` clean, and the built-output guard confirms **no compiler in
  the client**.
- **The heading floor is structural.** `compileExerciseMdx` refuses `h1`–`h3` and accepts
  `h4`+, while `compileMdx` keeps its `h2`/`h1` behaviour. The two share one parser and one
  trust boundary, so expressions, unsafe URLs, raw HTML and missing alt text are refused in an
  exercise body exactly as in a lesson body.
- **Referential integrity is fail-closed.** A `lesson.exercises` id that does not resolve is a
  build error, and that is true even when the exercise collection is absent (pinned by a test).

### Not done, deliberately

- **No scoring, attempts, rubrics or persistence.** `exercise.attempted` is **not** wired; the
  Practice section has no checkbox, no submit button and no progress state, and says so.
- No M2 close-out yet (no `v0.3.0-content-engine` tag), no pre-M3 hardening, no M3.
- No quizzes, labs, search, tool directory or career preparation.

### Not verified — read this before continuing

- **`npm run check` is not fully green in this sandbox, for one environmental reason only:**
  `src/content/__tests__/content-gate.test.ts` runs `npm run content:check` in a CHILD process,
  and this environment cannot spawn `cmd.exe` (`spawnSync … EBUSY`). The other 434 tests pass,
  and `content:check` itself is green when run directly. This is a sandbox limitation, not a
  code failure; the test was left unchanged. On a normal machine `npm run check` should be
  green.
- No browser was driven at 375 / 768 / 1440.
- **M2 is not finished.** The close-out remains; see `NEXT_STEPS.md`.

### Files that must be understood before changing anything

New at M2.4:

| File                                       | Why it matters                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `src/content/schemas/exercise.ts`          | The exercise schema. No `lessonId`; ungraded by construction              |
| `content/mdx/compile.ts`                   | `CompilePolicy` + `compileExerciseMdx` (floor `h4`) over the shared walk  |
| `vite-plugin-content.ts`                   | Picks the compiler by path; walks `content/exercises/`; missing-dir guard |
| `src/content/registry.ts`                  | `exercises`, `exerciseLessonIds` (derived), `exerciseBodies`              |
| `src/content/validation.ts`                | Fail-closed `lesson.exercises`; exercise skills/duplicates/provenance     |
| `src/app/content.ts`                       | `ExerciseView`; `lessonContext.exercises`                                 |
| `src/features/lessons/PracticeSection.tsx` | The Practice UI. No submit, no score, no save                             |

### Do not change without a decision

Everything in the M0/M1/M2.1/M2.2/M2.3 lists below, plus M2.4's: the lesson-owned
`lesson.exercises` reference with a derived `exerciseLessonIds` (D25), the fail-closed exercise
referential check, and the dedicated `compileExerciseMdx` entry point with the `h4` floor
(D26).

### Recommended next task

**Close out M2** (`NEXT_STEPS.md` item 1): re-read `PLAN.md` §60/§73/§84 against what M2 built,
confirm the slice boundaries are recorded and the warnings have fallen by fact, update the
orientation files, and tag `v0.3.0-content-engine`.

---

## Checkpoint: M2.3 lesson and roadmap content experience

**Date:** 2026-10-01
**Milestone:** M2 — Content Engine (third slice)
**Tag:** none — `v0.1.0-foundation` remains the only tag
**Branch:** `main` · **HEAD:** `6f5adbb` (M2.1 + M2.2) with M2.3 committed on top

### What this checkpoint is

The M2.2 compiled tree now reaches a learner. The route `/lessons/:lessonId` resolves a lesson
by its **stable id** through `lessonContext` in `src/app/content.ts` and renders its whole
page: metadata, objectives, advisory prerequisites with reasons, skills, related lessons,
deterministic previous/next navigation in roadmap order, breadcrumbs, and the compiled MDX
body through `MdxContent`. Lessons are reachable from the roadmap page and the dashboard.

This is the slice that finally exercises `prose.module.css` and the type scale against real
long-form text — the two questions left open since M1.

### Verified working

- `npm run check` **passes end to end**: format, lint, typecheck, content validation,
  `check:contrast`, **389 tests across 23 files**, **16 architectural invariants**, a build with
  the SPA fallback and the subpath verification, and the built-output compiler-leak guard.
- **The bundle grew by ~9 kB raw / ~2 kB gzipped to 482 kB / 148 kB**, over the M2.2 baseline
  of 473.30 kB / 145.57 kB. That increase is the lesson page and the renderer actually
  shipping — at M2.2 the renderer was tree-shaken out because nothing rendered a body. The
  compiler boundary did **not** regress.
- **No compiler in the client.** The built JS contains none of `YAMLException`, `mdast-util`,
  `micromark`, `unified`, `hast-util`, `remark-parse`, `remark-mdx`, `gray-matter` or
  `js-yaml`, while the content and the lesson page are present.
- **The renderer now applies its own prose class.** Found by audit: `MdxContent` relied on the
  caller to pass a `prose` class, and the caller's `.prose` was a layout rule, so the prose
  typography never loaded. The class now comes from the renderer's own CSS module and is
  combined with the caller's, and a test asserts the hashed class is present with no caller
  className.
- **An `h1` in a lesson body is refused at build time**, naming the file — the lesson page owns
  the single page heading, so a body heading can never introduce a second one. The compiler
  test covers both `#` and setext (`===`) syntax.
- **The renderer moved to `src/components/mdx/`**, and the compiled-body format/URL policy is
  read through a new `src/app/mdx.ts` seam. Before this slice, a feature importing the renderer
  would have imported `content/`, which the ESLint boundary rule forbids; the move closes that
  and mirrors the existing `src/app/content.ts` seam (D23).
- **Navigation ordering is deterministic.** Position and previous/next come from the roadmap's
  ordered lesson sequence (`lessonsOfRoadmap`), 1-based, de-duplicated. The first lesson has no
  previous and the last no next. Asserted against the real content
  (`what-is-a-virtual-assistant → who-hires-virtual-assists → files-and-folders → browser-basics`).
- **An unknown lesson id is a 404 inside the shell**, not an error, with the header and nav
  intact so there is a way out.
- **Deep links render on first load** — the SPA-fallback case, asserted directly.
- **Accessibility**: exactly one `h1`; no skipped heading level (scoped to `<main>`); breadcrumb
  and lesson navigation are named landmarks; the pager controls carry words, not just arrows.

### Bugs caught during M2.3, and fixed

1. **The prose stylesheet was never applied.** `MdxContent` did not import its own CSS module;
   it rendered whatever `className` the caller passed, and the caller passed a layout-only
   `.prose`. The renderer test passed anyway because the harness passed the literal string
   `'prose'`. The renderer now owns its class; the test asserts a hashed class with no caller
   input.
2. **A prerequisite could render as a dead link.** The page iterated the RAW prerequisite list
   for the reason while looking up the resolved link separately, so an unresolvable
   prerequisite fell back to the raw id and still produced a link. Prerequisites are now paired
   with their resolved lesson in the seam, and an unresolvable one is dropped with its reason.
3. **The M1 router test forbade `/lessons`.** Correct at M1, stale at M2.3; updated to allow the
   lesson route while still forbidding genuinely unbuilt routes.
4. **Invariant 3b matched a test's own content literal.** Test files are now excluded from the
   "no curriculum literals in the UI directories" walk, consistent with every other walk in the
   file — the rule is about code that ships.
5. **M2.2 tests compiled `# Heading` bodies** and would have broken under the new `h1` refusal;
   updated to `##`, which is the correct body-heading level.

### Not done, deliberately

- **No "mark complete" action.** Progress is M3; a button now would write to nowhere.
- No exercises, search, quizzes, tool directory, labs or career preparation.
- No custom MDX components registered. The allowlist is still empty.
- Tables and reference-style links are unsupported (recorded in `BACKLOG.md`).

### Deployed

- **The site is live and the M1 exit condition is closed.** `https://markkramm.github.io/VA/`
  returns 200 with the real `index.html` and both assets; the deep link
  `/VA/lessons/what-is-a-virtual-assistant` is served the `404.html` SPA fallback (same bundle,
  `#root` present) exactly as designed, so it boots the app and resolves the route client-side.
  The remote is `https://github.com/MarkKramm/VA`; `main` is at this checkpoint's commit and
  the **CI** and **Deploy** workflows both completed green on the push.

### Not verified — read this before continuing

- **No browser was driven at 375 / 768 / 1440.** Responsive behaviour is verified by
  construction.
- **A lesson in more than one roadmap shows one.** The page uses the primary roadmap for the
  breadcrumb, position and neighbours. All four current lessons sit in both roadmaps, so
  `beginner-va` always wins. Stated in `CURRENT_STATE.md`.
- **M2 is not finished.** Exercises remain.

### Files that must be understood before changing anything

New at M2.3, in addition to the M2.2 table below:

| File                                         | Why it matters                                                       |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `src/app/content.ts`                         | Now also `lessonContext`: the one read the lesson page performs      |
| `src/features/lessons/LessonPage.tsx`        | The lesson page. Owns the single `h1`                                |
| `src/features/lessons/LessonPage.module.css` | The reading column: header, sections, pager, responsive stack        |
| `src/components/mdx/render.tsx`              | The renderer, moved here at M2.3. Applies its own `.prose` class     |
| `src/components/mdx/registry.ts`             | The component allowlist, moved here at M2.3                          |
| `src/app/mdx.ts`                             | The compiled-body seam: format types + `isSafeUrl`, for the renderer |
| `src/content/selectors.ts`                   | `primaryModuleOfLesson`, `primaryRoadmapOfLesson`, `lessonsByIds`, … |

### Do not change without a decision

Everything in the M0/M1/M2.1/M2.2 lists below, plus M2.3's: the renderer's home in
`src/components/` with the `src/app/mdx.ts` seam (D23), the lesson route keyed on the lesson
id, the `h1` refusal in the compiler, the primary-roadmap rule for navigation and
breadcrumbs, and the `all-content-access-through-src/app` boundary.

### Recommended next task

**Exercises as a content entity**, then wire lesson → exercise references so at least one
lesson reaches practice. That is the last named M2 item and the thing the four
`quality/no-practice` warnings are counting.

---

## Earlier checkpoint: M2.2 MDX compilation + rendering foundation

**Date:** 2026-10-01
**Milestone:** M2 — Content Engine (second slice)
**Tag:** none — `v0.1.0-foundation` remains the only tag
**Branch:** `main` · **HEAD:** `43a9a94` (M1 audit fixes) with M2.1 + M2.2 in the working tree

### What this checkpoint is

Lesson bodies now compile at **build time** into a plain, serializable element tree, and
render in React through an explicit component allowlist. M2.1 moved frontmatter parsing out of
the browser; M2.2 does the same for MDX compilation, so the client receives renderable data
and no compiler. There is still **no lesson page** — that is the next slice.

### Verified working

- `npm run check` **passes end to end** — the canonical gate: format, lint, typecheck, content
  validation, `check:contrast`, **351 tests across 21 files**, **16 architectural invariants**,
  a build with the SPA fallback and the subpath verification, and the new built-output
  compiler-leak guard.
- **The bundle did not regress: 473.30 kB raw / 145.57 kB gzipped**, versus the M2.1 baseline
  of 468.22 kB / 146.22 kB. Gzipped it is marginally _smaller_: the compiled tree replaced the
  raw body text, which is dropped from the shipped module.
- **No compiler in the client.** The built JS contains none of `YAMLException`, `mdast-util`,
  `micromark`, `unified`, `hast-util`, `remark-parse`, `remark-mdx`, `gray-matter` or
  `js-yaml`, while the compiled content is present.
- **The built-output guard bites.** Injecting `YAMLException` into a built asset makes
  `check-paths` fail with a message naming the leaked dependency. Proven, not assumed.
- **The compiler's refusals are tested against the real compiler**, including the ones an
  adversarial review found broken and that are now fixed: expression attributes, JSX spreads,
  unsafe URLs on **both** syntaxes, and `<img>` without alt on either syntax.
- **The renderer's output is semantic**, asserted through Testing Library roles: headings are
  `h2`/`h3`, lists are `ul`/`ol`, links are focusable anchors, images carry alt, and text is
  escaped (no `script` element appears).

### Bugs caught during M2.2, and fixed

Each was found by an adversarial review and then proven with a test:

1. **Expression attributes silently became object props.** `<Callout title={name}>` stored the
   whole AST node as the prop value and shipped it to the client, rendering `[object Object]`.
   The documented refusal was false. Now any non-literal attribute value is refused.
2. **The URL filter was bypassed by JSX syntax.** `[x](javascript:…)` was refused but
   `<a href="javascript:…">` was not, so a writer could walk around the boundary by changing
   syntax. The policy now runs on every emitted URL, on both syntaxes, and again at render.
3. **JSX `<img>` skipped the alt-text requirement** that the Markdown image path enforced.
   Now enforced for any `img`, whichever path produced it.
4. **Reference-style links failed with an internal AST name.** `[text][ref]` threw
   `unsupported MDX construct "linkReference"`, which an author cannot act on, behind a
   comment that claimed `remark-parse` resolved references (it does not). Now refused with a
   message that names the construct and the supported alternative.
5. **Inline code compiled to an empty `<code>`.** `inlineCode` carries its text in `value`,
   not `children`, so the generic child walk produced nothing. Fixed and noted in a comment.
6. **The compiler/renderer element lists could drift.** A registry test asserts the allowlist
   contains no scripting-capable element and does contain the semantic ones.
7. **The ESLint content-boundary pattern did not match nested paths.** `@content/mdx/…` was
   not caught by `@content/*` (minimatch `*` does not cross `/`); `@content/**` was added.

### Not done, deliberately

- **No lesson or roadmap page.** The tree renders, but no route displays it, so the renderer
  is tree-shaken out of the current build. That is correct for a foundation slice, and the
  renderer is covered by direct tests instead.
- No exercises, search, progress UI, quizzes, tool directory, labs or career preparation.
- **No custom components registered.** The allowlist is empty; no current content uses one.
- Tables and reference-style links are unsupported (recorded in `BACKLOG.md`).
- No new runtime dependency: `unified`, `remark-parse` and `remark-mdx` are devDependencies.

### Not verified — read this before continuing

- **There is still no live URL.** The repository has no git remote, so `deploy.yml` has never
  run and M1's deployment exit condition remains unmet.
- **No browser was driven at 375 / 768 / 1440.**
- **M2 is not finished.** The lesson and roadmap pages are next, then exercises.

The `format:check` failure carried since M1 — `prettier --check .` globbing the untracked,
untouchable `opencode.json` — is resolved without touching that file: it is now listed in
`.gitignore` and `.prettierignore` (`DECISIONS.md` D20). `npm run check` is fully green.

### Files that must be understood before changing anything

New at M2.2, in addition to the M2.1 table:

| File                                      | Why it matters                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `content/mdx/compile.ts`                  | The build-time compiler. The trust boundary: what a body may become       |
| `content/mdx/tree.ts`                     | The closed node vocabulary + `isSafeUrl`, shared by compiler and renderer |
| `src/content/mdx/registry.ts`             | The component allowlist. The one place content can become code            |
| `src/content/mdx/render.ts`               | The React renderer. Re-checks URLs; throws on an unknown component        |
| `src/content/mdx/prose.module.css`        | Typography for every construct the compiler can emit                      |
| `scripts/check-paths.ts`                  | Now also guards the built output against a compiler leak                  |
| `src/domain/__tests__/boundaries.test.ts` | Invariant 6: the compiler stays at the build edge                         |

### Do not change without a decision

Everything in the M0/M1/M2.1 lists below, plus M2.2's: the "tree not a JavaScript module"
choice, the closed node vocabulary, the URL policy and its application to both syntaxes, the
alt-text requirement, the empty component allowlist, and the built-output leak guard.

### Recommended next task

**A lesson page**, rendering `findLesson(lessonId).body` through `MdxContent`. It is the
first thing that exercises `prose.module.css`, the type scale and prose contrast against real
long-form text — the two questions left open since M1.

---

## Earlier checkpoint: M2.1 content ingestion pipeline

**Date:** 2026-10-01
**Milestone:** M2 — Content Engine (first slice)
**Tag:** none — `v0.1.0-foundation` remains the only tag
**Branch:** `main` · **HEAD:** `43a9a94` (M1 audit fixes) with M2 changes in the working tree

### What this checkpoint is

The frontmatter parser moved out of the browser and into the build. At M1, `content/index.ts`
imported `gray-matter` and called it at module scope, and that file is in the client graph, so
a Node YAML parser shipped to every learner. M2 replaces that with `vite-plugin-content.ts`,
which parses `.mdx` frontmatter in Node and serves a virtual module of plain data. Rendering
the `.mdx` body is **not** part of this slice.

### Verified working

- `npm run check` passes end to end, **except** the one untracked-file caveat below:
  `format:check` (on tracked files), lint, typecheck, content validation, `check:contrast`,
  **283 tests across 18 files**, **14 architectural invariants**, a build with the SPA
  fallback, and the subpath verification.
- **The bundle shrank by a measured 56 kB gzipped: 717 kB / 202 kB → 468 kB / 146 kB
  (raw −34.7%, gzipped −27.6%).** This is the whole reason for the change, and it was
  measured by before/after builds rather than assumed.
- **`gray-matter` and `js-yaml` are absent from the built JS.** Asserted by grepping the
  built asset for `gray-matter`, `js-yaml`, `YAMLException`, `safeLoad` and others — all
  absent — while the parsed content itself (`va-foundations`, `what-is-a-virtual-assistant`)
  is present, proving the pipeline ran rather than the content being dropped.
- **Invariant 6 is proven to bite, not just to pass.** Re-importing `gray-matter` into
  `content/index.ts` makes two `test:arch` tests fail; restoring the file makes them pass.
- **Malformed YAML now fails at parse time, with the file named**, instead of surfacing as a
  downstream validation message. Tested with an unterminated string and a duplicate key.
- The pipeline is exercised through the same path in every context: `content:check` runs the
  registry through `vite-node`, which applies the plugin, and the counts (16 career paths,
  2 roadmaps, 2 modules, 4 lessons, 19 skills) match the M1 baseline exactly.
- The file walk is pinned against the **real** `content/` tree, not a fixture: it finds the
  real counts, walks lessons recursively, returns sorted repo-relative paths, and ignores
  non-`.mdx` files.

### Bugs caught while building M2, and fixed

1. **Generated import bindings contained hyphens.** The first plugin draft aliased
   `careerPaths as __career-paths`, an invalid JS identifier. Found immediately by running
   `content:check` rather than by inspecting the plugin.
2. **The static data import specifier did not resolve.** `"content/career-paths.ts"` is not a
   resolvable specifier in every context; changed to a root-relative `"/content/..."` that
   Vite resolves identically in build, dev and `vite-node`.
3. **A tab-indented YAML block does not throw in `gray-matter`.** An early malformed-input
   test asserted it would, and failed. The test was wrong, not the parser; it was replaced
   with inputs that genuinely are malformed (an unterminated string, a duplicate key).
4. **The boundary check matched its own explanatory comment.** `content/index.ts` documents
   that it no longer uses `import.meta.glob`, and the first version of the check matched that
   prose. Comments are now stripped before matching — a check that cannot name the thing it
   forbids is a check that gets weakened to pass.

### Not done, deliberately

- **No MDX compilation or rendering.** The body is still opaque text. This slice is the
  ingestion pipeline only.
- No lesson pages, no exercises, no search, no progress UI, no quizzes, no tool directory,
  no labs, no career preparation. No placeholder routes.
- No new runtime dependency. `gray-matter` remains a `devDependency`; the plugin is a build
  concern and is imported only by `vite.config.ts`.

### Not verified — read this before continuing

- **There is still no live URL.** The repository has no git remote, so `deploy.yml` has never
  run and M1's deployment exit condition remains unmet.
- **No browser was driven at 375 / 768 / 1440.** Unchanged from M1.
- **M2 is not finished.** This was the first of several M2 slices; MDX rendering followed at
  M2.2.

### Files that must be understood before changing anything

New at M2, in addition to the M1 table below:

| File                                      | Why it matters                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `vite-plugin-content.ts`                  | The build-time ingestion. Only file that reads `content/` from disk and parses YAML  |
| `content/virtual-content.d.ts`            | The contract between the plugin and `content/index.ts`. Deliberately loosely typed   |
| `content/index.ts`                        | Now imports `virtual:content-data` instead of globbing. Still the single entry point |
| `src/domain/__tests__/boundaries.test.ts` | Invariant 6 lives here: the parser must not reach the client                         |

### Do not change without a decision

Everything in the M0/M1 lists below, plus M2's: the build-time ingestion approach, the
virtual-module shape, and the rule that `gray-matter` is build-only (D21).

### Recommended next task

**Compile and render the `.mdx` body**, with a small, reviewed component registry. That is
the remaining M2 work named in `BACKLOG.md`, and the type-scale and prose-contrast questions
above can only be answered once it exists.

---

## Earlier checkpoint: v0.2.0-application-shell

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
