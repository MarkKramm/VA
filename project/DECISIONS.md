# Decision Log

Architectural choices, with the alternative that was rejected and the reason. The purpose
is to stop a future agent — human or otherwise — from reading a deliberate decision as an
oversight and "fixing" it.

**Changing any of these requires editing this file first.** That is what makes the change
visible in review rather than silent.

Format: decision, date, context, options, choice, reason, consequences.

---

## D1 — Content is data; every relationship is an id reference

**Date:** 2026-10-01

**Context.** The platform targets 21 roadmaps, ~34 modules and 500+ lessons, most of it
written with AI assistance. The failure mode is duplicated content and dangling references.

**Options.** (a) Content as data with derived relationships. (b) Content in a CMS.
(c) Content hard-coded in components.

**Choice.** (a). `content/` holds the curriculum; `src/content/registry.ts` is the only read
path; every relationship is an id reference; every inbound link is derived.

**Reason.** A roadmap listing module ids means adding a lesson to a second roadmap is a
one-line edit in one file, and "which roadmaps include this module" cannot be wrong. A CMS
adds a service, an auth problem and a migration path away from git history. Hard-coded
content makes lesson 400 a code change.

**Consequences.** Content additions need no code. Content is reviewable as diffs. The cost is
a build-time validation layer, which is the work that exists now.

## D2 — Progress is a pure fold over an append-only event log

**Date:** 2026-10-01

**Context.** Progress must support completion, quizzes, labs, assessments, bookmarks, notes
and portfolio evidence — and must not require a migration for any personalisation feature
added later.

**Options.** (a) Explicit aggregate fields plus a separate history array. (b) One append-only
event log, with derived state computed from it.

**Choice.** (b). `state = events.reduce(applyEvent, initialState)`. `derived` is a cache of
that fold, rebuildable at any moment, and an invariant test asserts they are equal.

**Reason.** Every future feature — sync, undo, history charts, weak areas, spaced review,
streaks — becomes a _pure function over the log_ and can be written at any time with no
migration. Explicit aggregates would need one migration per feature, and a second source of
truth that can disagree with the first.

**Consequences.** The log grows unboundedly and is a real cost at several thousand events on
a low-end phone; compaction is deferred and unaddressed. `derived` is recomputed on every
append rather than patched incrementally, which is wasteful but makes the invariant true by
construction; an incremental patch is a later optimisation that does not change the
invariant test.

## D3 — Every event carries an `id`

**Date:** 2026-10-01

**Context.** `localStorage` is shared across tabs, but each tab holds its own in-memory
copy. A stale tab writing its snapshot silently destroys events another tab recorded.

**Options.** (a) Last-write-wins, as a naive store does. (b) Add an `id` to every event and
merge by union on write. (c) A backend with server-side concurrency control.

**Choice.** (b). Event ids plus re-read-before-write on every append, and a `storage` event
listener so an open tab re-folds rather than overwriting.

**Reason.** The failure is silent, unreproducible, and loses a learner's work. Because state
_is_ an event log, a merge is a union and is trivially correct. (c) is forbidden by the
no-backend decision and would not help the offline case anyway.

**Consequences.** One field per event, now, while there is no learner data to migrate. This
is the single cheapest fix in the project and the most expensive to add later.

## D4 — Persistence behind a `StorageAdapter` port

**Date:** 2026-10-01

**Context.** Progress is local and browser-scoped, which is right for a free platform with no
accounts — and which also means a learner who clears site data loses everything.

**Options.** (a) Call `localStorage` directly. (b) A port with a local adapter. (c) A backend
from the start.

**Choice.** (b). Five methods, synchronous. `LocalStorageAdapter`, `MemoryStorageAdapter`, and
room for a future `HttpStorageAdapter` that would be a drop-in swap with no domain changes.

**Reason.** (a) scatters `localStorage` through the app and makes a future backend a rewrite.
(c) is forbidden by `PLAN.md` section 73 and would add auth, hosting cost and an operational
burden to a project that does not need it.

**Consequences.** Progress is lost on device change, mitigated by export/import at M3. The
interface is synchronous, which is shaped so an async backend can arrive later.

## D5 — Soft gating, with exactly one hard lock

**Date:** 2026-10-01

**Context.** Prerequisites can be advisory or enforced. The platform is free, aimed at
beginners, and markets job readiness.

**Options.** (a) Hard locks throughout. (b) Soft gating everywhere. (c) Soft gating, with
hard locks reserved for claiming a demonstrated outcome.

**Choice.** (c). Locked-but-clickable content with a stated reason; hard locks only on
assessments.

**Reason.** Walls cause abandonment on a free platform. But an assessment that can be passed
without having practised anything would let a learner record a "job ready" score on the
strength of checkboxes — the platform's worst possible failure. That is the one case where
a lock is justified.

**Consequences.** `src/domain/roadmap/unlock.ts` holds named policy functions rather than
conditionals, so a change is a decision in this file. `prerequisites` entries carry a
`reason`, because a specific warning is actionable and a generic one is not.

## D6 — Job readiness is evidence-weighted, not completion-weighted

**Date:** 2026-10-01

**Context.** The platform's core promise is employability. A completion percentage would tell
a learner who completed everything and failed every quiz that they are 90% job ready.

**Options.** (a) Completion percentage. (b) Evidence-weighted, derived from
`roadmap.outcomes[].evidence`.

**Choice.** (b). Completions are not competence. Readiness is computed from what has actually
been demonstrated, with self-assessed evidence weighted below scored evidence.

**Reason.** This is the single most damaging thing the platform could get wrong, and it was
structurally permitted until M0.

**Consequences.** `Roadmap.outcomes` carries an `evidence` array, which is empty until
quizzes and labs exist (M4, M6). M7's readiness UI is built on this meaning, so it cannot be
quietly redefined later.

## D7 — `Question` is a first-class content entity

**Date:** 2026-10-01 (corrects v1–v4, where questions were inlined in `QuizSchema`)

**Context.** `PLAN.md` section 36 defines six assessment levels. Several draw on the same
knowledge, and the platform targets thousands of questions.

**Options.** (a) Questions inlined in `QuizSchema`. (b) `content/questions/`, referenced by
`QuestionSlug`.

**Choice.** (b), landing at M4 with the quiz engine.

**Reason.** Inlining forbids reuse across assessment levels, makes concept-level weak-area
analysis impossible without a global question identity, and produces files that do not scale.
The one-time cost is a directory and a glob; the cost of retrofitting is editing every quiz
file.

**Consequences.** Every question is individually reviewable, which matters when agents
generate them. No existing content is affected — M0 has no questions.

## D8 — `lane` is a required field, not a track list

**Date:** 2026-10-01

**Context.** `PLAN.md` sections 44–46 cover resume, portfolio, applications, interviews,
freelancing, contracts and invoicing. Some applies to every learner, some only to
freelancers. It was unclear how to model that.

**Options.** (a) `lane: employment | freelance | both` on the roadmap. (b)
`tracks: Track[]`, each with its own stages, progress and readiness. (c) A learner-side
selection UI.

**Choice.** (a), **required with no default**, and content on the other track is
deprioritised rather than hidden.

**Reason.** A track list forks roadmap progress, job readiness and the recommendation
engine — the three most load-bearing computations in the platform — to express a distinction
that emphasis already captures. Working through the two objections: a learner pursuing both
tracks simultaneously is served by `both` plus multi-roadmap enrolment, and a learner who
wants only some freelance modules sees them once, labelled, and moves on. The cost of the
model being wrong is one label.

**Revisit as `tracks[]` if and only if** a learner needs a _different module selection_
within a single roadmap — not a different emphasis, and not more or less content. A new
lane such as `agency` is an enum value, not a trigger.

**Consequences.** Career-prep modules attach to every roadmap, not only to Remote Freelancer,
or a Data Entry learner finishes with no portfolio content. `lane` must be restated on every
roadmap, which is the point.

## D9 — Content is drafted by agents, edited by humans

**Date:** 2026-10-01

**Context.** Content will be generated at volume by AI agents, on a public site, about a
field where fabricated advice is actively harmful.

**Options.** (a) Publish agent output. (b) Human review as a documented process. (c) A
mechanical gate.

**Choice.** (b), enforced by `status: published` requiring `reviewedBy` and `reviewedAt`, with
validation failing the build otherwise. Backed by mechanical checks for the failure modes
that are detectable: guarantee language, uncited numbers, generic titles, duplicates, lessons
with no practice, and a professional-advice ban in the content guidelines.

**Reason.** `content:check` can tell you a lesson contains an uncited rate. It cannot tell
you whether the cited rate is correct, or whether a phishing example is subtly
unconvincing. Every automated check sits below the point where editorial judgement begins.
No amount of validation converts an agent into an editor.

**Consequences.** All M0 content is `draft`. Publishing is deliberately slow. `changeNote`
and `updatedAt` support an "what's new" surface at M5.

## D10 — TypeScript 5.x, not 7

**Date:** 2026-10-01

**Context.** TypeScript 7 is released. `typescript-eslint` declares peer support for
`>=4.8.4 <6.1.0`.

**Options.** (a) TypeScript 7 with `--legacy-peer-deps`. (b) TypeScript 5.x.

**Choice.** (b). `typescript@^5`.

**Reason.** Forcing a peer-dependency conflict to use a newer compiler means type-aware
linting is unreliable, and unreliable linting is worse than an older compiler. Revisit when
`typescript-eslint` supports 7.

**Consequences.** `engines.node` is `>=22.12` rather than pinned, so a developer on Node 24
does not see engine warnings while CI still runs the pinned 22 from `.node-version`.

## D11 — `zod`, and one runtime dependency

**Date:** 2026-10-01

**Context.** Content must be validated at build time with precise, actionable errors, and the
runtime dependency budget is 20.

**Options.** (a) `zod`. (b) Hand-written validators. (c) A validation service.

**Choice.** (a). One runtime dependency, currently the only one.

**Reason.** A hand-written validator for a dozen entities is a few hundred lines of code that
must be kept in sync with the types by hand, and the resulting errors are worse. (c) is
absurd for a static site.

**Consequences.** Schemas are the single source of truth for content types, and
`DATA_MODEL.md` documents them. Keeping the count at 1 out of a budget of 20 leaves plenty of
room, and makes adding a dependency a visible act.

## D12 — `gray-matter` for frontmatter, and why bodies stay opaque at M0

**Date:** 2026-10-01

**Context.** Content is `.mdx` with YAML frontmatter. M0 validates frontmatter without
compiling MDX.

**Options.** (a) `gray-matter` now, MDX at M2. (b) A hand-rolled frontmatter parser.
(c) Wire the MDX pipeline at M0.

**Choice.** (a). `gray-matter` is build-time only; the body is kept as raw text and is
deliberately not exposed to validated metadata.

**Reason.** (b) means hand-parsing YAML edge cases. (c) is scope creep — M0 is explicitly
"no MDX pipeline wiring beyond parsing". Keeping bodies opaque also means nothing in the
application layer can accidentally start depending on lesson prose.

**Consequences.** The MDX pipeline and its component registry land at M2. The registry's
`ContentFile` type carries only `path` and `data`, so tests never need to fabricate a body.

## D13 — A skill is a tree, and ids use hyphens

**Date:** 2026-10-01

**Context.** Skills need a taxonomy a learner can understand, and ids need one convention
across every entity.

**Options.** (a) A tree with hyphenated ids and a `parent` field. (b) A weighted graph.
(c) A tree with dotted ids encoding hierarchy.

**Choice.** (a).

**Reason.** A tree is comprehensible; a graph is not more useful here, only harder to read.
Lesson prerequisites and roadmap stage order already express "you need this first". (c)
would encode hierarchy twice — in the id and in `parent` — creating a second source of truth
for the same relationship, which is exactly the class of bug this architecture guards
against. Dotted ids were used in the first draft and corrected.

**Consequences.** Skill ids look like `communication-written-english`. Every reference was
updated at the same time, including test fixtures.

## D14 — Validation is tested with fixtures, not files on disk

**Date:** 2026-10-01

**Context.** The validator's important behaviour is what it does with _invalid_ content.

**Options.** (a) Test only that the real content is valid. (b) Build registries from
constructed data via `buildRegistryFromSource`.

**Choice.** (b).

**Reason.** You cannot create an invalid lesson file in a repository whose build rejects
invalid lessons. Testing only the happy path would have missed the wrapper-validation bug
recorded in `CHECKPOINT.md`.

**Consequences.** `buildRegistryFromSource` is exported from the registry. It is the reason
the registry is a function rather than a hard-wired module-level constant.

## D15 — Duplicate-id validation reads the pre-index entity list

**Date:** 2026-10-01 (corrects M0, where the check was unreachable)

**Context.** The `duplicate-id` check iterated the registry's Maps. Those Maps are built by
`indexById`, which is `new Map(items.map(i => [i.id, i]))` — and a Map keeps only the last
entry for a repeated id. By the time the check could look, the duplicate had been erased, so
it could never fire. An external audit confirmed it was dead code; a regression test
reproduces the original behaviour before the fix.

**Options.** (a) Check the Maps (the original, broken). (b) Validate ids while parsing,
before indexing. (c) Expose the validated pre-index entities on the registry and validate
there.

**Choice.** (c). `ContentRegistry.parsed` holds one array of `ParsedEntity` per type —
the validated entities _before_ `indexById`, each with its real source file path. The
duplicate check reads `parsed`.

**Reason.** (a) is structurally incapable of working, which is the worst kind of bug: a
check that looks correct and always passes. (b) would put policy inside the loader and
leave `validation.ts` — where every other rule lives — with a gap that is not obvious to
the next reader. (c) keeps all validation in one place, and the extra cost is one array of
references per type plus a path string, which is negligible next to the entity objects
themselves.

**Consequences.** The registry interface gained one field. Nothing in the application reads
`parsed`; it exists for the validator, and the comment on the field says so. Real file
paths are retained, so a duplicate error names both files — a synthesised
`content/lessons/**/<id>.mdx` would have named the same path twice and told the reader
nothing. Map lookup behaviour is unchanged: a duplicate still resolves to the last entry,
which is pinned by a test so nobody "fixes" it into a first-wins rule by accident.
