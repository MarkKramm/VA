# Next Steps

**At most three items.** This is the whole task list. Everything not here is either
already done or in `BACKLOG.md`.

If this file ever has more than three items, something has gone wrong: either the milestone
is too large or work is not being closed out.

---

## Current milestone: M2 — Content Engine · **in progress**

Two M2 slices are done. **M2.1** moved frontmatter parsing out of the browser (bundle
717 kB → 468 kB gzipped: −56 kB). **M2.2** compiles lesson bodies at build time into a
renderable tree and renders them through an explicit component allowlist, with no compiler in
the client (473 kB / 146 kB gzipped). See `CHECKPOINT.md` and `DECISIONS.md` D21/D22. The
three items below are the rest of M2.

### 1. A lesson page, rendering the compiled body

`findLesson(lessonId)` already returns the validated lesson and its compiled tree, and
`MdxContent` renders it. Add the route and page. This is the first thing that exercises
`prose.module.css`, the type scale and prose contrast against real long-form text — the two
questions left open since M1 — so **look at it before declaring it done**.

The route must be `:lessonId` (the stable id), never a file path.

### 2. Complete the roadmap page against the same data

Finish the roadmap page so a roadmap's stages, modules and lessons are navigable, reading
through `src/app/content.ts` and `selectors.ts`. **Do not add placeholder routes** for
anything not in this list.

### 3. Exercises: the first entity that makes a lesson reach practice

Every M0 lesson raises `quality/no-practice`. Add the exercise entity and its schema, wire
lesson → exercise references, and let at least one real lesson reach practice, so the warning
count falls by fact rather than by suppressing the check. Exercise content stays ungraded;
scored assessment is M4.

---

## Carry-over, not M2 — needs a human

**Deploy it.** The M1 exit condition is a live URL at `https://markkramm.github.io/VA/`, with
a deep link surviving a hard refresh on the real deployed site. Everything needed is
committed and locally verified, but **there is no git remote**, so the workflow has never run.
This needs the owner to add the remote and push.
