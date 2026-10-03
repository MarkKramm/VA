# Next Steps

**At most three items.** This is the whole task list. Everything not here is either
already done or in `BACKLOG.md`.

If this file ever has more than three items, something has gone wrong: either the milestone
is too large or work is not being closed out.

---

## Current milestone: M3 — Progress · **COMPLETE**

Progress is real and local-first. A React-facing store (`src/app/progress/`) persists the event
log through the existing `StorageAdapter`, synchronizes across tabs, and drives the UI:

- **Lesson completion** — explicit, with undo, using `lesson.completed` / `lesson.uncompleted`
  (`source: 'manual'`). Opening a lesson records a VIEW, never a completion.
- **Exercise attempts** — the Practice section records `exercise.attempted` (`selfChecked:
true`). Still ungraded: no score, no pass/fail, no grading, no mastery.
- **Dashboard** — lessons completed, exercises practised, overall and per-roadmap progress, the
  lesson to resume, and the learner's own export/import. An honest empty state for a new
  learner.
- **Roadmap page** — a completed-lesson bar and a "Completed" badge per finished lesson.

No new dependency: React context plus `useSyncExternalStore` (`DECISIONS.md` D29). See
`CHECKPOINT.md` and `DECISIONS.md` D27–D29.

**Not tagged.** An M3 release tag is a deliberate, separate step; `v0.3.0-content-engine`
remains the latest tag.

## Next milestone: M4 — Quiz Engine · **not started**

### 1. M4 — Quiz Engine

Quiz content, question rendering, scoring and results. The `Question` entity lands WITH the
engine, never after it (`DECISIONS.md` D7), because retrofitting a shared question identity is
editing every quiz file. See `PLAN.md` §69 and `BACKLOG.md`.

---

## Earlier milestones

- **M2 — Content Engine** · complete, tagged `v0.3.0-content-engine`. M2.1 build-time frontmatter
  ingestion, M2.2 build-time MDX compilation behind an enforced trust boundary, M2.3 the lesson
  experience, M2.4 the first render-only practice exercises.
- **Pre-M3 hardening** · done — the five post-M2 audit findings (F1, F2, F3, F5, F9).
- **M1 — Application Shell** · complete.
- **M0 — Foundation** · complete, tagged `v0.1.0-foundation`.

---

## Carry-over

~~**Deploy it.**~~ **Done.** The repository is `https://github.com/MarkKramm/VA` and the site is
live at `https://markkramm.github.io/VA/`. The deep-link SPA fallback was verified over HTTP:
`/VA/lessons/what-is-a-virtual-assistant` serves the `404.html` fallback and boots the app.
CI and Deploy both run green on push to `main`. The M1 exit condition is closed.
