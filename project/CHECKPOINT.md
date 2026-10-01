# Checkpoint

The last verified stable state. This is what an agent reads to know it is resuming from
something that works.

---

## Checkpoint: v0.1.0-foundation

**Date:** 2026-10-01
**Milestone:** M0 — Foundation
**Tag:** `v0.1.0-foundation`
**Branch:** `main`

### What this checkpoint is

The project went from an empty repository to a working, validated content pipeline with a
pure progress model and mechanically enforced architectural boundaries. There is no user
interface. That is correct for M0.

### Verified working

- `npm run check` passes: formatting, lint, typecheck, content validation, **169 tests**,
  architectural invariants, build.
- **`npm run check` includes `format:check`, so a green `check` means CI will be green.**
  At M0 it did not, which is how a formatting regression survived a full milestone behind a
  locally green gate. The gap is closed.
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

### Not done, deliberately

No UI, no router, no CSS, no deployment, no exercises, no quizzes, no labs, no tool
directory, no progress UI, no search. All are milestone work. See `CURRENT_STATE.md` for
the full list.

### Files that must be understood before changing anything

| File                                      | Why it matters                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/content/registry.ts`                 | The only read path to content. `asEntry` and `parseAll` encode a non-obvious wrapper distinction |
| `src/domain/progress/reducer.ts`          | The single pass that derives all progress state                                                  |
| `src/app/storage/merge.ts`                | The multi-tab fix. Read the comment block before changing event handling                         |
| `eslint.config.js`                        | Two of the five architectural invariants live here                                               |
| `src/domain/__tests__/boundaries.test.ts` | The other three, plus the self-exclusion rule                                                    |
| `vite.config.ts`                          | `base: '/VA/'` is load-bearing for GitHub Pages                                                  |

### Do not change without a decision

The four boundaries, the id-reference model, the event-log design, the `StorageAdapter`
port, `lane` as a field, soft gating, and the single assessment lock. Each is recorded in
`DECISIONS.md` with the alternative that was rejected.

### Recommended next task

**M1 — Application Shell.** Read `NEXT_STEPS.md` first. The first three items are the token
layer, the layout shell, and the router with its Pages subpath handling.
