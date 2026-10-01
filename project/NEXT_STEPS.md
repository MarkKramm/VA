# Next Steps

**At most three items.** This is the whole task list. Everything not here is either
already done or in `BACKLOG.md`.

If this file ever has more than three items, something has gone wrong: either the milestone
is too large or work is not being closed out.

---

## Current milestone: M2 — Content Engine · **in progress**

Three M2 slices are done. **M2.1** moved frontmatter parsing out of the browser (bundle
717 kB → 468 kB gzipped: −56 kB). **M2.2** compiles lesson bodies at build time into a
renderable tree and renders them through an explicit component allowlist, with no compiler in
the client. **M2.3** connects that tree to the application: `/lessons/:lessonId`, the lesson
page, roadmap → module → lesson navigation, breadcrumbs, deterministic previous/next, and the
missing-content states (482 kB / 148 kB gzipped; the small increase is the lesson page and
renderer now shipping). See `CHECKPOINT.md` and `DECISIONS.md` D21/D22/D23. Two items remain.

### 1. Exercises: the first entity that makes a lesson reach practice

Every M0 lesson raises `quality/no-practice`. Add the exercise entity and its schema, wire
lesson → exercise references, and let at least one real lesson reach practice, so the warning
count falls by fact rather than by suppressing the check. Exercise content stays ungraded;
scored assessment is M4.

### 2. Close out M2

Re-read `PLAN.md` §60/§73/§84 against what M2 actually built. Confirm the slice boundaries are
recorded, the `quality/no-practice` warnings have fallen by fact, and nothing in the milestone
is half-finished. Then update the orientation files and move to M3.

---

## Carry-over, not M2 — needs a human

**Deploy it.** The M1 exit condition is a live URL at `https://markkramm.github.io/VA/`, with
a deep link surviving a hard refresh on the real deployed site. Everything needed is
committed and locally verified, but **there is no git remote**, so the workflow has never run.
This needs the owner to add the remote and push.
