# Content Guidelines

How to write a lesson that is worth a learner's time, and the four rules that are not
negotiable.

The mechanical half of quality is automated. `npm run content:check` catches schema
violations, dangling references, guarantee language, uncited numbers, generic titles,
duplicate lessons and lessons with no practice. This document is the half that needs
judgement.

---

## Who this is written for

**Someone starting from zero.** Not someone optimising a career. Not someone who already
knows what a VA does. Assume no prior knowledge of the industry, no idea what a CRM is, and
possibly no professional English. Every unexplained term is a reason someone leaves.

If a sentence would make sense only to someone who already works in this field, rewrite it.

---

## The four non-negotiable rules

### 1. No professional advice

**No tax, legal, medical, or financial advice.** Ever.

Explain how a process works and what questions to ask, then point the reader to a qualified
professional. "Here is how a bookkeeping system is usually organised" is fine. "You can
deduct this expense" is not, even with a disclaimer, because disclaimers do not stop a
reader acting on confident-sounding advice.

This is simultaneously a safety rule and a hallucination control. Confident professional
guidance is exactly what a language model produces unprompted, and the platform's
credibility depends on not doing that.

### 2. Contested facts live in a shared topic

If two lessons might state something differently, it goes in `content/topics/` and is
referenced, not restated.

What counts as contested: rates and pricing, whether a niche is saturated, what a tool's
tier includes, which tasks fall inside a job title. These are the facts that go stale, and
two slightly different versions in two lessons is worse than one honest version plus an
"as of" date.

### 3. All example data is obviously synthetic

Use `example.com`, `client.invalid`, `Acme Co`, `Jordan Reyes`. These are the RFC 2606
reserved domains, which can never resolve to a real mailbox, so an example address can
never accidentally be a real contact.

API keys in examples must be visibly fake (`sk-test-XXXX-XXXX`). Screenshots must show
accounts containing no real data.

This matters because a learner may copy an example, replace it with a real client's details,
and paste that into a self-assessment field or a shared workspace.

### 4. Nothing is published unreviewed

`status: draft` is the default. `status: published` requires `reviewedBy` and `reviewedAt`,
and validation fails without them.

**The agent drafts. The human edits.** Every published lesson carries the name of a person
who checked it. That is the whole integrity model of the platform, and it is not
negotiable — not for speed, not for volume, not because a lesson "looks fine".

---

## Structure

### A lesson

```yaml
id: what-is-a-virtual-assistant # kebab-case, never renamed once published
title: What Is a Virtual Assistant? # says what it teaches
aliases: [VA, virtual assistants] # how learners actually search
summary: >- # one or two sentences, no jargon
  A plain-language explanation of what a virtual assistant does, who they work
  for, and the kinds of tasks that make up the job.
objectives: # REQUIRED, and behavioural
  - Describe what a virtual assistant does in your own words
  - Name the four broad categories of work most VAs are hired for
  - Explain the difference between working for a company, an agency, and a client
difficulty: beginner
estimatedMinutes: 8
prerequisites: [] # { id, reason } — the reason makes the warning useful
topics: []
skills: [communication]
status: draft
updatedAt: '2026-10-01'
```

**Objectives are the most important field.** Write them as things a learner _can do_, not
things they will know. "Understand spreadsheets" is not an objective. "Clean a spreadsheet
with duplicate and inconsistent rows" is.

A lesson whose single objective restates its title has no objective. Validation warns.

### The body

Prose with headings. Headings become the lesson's table of contents, so make them
meaningful rather than decorative.

**Open with why this matters**, not with a definition. A learner who does not yet know why
file naming matters will not retain the naming convention. Then the content. Then what to
do with it.

**Use concrete examples.** `Acme Co` sent an invoice on the 14th. Not "a client may send an
invoice".

**Say what goes wrong.** The most useful sentence in most lessons is the one that says what
a mistake looks like, because a beginner recognises mistakes before they recognise correct
work.

**Be honest about uncertainty.** If something varies by industry or client, say so. "Rates
vary widely by specialisation, client size and country" is more useful than a confident
number, and it is honest.

**Do not pad.** Eight hundred words that teach something beat fifteen hundred that repeat
it. `estimatedMinutes` should reflect what a careful reader needs, not a target.

### A module

An `outcome` in behavioural terms, and a `kind` for filtering. A module's job is to be
reusable across roadmaps, so write it for a learner who has not taken the modules before it
and is not certain they will take the ones after.

### A roadmap

Stages, in order, referencing modules that already exist. The `note` on a stage should say
why that stage is in _this_ roadmap.

---

## Voice

Plain, direct, and specific.

| Do                                            | Do not                                                |
| --------------------------------------------- | ----------------------------------------------------- |
| "Open the file menu"                          | "Navigate to the file system interface"               |
| "This is wrong because the client paid twice" | "This constitutes an error requiring correction"      |
| "Most people are surprised by this"           | "It is worth noting that many users are surprised"    |
| "Ask before you open it"                      | "It is recommended that one consider verifying first" |

Short sentences. Active voice. Second person for instructions. Concrete nouns.

Avoid: "delve", "leverage" (as a verb), "robust", "seamless", "game-changer", "in today's
fast-paced world", "it's important to note that". These are the tells of filler.

**Do not use enthusiasm to paper over uncertainty.** "This is a fantastic opportunity" tells
a learner nothing and raises expectations the industry will not meet.

---

## Numbers are the highest-risk thing you can write

A fabricated salary range is easy for an AI agent to produce and expensive for a learner's
finances. `content:check` flags any currency amount or percentage with no `resources[]`
citation.

**Every number needs one of three things:**

1. A citation in `resources[]`.
2. The words "varies", "typically", "roughly", or "estimates suggest", next to it.
3. Removal.

If a number genuinely matters and you cannot source it, say the thing a learner actually
needs instead: "rates vary widely; the way to find out what a role pays is to ask three
clients in that niche, or to search listings in your region."

The same applies to statistics about the industry, tool pricing, and platform fee
percentages. All of them change, and all of them are quoted confidently by models that have
no idea whether they are current.

---

## What a lesson is for

A learner should be able to answer six questions on any screen. `PLAN.md` section 78 lists
them: where am I, what am I learning, why does it matter, what do I do next, how do I know
whether I understood it, and how does this relate to actual VA work.

**"How do I know whether I understood it" is the one content most often fails to answer.**
Hence the rule that every lesson must reach practice: an exercise to do, a question to
answer, or a scenario to respond to. A lesson a learner only reads is a content page, and
`content:check` warns about every one.

---

## Review checklist

Before anything moves to `published`:

- [ ] Objectives are behavioural, and none of them restates the title
- [ ] Every term a beginner would not know is explained on first use
- [ ] Every number is cited, hedged, or removed
- [ ] Examples are synthetic and obviously so
- [ ] No professional advice of any kind
- [ ] Nothing is duplicated from another lesson — link or reference instead
- [ ] Nothing contradicts another lesson (check shared topics)
- [ ] The lesson reaches practice: an exercise, a question, or a scenario
- [ ] At least one realistic example with a named (fictional) client
- [ ] Something goes wrong, and the learner is told what it looks like
- [ ] `estimatedMinutes` is honest
- [ ] `difficulty` matches the actual reading, not the topic's reputation
- [ ] It does not promise an outcome, a job, or a salary
- [ ] `status: published`, `reviewedBy`, `reviewedAt` all set

---

## The honest limit

`content:check` can tell you a lesson contains "$45/hour" with no citation. **It cannot tell
you whether a cited figure is correct**, or whether a phishing example is subtly
unconvincing, or whether the ordering of two steps would confuse someone.

Every automated check sits _below_ the point where editorial judgement is required. That
boundary is permanent, and it is the strongest argument for the human-editor model: no
amount of validation converts an agent into an editor.
