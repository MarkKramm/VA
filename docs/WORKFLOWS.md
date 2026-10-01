# Workflows

Repo procedures. If you are an AI agent, `AGENTS.md` is the entry point and this document is
the reference it points at.

---

## Adding content

**1. Write the file.** Lessons to `content/lessons/<domain>/<slug>.mdx`, modules to
`content/modules/`, roadmaps to `content/roadmaps/`. Copy the frontmatter shape from
`CONTENT_GUIDELINES.md` and the rules from that same document.

**2. Wire the reference.** Add the id to the module's `lessons` list, or the module ids to a
roadmap's stages. This is the only wiring a new piece of content needs.

**3. Validate.**

```bash
npm run content:check
```

**4. Check the warnings, all of them.** Warnings are not noise. A
`quality/numeric-claim` warning is a task; a `quality/no-practice` warning on a new lesson
means the exercise is missing.

**5. Commit.**

```bash
git add content/
git commit -m "content: add cleaning-a-spreadsheet lesson"
```

Content-only commits must not touch `src/`. That keeps content diffs small, pure, and
easy for a human to review — which matters more when the content was drafted by an agent.

## Adding a new content field

1. Add it to the schema in `src/content/schemas/`, **with a default** unless it is
   genuinely required. Optional with a default means existing content keeps validating.
2. Add the Zod type to `DATA_MODEL.md`.
3. If it is a new id reference, add it to the referential-integrity check in
   `src/content/validation.ts`. An unvalidated reference is the failure mode this whole
   architecture guards against.
4. Add a fixture and a test in `src/content/__tests__/validation.test.ts`.
5. Record the decision if it changes what authors must do.

## Adding a new learning event

1. Add it to the `ProgressEvent` union in `src/domain/progress/types.ts`.
2. Handle it in the single pass in `src/domain/reducer.ts`.
3. If it is derived state, add it to `DerivedProgress` and compute it there — never as a
   separately stored field.
4. Add selector functions in `src/domain/progress/selectors.ts`.
5. Tests: fold behaviour, idempotence, and the derived-equals-folded invariant (which runs
   automatically because `applyEvent` re-derives).

**Reminder:** every event needs an `id`, and it already has one via `EventBase`. Do not
override it.

## Adding a question type

At M4, when the quiz engine lands. A question type is:

1. One member added to the `Question` union, discriminated on `type`.
2. One renderer component in the quiz feature.
3. One scoring function in `src/domain/assessment/`.
4. Tests.

Existing questions keep working. That is the point of the discriminated union.

## Adding a lab evaluation strategy

At M6. One file in `src/domain/labs/evaluators/`, implementing the strategy interface, and
one entry in the strategy map. No existing lab changes.

## Starting work on a session

```bash
git status
git log --oneline -10
npm run check
```

Then read `project/CURRENT_STATE.md`, `project/CHECKPOINT.md`, `project/NEXT_STEPS.md`, and
the relevant parts of `project/DECISIONS.md`.

**If `npm run check` is red, fixing that is the first task**, whatever you were asked to
do.

## Finishing a session

1. `npm run check` — green, or an honest account of why not.
2. Update `project/CURRENT_STATE.md` — the state as it is now.
3. Update `project/CHECKPOINT.md` — what was tested, what remains, what to do next.
4. Update `project/NEXT_STEPS.md` — at most three concrete items.
5. `CHANGELOG.md` if the change is meaningful.
6. Commit. At a milestone boundary, add an annotated tag.

## Milestones

Milestone boundaries are the only place the project gets a tag, and tags are the only
reliable rollback points on a multi-year project.

```bash
git tag -a v0.1.0-foundation -m "M0 foundation"
```

Rollback:

```bash
git reset --hard v0.1.0-foundation~1   # before the tag exists
git revert -m 1 <sha>                  # after — preferred, history preserved
```

**Prefer revert over rewriting `main` history.** Destroying the record of a mistake on a
project meant to last years costs more than living with the mistake.

## Pull requests

Direct push to `main` for `docs:`, `content:`, and small `fix:` — CI is still required.

**A PR is required** for anything touching `src/app/`, `src/domain/`, `src/content/`,
`vite.config.ts`, dependencies, or the content schema. Those are the places where an agent
can cause structural damage, and a PR forces a self-review pass.

PR body: what changed, why, and **what you deliberately did not change**.

## Reviewing a change

1. Does it pass `npm run check`?
2. Does it add a dependency? If so, is there a `DECISIONS.md` entry?
3. Does it add curriculum strings to `src/`? That should fail the build; if it passed, the
   test is too weak.
4. Does it change an architectural boundary? That needs a decision, not a commit message.
5. Is the documentation updated? A change with no doc update is unfinished.
6. Are the tests testing the *failure* paths, or only the happy one?

## Adding a dependency

1. Check the budget: 20 runtime packages. Currently 1.
2. Write a `DECISIONS.md` entry: the problem, the alternatives considered, why this one,
   and what it costs.
3. Prefer the standard library, or writing 10 lines yourself. `cn` in `src/lib/cn.ts` is
   four lines and would otherwise be a dependency forever.
4. If it is build-time only, make sure it cannot leak into the client bundle.

## Deploying

Deployment arrives at M1. Before adding anything to a deploy workflow, confirm the
`/VA/` base path is intact — `check:paths` in CI is the guard, and a root-relative asset URL
in a subpath deployment produces a site that works on the homepage and 404s everywhere else.
