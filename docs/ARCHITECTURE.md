# Architecture

How the system is built, and — more usefully — why, and what is deliberately missing.

For the entity model and content rules see [CONTENT_ARCHITECTURE.md](CONTENT_ARCHITECTURE.md).
For the type definitions see [DATA_MODEL.md](DATA_MODEL.md).

---

## The one-paragraph version

A learning platform where the curriculum is data, read through a single validated
registry; the learning logic is pure functions with no framework; and persistence sits
behind a port so it can be swapped. Everything below follows from wanting to be able to
write 500 lessons and 21 roadmaps, and to have an AI agent add the 400th lesson by
following the same procedure as the 4th.

## The four layers

```
content/          the curriculum, as data. Knows nothing about the application.
   ↓
src/content/      schemas, registry, selectors. The ONLY read path to content.
   ↓
src/domain/       pure logic: progress, assessment, unlock. No React, no I/O.
   ↓
src/app/          wiring: router, store, storage. Knows about all of the above.
src/features/     one folder per feature.
src/components/   reserved for genuinely cross-feature components.
```

Dependencies point one way. `content/` never imports from `src/`. `src/domain/` never
imports React, the app layer, or the content registry — it takes plain data as arguments
and is composed with content by `src/app/hooks/` when that exists at M3.

**Why domain takes plain data instead of importing the registry:** it is the difference
between logic you can unit-test in a microsecond and logic that needs the whole content
graph loaded. Every test in `src/domain/` runs with no fixtures and no DOM.

## The three rules that carry the weight

### 1. Every relationship is an id reference, and inbound links are derived

A roadmap lists module ids. A module lists lesson ids. Nobody writes "this module appears
in seven roadmaps" — the registry computes it by scanning roadmaps and building
`moduleId -> roadmapIds`.

This is what makes the reuse model work. Adding a lesson to a second roadmap is a one-line
edit in one file, and "which roadmaps include this lesson", "which lessons teach this
skill", "what does completing this advance" and "which tools have my completed lessons
used" are all free and always correct.

A reverse index is a **set**, not a tally. The registry de-duplicates on insert, because a
module referenced by two stages of one roadmap must yield that roadmap once. This was a
real bug caught by the M0 tests.

### 2. Progress is a pure fold over an append-only event log

```ts
state = events.reduce(applyEvent, initialState)
```

`derived` is a **cache** of that fold, not a source of truth. It may be deleted and
rebuilt at any moment, and an invariant test asserts the two are always equal.

Two consequences, and they are the reason so much can be deferred:

- The reducer is trivially testable with no DOM and no framework.
- Every future personalisation feature is a _pure function over this log_. Sync, undo,
  history charts, weak-area reports, spaced review, streaks, "what did I do last Tuesday"
  — all can be written at any time with no migration, because they read the log rather
  than a bespoke store.

**The rule to remember: model the events now, write the derivations later.**

Nothing is stored that is not already derivable. There is deliberately no
`completedLessons` set, no "primary roadmap" field, and no `learner.goal` event — a second
source of truth can always disagree with the log, and `roadmap.enrolled` already _is_ a
goal declaration.

### 3. The boundaries are enforced, not documented

Documentation of an architecture that nothing checks is a wish. Five invariants are
mechanically enforced, and splitting them by tool is deliberate:

**Via ESLint** (immediate feedback in the editor, which a test cannot give):

1. UI code (`src/components/`, `src/features/`) may not import from `content/`.
2. `src/domain/` may not import React, `src/app/`, `src/features/`, or `content/`.

**Via `npm run test:arch`** (the checks that need computation or the filesystem):

3. Only `content/index.ts` may glob or import content. `src/content/registry.ts` is the
   single permitted consumer, pinned by name so a second consumer is a decision.
4. `derived` always equals the fold of `events`, including after a deliberately corrupted
   cache.
5. Every content id is a well-formed slug, and referential integrity holds.

Why this matters more than usual here: without it, an agent can _suggest_ a restructure
and, with enough momentum, _silently perform_ one. These tests make the difference between
the two visible.

## Where content is read

`content/index.ts` is the only file allowed to glob content. It imports nothing from
`src/`, parses frontmatter, and exports raw content. `src/content/registry.ts` validates it
against Zod schemas, drops anything that fails, and derives the reverse indexes.

Entities that fail validation are **dropped rather than kept partially**. A registry
holding a half-valid lesson is worse than one missing it, because every consumer then has
to handle the broken case. The failure is reported loudly by `content:check` instead.

A subtle trap worth knowing about: `parseAll` receives bare data objects for career paths
and skills, but _file wrappers_ for modules, lessons and roadmaps. Validating the wrapper
instead of its contents produces "expected string, received undefined" for every `.mdx`
file, which looks like a frontmatter bug and is not one. `asEntry` normalises this.

## Storage, and the multi-tab fix

`StorageAdapter` is a five-method port. Today `LocalStorageAdapter` implements it;
`MemoryStorageAdapter` is for tests and for environments where `localStorage` throws. A
future `HttpStorageAdapter` would be a drop-in swap with **no domain changes** — which is
the entire reason the port exists.

The interface is deliberately synchronous, because `localStorage` is, and shaping it so an
async backend can arrive later costs nothing now.

**The bug this design exists to prevent.** `localStorage` is shared by every tab on the
origin, but each tab holds its own in-memory copy:

1. Tab A has the dashboard open, holding events `[e1 … e40]`
2. Tab B records `e41` and writes `[e1 … e41]`
3. Tab A completes a lesson, folds from its own stale copy, writes `[e1 … e40, e42]`

`e41` is gone. The learner loses work with no error and no reproducible cause. On a phone —
where this platform will mostly be used — that is not a rare race.

The fix is cheap _because_ progress is an append-only log:

- Every event carries a unique `id`, so two logs merge by union rather than
  last-write-wins. **This field is the enabling change** and the reason it is added now
  while there is no learner data to migrate.
- `append` re-reads from storage immediately before writing. It never writes a cached
  snapshot.
- A `storage` event listener lets an open tab re-fold when another tab writes.

## Validation and the build gate

`npm run content:check` runs a standalone validator — no dev server, no test runner, no
browser. It runs through `vite-node` so `import.meta.glob` resolves exactly as it does in
the app and in tests.

A reference that does not resolve is a **build error**. A learner hitting a broken link is a
trust-breaking bug; the same reference found by CI is a five-second fix.

Checks, split by what they can enforce:

**Mechanical (code).** Schema conformance, referential integrity, no duplicate ids, no
cycles, `published` requires a reviewer, guarantee-language deny-list, uncited numeric
claims, generic titles, duplicate lessons, lessons with no practice.

**Judgement (docs).** Depth, realism, whether a lesson is actually useful. These are in
`CONTENT_GUIDELINES.md` and cannot be automated.

**Warnings versus errors.** Anything needing a human to look is a warning. A build that
blocks on a judgement call teaches authors to work around the check. Only
machine-detectable problems are errors.

The one deliberate exception to "every reference must resolve": collections that do not
exist yet (`tools`, `quizzes`, `labs`, …) are skipped rather than failed, so a lesson can
stage a `tools:` list before the tool directory exists at M5. A _known_ collection is
always checked.

## Deliberate non-features

Each of these is absent on purpose. Adding one is a decision to be recorded in
`DECISIONS.md`, not an obvious gap to fill.

| Absent                          | Why                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Backend, database, auth         | Progress is local, and a port makes a future backend a swap. `PLAN.md` section 73 forbids premature backends                             |
| CMS                             | Content is files in the repository. That _is_ the feature: versioned, reviewable, diffable                                               |
| SSR                             | A static curriculum on GitHub Pages needs no server runtime                                                                              |
| i18n                            | One language. It would multiply the content workload and add a dependency                                                                |
| Content API                     | The content is compiled into the bundle. A fetch layer would add a loading state to a platform that has none                             |
| Redux / XState / TanStack Query | `Zustand` is one small dependency and removes provider boilerplate. Recorded in `DECISIONS.md` so it can be removed knowingly            |
| Component library               | A design system we own, in CSS variables, is cheaper than adopting and fighting someone else's                                           |
| Mermaid / chart library         | Diagrams are few, stable, and better hand-authored as SVG components                                                                     |
| Module prerequisite graph       | Lesson prerequisites plus roadmap stage order cover every real use case. A weighted graph is the classic over-engineering move           |
| Skill _graph_                   | A tree is what the platform shows a learner. A graph is not more useful here, only harder to read                                        |
| File upload                     | No backend means nowhere to put a file and no reason to accept one                                                                       |
| Secure client-side assessments  | Impossible without a server. Stated as a limitation rather than pretended away — see `DATA_MODEL.md`                                     |
| Analytics                       | Local-only is a privacy stance and a performance win. It also means we cannot know which content learners use, which is an accepted cost |

## Where new code goes

| You are adding                                | It belongs in                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A lesson, module, roadmap, skill, career path | `content/`. No code                                                                       |
| A new content field                           | `src/content/schemas/`, with a default, then the validator                                |
| A new way to query content                    | `src/content/selectors.ts` — never an ad-hoc lookup in a component                        |
| Learning or progression logic                 | `src/domain/`, as a pure function over plain data                                         |
| A new event                                   | `src/domain/progress/types.ts`, the union, and `reducer.ts`. Then any selectors that care |
| An evaluation strategy for labs               | `src/domain/labs/evaluators/`, one file, registered in a map                              |
| A UI component used by one feature            | That feature's folder                                                                     |
| A UI component used by many features          | `src/components/`                                                                         |
| A route                                       | `src/app/router.tsx`, thin: a loader or guard, and render a feature                       |
| A page                                        | `src/features/<name>/`, rendering data handed to it by `src/app/`                         |
| A design token                                | `src/styles/tokens.css`                                                                   |
| Storage behaviour                             | `src/app/storage/` behind the port                                                        |
| Shared client state                           | `src/app/providers/` — context at M1; see `DECISIONS.md` D17                              |

If you cannot place something in this table, that is a signal the design is missing
something. Ask rather than invent a layer.

## The content/UI seam

Since M1, `src/features/` and `src/components/` **cannot import `@/content/`**. The ESLint
boundary pattern also matches the alias, so the restriction is broader than the original
`content/` rule intended — and that is the useful outcome, not a bug.

`src/app/content.ts` is the seam. It reads the registry through `selectors.ts` and hands
plain data to the presentation layer:

```
src/features/dashboard/DashboardPage.tsx
   ↓ calls functions from
src/app/content.ts          ← the only file that touches @/content/ from the UI side
   ↓ uses
src/content/selectors.ts    ← every read goes through a selector
   ↓ reads
src/content/registry.ts
```

The point is that a query which does not exist cannot be improvised in a component. Adding
one means adding a selector, which is reviewable, rather than reaching past the registry
where the derived-index rule stops being true. Verified by probe: a file importing
`@/content/registry.ts` from `src/features/` fails lint. See `DECISIONS.md` D16.

## Build configuration that matters

`base: '/VA/'` in `vite.config.ts` is load-bearing. The site is served from a subpath on
GitHub Pages, so every asset URL, the router basename and the `404.html` SPA fallback all
depend on it. **Never hard-code `/VA/`.** Read `import.meta.env.BASE_URL` instead.

`npm run check:paths` asserts, against the **built** output rather than the source, that no
asset URL is root-relative. That distinction matters: a check that only reads source can be
fooled by a transform that introduces the problem later, and the failure it guards against —
a site that works on the homepage and 404s on every deep link — is invisible in `vite dev`.

The same failure needs the `404.html` fallback, because GitHub Pages has no rewrite rules: a
hard refresh on `/VA/roadmaps/beginner-va` hits the server, matches no file, and returns
Pages' own 404 without ever booting the app. Copying `index.html` to `404.html` lets the
app load and resolve the route client-side. `scripts/copy-spa-fallback.ts` does this as part
of `npm run build`.

Since M1 the build is a normal application build. M0 had no `index.html` and therefore
bundled the content registry in library mode — a placeholder, now replaced.

## Testing strategy

| Suite                                     | What it covers                                  | Environment                                                                                                                                                 |
| ----------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/__tests__/`                  | Registry, selectors, validation, quality checks | jsdom (validation is pure; jsdom is for parity)                                                                                                             |
| `src/domain/**/__tests__/`                | Reducer and selectors                           | jsdom, but nothing in `src/domain/` may import a DOM API — the ESLint rule enforces it                                                                      |
| `src/app/storage/__tests__/`              | Adapters, merge, import validation              | jsdom, because the merge logic can only be tested against a real Storage                                                                                    |
| `src/app/__tests__/`                      | The content/UI seam, router shape, deployment   | jsdom + filesystem. `router.test.ts` reads source, because a rendered assertion cannot tell "the basename is right" from "the basename did not matter here" |
| `src/app/providers/__tests__/`            | Theme resolution and port-backed persistence    | jsdom, with a `matchMedia` stub in `tests/setup.ts`                                                                                                         |
| `src/components/**/__tests__/`            | Shell structure, navigation, dialog behaviour   | jsdom + Testing Library                                                                                                                                     |
| `src/components/ui/__tests__/`            | Each component's accessibility contract         | jsdom + Testing Library                                                                                                                                     |
| `src/domain/__tests__/boundaries.test.ts` | The architectural invariants                    | node + filesystem                                                                                                                                           |

**Validation is tested against constructed fixtures, not files on disk.** That is the only
practical way to test the cases that matter most, which are the invalid ones. A suite that
can only assert "the real content is fine" proves very little.

**Shell tests assert behaviour, not existence.** `expect(getByTestId('shell')).toBeInTheDocument()`
passes on a shell with no landmarks, no skip link and no working navigation. The M1 suite
asserts where focus lands, what is announced, and which link is current. That is not
fastidiousness: `AppShell` took a `children` prop that react-router never passes, which
typechecked, compiled, and rendered a blank page on every route. The test that caught it is
`renders the matched route's content, not an empty main`.

**jsdom gaps are filled explicitly, in `tests/setup.ts`.** `matchMedia` and `scrollTo` are
not implemented, and the theme provider and focus-trap logic depend on them. Both are
stubbed minimally rather than with a polyfill dependency.
