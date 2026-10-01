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
- `check:paths` script and `postbuild-pages.mjs`, both part of the M1 deployment step.

## M2 content engine

- **The stale-tool report.** A tool whose `updatedAt` is newer than the `updatedAt` of the
  lessons referencing it. Needs the tools collection (M5); a derivation over the existing
  reverse indexes, so a few lines once the collection exists.
- Coverage thresholds on `src/domain` (90%+) and `src/content` (80%+). No UI threshold.
- Playwright, for the 5–10 critical journeys at M3.

## Milestone-gated

| Item | Milestone | Note |
|---|---|---|
| `Question` entity and question bank | M4 | Must land *with* the quiz engine, never after |
| `short-answer` scoring, `matching`, `ordering` renderers | M4 | Only if the learning value justifies the work |
| `file-review` lab strategy | M7 | Portfolio evidence |
| Progress export/import UI | M3 | The validator already exists at M0 |
| Bundle size budget in CI | M5 | The payload report already exists at M0 |
| Scheduled link check | M6 | Non-blocking first |
| Playwright in CI | M9 | |
| Lighthouse accessibility and performance budgets | M9 | |
| Content freshness report for entries past `lastReviewed` | M9 | |

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
  *spaced review as a derived view* needs no schema at all and is a M8 item, not this.
- **Voice practice before M9.** Deferred with its own planning pass, because audio storage
  on a static host is a real constraint. The Voice VA *roadmap* is not deferred.

## Content, when the time comes

Roughly 20 lessons exist. `PLAN.md` section 14.2 sets the MVP target. Beyond that, the long
list is in `PLAN.md` sections 16 and 22; there is no reason to duplicate it here. The
useful discipline is to write a module, check reuse against existing modules, and only then
write a roadmap that uses it.
