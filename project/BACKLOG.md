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
- Playwright, for the 5–10 critical journeys at M3.

## Development environment

- ~~**Scope `format:check` so it does not fail on untracked local config.**~~ **Resolved at
  M2.2.** The immediate failure — `prettier --check .` flagging the untracked `opencode.json`
  — is fixed by listing it in `.prettierignore` and `.gitignore` (`DECISIONS.md` D20), which
  is the durable fix for that specific file: it is machine-local runtime config that must
  never be committed or reformatted. A broader "check tracked files only" change is still
  available if a _different_ untracked file ever trips the gate, but it is no longer needed
  to keep CI green.

## Milestone-gated

| Item                                                     | Milestone | Note                                          |
| -------------------------------------------------------- | --------- | --------------------------------------------- |
| `Question` entity and question bank                      | M4        | Must land _with_ the quiz engine, never after |
| `short-answer` scoring, `matching`, `ordering` renderers | M4        | Only if the learning value justifies the work |
| `file-review` lab strategy                               | M7        | Portfolio evidence                            |
| Progress export/import UI                                | M3        | The validator already exists at M0            |
| Bundle size budget in CI                                 | M5        | The payload report already exists at M0       |
| Scheduled link check                                     | M6        | Non-blocking first                            |
| Playwright in CI                                         | M9        |                                               |
| Lighthouse accessibility and performance budgets         | M9        |                                               |
| Content freshness report for entries past `lastReviewed` | M9        |                                               |

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
