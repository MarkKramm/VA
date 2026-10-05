# Backlog

Deliberately deferred work. **This is the pressure valve.** Anything noticed but not in
`NEXT_STEPS.md` goes here, so scope creep has somewhere to go that is not the current
milestone.

Nothing here is scheduled. Items are listed so they are not forgotten, not as a queue.

---

## M1 shell

- Print stylesheet for checklists, templates and step lists. A VA will print these.
- Responsive table pattern with a scroll affordance — needed for wide comparison tables
  from M2 onward, and required by `ACCESSIBILITY.md`.
- ~~`check:paths` script and `postbuild-pages.mjs`~~ **Done at M1** as
  `scripts/check-paths.ts` and `scripts/copy-spa-fallback.ts`, both wired into
  `npm run build`.
- ~~**`gray-matter` is shipping to the browser (~55 kB gzipped).**~~ **Done at M2.** The
  build-time ingestion plugin (`vite-plugin-content.ts`) parses `.mdx` frontmatter in Node
  and serves `virtual:content-data`; the client bundle went from 717 kB / 202 kB gzipped to
  468 kB / 146 kB. See `DECISIONS.md` D21 and invariant 6.
- **Reusable dialog primitive.** The mobile nav's focus trap is hand-rolled and tested
  (`DECISIONS.md` D18). Replace it rather than extend it once a second dialog exists.
- **Drive a real browser at 375 / 768 / 1440.** The responsive layout is verified by
  construction — fluid `clamp()` and `auto-fit` grids, one structural breakpoint at `md` —
  but no screenshot or browser check has confirmed it.

## M2 content engine

- ~~**The Exercise entity and practice.**~~ **Done at M2.4.** `content/exercises/*.mdx` validate
  against an `Exercise` schema and compile at build time through a dedicated entry point
  (`compileExerciseMdx`, heading floor `h4`); `lesson.exercises` owns the reference,
  `exerciseLessonIds` is derived, and the lesson page renders a Practice section that is
  ungraded and unsaved. `DECISIONS.md` D25/D26.
- **MDX compilation and rendering, plus the component registry.** ~~Done at M2.2~~
  `content/mdx/compile.ts` compiles bodies at build time into a serializable tree, and
  `src/components/mdx/render.tsx` renders it through the allowlist in `registry.ts`.
  ~~The **lesson page** that consumes it is the remaining M2 work.~~ **Done at M2.3** — the
  lesson route and page exist and render the body.
- **GFM tables.** Base `remark-parse` leaves tables as text. Enabling `remark-gfm` is a
  deliberate, separate decision (it changes the parser's behaviour for several constructs at
  once). The renderer and `ALLOWED_ELEMENTS` already define the `table`/`thead`/`tbody`/`tr`/
  `th`/`td` mappings, so the work is the parser change plus tests.
- **Reference-style links and footnotes.** `[text][ref]` and `[^1]` are refused with an
  author-facing message, because resolving them needs a remark pass the compiler does not run.
  Supporting them is a small addition to `content/mdx/compile.ts`.
- **A second custom MDX component.** The allowlist is empty on purpose. When the first real
  component is authored (a `Callout`, a `KeyPoint`), add one entry to
  `src/components/mdx/registry.ts` and a test that it renders. Two components is when a
  block-vs-inline distinction may become worth expressing in the tree.
- **A lesson in more than one roadmap shows one.** The lesson page uses the lesson's PRIMARY
  roadmap for the breadcrumb, position and previous/next, chosen deterministically as the
  first. All four current lessons sit in both `beginner-va` and `data-entry-va`, so the page
  always says "Beginner VA". Showing every roadmap a lesson belongs to (e.g. "in Beginner VA
  and Data Entry VA") is the fuller statement; revisit if a learner is genuinely confused, not
  before.
- **A lesson's topic anchors.** A lesson can declare `topics` with inline anchors that match
  MDX heading ids. The lesson page does not yet render a topic list or link to anchors — no
  current content has a shared topic. Add it when the first shared topic lands.
- **The stale-tool report.** A tool whose `updatedAt` is newer than the `updatedAt` of the
  lessons referencing it. Needs the tools collection (M5); a derivation over the existing
  reverse indexes, so a few lines once the collection exists.
- Coverage thresholds on `src/domain` (90%+) and `src/content` (80%+). No UI threshold.
- Playwright, for the 5–10 critical journeys. M3 tested the real store, storage and routes
  through jsdom instead; a small number of genuine browser journeys is worth adding at M9.

## Pre-M3 hardening (post-M2 audit)

Findings from the post-M2 architectural health audit. **These are not M2 scope and not M3
features** — they are a hardening pass to run **before** M3, so the feature work lands on a
clean base. See `CURRENT_STATE.md` → "Before M3".

**Done in the pre-M3 hardening pass:**

1. ~~**`AGENTS.md` orientation drift.**~~ **Done.** §2/§4/§7 now state M0–M2 complete, M3
   next, build-time parsing, and exercises as render-only practice.
2. ~~**`syncFrom` equal-length divergence.**~~ **Done.** Change detection is by event
   identity, not count (`merge.ts`), with a regression test for the equal-length case.
3. ~~**Quality checks ignore compiled prose.**~~ **Done.** The scanned text now includes the
   flattened compiled body for BOTH lessons and exercises (`quality-checks.ts`), with
   regression tests for a body-only claim.
4. ~~**`KNOWN_EVENT_TYPES` hand-duplicated.**~~ **Done.** `PROGRESS_EVENT_TYPES` in
   `src/domain/progress/types.ts` is tied to the union by
   `satisfies Record<ProgressEventType, true>`, and the import validator derives its set from
   it, so drift is a compile error.
5. ~~**Exercise-title invariant coverage.**~~ **Done at M2.4** (invariant 3b includes exercise
   titles).
6. ~~**Missing export producer.**~~ **Done.** `serializeProgressExport` in
   `export-validate.ts`, round-trip tested across every event variant.

**Still open — the separate cleanup batch (not part of the hardening pass):**

4. **Duplicated `roadmapProgress`.** `src/domain/progress/selectors.ts` and
   `src/domain/roadmap/progress.ts` each implement mean-over-stages independently.
5. **Stale/no-op validation branch.** `src/content/validation.ts` has an empty `if` for a
   `shared` topic whose `sharedRef` does not resolve — dead code with a comment that still says
   topics arrive at M2.
6. **Boundary-test alias gap.** `importsContentForRuntime` in
   `src/domain/__tests__/boundaries.test.ts` matches `@content/` but not `@/content/`. The
   ESLint rule covers the alias via `**/content/**`; the test invariant does not.
7. **Tautological content test.** `src/app/__tests__/content.test.ts` — "counts lessons once
   per roadmap even when a module repeats" asserts `new Set([x]).size === 1`, which cannot
   fail; it should assert the actual de-duplicated ids.
8. **Dead `ProgressStore.refresh()`.** Defined in `src/app/storage/merge.ts`, never called.
9. **Stale checkpoint wording.** `project/CHECKPOINT.md` (M2.4 section) says "No M2 close-out
   yet (no `v0.3.0-content-engine` tag)", which the close-out checkpoint above it contradicts.

## M3 progress — deferred

M3 built the progress foundation and nothing more. These were deliberately NOT built; each
belongs to a later milestone, and recording them here is what kept them out of M3.

- **XP, levels, streaks, achievements** — M8 at the earliest. `AGENTS.md` §7 forbids them
  before then: mastery already means something honest, and points on top would not.
- **Bookmarks and notes** — the events exist (`bookmark.toggled`, `note.saved`) but there is no
  UI. A later slice; the domain is already ready.
- **Recommendations and weak-area detection** — a recommendation engine, not a progress feature.
  `PLAN.md` §73 and `AGENTS.md` rule 6 keep it out.
- **Job-readiness scoring** — M7. It is evidence-weighted (D6) and the evidence (quizzes, labs)
  does not exist yet.
- **Portfolio evidence** — M7.
- **Quizzes and assessments** — M4. The `Question` entity lands with the engine (D7).
- **Search and the tool directory** — M5.
- **Labs** — M6.
- **Authentication, backend, cloud and multi-device sync** — not planned (D4). The
  `StorageAdapter` port makes a backend a swap rather than a rewrite if that ever changes.
- **Browser-automation journeys** — M3 tests the real store, storage and routes through jsdom.
  Playwright stays a M9 item rather than a mid-milestone install.

## M4.3 — deferred

Deliberately NOT done in M4.3, which scores a quiz and records the attempt. Each is a follow-up
with a named owner milestone.

- **A per-quiz pass mark.** The threshold is one constant (0.8 — `DECISIONS.md` D32). A per-quiz
  `passMark` would be a content schema field and its own decision; D30 left it out on purpose.
- **Mastery from quiz attempts.** `masteryLevel` is deliberately NOT rendered for a quiz: it
  labels a SKILL's accumulated evidence, and a three-question quiz reading "mastered" would
  overstate what the platform knows. Skill-level aggregation belongs with the job-readiness work
  at M7.
- **`assessmentEligibility` gating.** It gates an assessment, and no assessment entity exists.
- **Storing the learner's answers.** The data model defines an attempt as a score, not an answer
  sheet (`DECISIONS.md` D32). Storing answers would need a schema decision first.
- **Reviewing a past attempt.** The result view shows the attempt just submitted. A past attempt
  is summarised (best, count) but its per-question answers are not replayed, because they were
  never stored.
- **XP, achievements and streaks.** Not in the plan's M4 scope; inventing them would be a product
  decision rather than an engineering one.
- **Additional question types** (`multiple-select`, `matching`, `ordering`, `scenario`,
  `short-answer`). The scorer's `never` guard makes each a COMPILE error until it has a marking
  case, which is the intended failure rather than a silent zero.
- **`Quiz.shuffle`.** Still absent; still a presentation decision.
- **Roadmap `outcomes[].evidence` linkage.** Untouched, and unvalidated for every kind.
- **A quizzes index.** There is still no `/quizzes` route.
- **Multiple quizzes per lesson.** `lesson.quiz` is singular (`DECISIONS.md` D31).

## M4.2 — deferred

Deliberately NOT done in M4.2, which renders a quiz and collects answers. Each is a follow-up with
a named owner milestone.

- **Scoring, pass/fail and mastery.** ~~M4.3~~ **Done at M4.3** — see `DECISIONS.md` D32. The
  renderer still has no access to the correct answers, so the scorer reads the canonical
  `Question` through its own seam (`quizScoringInput`) rather than by widening the view.
- **Quiz attempts and progress integration.** ~~M4.3~~ **Done at M4.3** — one `quiz.attempted`
  event per submission, through the existing store.
- **Answer persistence.** **Resolved at M4.3, as a deliberate NO** — answers stay transient and
  are never stored (`DECISIONS.md` D32).
- **Whether a quiz attempt counts as "practice".** **Still open, and now documented.** Only
  `exercise.attempted` sets `practisedLessons`, so taking a quiz does not move the dashboard's
  "exercises practised" count. Left as-is deliberately: a quiz is a check on reading, and calling
  it practice would conflate two different kinds of evidence (D5/D6).
- **A quizzes index.** There is no `/quizzes` route; a quiz is reached from the lesson that
  declares it. An index becomes worth building once there are enough quizzes to browse.
- **Additional question types** (`multiple-select`, `matching`, `ordering`, `scenario`,
  `short-answer`). Each is a new member of the content union plus a renderer AND a scoring case.
  The renderer's `switch` and the scorer's `never` guard both fail loudly rather than
  mis-rendering or scoring a learner zero.
- **`Quiz.shuffle`.** Still absent; still a presentation decision.
- **Roadmap `outcomes[].evidence` linkage.** Untouched, and unvalidated for every kind.
- **Multiple quizzes per lesson.** `lesson.quiz` is singular (`DECISIONS.md` D31). Several would
  be a schema change and its own decision; only the field's shape would move, not the rendering.

## M4.1 — deferred

Deliberately NOT done in M4.1, which is content architecture only. Each is a follow-up with a
named owner milestone.

- **`lesson.quiz` is not validated.** ~~Deferred to M4.2~~ **Done at M4.2** — the field is now a
  fail-closed reference and the lesson page links the quiz it declares (`DECISIONS.md` D31).
- **`roadmap.outcomes[].evidence` is not validated.** It has never been validated for ANY kind
  (`quiz`, `lab`, `assessment`), so making quizzes a registered collection does not change it.
  Belongs with the job-readiness work (M7), where evidence is actually consumed.
- **`Quiz.shuffle` does not exist.** `docs/DATA_MODEL.md` sketches it as a per-quiz opt-in
  defaulting to `false`. Deferred with the renderer, because "what does shuffling mean" is a
  presentation decision and a field no code reads is a guess. Add it in M4.2 if the renderer
  needs it.
- **No alias or deprecated-id resolution.** `deprecatedIds` is parsed and preserved on every
  entity, but nothing in `src/` resolves it — there is no mechanism to hook into. Quiz
  references therefore resolve by exact id. A resolution mechanism, if it is ever wanted, is a
  separate decision affecting every entity, not a quiz-specific concern.
- **No question-bank scale-out.** Three questions exist to prove the pipeline. Populating the
  curriculum is not M4.1's job, and a large bank written before the renderer exists would be
  written against a guess about presentation.

## Post-M3 audit (deferred)

Findings from the post-M3 adversarial audit that were consciously **not** fixed in the pre-M4
hardening pass (A1 and A2 were). Each is small; none blocks M4.

- **A3 — the dashboard's "Exercises practised" fact shows a LESSON count.**
  `exercise.attempted` folds to `practisedLessons[lessonId]`, so the number is lessons
  practised. Accurate today (every lesson has one exercise); relabel it, or count exercises
  from the log, before a lesson gains a second exercise.
- **A4 — `nextTimestamp` can future-date events.** `Math.max(now, lastMs + 1)` drifts once the
  log holds a future timestamp (an import from a fast clock, a hand-edit). Clamp when `lastMs`
  is implausibly far ahead.
- **A5 — `restore` neither dedupes by id nor re-sorts.** Harmless while every write merges
  first, but restoring through `mergeEventLogs([], events)` would make it total.
- **A6 — the practice control loses focus.** Clicking "I have done this exercise" replaces the
  button with a status paragraph, so focus falls to `<body>`. `CompletionControl` keeps its
  button mounted; the two controls should agree.
- **A7 — duplicate progressbar accessible names on the dashboard.** The overall bar and each
  roadmap bar share the label "N of 4 lessons complete"; include the roadmap title.
- **A8 — live regions are conditionally mounted.** `role="status"` nodes appear with their
  content already present, which some screen readers do not announce.
- **A9 — dead code and stale comments.** `ProgressStore.refresh()`, `LearnerProgress.clear()`
  (documented as backing a control that does not exist), the `recentlyCompleted` export, and
  `LocalStorageAdapter.isPersistent` (documented "Surfaced in the UI at M3" — it is not).
- **A10 — `subscribeToExternalWrites` key matching is loose.** It matches any key ending in
  "progress" and any `clear()`, rather than the `va:progress` key specifically.
- **A11 — `createInitialState()` is allocated per `load()`.** Micro-optimisation only.

## Development environment

- ~~**Scope `format:check` so it does not fail on untracked local config.**~~ **Resolved at
  M2.2.** The immediate failure — `prettier --check .` flagging the untracked `opencode.json`
  — is fixed by listing it in `.prettierignore` and `.gitignore` (`DECISIONS.md` D20), which
  is the durable fix for that specific file: it is machine-local runtime config that must
  never be committed or reformatted. A broader "check tracked files only" change is still
  available if a _different_ untracked file ever trips the gate, but it is no longer needed
  to keep CI green.

## Milestone-gated

| Item                                                     | Milestone | Note                                                        |
| -------------------------------------------------------- | --------- | ----------------------------------------------------------- |
| `Question` entity and question bank                      | M4        | Must land _with_ the quiz engine, never after               |
| `short-answer` scoring, `matching`, `ordering` renderers | M4        | Only if the learning value justifies the work               |
| `file-review` lab strategy                               | M7        | Portfolio evidence                                          |
| Progress export/import UI                                | M3        | **Done at M3** — application-layer export + merge-on-import |
| Bundle size budget in CI                                 | M5        | The payload report already exists at M0                     |
| Scheduled link check                                     | M6        | Non-blocking first                                          |
| Playwright in CI                                         | M9        |                                                             |
| Lighthouse accessibility and performance budgets         | M9        |                                                             |
| Content freshness report for entries past `lastReviewed` | M9        |                                                             |

## Explicitly not planned

Recorded so a future agent does not treat absence as an oversight.

- **A backend, database, or authentication.** The `StorageAdapter` port exists so that if
  this ever changes it is a swap. It is not planned.
- **File upload.** No backend means nowhere to put a file.
- **i18n.** One language. It would multiply the content workload.
- **Analytics.** A privacy stance. The cost is that we cannot tell which content learners
  use, which is accepted.
- **Certificates.** A self-completed certificate is close to meaningless, and `PLAN.md`
  section 5.7 warns against inflated claims. Revisit only alongside real assessment.
- **A skill graph with weighted edges.** See `DECISIONS.md` D13.
- **A module prerequisite graph.** Lesson prerequisites and stage order are sufficient.
- **Learning-style adaptation or a spaced-repetition scheduler.** No evidence base for a
  specific pedagogy claim, and each is a scheduler plus a model plus a UI. Note that
  _spaced review as a derived view_ needs no schema at all and is a M8 item, not this.
- **Voice practice before M9.** Deferred with its own planning pass, because audio storage
  on a static host is a real constraint. The Voice VA _roadmap_ is not deferred.

## Content, when the time comes

Roughly 20 lessons exist. `PLAN.md` section 14.2 sets the MVP target. Beyond that, the long
list is in `PLAN.md` sections 16 and 22; there is no reason to duplicate it here. The
useful discipline is to write a module, check reuse against existing modules, and only then
write a roadmap that uses it.
