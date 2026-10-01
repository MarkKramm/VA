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

## D16 — `src/app/content.ts` is the only seam between content and UI

**Date:** 2026-10-01 (M1)

**Context.** The M0 ESLint rule forbids `src/components/` and `src/features/` from
importing anything matching `content/*`. That was written before either directory
existed, and the pattern is broad enough that at M1 it also blocks `@/content/*` — the
alias. A feature component therefore cannot import the registry, and cannot import a
selector either.

**Options.** (a) Narrow the ESLint rule so features may import `@/content/`.
(b) Let features read the registry directly and drop the rule. (c) Keep the rule and
give `src/app/` the job of composing content for the UI.

**Choice.** (c). `src/app/content.ts` reads the registry through `selectors.ts` and
hands plain data to the presentation layer.

**Reason.** (a) and (b) both weaken an M0 invariant to solve a convenience problem, and
the invariant exists for the reason in `ARCHITECTURE.md`: without a mechanical boundary,
an agent can suggest a restructure and, with enough momentum, silently perform one.
Verified empirically at M1 rather than assumed — a probe file importing
`@/content/registry.ts` from `src/features/` fails lint with the expected message.

The seam is also where a genuinely new query belongs: adding a selector is a change to
`src/content/selectors.ts`, which is reviewable, rather than an ad-hoc `registry.get()`
sprouted in a component.

**Consequences.** A feature asks `src/app/` for data instead of reaching for it. Every
content read is now greppable in one file. The cost is one extra hop, and a rule that
features may not compute from content — which is the correct constraint anyway, since
computation belongs in `src/domain/`.

## D17 — No state-management library at M1; the theme uses React context

**Date:** 2026-10-01 (M1)

**Context.** `ARCHITECTURE.md` records Zustand as the choice over Redux, XState and
TanStack Query. At M1 the only shared client state is the theme preference: one string,
one writer, a few readers.

**Options.** (a) Add Zustand now. (b) React context plus `useState`. (c) A module-level
mutable singleton.

**Choice.** (b).

**Reason.** Not a rejection of the recorded choice — a deferral. Zustand earns its place
at M3, when the progress event log arrives and genuinely needs a store outside React's
render cycle. Adding it now to hold a theme string would pay a dependency for nothing,
and `AGENTS.md` rule 3 requires a dependency to justify itself. (c) is rejected outright:
a module-level mutable singleton is untestable in isolation and is how "just one global"
becomes five.

**Consequences.** The runtime dependency count is 5 (zod, react, react-dom, react-router,
lucide-react), against a budget of 20. The theme preference is still persisted through
`StorageAdapter`, so choosing context did not leak persistence into a component — that is
asserted by a test which reads the value back out of the adapter and separately asserts
`localStorage` was never touched.

## D18 — Mobile navigation is a modal dialog, hand-rolled

**Date:** 2026-10-01 (M1)

**Context.** The header needs a nav disclosure below `md`. A non-modal drawer that only
slides in visually is the most common mobile nav accessibility failure: a keyboard user
tabs straight out of the open menu into invisible page content behind it.

**Options.** (a) A CSS-only disclosure with no focus management. (b) A hand-written
`role="dialog"` with a focus trap, Escape, and focus restoration. (c) A dialog library or
a headless component library.

**Choice.** (b).

**Reason.** (a) is the bug. (c) is disproportionate: the M1 shell has exactly one dialog,
and the reachable primitives (Radix, Headless UI) arrive with a design system attached,
which `DESIGN_SYSTEM.md` §1 rejects on principle. The trap is about fifteen lines of
`keydown` handling.

**Consequences.** `DESIGN_SYSTEM.md` §10 records that a reusable dialog primitive is a
known gap, to be revisited when a second dialog exists — at which point the hand-rolled
version should be replaced rather than extended. The panel is rendered only when open, so
its links are not focusable while closed.

## D19 — Contrast is verified by code, not asserted in a document

**Date:** 2026-10-01 (M1)

**Context.** `DESIGN_SYSTEM.md` states contrast ratios. A stated ratio that is wrong is
worse than no ratio, because the next person trusts it and skips the check.

**Options.** (a) State the ratios and trust them. (b) Verify with a browser tool on
rendered output. (c) Compute them from the token values and fail the build.

**Choice.** (c), via `npm run check:contrast`, which is part of `npm run check`.

**Reason.** The ratios are derived from `oklch()` token values, so they are computable
without a browser, and a check that runs in CI cannot be forgotten. It caught two real
problems on its first run — see below — which is the argument for the approach.

**The first run reported 23 failures. All 23 were bugs in the checker, not the palette:**

1. WCAG relative luminance is defined on **linear** light. The script gamma-encoded the
   channels first, reporting a known-good 10:1 pair as 3.2:1.
2. Dark-theme lookups did not fall back to the `:root` primitives, so every lookup of a
   `--brand-*` or `--state-*` token reported "not found".

It then found one genuine palette problem: the state chips used a single theme-independent
ramp, putting a 94%-lightness pastel on an 18%-lightness dark surface. Dark mode now
defines its own soft and strong variants.

**Consequences.** Two lessons recorded rather than forgotten. First, a check that produces
confident wrong numbers is worse than no check, so the known-good value is written into
the script as a comment. Second, `DESIGN_SYSTEM.md` publishes the ratios copied from the
script's output, and the two are asserted to agree in spirit — the script is the source
of truth. Known gap: this verifies tokens, not rendered pixels, so a component that puts
a good token on an unintended background would not be caught.

## D20 — `opencode.json` is live runtime configuration and is never moved

**Date:** 2026-10-01 (M1)

**Context.** This repository is developed inside an OpenCode session, and `opencode.json`
in the project root is the **active** runtime configuration for that session. It names the
provider and model the session is using. It is untracked and is deliberately not part of
the repository, because it is local development configuration rather than application
code. It must not contain real secrets.

The file is also visible to tooling that globs the working tree. In particular
`npm run format:check` runs `prettier --check .`, which picks up untracked files, so an
`opencode.json` that is not Prettier-formatted makes the whole gate exit non-zero even
though every tracked file passes.

**Options.** (a) Move the file out of the tree while validating, so the gate goes green.
(b) Delete or `git clean` it. (c) Reformat it so `prettier --check .` passes. (d) Leave it
in place, report the condition, and validate in a way that does not touch it.

**Choice.** (d). Leave `opencode.json` present and untouched at all times. Validate the
files that are actually under test — the tracked files and any new files — rather than
removing the configuration to make a tree-wide glob pass. Never edit the provider or model
configuration to satisfy a repository check.

**Reason.** The file is not inert. Removing it while OpenCode is running can cause the
active session to **lose its configured provider and model and fall back to a different
model mid-task** — which happened: an earlier validation step moved `opencode.json` to the
temporary directory to isolate the formatting failure, and the session dropped its
configured provider and continued on a fallback model. The validation result obtained that
way was therefore invalid, because the environment that produced it was no longer the
environment under test. Removing live configuration to get a cleaner check is the same
class of mistake as modifying the thing you are measuring: the measurement no longer
describes reality.

**Consequences.**

- `Move-Item`, `Remove-Item`, `git clean`, renaming, hiding, or otherwise removing
  `opencode.json` during an active OpenCode task is forbidden. There is no "just for a
  moment" exception.
- When `opencode.json` makes a tree-wide check fail, that is a fact to report, not a
  problem to clear by touching the file. The correct responses are to validate the
  specific files under test, or to state the limitation explicitly in the report.
- The provider and model configuration is never edited to make checks pass.
- **Resolved at M2.2.** The gap — `prettier --check .` globbing the working tree and failing
  on the untracked `opencode.json` — is closed by listing `opencode.json` in `.prettierignore`
  and `.gitignore`. Both are tracked project files; neither touches the configuration. This
  is the smallest durable fix: the file is machine-local runtime config that must never be
  committed or reformatted, so excluding it by name is more precise than scoping the whole
  format check to a tracked-file list. `npm run check` is green again. See `BACKLOG.md`.

## D21 — Content is ingested at build time through a Vite plugin and a virtual module

**Date:** 2026-10-01 (M2)

**Context.** At M0 and M1, `content/index.ts` imported `gray-matter` and parsed
`.mdx` frontmatter at module scope, then globbed the files with `import.meta.glob`.
That file is in the client graph — `DashboardPage → src/app/content.ts →
registry.ts → content/index.ts` — so a Node YAML parser and its `js-yaml`
dependency were compiled into the browser bundle. Measured at M1: **717 kB raw /
202 kB gzipped** total, of which about **249 kB raw / 56 kB gzipped** was the
parser. The audience is largely on mid-range phones and metered connections, so
that was a real per-visit cost for machinery the browser never needed.
`DECISIONS.md` D12 and `vite.config.ts` both named the fix: parse at build time.

**Options.** (a) A Vite plugin that parses frontmatter in Node and serves the
result as a virtual module. (b) A prebuild script that writes a generated `.ts` or
`.json` file into the repo. (c) Lazy-load content at runtime so the parser is in a
separate chunk fetched on demand. (d) Hand-roll a small YAML parser in `content/`.

**Choice.** (a), in `vite-plugin-content.ts`, consumed as `virtual:content-data`.

**Reason.**

- (b) creates a second source of truth on disk that can go stale, needs a
  gitignore decision, and produces a confusing diff. A virtual module has no
  file, cannot drift, and is regenerated on every build and every dev request by
  construction.
- (c) keeps the parser in the bundle and only defers it, which is worse: the
  content is needed eagerly to build the reverse indexes the whole model depends
  on, so the "lazy" chunk would load immediately anyway.
- (d) is forbidden by D12: a hand-rolled parser duplicates a solved problem and
  can disagree with `gray-matter` on an edge case. The plugin uses the same
  `gray-matter`, so no parsing behaviour changed — only _where_ it runs.

The plugin runs under `vite build`, `vite dev` and `vite-node`, so the registry,
the tests and `content:check` all exercise the same content-loading path the
browser uses. A plugin that ran only at build time would make the tests a
different code path from production, which is the class of divergence this project
guards against everywhere else.

**Consequences.**

- **Measured result:** the client JS went from **717 kB / 202 kB gzipped** to
  **468 kB / 146 kB gzipped** — a **56 kB gzipped (28%) reduction**. `gray-matter`,
  `js-yaml` and every YAML signature are absent from the built bundle; the parsed
  content is embedded as plain JSON.
- `gray-matter` stays a `devDependency`. It is imported only by the plugin, which
  is imported only by `vite.config.ts`. A new architecture invariant
  (`boundaries.test.ts`, invariant 6) asserts nothing under `src/` or `content/`
  imports it, and that `content/index.ts` no longer globs or parses — so a
  regression fails `test:arch` rather than silently re-inflating the bundle.
- The dependency arrow is unchanged: app → registry → content → `virtual:content-data`
  ← plugin. `content/` still imports nothing from `src/`.
- The virtual module's shape is declared in `content/virtual-content.d.ts` and
  typed loosely on purpose. Frontmatter is unvalidated data; the Zod schemas
  remain the single source of truth for what a valid entity is. A precise type in
  the declaration would be a second, erasure-prone copy of that contract.
- Malformed YAML now fails **at parse time, with the file named**, instead of
  surfacing as a downstream validation message. That is a strictly better failure,
  and it is what makes the parser legitimately a build concern.
- **Not yet done:** the `.mdx` _body_ is still opaque text. This decision is about
  the ingestion pipeline, not MDX rendering. Rendering the body (and the component
  registry that governs what content can become code) is the next M2 step and is
  recorded in `BACKLOG.md`.

## D22 — MDX compiles to a serializable element tree, not to a JavaScript module

**Date:** 2026-10-01 (M2.2)

**Context.** D21 moved frontmatter parsing to build time but left the `.mdx` body as
opaque text, so no lesson could render. M2.2 must make the body renderable without
re-introducing compiler machinery into the client, and without creating a second way
for content to become executable code.

**Options.** (a) Compile MDX to a JS module (`@mdx-js/mdx` → JSX → Vite's React
transform), which is the documented default and what `@mdx-js/rollup` automates.
(b) Compile MDX to HTML with `remark-rehype` and set it via `dangerouslySetInnerHTML`.
(c) Compile MDX's markdown AST to a **plain, serializable element tree** at build
time, and render that tree in React through an explicit component map.

**Choice.** (c).

**Reason.**

- (a) ships an MDX runtime and a JSX component-binding layer into the client graph,
  and makes "which components exist" a property of a module graph rather than a
  reviewed list. It is the right choice for a site that _wants_ arbitrary MDX
  components; this platform explicitly does not.
- (b) discards the component-name information. This was **measured, not assumed**:
  `mdast-util-to-hast` renders both `<Callout>` and `<Badge>` as a bare `<div>`.
  That is a silent downgrade of authored content, and it also removes the trust
  boundary — HTML strings would have to be trusted.
- (c) keeps the client free of every MDX and compiler package (the tree is plain
  JSON), makes the trust boundary a data structure rather than a convention, and is
  deterministic by construction. It is also the smallest thing that actually renders
  the current content correctly.

**Parser.** `unified` + `remark-parse` + `remark-mdx` (with `micromark` and its MDX
extension, transitively) are added as **devDependencies**. This is the same reasoning
as D12: MDX parsing is a solved problem, and hand-rolling it would duplicate a
formatter and disagree with the real one on an edge case. Crucially they are build
dependencies — the runtime dependency count is unchanged at five, well inside the
budget of twenty (D11), because nothing in this set reaches the bundle.

**The trust boundary.** The compiler walks the mdast and emits a closed set of node
kinds: `element` (a fixed set of HTML tag names), `text`, and `component` (a _name_
plus serializable props and children). It **rejects**:

- `mdxFlowExpression` / `mdxJsxExpressionAttribute` — `{ … }` evaluates a JavaScript
  expression. This is the arbitrary-code vector and it is the reason a
  component allowlist alone is not sufficient.
- `html` nodes, and any HTML element written directly in JSX — raw HTML bypasses the
  element mapping. (`remark-mdx` parses raw HTML as JSX elements rather than `html`
  nodes, so the practical refusal is the lowercase-tag branch; the `html` case is a
  backstop.)
- any attribute that is a JSX expression rather than a literal (`onClick={fn}`,
  `title={name}`), because a literal prop cannot become a function, and an expression
  value has no literal representation.
- an unsafe URL on an `href` or `src`, on **either** syntax, and an `<img>` without alt
  text, on either syntax.
- a reference-style link (`[text][ref]`), with an author-facing message.

The **component** half of the boundary is enforced at RENDER time, not compile time,
and that is deliberate. The compiler records any capitalised JSX name as a `component`
node; the renderer resolves it against the allowlist and throws
`UnknownMdxComponentError` for a name that is not there. Two lists, not one, so a
component can be authored into content before the renderer knows it, and the failure
is a clear local error rather than a build that will not run.

A rejected construct **fails the build with the file and line named**. It is never
dropped silently, because a silently dropped `{expression}` is indistinguishable from
an author who wrote nothing.

**Consequences.**

- New modules: `content/mdx/compile.ts` (parser + mdast → tree, build-time only) and
  `src/content/mdx/registry.ts` (the render-time allowlist) plus `src/content/mdx/render.ts`
  (the React renderer). The allowlist is deliberately empty of custom components at M2.2: no
  current content uses one, and adding the first should be a visible, reviewed act.
- The compiled tree crosses the virtual-module boundary as JSON and is attached to
  lessons by **id**, not by path, in the registry (`registry.lessonBodies`). The raw `body`
  text is measured at build time for the payload report and then **dropped from the shipped
  module**, so there is one representation of each lesson in the bundle, not two. That choice
  is what keeps the bundle at or below the M2.1 baseline.
- Bundle protection extends to the MDX parser: invariant 6 in `boundaries.test.ts` now
  asserts that no MDX/compiler package is imported from `src/` or `content/`, that the
  compiler lives at the build edge, and a **built-output** guard in `scripts/check-paths.ts`
  scans `dist/assets/*.js` for compiler markers, so a leak that only appears after bundling
  is caught.
- The **URL policy applies to both syntaxes**. An adversarial review found that JSX
  `<a href=…>` initially bypassed the filter that Markdown links went through; the policy now
  runs on every emitted `href`/`src`, and again at render time.
- Accessibility rules apply to both syntaxes too: an `<img>` written as JSX must have alt
  text, exactly as a Markdown image must.
- Tables are **not** supported yet: base `remark-parse` leaves them as text, and enabling
  `remark-gfm` is a separate, deliberate decision. The renderer defines a `table` mapping but
  no current content reaches it. Recorded in `BACKLOG.md`.
- Reference-style links (`[text][ref]`) are refused with an author-facing message rather than
  an internal AST type name. Supporting them is a small later addition, in `BACKLOG.md`.

---

## D23 — The MDX renderer is a presentation component; the compiled-body format is read through a seam

**Date:** 2026-10-01 (M2.3)

**Context.** D22 put the renderer (`MdxContent`), the component allowlist and the prose
stylesheet under `src/content/mdx/`, beside the build-time compiler. At M2.2 nothing in
`src/features/` rendered a body, so the placement was never tested against the ESLint layer
rule. M2.3 adds the lesson page, which must render a compiled body — and the rule forbids
`src/features/` and `src/components/` from importing anything matching `content/*`. The lesson
page's first import of the renderer failed lint, correctly.

**Options.** (a) Add an ESLint exemption for the renderer path. (b) Re-export the renderer from
`src/app/content.ts` (the data seam) and import it from there. (c) Move the renderer, the
allowlist and the prose CSS to `src/components/mdx/`, and expose only the format types and the
one runtime helper (`isSafeUrl`) the renderer needs through a new `src/app/mdx.ts` seam.

**Choice.** (c).

**Reason.**

- (a) is the escape hatch the architecture exists to prevent. "Just this once, import from
  `content/`" is exactly how a boundary becomes decorative, and `ARCHITECTURE.md` places a
  UI component used by a feature in the components layer, not the data layer.
- (b) would put a React component in a file whose job is composing DATA for pages. The renderer
  is presentation; it belongs where presentation lives.
- (c) is the placement the architecture already describes. The renderer turns data into DOM —
  the definition of the components layer — and it is used by a feature, which is what makes it
  cross-feature. It depends on exactly two things from the data layer: the node **types** and
  `isSafeUrl`. Types are erased; `isSafeUrl` is a pure function with no parser. Exposing those
  two through `src/app/mdx.ts` mirrors the existing content seam and means no feature or
  component imports `content/` at all.

**What moved.** `src/content/mdx/{render.ts, registry.ts, prose.module.css}` →
`src/components/mdx/{render.tsx, registry.ts, prose.module.css}`. The tree FORMAT stays at
`content/mdx/tree.ts`: it is a property of what the build produces, not of the application.

**Consequences.**

- New file `src/app/mdx.ts`: re-exports the compiled-body types and `isSafeUrl`. It is the
  second permitted UI-side seam, and the only other consumer of `@content/` besides
  `src/content/registry.ts`.
- Invariant 3 (single content entry point) is narrowed, not weakened: it now exempts (i) a
  `type`-only import and (ii) an import of `content/mdx/tree.ts`, the format contract that
  holds no curriculum data. Both exemptions are named and documented; every real curriculum
  read still fails the check. This is the same reasoning the file already used for type-only
  imports at M2.2.
- Invariant 6 keeps its explicit package list rather than a `/mdx/` pattern, so our own
  `src/components/mdx/` modules are not mistaken for the compiler.
- The renderer now applies its **own** `.prose` class. Relying on the caller to pass one was a
  latent bug: the caller's `.prose` was a layout rule, so the typography never loaded, and a
  test passed anyway because the harness passed the literal string `'prose'`. The class now
  comes from the renderer's CSS module and is combined with, not replaced by, the caller's.

---

## D24 — A lesson body may not contain an h1

**Date:** 2026-10-01 (M2.3)

**Context.** The lesson page renders the lesson title as the page's single `<h1>`. The
compiler's element allowlist included `h1`, so a body containing `# Heading` (or a setext
`===` heading) would produce a second `<h1>` and a page whose outline claims two different
things are the title. No current content does this, so the bug was latent — but "no current
content does this" is not a guarantee about future content.

**Options.** (a) Allow `h1` and accept a duplicate. (b) Silently demote a body's `h1` to `h2`
in the compiler. (c) Refuse an `h1` in a lesson body at compile time, naming the file.

**Choice.** (c).

**Reason.** (a) breaks the accessibility commitment the design system makes. (b) hides a real
authoring mistake and, worse, teaches the author the wrong level: they would never learn that
body headings start at `h2`. Every other unsupported construct in this compiler is refused
loudly with the file and line named; an `h1` is no different.

**Consequences.**

- `content/mdx/compile.ts` refuses `depth <= 1` in the `heading` case, with an author-facing
  message. `headingTag` clamps to `h2`–`h6` as a belt-and-braces floor.
- The compiler tests assert both the refusal and the remaining `h2`–`h6` behaviour, and the
  lesson page test asserts exactly one `h1` on a rendered page.
- Existing M2.2 test fixtures that compiled `# Heading` bodies were corrected to `##`, which is
  the level a body should use.
