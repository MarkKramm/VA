# VA Learning Platform

A learning platform that takes a learner from complete beginner to job-ready Virtual
Assistant, across many career paths.

**Status: Milestone 2 (Content Engine) complete — lessons are readable end to end and the first
practice exercises render; progress tracking, quizzes and labs do not exist yet.**

The curriculum lives in `content/` and is validated and compiled at build time. The
application renders it: a responsive shell, a dashboard, a roadmaps index, and **lesson pages
with the compiled MDX body, objectives, prerequisites, previous/next navigation and a Practice
section** that renders exercises — all reading real content through one seam. Exercises are
**ungraded and unsaved**, so nothing here pretends to record something it cannot. **Progress
tracking, quizzes and labs arrive in later milestones.** See
[project/CURRENT_STATE.md](project/CURRENT_STATE.md) for exactly what exists and works
today, and [project/NEXT_STEPS.md](project/NEXT_STEPS.md) for what is being built next.

> **Live at <https://markkramm.github.io/VA/>.** Pushing to `main` runs CI and then deploys to
> GitHub Pages. Deep links survive a hard refresh through the SPA fallback.

---

## Quick start

```bash
npm install
npm run dev        # dev server — the shell runs at /
npm run check      # the single gate: format, lint, types, content, contrast, tests, build
npm run format     # Prettier — fixes formatting instead of reporting it
```

**Requirements:** Node 22.12 or newer (`.node-version` pins 22 for CI consistency;
Node 24 also works — `engines` is `>=22.12` so a newer machine does not warn).

## Commands

| Command                           | What it does                                         |
| --------------------------------- | ---------------------------------------------------- |
| `npm run dev`                     | Vite dev server                                      |
| `npm run build`                   | Production build, then the SPA fallback + path check |
| `npm run preview`                 | Serve the production build locally                   |
| `npm run lint`                    | ESLint, including the layer-boundary rules           |
| `npm run typecheck`               | `tsc --noEmit`, app and tooling configs separately   |
| `npm run content:check`           | Validate all curriculum content                      |
| `npm run check:contrast`          | WCAG ratios computed from the design tokens          |
| `npm run test`                    | Full test suite                                      |
| `npm run test:arch`               | Architectural invariant tests only                   |
| `npm run format` / `format:check` | Prettier                                             |
| `npm run check`                   | Everything above, in order. The single gate          |

`check` includes `format:check`, `check:contrast` and the built-output path check, so a
green `check` means CI will be green. Use `npm run format` to fix formatting rather than
report it.

## Architecture at a glance

Four layers, dependencies pointing one way:

```
content/          the curriculum, as data. Knows nothing about the application.
   ↓
src/content/      schemas, registry, selectors. The ONLY read path to content.
   ↓
src/domain/       pure logic: progress, assessment, unlock. No React, no I/O.
   ↓
src/app/          wiring: router, navigation, storage. Composes content for the UI.
src/features/     one folder per feature. Reads data from src/app/, never content.
src/components/   genuinely cross-feature components.
```

The boundaries are **enforced, not documented** — two by ESLint, three by `test:arch`. A
notable consequence: `src/features/` cannot import `@/content/`, so every content read goes
through `src/app/content.ts`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[project/DECISIONS.md](project/DECISIONS.md).

## Adding content

Content is data, and the only place it lives is `content/`.

- **A lesson** — create `content/lessons/<domain>/<slug>.mdx`, then add its id to a
  module's `lessons` list. That is the whole procedure. No code, no route, no index.
- **An exercise** — create `content/exercises/<slug>.mdx` (headings start at `####`) and list
  its id in a lesson's `exercises`. The reference is lesson-owned, and an id that does not
  resolve fails the build.
- **A module** — create `content/modules/<slug>.mdx` listing its lessons.
- **A roadmap** — create `content/roadmaps/<slug>.mdx` listing modules per stage.
- **A skill or career path** — add one entry to the relevant taxonomy file.

Then run `npm run content:check`. A reference that does not resolve fails the build
with a file-and-field diagnostic.

Full rules, schemas and worked examples: [docs/CONTENT_ARCHITECTURE.md](docs/CONTENT_ARCHITECTURE.md).

Three consequences worth knowing:

1. **Adding a lesson touches no application code.** Every relationship is an id reference,
   and every "which roadmaps use this" question is derived by the registry rather than
   written by hand.
2. **Progress is a fold over an event log.** `state = events.reduce(applyEvent, initial)`.
   Every future personalisation feature is a pure function over that log, so it can be
   written later with no migration.
3. **Content is never hard-coded into the UI.** A curriculum string appearing in
   `src/components/` or `src/features/` is a review-blocking bug, and `test:arch` fails on
   it.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Deployment

GitHub Pages, at `https://markkramm.github.io/VA/`. The site is served from a **subpath**,
which drives three things:

- `base: '/VA/'` in `vite.config.ts` — load-bearing. Every asset URL and the router
  `basename` derive from `import.meta.env.BASE_URL`. **Never hard-code `/VA/` anywhere
  else**; a test asserts the router does not.
- `dist/404.html` — GitHub Pages has no rewrite rules, so without a copy of `index.html` a
  hard refresh on any deep link serves a server 404 instead of the app. `npm run build`
  does this automatically.
- `npm run check:paths` — asserts no built asset URL is root-relative. A subpath site that
  works on the homepage and 404s on every deep link is the classic failure this catches.

`.github/workflows/deploy.yml` runs `npm run check` then publishes `dist/` on every push to
`main`. The repository is `https://github.com/MarkKramm/VA`, and CI and Deploy run green on
push to `main`.

## For AI coding agents

Read [AGENTS.md](AGENTS.md) first. It contains the reading order, the twelve hard rules,
and the session protocol. In short: read the orientation files before touching code,
never hard-code content into `src/`, keep the smallest correct change, run
`npm run check`, and update the four `project/` documents before committing.

## Documentation

| Document                                                     | What it is                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| [PLAN.md](PLAN.md)                                           | The long-term project constitution. Aspirational by design. |
| [AGENTS.md](AGENTS.md)                                       | The AI-agent entry point. Read this first.                  |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                 | Layers, boundaries, and where new code goes                 |
| [docs/CONTENT_ARCHITECTURE.md](docs/CONTENT_ARCHITECTURE.md) | Entities, id rules, how to add each thing                   |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md)                     | Every entity type and the progress event log                |
| [docs/CONTENT_GUIDELINES.md](docs/CONTENT_GUIDELINES.md)     | How to write a lesson that is worth reading                 |
| [docs/WORKFLOWS.md](docs/WORKFLOWS.md)                       | Repo procedures                                             |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)               | Visual identity, tokens, and the accessibility rules        |
| [project/CURRENT_STATE.md](project/CURRENT_STATE.md)         | What exists and works right now                             |
| [project/CHECKPOINT.md](project/CHECKPOINT.md)               | The last verified stable state                              |
| [project/NEXT_STEPS.md](project/NEXT_STEPS.md)               | What is being built next                                    |
| [project/DECISIONS.md](project/DECISIONS.md)                 | Architectural decisions and their reasons                   |
| [project/BACKLOG.md](project/BACKLOG.md)                     | Deliberately deferred work                                  |
| [CHANGELOG.md](CHANGELOG.md)                                 | Meaningful changes                                          |

## Licence

MIT — see [LICENSE](LICENSE). Applies to both the code and the curriculum content.
