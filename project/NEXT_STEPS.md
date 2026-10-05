# Next Steps

**At most three items.** This is the whole task list. Everything not here is either
already done or in `BACKLOG.md`.

If this file ever has more than three items, something has gone wrong: either the milestone
is too large or work is not being closed out.

---

## Current milestone: M4 — Quiz Engine · **in progress** (M4.1 and M4.2 complete)

M4.1 landed the content foundation and M4.2 the renderer, so a learner can now take a quiz:

- **`/quizzes/:quizId`** — renders a validated quiz: its title, summary, and its questions in the
  order the quiz declares.
- **Interaction** — `single-choice` and `true-false` as accessible radio groups, one group per
  question, with a live "N of M answered" count and a completion control.
- **Transient answers only** — no storage, no progress event, no attempt, no score, and the
  correct answers are stripped before the renderer sees them.
- **Reachable** — a lesson links the quiz it declares through `lesson.quiz`, now a fail-closed
  reference (`DECISIONS.md` D31).

**Nothing is scored.** No grading, no pass/fail, no attempt, no saved answers — the page says so.
See `CHECKPOINT.md` and `DECISIONS.md` D30/D31.

**Not tagged.** `v0.3.0-content-engine` remains the latest tag.

## Next milestone: M4.3 — scoring, attempts and progress · **not started**

### 1. M4.3 — scoring, attempts and progress

Score a submitted quiz and record the attempt as the existing `quiz.attempted` event through the
progress store. This is where an answer stops being transient. Two decisions must be made and
documented rather than assumed: whether a quiz attempt counts as "practice" for its lesson
(today only `exercise.attempted` sets `practisedLessons`, so a quiz would not), and how a
client-computed score is framed given that the correct answers necessarily ship in the bundle
(`docs/DATA_MODEL.md`).

---

## Earlier milestones

- **M4.1 — Question and quiz content architecture** · complete, untagged. `Question` and `Quiz`
  as first-class content, one file per entity in `content/questions/` and `content/quizzes/`,
  with fail-closed quiz → question integrity (`DECISIONS.md` D30).
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
