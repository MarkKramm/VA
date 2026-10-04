# Next Steps

**At most three items.** This is the whole task list. Everything not here is either
already done or in `BACKLOG.md`.

If this file ever has more than three items, something has gone wrong: either the milestone
is too large or work is not being closed out.

---

## Current milestone: M4 — Quiz Engine · **in progress** (M4.1 complete)

M4.1 landed the CONTENT foundation. Questions and quizzes are first-class entities, one file per
entity in `content/questions/` and `content/quizzes/`:

- **`Question`** — a discriminated union on `type`, initially `single-choice` and `true-false`.
  A future type is a new variant, not a widening.
- **`Quiz`** — an ordered list of canonical question ids. Empty and repeated references are
  schema failures; a reference that does not resolve fails the build.
- **Registry** — `questions` / `quizzes` collections and the derived `questionQuizIds`
  (question → quizzes).

**Content only:** no renderer, no route, no scoring, no attempt, and no new progress event.
See `CHECKPOINT.md` and `DECISIONS.md` D30.

**Not tagged.** `v0.3.0-content-engine` remains the latest tag.

## Next milestone: M4.2 — the quiz renderer · **not started**

### 1. M4.2 — the quiz renderer

Render a quiz: a route, the question cards, answer selection and navigation. **No scoring and no
attempt recording** — those are M4.3, and a renderer that also scores would put that decision in
the wrong milestone. M4.2 also owns the linkage decision M4.1 deliberately deferred: how a
learner reaches a quiz, and therefore whether `lesson.quiz` becomes fail-closed.

---

## Earlier milestones

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
