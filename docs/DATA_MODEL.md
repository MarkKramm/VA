# Data Model

Every entity type, and the progress event log. The authoritative definitions are the Zod
schemas in `src/content/schemas/` and the types in `src/domain/progress/types.ts`; this
document explains them and records the decisions behind them.

For how entities relate, see [CONTENT_ARCHITECTURE.md](CONTENT_ARCHITECTURE.md).

---

## Shared vocabulary

From `src/content/schemas/primitives.ts`:

| Name | Type | Notes |
|---|---|---|
| `SlugSchema` | `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 2-80 chars | The only accepted id shape. Ids are **immutable once published** |
| `IsoDateSchema` | `YYYY-MM-DD` | Deliberately not a full timestamp; content dates are days |
| `DifficultySchema` | `beginner \| intermediate \| advanced` | |
| `StatusSchema` | `draft \| review \| published` | `published` requires a reviewer |
| `provenanceShape` | `status`, `updatedAt`, `changeNote?`, `reviewedBy?`, `reviewedAt?`, `deprecatedIds` | Spread into every content entity |

Each entity type also has a dedicated slug schema (`LessonSlugSchema`,
`ModuleSlugSchema`, …) rather than reusing one generic `IdSchema`, so a field's type says
what it points at. A roadmap's `careerPath` is typed `CareerPathSlugSchema`, and a
mistake becomes a type error rather than a runtime lookup failure.

## Content entities

### CareerPath

```ts
{ id, title, summary, icon?, parent?, order, ...provenanceShape }
```

Taxonomy, not curriculum. `parent` enables nesting, so `PLAN.md` section 29's future
verticals (Medical VA, Legal VA, Insurance VA) attach as child nodes. Cycles are a
validation error.

**Why a first-class entity and not a free string:** every roadmap references one, and an
unvalidated `careerPath: "automation"` that matches nothing is precisely the dangling
reference this architecture exists to prevent. It is the taxonomy that makes 21 roadmaps
navigable, so it cannot be allowed to rot.

### Skill

```ts
{ id, title, summary?, parent?, relation, gloss?, order }
```

A tree, not a graph. `relation` is `contains | requires | enables`, with `contains` the
normal case. `gloss` is a short plain-language explanation, rendered wherever a skill name
appears, because the audience is complete beginners and unexplained jargon is one of the
main reasons a learning platform is abandoned in week one.

Referenced by lessons, exercises, quizzes, labs and assessments. The reverse index
(`skill -> lessons`) is derived.

**Why a tree rather than a graph:** a tree is what a learner can hold in their head. A
weighted graph is more expressive in principle and, for this platform, less useful in
practice. The prerequisite mechanism on lessons already covers "you need this first".

### Lesson

```ts
{
  id, title, aliases, summary, objectives,
  topics, skills, tools, resources, prerequisites,
  difficulty, estimatedMinutes,
  exercises, quiz?, lab?, related,
  ...provenanceShape
}
```

| Field | Required | Why |
|---|---|---|
| `objectives` | **yes, min 1** | A lesson without a stated objective is a page, not a lesson. This single requirement does more for content quality than any amount of prose guidance |
| `aliases` | no | Extra search keys: "VA", "GSheets", "freelance help". Feeds the MiniSearch index at M2 |
| `prerequisites` | no | Objects, not bare ids: `{ id, reason }`. The `reason` makes the advisory *specific*, and a specific advisory is actionable where "you have unmet prerequisites" is not |
| `estimatedMinutes` | yes | Feeds roadmap time estimates and the "is this worth it" judgement |
| `changeNote` | no | Gives the M5 "what's new" surface something to say beyond "updated" |

`Lesson.topics` is an array of anchors. `kind: 'shared'` requires a `sharedRef` to a
`content/topics/*.mdx` entity, enforced by the schema.

### Module

```ts
{ id, title, summary, outcome, lessons, skills, tools, topics, kind?, estimatedMinutes, ...provenanceShape }
```

The unit of reuse. `outcome` is required and behavioural: "clean a spreadsheet with
duplicate and inconsistent rows", not "understands spreadsheets".

`kind` is an **editorial tag** (`core | tool | specialization | project`) used for
filtering. It is deliberately *not* the progression stage — a module is not inherently a
"foundation", it is a foundation module in one roadmap and a tool module in another. That
vocabulary belongs to the roadmap. Conflating the two was a v4 error.

### Roadmap

```ts
{
  id, title, aliases, summary,
  careerPath, lane,
  stages, outcomes, estimatedWeeks, level,
  finalAssessment?, ...provenanceShape
}
```

```ts
{ kind: StageKind, title?, modules: ModuleSlug[], note? }
```

`stages` is a **list, not a map** — two stages may share a `kind`. `note` explains why a
stage exists in this specific roadmap.

`lane` is `employment | freelance | both` and is **required with no default**, so every
roadmap makes a deliberate editorial statement rather than inheriting a fallback that
means "undecided".

```ts
{ statement: string, evidence: { kind: 'quiz'|'lab'|'assessment', id }[], weight: number }
```

Outcomes carry **evidence**, and job readiness is computed from them rather than from
completion. A learner who completes everything and fails every quiz must not be told they
are job-ready; that is the platform's worst possible failure mode and it is structurally
prevented here.

### Later entities

Not yet implemented. Named here so the shape is decided before retrofitting forces it.

**Question** — a **first-class entity** in `content/questions/`, referenced by
`QuestionSlug` from quizzes and assessments. This is the single most expensive-to-retrofit
decision in the project, and it was wrong in v1-v4 when questions were inlined in
`QuizSchema`:

- No reuse. `PLAN.md` section 36 defines six assessment levels, and a module assessment and
  a roadmap assessment covering the same module should draw on the *same* question.
  Inlined questions make that copy-paste, which is exactly the duplication failure the
  id-reference architecture exists to prevent.
- No concept-level analytics. Weak-area analysis needs to know which *concepts* a learner
  is weak at, which requires a global question identity.
- Unmanageable files at scale. The platform targets thousands of questions; a 3,000-question
  bank inlined into quizzes is not a workable structure.

It lands at M4, *with* the quiz engine. Retrofitting after hundreds of questions exist means
editing every quiz file.

```ts
{ id, type, difficulty, tags, explanation, ...provenanceShape }
```

`explanation` is required, so every answer is explainable on review.

**Exercise / Quiz / Assessment / Lab** — see `ARCHITECTURE.md` and the milestone list.
`Quiz.shuffle` defaults to `false` (a per-quiz opt-in); `Assessment` is composite and owns
the one hard lock in the platform.

**Tool / Resource** — `Tool` has `category`, `useCases`, `difficulty`, `pricing`,
`officialUrl`, `alternatives`, `status: current | deprecated | rising`, `lastReviewed`.
`Resource` has `kind: documentation | tutorial | guide | template | checklist | video |
article | practice-site | reference | job-platform | community`, plus `official` and
`lastReviewed`. `job-platform` exists as its own kind because those links rot faster than
any other resource type and need a separate freshness cadence.

`status: deprecated` is the answer to "tools must be replaceable without restructuring":
retire a tool by editing one field, and the UI suggests its `alternatives`.

---

## The progress event log

From `src/domain/progress/types.ts`. **The central design decision of the application.**

```ts
type ProgressState = {
  version: number                  // migration hook, starts at 1
  events: readonly ProgressEvent[] // append-only
  derived: DerivedProgress         // a CACHE of the fold, never a source of truth
}
```

Every event carries:

```ts
{ id: string, at: string }          // id is load-bearing — see below
```

| Event | Payload |
|---|---|
| `lesson.viewed` | `lessonId` |
| `lesson.completed` | `lessonId, source: 'manual' \| 'activity'` |
| `lesson.uncompleted` | `lessonId` |
| `topic.completed` | `topicId, lessonId, completed` |
| `exercise.attempted` | `exerciseId, lessonId, selfChecked` |
| `quiz.attempted` | `quizId, attemptId, score, maxScore, passed, evaluatedBy` |
| `lab.submitted` | `labId, attemptId, attemptNumber, payload, feedbackNotes, passed, evaluatedBy` |
| `assessment.attempted` | `assessmentId, attemptId, score, maxScore, passed, evaluatedBy` |
| `roadmap.enrolled` / `roadmap.unenrolled` | `roadmapId` |
| `bookmark.toggled` | `refType, refId` |
| `note.saved` | `refType, refId, body` |
| `portfolio.artifact.added` | `artifactId, roadmapId, skills` |

### `id` on every event

This one field is what makes concurrent writes safe. `localStorage` is shared by every tab
on the origin, but each tab holds its own in-memory copy. Without ids, a stale tab silently
overwrites another tab's events and the learner loses work with no error. With ids, two logs
merge by union. **It is cheap now and there is no learner data to migrate yet** — which is
the only time it is cheap.

### `evaluatedBy`

`'system'` (the platform scored it) or `'self'` (the learner scored their own work against
a published rubric). Recorded on the event, surfaced in every results view, and used to
weight evidence in job readiness. It is a data-model decision so the distinction cannot be
lost later in the UI.

### Three tiers, and why completion is not one of them

| Tier | Meaning | Evidence |
|---|---|---|
| **Exposed** | Read the lesson | `lesson.viewed` — never counts as competence |
| **Practised** | Did the exercise or lab | `exercise.attempted`, `lab.submitted` |
| **Demonstrated** | Passed a scored check | `quiz.attempted` (passed), `assessment.attempted` (passed) |

`lesson.completed` still exists as a self-report, because removing the checkbox is a wall
and this platform does not build walls. It simply does not count as competence on its own,
and an assessment cannot be *passed* until its lessons are completed **and** practised.
That is the single hard lock in the platform, and it is reserved for claiming a
demonstrated outcome.

### What is deliberately not stored

No `completedLessons` set, no "primary roadmap" field, no `learner.goal` event. All of these
are derivable from the log, and a second source of truth can always disagree with the first.
`roadmap.enrolled` already *is* a goal declaration.

### Mastery: a number internally, a level externally

```ts
{ score: 0..1, confidence: 0..1 }  ->  masteryLevel()  ->  'not-started' | 'aware' | 'able' | 'proficient' | 'mastered'
```

`score` is the best attempt, with a recency-weighted mean of the last three so a single
lucky attempt months ago does not still read as mastery. `confidence` saturates at five
attempts, because a learner is not meaningfully more confident after twenty than after five.

**The decimal is stored but never rendered.** A value like "0.734" implies precision the
data does not have, which is dishonest on a platform whose credibility depends on not
overstating what a learner knows. The UI shows the level plus the evidence behind it.

## Known limitations, stated rather than hidden

1. **All quiz answers ship in the client bundle.** A static site has no server, so a learner
   can read them in devtools. Not fixable without a backend, which `PLAN.md` section 73
   rules out. Mitigated by anchoring *demonstrated competence* in labs and portfolio
   evidence rather than quiz scores, and stated in `QUIZ_GUIDELINES.md` at M4.
2. **Self-assessed labs are self-reported.** The learner is the only user, so self-assessment
   is inherently unverified. Mitigated by the `evaluatedBy` discriminator, a required
   written payload (M6), visible labelling, and a lower readiness weight. Not eliminated,
   and no schema change will eliminate it.
3. **A learner can hand-edit their exported progress JSON.** It only affects their own local
   view. What *is* required is robustness: import parses, schema-validates, version-checks
   and rejects cleanly, and a failed import never destroys existing progress.
4. **Progress lives in one browser.** Clearing site data or switching device loses it. Export
   and import (M3) mitigate; accounts would fix it, and accounts are not planned.
