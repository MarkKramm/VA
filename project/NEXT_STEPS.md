# Next Steps

**At most three items.** This is the whole task list. Everything not here is either
already done or in `BACKLOG.md`.

If this file ever has more than three items, something has gone wrong: either the milestone
is too large or work is not being closed out.

---

## Current milestone: M1 — Application Shell · **complete, awaiting review**

All three items are done. What follows is what remains, including the one thing that is
**not** done.

### 1. Deploy it — the M1 exit condition is not met

`NEXT_STEPS.md` set M1's exit condition as a live URL at
`https://markkramm.github.io/VA/`, navigable, keyboard-operable, responsive at 375 / 768 /
1440, with a deep link surviving a hard refresh **on the real deployed site**.

Everything needed is committed and locally verified: `deploy.yml`, `public/.nojekyll`, the
`404.html` fallback, and `check-paths` (proven to fail on a deliberately broken build).
**There is no git remote**, so the workflow has never run and there is no live URL.

This needs a human: add the remote, push to `main`, and confirm the deployed deep-link
refresh.

### 2. Review the shell in a browser at three widths

The responsive layout is verified by construction — fluid `clamp()` and `auto-fit` grids
with one structural breakpoint at `md` — but no browser was driven at 375 / 768 / 1440.
Worth doing before M2 builds on it.

### 3. Decide whether the bundle size is acceptable to defer

The build is **717 kB / 202 kB gzipped**, of which roughly **55 kB gzipped is
`gray-matter`**, a Node YAML parser shipping to the browser. Measured by rebuilding with the
parser stubbed out (717 kB → 469 kB).

The fix is a build-time frontmatter transform, which is the M2 MDX pipeline. It was not
patched at M1 because a hand-rolled YAML parser would duplicate a solved problem and risk
disagreeing with `gray-matter` on an edge case. It is a real cost on a phone, so it is a
decision rather than an oversight — see `BACKLOG.md` and `DECISIONS.md` D17.

---

## After M1

M2 (content engine) is scoped in `PLAN.md` section 16: MDX pipeline and component registry,
the remaining entity schemas, lesson and roadmap pages, exercises, and search.

Two things M1 should set up for M2 without building them:

- ~~The stage renderer must **iterate a list**, because roadmaps will have two stages
  sharing a `kind`. Do not key a component by stage kind.~~ **Done at M1.**
  `stagesOfRoadmap` returns an ordered array of `{ stage, modules }` and
  `RoadmapDetailPage` keys by index. `beginner-va` already has two stages sharing a module
  across different kinds, so the real content exercises the case, and a test asserts all
  three stages survive.
- The MDX component registry should be a small, reviewed set. It is the one place content
  can become code, so its size is a governance decision, not a convenience one. **Still
  open** — an M2 decision that nothing at M1 depends on.
