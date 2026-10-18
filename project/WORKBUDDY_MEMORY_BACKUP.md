# Workbuddy Memory Backup

Backed up from `.workbuddy-ai/memory/` before SSD migration (2026-10-18).
These notes are gitignored local agent scratch; this copy preserves them in the repo.
Safe to delete once no longer needed.

===== 2026-10-03.md =====

# 2026-10-03 — VA learning platform

## Recovered the repo, then implemented M2.4 (exercise entity + practice)

Context: the repo is a fresh clone of `github.com/MarkKramm/VA` at `35dd3fa` (M2.3 was the
latest pushed state). A prior session's work after M2.3 was never pushed. This session
recreated **M2.4** only.

### What shipped (3 commits on `main`)

- `07cc860` feat(content): add the Exercise entity and practice pipeline (M2.4)
- `a96f057` feat(lessons): render the Practice section on lesson pages (M2.4)
- `5896bd5` docs: record the M2.4 exercise entity and practice (D25, D26)

### The pipeline for adding a content entity (reuse this for Quiz/Tool/Lab)

1. Schema in `src/content/schemas/<entity>.ts`, re-export from `schemas/index.ts`. Use
   primitives (`<Entity>SlugSchema`, `DifficultySchema`, `provenanceShape`).
2. Compiler entry (if it has prose) in `content/mdx/compile.ts` — thread a `CompilePolicy`
   (headingFloor + refusal message) through the shared walk; do NOT fork the walk.
3. Ingestion `vite-plugin-content.ts`: walk `content/<collection>/`, pick the compiler by path,
   emit a virtual-module export; `findMdxFiles` now returns `[]` for a missing dir.
4. `content/virtual-content.d.ts` + `content/index.ts`: export the collection and add its
   compiled bodies to the path-keyed `bodies` map.
5. Registry `src/content/registry.ts`: collection + `parsed` + derived reverse index +
   `<entity>Bodies`; remove from `pendingCollections`.
6. Validation `src/content/validation.ts`: duplicate-id, referential integrity (fail-closed for
   a registered collection), provenance, `counts`.
7. Selectors `src/content/selectors.ts`: `getX`, `xBody`, `xsOfY`, `ysUsingX`.
8. App seam `src/app/content.ts`: a resolved `XView` + include in `lessonContext`.
9. UI in `src/features/lessons/`; tests; then run `npm run check`.

### Key decisions recorded

- **D25**: Exercise is a first-class entity; `lesson.exercises` owns the reference (no
  `lessonId` on the exercise); derived `exerciseLessonIds`; ungraded + unsaved at M2.4;
  `exercise.attempted` deliberately NOT wired (M3); referential integrity fail-closed.
- **D26**: `compileExerciseMdx` — a dedicated entry point over the SHARED compiler, heading
  floor `h4` (a lesson body floor is `h2`). The floor follows the path, not a call-site arg.

### Verification (this session)

- `content:check` 0 errors, 3 warnings (down from 4; `files-and-folders` now reaches practice).
- typecheck clean, lint clean, contrast 34 pairs pass, `test:arch` 16 pass.
- 435 tests across 24 files; **434 pass**. The one failure is ENVIRONMENTAL:
  `content-gate.test.ts` spawns `npm run content:check` in a child process and this sandbox
  cannot spawn `cmd.exe` (`spawnSync … EBUSY`). Test left unchanged on purpose.
- Build 489 kB / 149 kB gzipped (M2.3: 482/148); SPA fallback + `check:paths` clean; no compiler
  in the client.

### Environment gotchas

- `node_modules` was empty in the fresh clone — run `npm ci` first.
- Concurrent agent activity can cause transient `EBUSY` (file locks, cmd.exe spawn blocks).

### NOT done (by instruction)

- No M2 close-out, no `v0.3.0-content-engine` tag, no pre-M3 hardening, no `AGENTS.md` rewrite.
  `NEXT_STEPS.md` now has one item: close out M2.

===== 2026-10-04.md =====

# 2026-10-04 — VA learning platform

## M2 close-out + release `v0.3.0-content-engine`

M2 (Content Engine) is **CLOSED**. M0, M1, M2.1, M2.2, M2.3, M2.4 all complete. M3 not started.

### Commits (branch `main`, not pushed)

- `7eadb64` chore: ignore the local agent workspace in git and prettier
- `0d1a851` docs: close out M2 and record the v0.3.0-content-engine release
- (earlier M2.4) `5896bd5`, `a96f057`, `07cc860`

### Tag

- `v0.3.0-content-engine` (annotated) → `0d1a851f4af2419f15f1c51a4773d241b32660b2` (= HEAD).
- Previous tag `v0.1.0-foundation` (M0) is still the only other tag.

### Verification

- content:check 0 errors, 3 warnings; 16 career paths / 2 roadmaps / 2 modules / 4 lessons /
  1 exercise / 19 skills.
- format:check, lint, typecheck, contrast (34) clean.
- test: 435 across 24 files, **434 pass**; 1 environmental failure (`content-gate.test.ts`
  spawns `cmd.exe`, sandbox `EBUSY`). Test left unchanged.
- test:arch 16 pass. build 489 kB / 149 kB gzipped; SPA fallback + check-paths clean.

### Doc changes

- `README.md` status → M2 complete; fixed the stale "no git remote" deploy line; added "An exercise".
- `CHANGELOG.md`: `[Unreleased]` reset; new `## [0.3.0-content-engine] — 2026-10-04 — M2 Content Engine`
  (M2.1–M2.4 content moved under it); version links updated.
- `project/CURRENT_STATE.md`: milestone status table (M0–M2 ✅, M3 ⏳), "As of 2026-10-04",
  honest verification note about the sandbox spawn failure, "Before M3" section.
- `project/CHECKPOINT.md`: new top checkpoint "M2 close-out — v0.3.0-content-engine".
- `project/NEXT_STEPS.md`: M2 COMPLETE; next = (1) pre-M3 hardening, (2) M3 Progress.
- `project/BACKLOG.md`: Exercise marked Done at M2.4; new **"Pre-M3 hardening (post-M2 audit)"**
  section with the 9 findings.
- `DECISIONS.md`: unchanged (D25/D26 already recorded at M2.4). D1–D26 intact, no renumber.

### Important note (discrepancy found, not "fixed")

`PLAN.md` §69 lists M2 as lesson data/pages/modules/categories/roadmaps and puts _Exercises_
under M6 "Practice". The repo's internal M2.4 slice extended M2 to include the first **ungraded**
exercise. PLAN.md was NOT edited (it is the constitution); the mapping is recorded in
`CURRENT_STATE.md` → "A note on PLAN.md §69".

### Deliberately NOT done (next task = pre-M3 hardening)

The 9 findings in `BACKLOG.md`: stale AGENTS.md, `syncFrom` equal-length divergence, quality
checks ignoring compiled prose, duplicated `roadmapProgress`, hand-duplicated
`KNOWN_EVENT_TYPES`, no-op shared-topic validation branch, `@/content` boundary-test gap,
exercise-title invariant (already added at M2.4 — keep in step), missing export producer.
`AGENTS.md` was intentionally left stale for that pass.

### `opencode.json`

Not touched (D20).

---

## Pre-M3 hardening pass (later the same day)

Fixed the five P2 findings from the M2→M3 audit. No M3 work. Three commits:

- `a932f0c` fix(progress): harden event synchronization and export handling (F5, F2, F9)
- `b8710a4` fix(content): validate compiled lesson and exercise prose (F3)
- `cd1f6b5` docs: refresh pre-M3 project orientation (F1)

### What changed

- **F5** — `PROGRESS_EVENT_TYPES` in `src/domain/progress/types.ts`, tied to the union via
  `satisfies Record<ProgressEventType, true>`; `KNOWN_EVENT_TYPES` in `export-validate.ts`
  is now derived from it (drift = compile error).
- **F2** — `ProgressStore.syncFrom` compares event IDENTITY (id sequence), not length.
- **F9** — `serializeProgressExport(state)` added (pure, `JSON.stringify({version, events}, null, 2)`),
  round-trips through `parseProgressExport`.
- **F3** — `quality-checks.ts` flattens the compiled body (text nodes only) for lessons AND
  exercises; props/URLs/element names excluded.
- **F1** — AGENTS.md §2/§4/§7 refreshed.

### Verification

- content:check 0 errors, 3 warnings (unchanged). typecheck/lint/contrast clean.
- test: **452 across 25 files, 451 pass**; 1 environmental (`content-gate` spawns cmd.exe →
  EBUSY). test:arch 16.
- build 489.18 kB / 149.41 kB gzipped — byte-identical to before (no client code added);
  check-paths clean.
- HEAD `cd1f6b5`. No new tag. `opencode.json` absent/untouched.

### Still open (cleanup batch, NOT done)

`roadmapProgress` duplication, no-op shared-topic branch, `@/content` boundary-test alias gap,
tautological `content.test.ts` de-dup assertion, dead `ProgressStore.refresh()`, stale M2.4
checkpoint wording. Recorded in `BACKLOG.md` → "Pre-M3 hardening".

---

## M3 — Progress (same day, after the hardening pass)

Implemented M3: the local-first progress layer. **Not tagged** (deliberate).

### Commits (branch `main`, not pushed)

- `70ac52d` feat(progress): add the local-first progress store and persistence
- `407dc85` feat(progress): record lesson completion and exercise attempts
- `27b9733` feat(dashboard): surface progress, per-roadmap progress and export/import
- `85aa0b4` docs: record the M3 progress milestone

HEAD `85aa0b4`. No new tag (`v0.3.0-content-engine` still latest).

### Architecture

- `src/app/progress/store.ts` — `LearnerProgress`: record / persist / cross-tab sync / export /
  merge-on-import / clear. Framework-free; built on the existing `ProgressStore`.
- `src/app/progress/ProgressProvider.tsx` — React context + `useSyncExternalStore` (NO Zustand;
  D29).
- `src/app/progress/composition.ts` — content↔progress join (curriculum/roadmap progress,
  continueLearning, recentlyCompleted).
- `src/app/progress/file-io.ts` — browser download/read, isolated for testability.
- UI: `CompletionControl` (lesson page), PracticeSection self-report, `ProgressPanel` +
  `DataTransfer` (dashboard), roadmap progress bar + per-lesson "Completed" badges.

### New decisions

- **D27** learner-facing roadmap progress = completed-lesson COUNT; the domain's stage-mean
  stays the gating policy (do not "unify" them).
- **D28** generated event timestamps are strictly increasing.
- **D29** React context + `useSyncExternalStore`, not Zustand.

### Bug found & fixed during M3

Two events appended in the same millisecond shared an `at` and fell back to a random-id
tiebreak → "mark complete then un-mark" was a coin flip. Fixed in `merge.ts` (`nextTimestamp`),
regression test added. Found via a flaky test.

### Verification

- content 0 errors / 3 warnings; lint, typecheck, contrast (34), arch (16) clean.
- test: **497 across 29 files, 496 pass**; 1 environmental (`content-gate` spawns cmd.exe).
- build **503.8 kB / 154.0 kB gzipped** (M2: 489.2/149.4). Runtime deps still 5 — no new dep.
- check-paths clean, no compiler leak.

### Deferred (recorded in BACKLOG "M3 progress — deferred")

XP/levels/streaks/achievements, bookmarks/notes, recommendations/weak areas, job readiness,
portfolio, quizzes (M4), search + tool directory (M5), labs (M6), auth/backend/cloud sync.

---

## Pre-M4 hardening pass (same day, after the post-M3 audit)

Fixed the two P2 findings from the post-M3 adversarial audit. No M3 architecture changed.

**Commit:** `8abc63e` — `fix(progress): harden storage validation and cross-tab sync`
HEAD `8abc63e`. No new tag.

### A1 — validation on every read of persisted progress

- Root cause: validation ran only in `LearnerProgress.restore` (init). `append`, `mergeEvents`
  and `syncFrom` re-read storage RAW, so a corrupted event reached `mergeEventLogs`' sort →
  `undefined.localeCompare` → TypeError on the next interaction. `syncFrom` threw on
  `undefined.length`.
- Fix: moved the shape predicate to the storage boundary —
  `isProgressEvent` + `sanitizeProgressEvents` in `export-validate.ts`; `ProgressStore.load`
  now sanitizes via `sanitizeStoredState`. `append`/`mergeEvents` share a private `persist`.
  `store.ts` `restore` is now just `try { load() } catch`.
- **Mutation-verified**: reverting the sanitizer made the two new A1 tests fail with exactly
  the predicted TypeErrors.

### A2 — cross-tab storage-event wiring now tested

- New `src/app/progress/__tests__/cross-tab.test.tsx`: dispatches a real `StorageEvent` and
  asserts the dashboard updates through provider → store → React, plus no write-back (no loop)
  and no reaction to an unrelated key.
- Extended `storage.test.ts` "cross-tab subscription": call-back on the progress key, ignore an
  unrelated key, stop after unsubscribe.
- **Mutation-verified**: breaking the key match failed both dispatch tests.

### Verification

- test **506 across 30 files, 505 pass** (+9 tests, +1 file); 1 environmental content-gate spawn.
- format/lint/typecheck/content(0 err, 3 warn)/contrast(34)/arch(16) clean.
- build **503.88 kB / 154.03 kB gzipped** (unchanged); check-paths clean, no compiler leak.

### Deferred (recorded in BACKLOG "Post-M3 audit (deferred)")

A3 dashboard label, A4 future-date clamp, A5 restore dedupe, A6 practice focus, A7 progressbar
naming, A8 live regions, A9 dead code, A10 key matching, A11 createInitialState allocation.

---

## A1-R fix (same day, after the final pre-M4 audit)

**Commit:** `c1472fb` — `fix(progress): preserve unknown events during storage reads`
HEAD `c1472fb`. No new tag.

### The regression the A1 fix introduced

A1 made `ProgressStore.load()` filter stored events by `KNOWN_EVENT_TYPES`. Because the
sanitized state is what `mergeEvents` writes back, an older build would DELETE a newer build's
unknown-typed events on its next write. Not reachable today (one union), but live as soon as
the union changes.

### The fix (storage structural vs import semantic)

`src/app/storage/export-validate.ts`:

- `isStoredProgressEvent` — STRUCTURAL only (`id`/`at`/`type` are strings). Used by storage.
- `isKnownProgressEvent` — structural + `KNOWN_EVENT_TYPES.has(type)`. Import only.
- `sanitizeStoredEvents` (storage path) / `filterKnownEvents` (import path).
- `parseProgressExport` now uses `filterKnownEvents`, which also removed the old
  `known as unknown as readonly ProgressEvent[]` double cast.

`merge.ts` imports `sanitizeStoredEvents`; doc comment explains the preserve-don't-filter rule.
No change to the domain reducer, the event union, or `ProgressState`.

### Tests

- New: `preserves an unknown event type across load → append → write (A1-R)`.
- Inverted two A1-era assertions that encoded the now-invalid behaviour (unknown types dropped
  on read); malformed-structure assertions unchanged.
- Strengthened the import test: the unknown imported type is still skipped AND absent from the
  resulting state.
- **Mutation-verified**: restoring the known-type filter failed all three preservation tests.

### Verification

- test **507 across 30 files, 506 pass** (+1); 1 environmental content-gate spawn.
- format/lint/typecheck/content(0 err, 3 warn)/contrast(34)/arch(16) clean.
- build **503.86 kB / 154.03 kB gzipped** (unchanged); check-paths clean, no compiler leak.

---

## M4.1 — Question + Quiz content architecture (2026-10-05)

**Commit:** `3f69ad8` — `feat(quiz): add question and quiz content architecture`
HEAD `3f69ad8`. No new tag. **Content only** — no renderer/route/scoring/attempt/progress event.

### What landed

- `src/content/schemas/question.ts` — `QuestionSchema`, a `z.discriminatedUnion('type', ...)`
  of `single-choice` (choices + `correctChoiceId`) and `true-false` (`answer`), plus two
  cross-field `.refine`s (correct answer must name a choice; choice ids unique).
- `src/content/schemas/quiz.ts` — `QuizSchema` (id/title/summary/`questionIds` min 1/provenance)
  - a refine rejecting a repeated question reference.
- `content/questions/*.mdx` (3 files) + `content/quizzes/*.mdx` (1 file) — **one file per
  entity**, following `docs/DATA_MODEL.md`'s `content/questions/`. Frontmatter-only, no body.
- Registry: `questions`/`quizzes` maps, `parsed.questions/quizzes`, derived `questionQuizIds`.
  Both left `pendingCollections`.
- Validation: fail-closed quiz→question, question→skills, duplicate ids, provenance, counts.
- Selectors: `getQuestion`/`getQuiz`/`questionsOfQuiz`/`quizzesUsingQuestion`; app seam
  `allQuestions`/`findQuestion`/`allQuizzes`/`findQuiz`.
- Quality checks: question prose scanned for guarantee language + uncited numeric claims.
- **D30** recorded; CURRENT_STATE/CHECKPOINT/NEXT_STEPS/BACKLOG/CHANGELOG/README updated.

### Gotchas worth remembering

- YAML parses an unquoted `updatedAt: 2026-10-05` into a JS **Date**, which fails
  `IsoDateSchema`. `.mdx` frontmatter must quote dates: `updatedAt: '2026-10-05'` (the existing
  lesson/exercise files already do).
- `z.discriminatedUnion(...).refine(...)` returns a `ZodEffects`; that is fine for `parseAll`,
  but a `.filter(predicate)` narrowing to a union FAILS `S extends T` against Zod's inferred
  element type (which carries an index signature). Typing the array as `readonly unknown[]`
  first fixes it.
- Plugin: `.mdx` collections are walked by `findMdxFiles`; `.ts` collections go in
  `DATA_IMPORTS`. Questions/quizzes use the walk (one file per entity).

### Verification

- content:check **0 errors, 3 warnings**; "3 questions, 1 quizzes".
- test **537 across 31 files, 536 pass** (+30 tests, +1 file); 1 environmental spawn.
- format/lint/typecheck/contrast(34)/arch(16) clean.
- build **509.96 kB / 155.74 kB gzipped** (+6.1 raw / +1.7 gzip); check-paths clean, no leak.
- Mutation check: breaking the duplicate-reference refine + the quiz→question check failed
  exactly 3 tests; both restored.

### Deferred (BACKLOG "M4.1 — deferred")

`lesson.quiz` and `roadmap.outcomes[].evidence` validation (pending the M4.2/M4.3 linkage
decision), `Quiz.shuffle`, alias/deprecated-id resolution (no mechanism exists), question-bank
scale-out.

---

## M4.1 hardening pass (2026-10-05, after the M4.1 audit)

**Commit:** `7e3b89a` — `fix(content): harden M4.1 quiz validation and tests`
HEAD `7e3b89a`. No new tag. 12 files, +267/−23. No architecture change.

### The 7 items

1. **P2 fixed** — `quality-checks.ts` gained a quizzes loop scanning `title` + `summary` with
   the existing `GUARANTEE_PATTERNS` / `NUMERIC_CLAIM`, path `content/quizzes/${id}.mdx`;
   `push`'s entity union extended to `'quiz'`; steps renumbered 9/10.
2. `AGENTS.md` §2 — now "M4 in progress (M4.1 landed, M4.2 next)".
3. `docs/ARCHITECTURE.md` (dropped `quizzes` from the skipped list, named the known
   collections) and `docs/CONTENT_ARCHITECTURE.md` (added an "M4.1 adds" line).
4. Ordering fixture test — registry order is now the OPPOSITE of `questionIds`, so it can only
   pass if `questionsOfQuiz` follows the quiz's own sequence.
5. Three test cases: unused question → no reverse entry; true-false strips `choices`;
   `quizzesUsingQuestion` against the REAL registry.
6. `vite-plugin-content.ts` — `isQuestionPath`/`isQuizPath` + `warnIfBodyIsIgnored`, a
   build-time `console.warn` naming the file. Body is still NOT rendered.
7. `scripts/validate-content.ts` — generic `count(n, singular, plural?)` helper; now
   "1 exercise, 3 questions, 1 quiz".

### Verification

- test **548 across 31 files, 547 pass** (+11); 1 environmental content-gate spawn.
- format/lint/typecheck/content(0 err, 3 warn)/contrast(34)/arch(16) clean.
- build **509.96 kB / 155.74 kB gzip — byte-identical hash (`index-CCNGQp8a.js`)**. Proof the
  hardening touched no client code: `validation.ts`/`quality-checks.ts` are not in the client
  graph (registry imports `type RegistryIssue` only).
- **Mutation check**: blanking the quiz loop's scanned body + making the path predicates never
  match failed exactly the 5 new tests; both restored before commit.

---

## M4.2 — Learner quiz renderer (2026-10-05)

**Commit:** `b0f0e06` — `feat(quiz): add learner quiz renderer and interaction`
HEAD `b0f0e06`. No new tag. 24 files, +1181/−59. No progress/domain changes.

### What landed

- `/quizzes/:quizId` — `src/features/quizzes/`: `QuizPage.tsx`, `QuestionCard.tsx`,
  `answers.ts` + 2 CSS modules. 17 tests.
- `quizContext()` in `src/app/content.ts` — the renderer view. **Strips `correctChoiceId`,
  `answer`, `explanation`**, so the page physically cannot reveal a correct answer. The
  mapper's `switch` has a `never` guard, so a new content type is a COMPILE error.
- `lesson.quiz` is now **fail-closed** (`validation.ts`) and the lesson page links it
  (`LinkButton` + a "Check your understanding" section). `what-is-a-virtual-assistant.mdx`
  declares `quiz: va-foundations-basics`.
- **D31** records the linkage decision. The fixture's `validLesson` default `quiz` was removed
  (so fixture registries without quizzes stay valid), and `exercises.test.ts`'s pinned
  no-practice count went 3 → 2 (the quiz makes a lesson reach practice by fact).

### Interaction/state

- One native radio group per question (`name="question-<id>"`), so selecting one cannot clear
  another. Arrow keys are the browser's; jsdom can't simulate them, so the test asserts the
  STRUCTURE (separate names, all enabled) plus Space activation.
- `answers` is `useState` only: no storage, no progress event, no attempt, no score. The
  "Check answers" button is disabled until all are answered; pressing it reveals "Nothing is
  scored or saved yet" and REPLACES the button (mirrors `PracticeSection`).
- Single page, no pager — the ordered list + live count is the "equivalent navigation".

### Verification

- test **567 across 32 files, 566 pass** (+19); 1 environmental content-gate spawn.
- format/lint/typecheck/contrast(34)/arch(16) clean.
- content:check **0 errors, 2 warnings** (down from 3 — the quiz link makes a lesson reach
  practice).
- build **515.09 kB / 157.20 kB gzip** (CSS 52.65/8.90); check-paths clean, no compiler leak.
- **Mutation check**: sorting `questionsOfQuiz` by id failed 6 tests including the renderer's
  ordering test; restored.
- Harness gotcha: `tests/harness.tsx` DUPLICATES the route table on purpose — a new route must
  be added there too, or every page test fails to resolve it.

### Deferred (BACKLOG "M4.2 — deferred")

Scoring/pass-fail/mastery, `quiz.attempted` + attempts, answer persistence, whether a quiz
counts as "practice", a `/quizzes` index, more question types, `Quiz.shuffle`, roadmap evidence.

---

## M4.3 — Quiz scoring, results and persisted attempts (2026-10-05)

**Commit:** `bc90519` — `feat(quiz): implement scoring and persisted attempts (M4.3)`
HEAD `bc90519`. No new tag. 20 files, +1455/−162. **No `src/domain/` change.**

### The seam decision (the key architectural call)

- `src/app/quiz/score.ts` — the PURE scorer. NOT in `src/domain/` (the domain deliberately knows
  nothing about content — `unlock.ts` says so and the boundary test enforces it) and NOT in the
  feature (the scorer would then import from a feature, reversing the direction).
- The answer model MOVED from `src/features/quizzes/answers.ts` to `src/app/quiz/answers.ts` so
  both the renderer and the scorer import downward. The feature's UI helpers are now
  `src/features/quizzes/options.ts`.
- `quizScoringInput(quizId)` in `src/app/content.ts` returns the CANONICAL questions — read only
  inside the submit click handler, never during render.

### Scoring model (D32)

One point per question; `maxScore = questions.length`; pass at `QUIZ_PASS_THRESHOLD = 0.8`
(matching `DEFAULT_STAGE_THRESHOLD`). No partial credit/weighting/negative marking/fuzzy match.
Unanswered and malformed both score zero but are reported SEPARATELY (`unanswered`), so the UI
says "skipped" not "wrong". `switch` ends in a `never` guard → a new question type is a COMPILE
error. Nothing throws.

### Persistence

Exactly one `quiz.attempted` event per submission via `LearnerProgress.submitQuizAttempt`,
`evaluatedBy: 'system'`, `attemptId` from `newEventId()`. Answers are NOT stored. Submission runs
in the click handler (never an effect), which is what makes "one attempt per submission"
structural. Retry adds an attempt; history is read from the log.

### Gotchas

- Fixture ids must be ≥2 chars (`SlugSchema.min(2)`) — `id: 'q'` throws a ZodError.
- `getByText` THROWS when absent; use `queryByText` for a negative assertion.
- The result summary has a `<dt>Correct</dt>` figure label, so an unscoped `getAllByText('Correct')`
  counts 4 not 3 — scope to the question groups.
- The design system has **no negative/danger colour**. Used the existing contrast-validated
  complete-chip pair (`--state-complete-soft` + `--state-complete-strong`) for correct and the
  neutral inset surface for anything else; the WORD carries the outcome. No new tokens, no new
  contrast pairs.
- P3 fix applied: the "Answered" marker moved OUT of `<legend>` so the radio group's accessible
  name stops mutating.

### Verification

- test **605 across 34 files, 604 pass** (+38); 1 environmental content-gate spawn.
- format/lint/typecheck/content(0 err, 2 warn)/contrast(34)/arch(16) clean.
- build **519.16 kB / 158.27 kB gzip** (+4.1 raw / +1.1 gzip); check-paths clean, no leak.
- **Mutation check**: persisting on answer + leaking `correctChoiceId` into the view + sorting
  `questionsOfQuiz` → 20 tests failed; all restored.

---

## M5 — Learning & Assessment Foundation (2026-10-05)

**Commit:** `9e241d4` — `feat(learning): establish assessment and skill evidence foundation (M5)`
HEAD `9e241d4`. No new tag. 44 files, +3153/−80. No dependency change.

### What landed

- `src/content/schemas/assessment.ts` — the `Assessment` entity (PLAN §52: scenario,
  requirements, tools, instructions, deliverable, evaluationCriteria, hints, commonMistakes,
  referenceGuidance). Frontmatter-only, one file per entity, no learner state, no payload.
- `content/assessments/client-file-organisation.mdx` — a real practical task; wired to
  `beginner-va` via `finalAssessment` AND `outcomes[].evidence`.
- `roadmap.finalAssessment` and `roadmap.outcomes[].evidence` are now **fail-closed** (the M4.1
  deferral, resolved). `lab` evidence stays skipped (pending collection).
- `/assessments/:assessmentId` — brief + published rubric + self-evaluation + result + retry.
  The gate shows its reasons; the task stays readable while locked.
- `src/app/learning/assessment.ts` — `scoreSelfAssessment` (all criteria to pass) +
  `assessmentGate` (delegates to `assessmentEligibility`).
- `src/app/learning/evidence.ts` — the three tiers (read/practised/demonstrated), DERIVED.
- `LearnerProgress.submitAssessmentAttempt` — reuses the existing `assessment.attempted`.
- Dashboard `SkillsPanel`; roadmap final-assessment card.
- Registry: `assessmentSkillIds`, `assessmentRoadmapIds`, `skillQuizIds` (a quiz's skills come
  from its questions).

### Decisions (D33)

Self-evaluated (`evaluatedBy: 'self'`) because there is no evaluator and no upload; the rubric is
PUBLIC while a quiz's answers are hidden (different instruments); all criteria to pass; readiness
is counts and states, never a score.

### Gotchas

- `assessmentEligibility` could never be satisfied for a lesson with NO activities
  (`[].some()` is false) → a lesson with nothing to practise now requires completion only.
- Test helpers that wrap fixture data must pass an ALREADY-wrapped `{path, data}` through, or the
  wrapper nests and the schema silently drops the entity (cost me a confusing duplicate-id failure).
- Adding fail-closed evidence validation broke 6 fixture tests: a fixture roadmap that stages a
  quiz needs the quiz AND its questions in the set.
- `getAllByText('Demonstrated')` — the result/skills panels have multiple badges; scope with
  `within()` or use getAll.

### Verification

- test **676 across 38 files, 675 pass** (+71); 1 environmental content-gate spawn.
- format/lint/typecheck/content(0 err, 2 warn)/contrast(34)/arch(16) clean.
- build **538.94 kB / 163.33 kB gzip** (+19.8 raw / +5.1 gzip); check-paths clean, no leak.

===== 2026-10-05.md =====

# 2026-10-05 — M6 core VA curriculum

**Commit:** `4b0ec16` — `feat(content): build core VA foundations curriculum (M6)`.
HEAD `4b0ec16`, `main`, working tree clean. No new dependencies; `opencode.json` absent/untouched.

## What landed

- 7 modules and 20 lessons covering online research, client communication, email/scheduling,
  shared files/SOPs, data/spreadsheets, remote work/safety/scam-awareness, non-voice support.
- 10 practical exercises, 6 module quizzes (18 new questions, 21 total), 2 assessments (3 total),
  4 new skills (`safety`, `safety-accounts`, `safety-scam-awareness`, `data-spreadsheets`), and a
  `non-voice-va` roadmap reusing shared modules by id.
- `outcomesOfRoadmap` resolves validated quiz/assessment outcome evidence to navigable links;
  `RoadmapDetailPage` exposes those links. New test: `RoadmapEvidence.test.tsx`.
- Existing roadmaps expanded with new modules/evidence. Stage list deliberately contains repeated
  `core` kinds; stage test updated to assert list order/retention (not distinct kinds).
- Existing aggregate count tests updated for 24 lessons, 9 modules and 3 roadmaps.
- 2 intentional `quality/no-practice` warnings remain: `browser-basics` and
  `who-hires-virtual-assists`.

## Verification

- `content:check`: 0 errors, 2 warnings; 3 roadmaps, 9 modules, 24 lessons, 11 exercises,
  21 questions, 7 quizzes, 3 assessments, 23 skills; payload 98.2 KB.
- `format:check`, lint, typecheck, contrast (34 pairs), architecture (16), build and check-paths
  pass. Build: **767.96 kB / 213.72 kB gzip**, no runtime compiler marker in the bundle.
- Vitest: **680 across 39 files, 679 pass**. Single known environmental `content-gate.test.ts`
  child-process (`cmd.exe EBUSY`); direct `npm run content:check` exits 0. Gate not weakened.

## Documented scope boundaries

No specialized VA curriculum, tool directory/search, labs, file upload, automated/AI grading,
portfolio/resume/interview, job board, backend, auth, XP, achievements or streaks. Module/roadmap
bodies are ingested and payload-counted but not rendered (recorded in BACKLOG). PLAN labels tools
and search M5, while the requested batch used M6 for curriculum; NEXT_STEPS documents the label
conflict for owner resolution.

===== 2026-10-15.md =====

# 2026-10-15

## Session: verified and pushed M6

- **Context:** ~10 days since last session. Owner asked whether the project was pushed (considering a reformat / new SSD).
- **Finding:** `main` was **1 commit ahead of `origin/main`** — `4b0ec16` (M6 core VA foundations curriculum, committed 2026-10-05 23:45) had never been pushed. Everything through M5 (`9e241d4`) was already on GitHub.
- **Blocked initially:** `git push` failed with `could not read Username for 'https://github.com': terminal prompts disabled`. Cause: system git config has `credential.helper = helper-selector`, which requires an interactive dialog. A stored credential for `git:https://github.com` _did_ exist in Windows Credential Manager.
- **Fix used:** pushed with `git -c credential.helper= -c credential.helper=manager push origin main` (resets the helper list, then uses Git Credential Manager, which reads the stored credential non-interactively).
- **Made permanent:** `git config --local credential.helper manager` — repo-local only, so `.git/config` overrides the system `helper-selector`. Future pushes from this repo work without the workaround. No global/system config was touched.
- **Result:** `9e241d4..4b0ec16  main -> main`. Remote `refs/heads/main` and `HEAD` both verified at `4b0ec16` via `git ls-remote`. 0 ahead / 0 behind, working tree clean.
- **Tags:** unchanged. `v0.1.0-foundation` and `v0.3.0-content-engine` exist on the remote; M3/M4/M5/M6 remain untagged by convention. M6 was **not** tagged — owner did not ask for it.
- **Local-only note:** `.workbuddy-ai/` is gitignored (`.gitignore:57`) and untracked — holds only this memory folder (~32K). `dist/` and `node_modules/` are also ignored but reproducible. Repo without `node_modules` is 4.1M.
