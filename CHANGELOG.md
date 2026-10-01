# Changelog

All notable changes to this project. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Only meaningful changes.** Typos, whitespace and formatting are not recorded.

---

## [Unreleased]

### Fixed

**Two validation gates that were not actually green**, both found by an independent audit of
M0 rather than by the M0 work itself.

- **The `duplicate-id` check was unreachable.** It iterated the registry's Maps, which
  `indexById` builds with `new Map(items.map(i => [i.id, i]))` — a Map keeps only the last
  entry for a repeated id, so the duplicate was already erased before any check could
  observe it. A check that looks correct and always passes is the worst kind of bug.
  Validation now reads the pre-index entity list, exposed on the registry as `parsed`, with
  each entity's real source file retained so a duplicate error names both files. Map lookup
  behaviour is unchanged and pinned by a test. Six regression tests, including one
  confirming the same id in two different entity types is not a false positive.
  `DECISIONS.md` D15.
- **11 Markdown files failed `npm run format:check`.** Fixed by applying the repository's
  existing Prettier rules, not by hand.

### Documentation

`npm run check` does **not** run `format:check`, but CI does. That gap is why the formatting
regression went unnoticed for a full milestone, and a green `check` is therefore not the same
as a green CI. Now stated explicitly in `README.md`, `AGENTS.md`, `docs/WORKFLOWS.md`,
`project/CURRENT_STATE.md` and `project/CHECKPOINT.md`, and `AGENTS.md` rule 9 now requires
both. The split itself is deliberate — `check` is meant to be fast enough to run constantly —
so the fix is documentation, not a change to what `check` does.

### Not changed

No architecture, no schema semantics, no content, no dependencies, no tests removed. All M0
content remains `status: draft`.

## [0.1.0-foundation] — 2026-10-01

Milestone 0. The project went from an empty repository to a validated content pipeline, a
pure progress model, and mechanically enforced architectural boundaries. **No user
interface exists yet** — that is Milestone 1.

### Added

**Content architecture.** The curriculum as build-time-validated data: 2 roadmaps, 2
modules, 4 lessons, 16 career paths, 19 skills, all real and publishable. Zod schemas for
`CareerPath`, `Skill`, `Module`, `Roadmap` and `Lesson`, with a shared primitives module
holding the id, date, difficulty, status and provenance definitions.

**The registry** (`src/content/registry.ts`) as the only read path to content, deriving
every reverse index — module to roadmaps, lesson to modules, skill to lessons and modules,
lesson to career paths. Nothing hand-maintains an inbound link.

**Cross-roadmap reuse, demonstrated.** Both M0 roadmaps reference both M0 modules. The
reuse model is proven by test rather than asserted in a comment, including the
de-duplication behaviour when a module appears in two stages of one roadmap.

**Selectors** for every read pattern the UI will need, degrading to an empty result for an
unknown id rather than throwing.

**Validation** (`npm run content:check`), runnable without a dev server, test runner or
browser. Schema conformance, referential integrity, duplicate ids, cycle detection,
provenance (published requires a reviewer), orphan detection, and six content-quality
checks: guarantee language, uncited numeric claims, generic titles, lessons with no
practice, duplicate lessons, and near-duplicate lessons within a module.

**The progress model.** 13 event types as a pure fold over an append-only log, with a
rebuildable `derived` cache. Module, roadmap and stage progress; attempt summaries; mastery
levels (stored as a number, rendered as a level, never as a false-precision decimal);
soft-gating advisories; and assessment eligibility, the platform's single hard lock.

**Storage** behind a `StorageAdapter` port, with localStorage and in-memory adapters,
cross-tab event merging that prevents silent progress loss, and import validation that
rejects a malformed or future-version export without destroying existing progress.

**Five architectural invariants**, enforced by a mix of ESLint rules (layer boundaries,
domain purity) and tests (single content entry point, derived-equals-folded, id and
referential integrity).

**Documentation.** `README.md`, `AGENTS.md`, five `docs/` files and five `project/` files,
written in the same pass as the code so they describe what exists rather than what was
planned.

**CI.** A seven-step workflow: lint, typecheck, content validation, tests, architectural
invariants, build, formatting.

### Fixed

Five bugs found by the M0 tests, each of which would otherwise have shipped. Reverse
indexes containing duplicates; cycle detection that followed only the first prerequisite and
so missed most cycles; orphan warnings that did not name the entity; the registry validating
a file wrapper instead of its contents, producing 77 misleading errors; and the boundary
test flagging its own source.

### Decisions

Fourteen recorded in `project/DECISIONS.md`, each with the rejected alternative. The most
consequential: progress is a pure fold over an event log, job readiness is evidence-weighted
rather than completion-weighted, and content is drafted by agents but edited by humans,
enforced by a rule that `published` requires a named reviewer.

### Known limitations

- No user interface, no router, no CSS, no deployment. All Milestone 1.
- All four lessons warn `quality/no-practice`, because the exercise system is Milestone 2.
- The build uses library mode, since there is no `index.html` yet.
- All quiz answers will ship in the client bundle. This is not fixable without a server, and
  is mitigated by anchoring demonstrated competence in labs and portfolio evidence.
- Progress is browser-scoped. Export and import arrive at Milestone 3; accounts are not
  planned.

[Unreleased]: https://github.com/MarkKramm/VA/compare/v0.1.0-foundation...HEAD
[0.1.0-foundation]: https://github.com/MarkKramm/VA/releases/tag/v0.1.0-foundation
