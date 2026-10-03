# Next Steps

**At most three items.** This is the whole task list. Everything not here is either
already done or in `BACKLOG.md`.

If this file ever has more than three items, something has gone wrong: either the milestone
is too large or work is not being closed out.

---

## Current milestone: M2 — Content Engine · **in progress**

Four M2 slices are done. **M2.1** moved frontmatter parsing out of the browser (bundle
717 kB → 468 kB gzipped: −56 kB). **M2.2** compiles lesson bodies at build time into a
renderable tree and renders them through an explicit component allowlist, with no compiler in
the client. **M2.3** connects that tree to the application: `/lessons/:lessonId`, the lesson
page, roadmap → module → lesson navigation, breadcrumbs, deterministic previous/next, and the
missing-content states. **M2.4** adds the `Exercise` entity, a dedicated exercise compiler
entry point with an `h4` heading floor, and the Practice section on the lesson page;
`files-and-folders` now reaches practice, so the `quality/no-practice` warnings fell from **4
to 3 by fact** (482 kB / 148 kB → 489 kB / 149 kB gzipped). See `CHECKPOINT.md` and
`DECISIONS.md` D21–D26. **One item remains.**

### 1. Close out M2

Re-read `PLAN.md` §60/§73/§84 against what M2 actually built. Confirm the slice boundaries are
recorded, the `quality/no-practice` warnings have fallen by fact, and nothing in the milestone
is half-finished. Then update the orientation files, tag `v0.3.0-content-engine`, and move to
M3.

---

## Carry-over, not M2

~~**Deploy it.**~~ **Done.** The repository is `https://github.com/MarkKramm/VA` and the site is
live at `https://markkramm.github.io/VA/`. The deep-link SPA fallback was verified over HTTP:
`/VA/lessons/what-is-a-virtual-assistant` serves the `404.html` fallback and boots the app.
CI and Deploy both run green on push to `main`. The M1 exit condition is closed.
