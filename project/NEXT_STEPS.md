# Next Steps

**At most three items.** This is the whole task list. Everything not here is either
already done or in `BACKLOG.md`.

If this file ever has more than three items, something has gone wrong: either the milestone
is too large or work is not being closed out.

---

## Current milestone: M4 — Quiz Engine · **in progress** (M4.1, M4.2 and M4.3 complete)

`PLAN.md` §Milestone 4 — quiz data, question rendering, scoring and results — is now delivered
end to end:

- **Content (M4.1)** — `Question` and `Quiz` as first-class entities, one file per entity, with
  fail-closed quiz → question integrity (`DECISIONS.md` D30).
- **Renderer (M4.2)** — `/quizzes/:quizId` renders a validated quiz, with `single-choice` and
  `true-false` as accessible radio groups, and the correct answers stripped from the view.
- **Scoring and attempts (M4.3)** — submitting marks the quiz against the canonical content and
  records exactly one `quiz.attempted` event; the result shows score, percentage, pass/fail and
  per-question correctness, and history is read back from the log. Answers stay transient until
  submitted (`DECISIONS.md` D32).

**Not tagged.** `v0.3.0-content-engine` remains the latest tag.

## Next milestone: M5 — Search and the tool directory · **not started**

### 1. M5 — Search and the tool directory

No further M4 work is defined in this repository, so this is the next milestone the plan names:
the `tools` collection (a new content entity and its directory), and search across the
curriculum. See `PLAN.md` and `BACKLOG.md`. If the owner intends a further M4 slice, it should
be written into this file before work starts.

---

## Earlier milestones

- **M4.3 — Quiz scoring, results and persisted attempts** · complete, untagged. A pure scorer
  over canonical questions, the existing `quiz.attempted` event, a result view, and retry that
  adds an attempt (`DECISIONS.md` D32).
- **M4.2 — Learner quiz renderer** · complete, untagged. The quiz route, accessible radio
  groups, transient answers, and the fail-closed `lesson.quiz` link (`DECISIONS.md` D31).
- **M4.1 — Question and quiz content architecture** · complete, untagged. `Question` and `Quiz`
  as first-class content, one file per entity (`DECISIONS.md` D30).
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
