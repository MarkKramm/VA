# VA Learning Platform

A learning platform that takes a learner from complete beginner to job-ready Virtual
Assistant, across many career paths.

**Status: Milestone 0 (Foundation) — no user interface yet.**

The curriculum lives in `content/` and is validated at build time. The application
shell, lessons, quizzes and labs arrive in later milestones. See
[project/CURRENT_STATE.md](project/CURRENT_STATE.md) for exactly what exists and works
today, and [project/NEXT_STEPS.md](project/NEXT_STEPS.md) for what is being built next.

---

## Quick start

```bash
npm install
npm run dev        # dev server (no UI at M0)
npm run check      # format, lint, types, content, tests, build
npm run format     # Prettier — fixes formatting instead of reporting it
```

**Requirements:** Node 22.12 or newer (`.node-version` pins 22 for CI consistency;
Node 24 also works — `engines` is `>=22.12` so a newer machine does not warn).

## Commands

| Command                           | What it does                                       |
| --------------------------------- | -------------------------------------------------- |
| `npm run dev`                     | Vite dev server                                    |
| `npm run build`                   | Production build to `dist/`                        |
| `npm run preview`                 | Serve the production build locally                 |
| `npm run lint`                    | ESLint, including the layer-boundary rules         |
| `npm run typecheck`               | `tsc --noEmit`, app and tooling configs separately |
| `npm run content:check`           | Validate all curriculum content                    |
| `npm run test`                    | Full test suite                                    |
| `npm run test:arch`               | Architectural invariant tests only                 |
| `npm run format` / `format:check` | Prettier                                           |
| `npm run check`                   | Everything above, in order. The single gate        |

`check` includes `format:check`, so a green `check` means CI will be green. Use
`npm run format` to fix formatting rather than report it.

## Adding content

Content is data, and the only place it lives is `content/`.

- **A lesson** — create `content/lessons/<domain>/<slug>.mdx`, then add its id to a
  module's `lessons` list. That is the whole procedure. No code, no route, no index.
- **A module** — create `content/modules/<slug>.mdx` listing its lessons.
- **A roadmap** — create `content/roadmaps/<slug>.mdx` listing modules per stage.
- **A skill or career path** — add one entry to the relevant taxonomy file.

Then run `npm run content:check`. A reference that does not resolve fails the build
with a file-and-field diagnostic.

Full rules, schemas and worked examples: [docs/CONTENT_ARCHITECTURE.md](docs/CONTENT_ARCHITECTURE.md).

## Architecture in one minute

Four layers, dependencies pointing one way only:

```
content/          the curriculum, as data. Knows nothing about the app.
   ↓
src/content/      schemas, registry, selectors. The ONLY read path to content.
   ↓
src/domain/       pure logic: progress, assessment, unlock. No React, no I/O.
   ↓
src/app/          wiring: router, store, storage. Knows about all of the above.
src/features/     one folder per feature.
```

Three consequences worth knowing:

1. **Adding a lesson touches no application code.** Every relationship is an id
   reference, and every "which roadmaps use this" question is derived by the
   registry rather than written by hand.
2. **Progress is a fold over an event log.** `state = events.reduce(applyEvent, initial)`.
   Every future personalisation feature is a pure function over that log, so it can be
   written later with no migration.
3. **The boundaries are enforced, not documented.** ESLint restricts imports;
   `npm run test:arch` asserts the invariants.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Deployment

GitHub Pages, at `https://markkramm.github.io/VA/`. The site is served from a subpath,
so `base: '/VA/'` in `vite.config.ts` is load-bearing and every asset URL and the router
basename derive from `import.meta.env.BASE_URL`. Never hard-code `/VA/` anywhere else.
Deployment arrives at M1.

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
| [project/CURRENT_STATE.md](project/CURRENT_STATE.md)         | What exists and works right now                             |
| [project/CHECKPOINT.md](project/CHECKPOINT.md)               | The last verified stable state                              |
| [project/NEXT_STEPS.md](project/NEXT_STEPS.md)               | What is being built next                                    |
| [project/DECISIONS.md](project/DECISIONS.md)                 | Architectural decisions and their reasons                   |
| [project/BACKLOG.md](project/BACKLOG.md)                     | Deliberately deferred work                                  |
| [CHANGELOG.md](CHANGELOG.md)                                 | Meaningful changes                                          |

## Licence

MIT — see [LICENSE](LICENSE). Applies to both the code and the curriculum content.
