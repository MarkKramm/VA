# Content Architecture

How the curriculum is modelled, and how to add to it. The full type definitions are in
[DATA_MODEL.md](DATA_MODEL.md); the writing rules are in
[CONTENT_GUIDELINES.md](CONTENT_GUIDELINES.md).

---

## The one thing to understand

**Content is data. Every relationship between two pieces of content is a reference to an
id. Nothing is ever copied.**

That single rule is what lets 21 roadmaps share ~34 modules, and what lets an AI agent add
the 400th lesson using exactly the same three steps as the 4th. It is also the reason
"which roadmaps include this module" is a free query rather than a hand-maintained list
that is wrong by lesson 40.

## The hierarchy

```
CareerPath  ->  Roadmap  ->  Stage[]  ->  Module  ->  Lesson  ->  Topic
                                             |-  Exercise   (practice, ungraded)
                                             |-  Quiz       (scored)
                                             |-  Lab        (realistic simulation)
                                             `-  Assessment (composite, pass/fail)
```

Plus two orthogonal taxonomies that anything can reference: `Skill` (a tree) and
`Tool`/`Resource` (directories, arriving at M5).

**M0 has:** `CareerPath`, `Skill`, `Module`, `Roadmap`, `Lesson`, and `Lesson.topics`.
**Later milestones add:** `Topic` (standalone), `Exercise`, `Quiz`, `Question`,
`Assessment`, `Lab`, `Tool`, `Resource`. The schema files live in one directory and the
validator skips collections that do not exist yet, so adding one later is additive.

## Topics, and why they are a first-class entity

A topic is a named, addressable concept inside a lesson. It has two forms, and the
distinction is the whole point:

| Form | When | Cost |
|---|---|---|
| **Inline** (default) | The concept belongs to this lesson. A frontmatter anchor plus matching MDX headings. | None |
| **Shared** | The concept is taught in several lessons. It lives once in `content/topics/*.mdx` and each lesson *references* it | One file |

This is the anti-duplication mechanism for **concepts**, exactly parallel to how modules
avoid duplicating lessons. "Professional tone" taught in email, in client updates and in
interviews is one topic file with three references — not three slightly different
paragraphs that will drift apart.

**It is also the anti-contradiction surface.** Any claim two lessons might state differently
goes here. See rule 1 in `AGENTS.md` section 4.

M0 lessons use inline topics only; `content/topics/` arrives at M2. The schema supports both
now, because retrofitting it later means re-authoring every lesson.

## The id rule

Ids are lowercase kebab-case, 2-80 characters, matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

**An id is immutable once published.** Renaming one orphans every learner's local progress
record — silently and permanently, because progress is keyed by id in `localStorage`. If a
rename is genuinely unavoidable, add the old value to `deprecatedIds` so the migration can
find it.

Skill ids use hyphens, not dots: `communication-written-english`. The hierarchy is
expressed by the `parent` field alone, and having it in two places would create a second
source of truth for the same relationship. This was a v5 correction.

## Reuse, concretely

The M0 content is the worked example. `va-foundations` is referenced by both roadmaps:

```yaml
# content/roadmaps/beginner-va.mdx
stages:
  - { kind: foundation, modules: [va-foundations] }
  - { kind: core, modules: [computer-fundamentals] }
  - { kind: specialization, modules: [computer-fundamentals] }   # revisited on purpose
```

```yaml
# content/roadmaps/data-entry-va.mdx
stages:
  - { kind: foundation, modules: [va-foundations] }
  - { kind: core, modules: [computer-fundamentals] }
  - { kind: specialization, modules: [va-foundations] }
```

Neither roadmap says "I contain `va-foundations`" anywhere else. The registry derives
`moduleId -> [beginner-va, data-entry-va]`, and the test
`reports BOTH roadmaps for a module they both reference` is the proof the model works.

Note `computer-fundamentals` appears in **two stages** of `beginner-va`. The roadmap module
spine keeps both (stage order matters); the reverse index yields each roadmap **once**,
because a set is not a tally.

## Roadmaps and stages

A roadmap is an ordered list of **stages**, each holding module ids. `kind` is the
progression stage from `PLAN.md` section 38, extended to cover the stages the original list
could not express:

```
foundation | core | tool | specialization | projects | practice | portfolio | career-prep | assessment
```

`stages` is a **list, not a map** — two stages may legitimately share a `kind`. The
Automation VA roadmap has two `kind: tool` stages, deliberately, because a renderer that
assumes one stage per kind should be caught early rather than after 20 roadmaps exist.

`Stage.kind` is the progression stage and belongs to the roadmap. `Module.kind` is an
*editorial tag* (`core | tool | specialization | project`) used for filtering. A module is
not inherently a "foundation" — it is a foundation module in one roadmap and a tool module
in another. Conflating the two vocabularies was a v4 error.

`lane: employment | freelance | both` is **required, with no default**. An earlier version
defaulted to `both`, which made `both` mean "nobody decided yet" rather than a deliberate
editorial claim. The field controls emphasis, never availability: content on the other
track is deprioritised, never hidden. The reasoning is in `DECISIONS.md`.

## Roadmap outcomes, and why they carry evidence

```yaml
outcomes:
  - statement: Clean a spreadsheet with duplicate and inconsistent rows
    evidence: [{ kind: quiz, id: cleaning-basics }]
    weight: 1
```

Job readiness is computed from these, **not from lesson completion**. A learner who
completes everything and fails every quiz must not be told they are job-ready — that is the
platform's single worst possible failure, and the reason `evidence` exists.

## Provenance

Every content entity carries:

```yaml
status: draft          # draft | review | published
updatedAt: '2026-10-01'
changeNote: ...         # what changed, for the "what's new" surface at M5
reviewedBy: ...         # required for published
reviewedAt: ...         # required for published
deprecatedIds: []       # only for genuine renames
```

`status: published` **requires** `reviewedBy` and `reviewedAt`; validation fails the build
otherwise. This is the mechanism behind the project's most important division of labour: an
agent drafts, a human edits, and nothing is published without a named human.

`updatedAt` (content changed) and `lastReviewed` (external information verified, on tools
and resources) are different things and are not conflated. A tool's pricing changing is not
the same event as a lesson being edited.

---

## How to add things

### A lesson

1. Create `content/lessons/<domain>/<slug>.mdx` with frontmatter:

   ```yaml
   ---
   id: cleaning-a-spreadsheet
   title: Cleaning a Spreadsheet
   aliases: [spreadsheet cleanup, dedupe sheet]
   summary: Fixing inconsistent formatting, duplicates and errors in a dataset.
   objectives:
     - Remove duplicate rows
     - Standardise date formats
   topics: []
   skills: [data-cleaning]
   prerequisites: []
   difficulty: beginner
   estimatedMinutes: 12
   exercises: [clean-a-sheet]
   status: draft
   updatedAt: '2026-10-01'
   ---
   ```

   Then the body in MDX.

2. Add the id to a module's `lessons` list.
3. `npm run content:check`

That is the whole procedure. No code, no route, no index, no component.

### A module

Create `content/modules/<slug>.mdx` listing its lessons, with an `outcome` written in
behavioural terms ("after this the learner can clean a spreadsheet with duplicate rows" —
not "understands spreadsheets").

### A roadmap

Create `content/roadmaps/<slug>.mdx` with a validated `careerPath`, a required `lane`,
stages referencing **existing** module ids, and at least one outcome. Career paths must
already exist in `content/career-paths.ts`.

### A skill

Add one entry to `content/skills/skill-tree.ts`. Hyphenated id, `parent` for hierarchy,
`gloss` for a plain-language explanation of a term a beginner may not know.

### A career path

Add one entry to `content/career-paths.ts`, with an `order` for browse ordering.

### A tool or resource (M5)

One file each in `content/tools/` or `content/resources/`. Reference them from lessons by
id; the reverse index is derived. **All external URLs live here and nowhere else** — a URL
literal in `src/` is a review-blocking bug.

---

## Validation reference

| Rule | Severity | What it catches |
|---|---|---|
| `schema` | error | Frontmatter that does not match the schema |
| `referential-integrity` | error | An id that does not resolve |
| `duplicate-id` | error | Two entities with the same id |
| `cycle` | error | A dependency or taxonomy loop |
| `provenance` | error | `published` with no reviewer |
| `orphan` | warning | A lesson in no module, a module in no roadmap |
| `quality/language` | warning | Guarantee language |
| `quality/numeric-claim` | warning | An uncited rate or percentage |
| `quality/generic-title` | warning | "Introduction", "Overview", "Lesson 4" |
| `quality/no-practice` | warning | A lesson with no exercise, quiz or lab |
| `quality/duplicate` | warning | Two lessons with the same title or summary |
| `quality/near-duplicate` | warning | Two very similar lessons in one module |

**Errors fail the build. Warnings do not.** Anything needing a human judgement is a warning,
because a build that blocks on judgement teaches authors to work around the check.

The M0 content currently produces four `quality/no-practice` warnings and nothing else.
That is expected: the exercise system arrives at M2.

## Scale notes

Things that will matter as the content grows, and are already handled:

- **Reverse indexes are computed, never maintained.** A module referenced by 20 roadmaps is
  one line in each of 20 files, and the index derives all 20.
- **Content payload size is reported** by `content:check`, so the "eager glob versus lazy
  loading" question gets decided on a measurement at M8 rather than an opinion.
- **Ids are immutable**, so learner progress never silently breaks.
- **Every content file is one entity**, so concurrent edits by different agents touch
  different files and git conflicts stay small.

Things deliberately not built, because they would need to be un-built later: a
module-to-module prerequisite graph, a skill graph, and a CMS.
