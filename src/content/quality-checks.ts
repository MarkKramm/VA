import type { ContentRegistry } from './registry.ts'
import type { RegistryIssue } from './validation.ts'
import { LESSON_REACHES_PRACTICE } from './schemas/lesson.ts'
import type { Lesson } from './schemas/index.ts'

/**
 * Content quality checks.
 *
 * These are the mechanical half of content governance. The judgement half lives
 * in docs/CONTENT_GUIDELINES.md and cannot be automated — but several of the
 * failure modes below are *mechanical* and are exactly what an AI agent
 * generating content in parallel produces reliably, which makes them worth
 * catching here.
 *
 * All checks are warnings rather than errors by design. Each one needs a human
 * to look, and a build that blocks on a judgement call teaches authors to work
 * around the check.
 */

/** Language that `plan.md` §5.7 and §77 forbid. Encoded as code, not as advice. */
const GUARANTEE_PATTERNS: readonly { pattern: RegExp; message: string }[] = [
  {
    pattern: /\bguarantee[ds]?\b/i,
    message:
      'avoid guaranteeing an outcome; the platform prepares learners, it does not promise jobs',
  },
  {
    pattern: /\bwe will (?:get you|ensure you|help you) (?:hired|employed)\b/i,
    message: 'remove the hiring promise (plan.md §2, §77)',
  },
  {
    pattern: /\bearn \$?\d/i,
    message: 'state earnings as a range with a source, or not at all',
  },
  {
    pattern: /\bpassive income\b/i,
    message: 'this framing misrepresents the work; the platform teaches employment and freelancing',
  },
  {
    pattern: /\brisk[- ]free\b/i,
    message: 'freelancing carries real risk; describe it honestly',
  },
]

/**
 * A currency amount or a percentage with no citation is the highest-risk
 * hallucination class in this domain: fabricated rates are both the easiest
 * thing for a language model to produce and the most expensive for a learner's
 * finances. A warning, because some numbers are legitimately cited and some are
 * arithmetic rather than claims.
 */
const NUMERIC_CLAIM =
  /(?:[$€£]\s?\d[\d,.]*)|(?:\b\d+(?:\.\d+)?\s?%)|(?:\b\d+\s?(?:per|an)\s+hour\b)/i

const hasCitation = (lesson: Lesson): boolean => lesson.resources.length > 0

const titleOf = (lesson: Lesson): string => lesson.title.trim().toLowerCase()

const normalise = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Crude token overlap. Enough to catch near-duplicate generated lessons, not a semantic model. */
const overlap = (a: string, b: string): number => {
  const tokensA = new Set(
    normalise(a)
      .split(' ')
      .filter((t) => t.length > 3),
  )
  const tokensB = new Set(
    normalise(b)
      .split(' ')
      .filter((t) => t.length > 3),
  )
  if (tokensA.size === 0 || tokensB.size === 0) return 0
  let shared = 0
  for (const token of tokensA) if (tokensB.has(token)) shared += 1
  return shared / Math.min(tokensA.size, tokensB.size)
}

export function runQualityChecks(registry: ContentRegistry): RegistryIssue[] {
  const issues: RegistryIssue[] = []
  const lessons = [...registry.lessons.values()]
  const lessonPath = (id: string): string => `content/lessons/**/${id}.mdx`

  const push = (
    severity: 'warning' | 'info',
    rule: string,
    path: string,
    field: string,
    message: string,
  ): void => {
    issues.push({ severity, rule, entity: 'lesson', path, field, message })
  }

  for (const lesson of lessons) {
    const at = lessonPath(lesson.id)
    const body = `${lesson.summary}\n${lesson.objectives.join(' ')}`

    // 1. Forbidden guarantee language
    for (const { pattern, message } of GUARANTEE_PATTERNS) {
      if (pattern.test(body)) {
        push('warning', 'quality/language', at, 'summary', message)
      }
    }

    // 2. Numeric claims without a citation
    if (NUMERIC_CLAIM.test(body) && !hasCitation(lesson)) {
      push(
        'warning',
        'quality/numeric-claim',
        at,
        'summary',
        'contains a currency amount or percentage with no resource citation — verify it, or remove it',
      )
    }

    // 3. Generic titles. "Introduction" and "Overview" are not titles, they are
    //    placeholders, and they are what a content generator produces when it
    //    has not yet decided what the lesson is about.
    if (
      /^(introduction|overview|getting started|lesson \d+|untitled)$/i.test(lesson.title.trim())
    ) {
      push(
        'warning',
        'quality/generic-title',
        at,
        'title',
        'title is generic; say what the lesson teaches',
      )
    }

    // 4. A lesson with no practice is a reading page. This is the strongest
    //    structural guarantee that the platform teaches rather than hosts
    //    articles — see ARCHITECTURE.md.
    if (!LESSON_REACHES_PRACTICE(lesson)) {
      push(
        'warning',
        'quality/no-practice',
        at,
        'id',
        'lesson has no exercise, quiz or lab — every lesson must reach practice',
      )
    }

    // 5. Objectives that restate the title add nothing.
    if (
      lesson.objectives.length === 1 &&
      normalise(lesson.objectives[0] ?? '') === normalise(lesson.title)
    ) {
      push(
        'warning',
        'quality/objective-restates-title',
        at,
        'objectives',
        'the only objective restates the title',
      )
    }
  }

  // 6. Near-duplicate lessons. AI agents generating content in parallel reliably
  //    produce overlapping lessons; catching them here is far cheaper than
  //    unpicking them later.
  for (let i = 0; i < lessons.length; i += 1) {
    for (let j = i + 1; j < lessons.length; j += 1) {
      const a = lessons[i]
      const b = lessons[j]
      if (!a || !b) continue
      if (titleOf(a) === titleOf(b)) {
        push(
          'warning',
          'quality/duplicate',
          lessonPath(b.id),
          'title',
          `duplicate title with "${a.id}"`,
        )
        continue
      }
      if (normalise(a.summary) === normalise(b.summary)) {
        push(
          'warning',
          'quality/duplicate',
          lessonPath(b.id),
          'summary',
          `duplicate summary with "${a.id}"`,
        )
        continue
      }
      const sameModule = registry.lessonModuleIds
        .get(a.id)
        ?.some((m) => registry.lessonModuleIds.get(b.id)?.includes(m))
      if (sameModule && overlap(a.title, b.title) >= 0.7) {
        push(
          'warning',
          'quality/near-duplicate',
          lessonPath(b.id),
          'title',
          `title is very similar to "${a.id}" in the same module — merge them or sharpen the difference`,
        )
      }
    }
  }

  // 7. The stale-tool report — a tool whose `updatedAt` is newer than the
  //    `updatedAt` of the lessons that reference it — is not implemented yet,
  //    because it needs the tools collection, which arrives at M5. It is a
  //    derivation over the existing reverse indexes, so it is a few lines once
  //    that collection exists. See project/BACKLOG.md.

  return issues
}
