# Next Steps

**At most three items.** This is the whole task list. Everything not here is either
already done or in `BACKLOG.md`.

If this file ever has more than three items, something has gone wrong: either the milestone
is too large or work is not being closed out.

---

## Current milestone: M6 — Core VA Curriculum · **complete**

The foundation is now filled with a real curriculum slice:

- **Seven modules, twenty lessons** — research and verification, professional and written
  communication, inbox triage and scheduling, shared files and SOPs, data entry and spreadsheets,
  working remotely safely (including scam and job-fraud awareness), and non-voice support.
- **Ten exercises** that require doing, **six module quizzes** (twenty-one questions),
  **three practical assessments** — all self-evaluated, all fail-closed.
- **A non-voice roadmap** that reuses the shared foundation by id rather than duplicating it.
- **Roadmap outcome evidence resolved to real links**, so an outcome is navigable.

**Not tagged.** `v0.3.0-content-engine` remains the latest tag.

## Next milestone: the tool directory and search · **not started**

### 1. The tool directory and search

**Note on labels.** `PLAN.md` and `BACKLOG.md` previously called this "M5", and the owner's
milestone plan used "M5" for the learning and assessment work above. The work is unbuilt either
way; whichever label the owner prefers should be settled before it starts, so the two documents
stop disagreeing.

The `tools` collection (a new content entity, its directory, and `lesson.tools` becoming a checked
reference) plus search across the curriculum. `lesson.tools` and `lesson.resources` are already
staged in the schema and skipped by referential integrity as pending collections.

---

## Earlier milestones

- **M6 — Core VA Curriculum** · complete, untagged. Seven modules, twenty lessons, ten exercises,
  six quizzes, three assessments and a non-voice roadmap.
- **M5 — Learning & Assessment Foundation** · complete, untagged. Practical assessments, the one
  hard lock, self-evaluated results, derived skill evidence and a readiness view
  (`DECISIONS.md` D33).
- **M4 — Quiz Engine** · complete, untagged. M4.1 content, M4.2 renderer, M4.3 scoring and
  persisted attempts (`DECISIONS.md` D30–D32).
- **M3 — Progress** · complete, untagged. Local-first progress: lesson completion, ungraded
  exercise attempts, the dashboard, and export/import (`DECISIONS.md` D27–D29).
- **M2 — Content Engine** · complete, tagged `v0.3.0-content-engine`. M2.1 build-time frontmatter
  ingestion, M2.2 build-time MDX compilation behind an enforced trust boundary, M2.3 the lesson
  experience, M2.4 the first render-only practice exercises.
- **Pre-M3 hardening** · done — the five post-M2 audit findings (F1, F2, F3, F5, F9), then A1/A2
  and A1-R after the post-M3 audits.
- **M1 — Application Shell** · complete.
- **M0 — Foundation** · complete, tagged `v0.1.0-foundation`.

---

## Carry-over

~~**Deploy it.**~~ **Done.** The repository is `https://github.com/MarkKramm/VA` and the site is
live at `https://markkramm.github.io/VA/`. The deep-link SPA fallback was verified over HTTP:
`/VA/lessons/what-is-a-virtual-assistant` serves the `404.html` fallback and boots the app.
CI and Deploy both run green on push to `main`. The M1 exit condition is closed.
