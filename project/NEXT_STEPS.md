# Next Steps

**At most three items.** This is the whole task list. Everything not here is either
already done or in `BACKLOG.md`.

If this file ever has more than three items, something has gone wrong: either the milestone
is too large or work is not being closed out.

---

## Current milestone: M2 — Content Engine · **COMPLETE**

**Tagged `v0.3.0-content-engine`.** All four M2 slices are done and verified:

- **M2.1** build-time frontmatter ingestion — the browser no longer ships a YAML parser
  (717 kB / 202 kB → 468 kB / 146 kB gzipped). `DECISIONS.md` D21.
- **M2.2** build-time MDX compilation into a serializable element tree, with an enforced trust
  boundary and no compiler in the client. `DECISIONS.md` D22.
- **M2.3** the lesson experience: `/lessons/:lessonId`, the lesson page, roadmap → module →
  lesson navigation, advisory prerequisites with reasons, related lessons, deterministic
  previous/next. `DECISIONS.md` D23/D24.
- **M2.4** the `Exercise` entity, a dedicated exercise compiler entry point with an `h4`
  heading floor, and the Practice section; `files-and-folders` reaches practice, so the
  `quality/no-practice` warnings fell from **4 to 3 by fact**. `DECISIONS.md` D25/D26.

See `CHECKPOINT.md` for the verified state and `CHANGELOG.md` for the release entry.

## Next milestone: M3 — Progress · **not started**

M3 gives progress a home — lesson completion, roadmap progress and dashboard progress — on top
of the M0 progress model (a pure fold over an append-only event log) and the `StorageAdapter`
port.

### 1. Pre-M3 hardening pass · **DONE**

The five pre-M3 findings from the post-M2 audit are fixed: `AGENTS.md` orientation (F1),
`syncFrom` change detection (F2), compiled-prose quality checks (F3), event-type completeness
(F5), and the export producer (F9). See `BACKLOG.md` → "Pre-M3 hardening (post-M2 audit)"; the
items still listed there are an optional cleanup batch, not blockers.

### 2. M3 — Progress

Lesson completion, roadmap and dashboard progress, and the export/import UI — the parser and,
as of the hardening pass, the serializer both exist. `exercise.attempted` may be wired here,
now that progress has a home. See `PLAN.md` §69 and `BACKLOG.md`.

---

## Carry-over, not M2

~~**Deploy it.**~~ **Done.** The repository is `https://github.com/MarkKramm/VA` and the site is
live at `https://markkramm.github.io/VA/`. The deep-link SPA fallback was verified over HTTP:
`/VA/lessons/what-is-a-virtual-assistant` serves the `404.html` fallback and boots the app.
CI and Deploy both run green on push to `main`. The M1 exit condition is closed.
