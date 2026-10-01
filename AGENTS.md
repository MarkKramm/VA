# AGENTS.md

**If you are an AI coding agent: read this file first, in full, before touching
anything.** It is short on purpose.

This is a learning platform that teaches people to work as Virtual Assistants. The
curriculum is content, and the architecture exists to make it possible to write hundreds
of lessons and dozens of career roadmaps without the codebase collapsing under its own
weight. Most of the rules below exist to protect that.

---

## 1. The reading order

Do these in order. Do not skip to the code.

1. **`AGENTS.md`** — this file. You are here.
2. **`PLAN.md`** — the long-term constitution. Read sections 1–6 (vision and principles),
   then 60 (technology principles), 73 (anti-overengineering), 74 (anti-simplification)
   and 84 (the master implementation rule). You do not need the other 75 sections.
3. **`project/CURRENT_STATE.md`** — what exists and works right now.
4. **`project/CHECKPOINT.md`** — the last verified stable state, and what was tested.
5. **`project/NEXT_STEPS.md`** — the actual task list. It holds at most three items.
6. **`docs/ARCHITECTURE.md`** — how the system is built.
7. **`docs/CONTENT_ARCHITECTURE.md`** — only if you are writing or changing content.
8. **`project/DECISIONS.md`** — the sections relevant to your task. These are settled.
   Do not undo them.
9. **The code itself**, before changing it.

`project/CURRENT_STATE.md`, `CHECKPOINT.md` and `NEXT_STEPS.md` together tell you where
the project is without needing any conversation history. That is the point of them.

## 2. The state of the project

**Milestone 0 (Foundation) is complete. Milestone 1 (Application Shell) is next.**

There is no user interface. No React components, no router, no CSS. If you find
yourself wanting to build a component, you are working on the wrong milestone.

Verify your starting point before doing anything else:

```bash
git status
npm run check        # must be green before you change anything
```

If `npm run check` is red, that is your first task, regardless of what you were asked
to do.

## 3. Twelve hard rules

**1. Never assume the repository is empty.**
Run `git status` and read the orientation files first. This is an established project.

**2. Never rebuild what works.**
If it compiles, tests pass, and `CHECKPOINT.md` says it is stable, extend it. A
refactor must be its own commit with a stated reason in the message or `DECISIONS.md`.

**3. Never add a dependency without a `DECISIONS.md` entry.**
The entry states the problem, the alternative you considered, and why this one wins. The
runtime budget is 20 packages. Every dependency is a permanent maintenance and
confusion cost.

**4. Never hard-code content into `src/`.**
If a lesson, module, roadmap, skill, tool or resource name appears as a string literal
in application code, that is a bug. Content lives in `content/` and is read through
`src/content/`. This is enforced by ESLint and by `npm run test:arch`.

**5. Never duplicate content.**
One fact, one home. Reference by id. Do not copy a tool description into a lesson. Do
not add a lesson to a module if another module already contains it. Do not hand-write a
list that the registry can derive.

**6. Never widen the task.**
Implement the item in `NEXT_STEPS.md` or what was explicitly asked. If you notice
adjacent work, write it in `project/BACKLOG.md` and leave it. Scope creep is the most
common way good work in this project becomes unreviewable.

**7. Never silently change a requirement.**
If a request conflicts with `PLAN.md` or `DECISIONS.md`, say so and ask before
implementing a destructive solution.

**8. Make the smallest correct change.**
Prefer editing an existing file to restructuring a folder. Prefer adding a function over
refactoring something unrelated. If the change touches more than three files, pause and
confirm it is really the smallest change.

**9. Verify before claiming completion.**
`npm run check` must pass. "It should work" is not a result.

**10. Update the four documents and commit before you finish.**
`project/CURRENT_STATE.md`, `project/NEXT_STEPS.md`, `project/CHECKPOINT.md`, and
`CHANGELOG.md` if the change is meaningful. If those are not updated, the session is
not finished — the next agent will have no idea what happened.

**11. Match the existing conventions.**
When unsure, read a neighbouring file first. Naming, comment style, file size, test
structure. Consistency is worth more than your preference.

**12. Keep files small.**
Roughly 250 lines for a component, 400 for a module. If a file wants to be bigger, it
probably wants to be two files.

## 4. Content rules that are not negotiable

These are judgement, not mechanics, which is why they are written down here. Full detail
in `docs/CONTENT_GUIDELINES.md`.

**Do not publish unreviewed content.** `status: draft` is the default and M0 content is
draft. `status: published` requires `reviewedBy` and `reviewedAt`, and validation
enforces it. **The agent drafts; the human edits.** Nothing reaches `published` without
a named human having signed it off.

**Never write tax, legal, medical or financial advice.** Explain how a process works and
what questions to ask, then point the learner to a qualified professional. This is both a
safety rule and a hallucination control — confident-sounding professional advice is
exactly what a language model produces unprompted.

**Contested facts go in a shared topic, not in a lesson.** If two lessons might state
something differently — a rate, whether a niche is saturated, what a pricing tier
includes — it is written once in `content/topics/` and referenced. See
`docs/CONTENT_ARCHITECTURE.md`.

**All example data is obviously synthetic.** Use `example.com`, `client.invalid`
(RFC 2606 reserved domains, which can never resolve), and names like `Acme Co`. API keys
in examples must be visibly fake. A learner may be tempted to paste real client data
into a self-assessment field, and the example must never look like a real contact.

**Avoid unverified numbers.** A currency amount or percentage with no citation is the
highest-risk thing an AI agent can put in a lesson, because a fabricated rate is both
easy to produce and expensive for a learner's finances. `npm run content:check` flags
these as warnings; treat every one as a task, not noise.

**Every lesson must reach practice.** A lesson with no exercise, quiz or lab is a
reading page, and `content:check` warns about it. (M0 lessons are all warnings — the
exercise system arrives at M2. That is expected, not a bug.)

## 5. Session protocol

**Starting:**

1. `git status` and `git log --oneline -10`
2. Read the orientation files listed in section 1
3. Inspect the code your task actually touches
4. Restate the task in a sentence or two, and say what you will **not** touch

**Working:**

5. Make the smallest correct change
6. Add or update tests alongside it
7. Run `npm run check`. Fix and re-run.
8. If the task turns out bigger than expected: stop, note it in `BACKLOG.md`, complete a
   coherent subset, and update `NEXT_STEPS.md` accurately. **Partial completion with
   honest documentation beats silent scope creep.**

**Finishing:**

9. Update `project/CURRENT_STATE.md` — the state as it now is, not as it was
10. Update `project/CHECKPOINT.md` — what was tested, what remains
11. Update `project/NEXT_STEPS.md` — at most three concrete items
12. `CHANGELOG.md` if the change is meaningful
13. Commit with a Conventional Commits message
14. At a milestone boundary, add an annotated tag

## 6. Commit messages

```
feat(content): add data cleaning lesson
feat(progress): add stage progress selector
fix(registry): de-duplicate reverse indexes
docs: record the Question entity decision
refactor(content): extract schema primitives
chore: bump vitest
```

One logical change per commit. Unrelated changes get split. Content-only changes use
`content:` and must not touch `src/`, which keeps content diffs small and pure.

## 7. Things that look like they need building and do not

The project has already made these decisions deliberately. Changing one is a decision,
not a fix.

- **Do not add a backend, database, or authentication** before M6, and probably not
  ever. Progress lives in `localStorage` behind a `StorageAdapter` port, so a backend is
  a swap rather than a rewrite.
- **Do not add a CMS.** Content is files in the repository. That is the feature.
- **Do not convert a roadmap `lane` into a track list.** `lane: employment | freelance |
  both` is a field, and the reason is written down in `DECISIONS.md`. Revisit only if a
  learner needs a *different module selection* within one roadmap — not a different
  emphasis, and not more or less content.
- **Do not add XP, levels, achievements or streaks before M8.** Mastery already means
  something honest; a points system on top of it would not.
- **Do not add a module prerequisite graph.** Lesson prerequisites and roadmap stage
  order cover every real use case. A weighted graph is the classic over-engineering move.
- **Do not remove the Voice VA roadmap.** Voice *practice* is deferred past M9; the
  *career path* is first-class. See `DECISIONS.md`.
- **Do not add file upload.** There is no backend, so there is nowhere to put a file and
  no reason to accept one.

## 8. When you are stuck

If something genuinely blocks you and the documents do not resolve it: **stop and ask.**
Do not invent a requirement, and do not change the architecture to get unstuck. A wrong
guess baked into the architecture is far more expensive than a question.

Two places where guessing has already been caught, and where the reasoning is worth
reading before you touch them:

- `project/DECISIONS.md` — every architectural choice, with the alternative rejected.
- `docs/ARCHITECTURE.md` — what is deliberately absent, and why.
