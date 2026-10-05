import type { ContentRegistry } from './registry.ts'
import { runQualityChecks } from './quality-checks.ts'
import type { Exercise, Lesson, Module, Question, Quiz, Roadmap } from './schemas/index.ts'

/**
 * Content validation.
 *
 * Everything here is a pure function over a registry, so it is fully testable
 * with fixture content and never needs a dev server. `scripts/validate-content.ts`
 * is a thin wrapper that prints the result and sets an exit code.
 *
 * The design rule: a reference that does not resolve is a BUILD error, not a
 * runtime surprise. A learner hitting a broken link is a trust-breaking bug; the
 * same reference found by CI is a five-second fix.
 */

export type Severity = 'error' | 'warning' | 'info'

export interface RegistryIssue {
  readonly severity: Severity
  /** The check that produced this, e.g. 'schema' | 'referential-integrity'. */
  readonly rule: string
  readonly entity: string
  /** Where it lives: a file path, or 'content/career-paths.ts[3]'. */
  readonly path: string
  /** Which field, e.g. 'stages[1].modules[0]'. */
  readonly field: string
  readonly message: string
}

const report = (
  issues: RegistryIssue[],
  severity: Severity,
  rule: string,
  entity: string,
  path: string,
  field: string,
  message: string,
): void => {
  issues.push({ severity, rule, entity, path, field, message })
}

const pathOf = {
  lesson: (lesson: Lesson): string => `content/lessons/**/${lesson.id}.mdx`,
  module: (module: Module): string => `content/modules/${module.id}.mdx`,
  roadmap: (roadmap: Roadmap): string => `content/roadmaps/${roadmap.id}.mdx`,
  exercise: (exercise: Exercise): string => `content/exercises/**/${exercise.id}.mdx`,
  /**
   * Questions and quizzes are one file per entity, so the path names the file to
   * open — the same contract as lessons and exercises.
   */
  question: (question: Question): string => `content/questions/**/${question.id}.mdx`,
  quiz: (quiz: Quiz): string => `content/quizzes/${quiz.id}.mdx`,
}

/**
 * Every id reference in the content must resolve.
 *
 * Collections that this milestone has not created yet (tools, resources, labs,
 * assessments, topics) are skipped rather than failed. That is deliberate: a
 * lesson may legitimately stage a `tools:` list before the tool directory exists
 * at M5, and the build should not block work in progress.
 *
 * A *known* collection is always checked, and questions and quizzes became known
 * at M4.1. So a `quiz.questionIds` reference is checked UNCONDITIONALLY: if the
 * question does not exist, that is an error, whether the question bank is empty
 * or missing. Fail-closed is the point — a reference that resolves to nothing
 * would render a quiz that silently asks fewer questions than its author wrote.
 *
 * A *known* collection is always checked, and exercises became known at M2.4. So
 * a `lesson.exercises` reference is checked UNCONDITIONALLY: if the exercise does
 * not exist, that is an error, whether the exercise directory is empty or
 * missing. Fail-closed is the point — a reference that resolves to nothing would
 * render an exercise-less Practice section and read as "the exercise was
 * dropped" rather than "the id is wrong".
 */
const checkReferentialIntegrity = (registry: ContentRegistry, issues: RegistryIssue[]): void => {
  const resolve = (collection: ReadonlyMap<string, unknown>, id: string): boolean =>
    collection.has(id)

  for (const lesson of registry.lessons.values()) {
    const at = pathOf.lesson(lesson)
    for (const skillId of lesson.skills) {
      if (!resolve(registry.skills, skillId)) {
        report(
          issues,
          'error',
          'referential-integrity',
          'lesson',
          at,
          'skills',
          `"${skillId}" does not exist`,
        )
      }
    }
    lesson.topics.forEach((topic, index) => {
      for (const skillId of topic.skills) {
        if (!resolve(registry.skills, skillId)) {
          report(
            issues,
            'error',
            'referential-integrity',
            'lesson',
            at,
            `topics[${index}].skills`,
            `"${skillId}" does not exist`,
          )
        }
      }
      if (topic.kind === 'shared' && !resolve(registry.lessons, topic.sharedRef ?? '')) {
        // A shared topic lives in content/topics/*.mdx, which arrives at M2. Until
        // then the reference cannot resolve and the check is skipped rather than
        // failed, for the same reason as the pending collections above.
      }
    })
    lesson.prerequisites.forEach((prerequisite, index) => {
      if (!resolve(registry.lessons, prerequisite.id)) {
        report(
          issues,
          'error',
          'referential-integrity',
          'lesson',
          at,
          `prerequisites[${index}].id`,
          `"${prerequisite.id}" does not exist`,
        )
      }
    })
    lesson.related.forEach((relatedId, index) => {
      if (!resolve(registry.lessons, relatedId)) {
        report(
          issues,
          'error',
          'referential-integrity',
          'lesson',
          at,
          `related[${index}]`,
          `"${relatedId}" does not exist`,
        )
      }
    })
    /*
     * The lesson OWNS the exercise reference, so this is the check that makes
     * "every lesson reaches practice" real: a lesson that names an exercise that
     * does not exist fails the build rather than silently rendering nothing.
     * Unconditional, because exercises are a registered collection from M2.4.
     */
    lesson.exercises.forEach((exerciseId, index) => {
      if (!resolve(registry.exercises, exerciseId)) {
        report(
          issues,
          'error',
          'referential-integrity',
          'lesson',
          at,
          `exercises[${index}]`,
          `"${exerciseId}" does not exist`,
        )
      }
    })
    /*
     * The lesson's quiz (M4.2). `lesson.quiz` existed from M0 but was skipped as a
     * pending collection; quizzes are registered now, so a lesson naming a quiz
     * that does not exist is an error rather than a link that silently renders
     * nothing. This is what makes the "Take the quiz" link on a lesson page
     * trustworthy: the link exists because the quiz does.
     */
    if (lesson.quiz !== undefined && !resolve(registry.quizzes, lesson.quiz)) {
      report(
        issues,
        'error',
        'referential-integrity',
        'lesson',
        at,
        'quiz',
        `"${lesson.quiz}" does not exist`,
      )
    }
  }

  for (const exercise of registry.exercises.values()) {
    const at = pathOf.exercise(exercise)
    for (const skillId of exercise.skills) {
      if (!resolve(registry.skills, skillId)) {
        report(
          issues,
          'error',
          'referential-integrity',
          'exercise',
          at,
          'skills',
          `"${skillId}" does not exist`,
        )
      }
    }
  }

  /*
   * A question's skill references (M4.1). Checked unconditionally, like every
   * other `skills` list — the skill collection is registered, so a reference that
   * does not resolve is an error rather than work in progress.
   */
  for (const question of registry.questions.values()) {
    const at = pathOf.question(question)
    for (const skillId of question.skills) {
      if (!resolve(registry.skills, skillId)) {
        report(
          issues,
          'error',
          'referential-integrity',
          'question',
          at,
          'skills',
          `"${skillId}" does not exist`,
        )
      }
    }
  }

  /*
   * THE quiz -> question reference (M4.1), and the reason questions and quizzes
   * are registered collections rather than pending ones.
   *
   * A quiz that names a question which does not exist is a BUILD error, exactly
   * as a lesson that names a missing exercise is. The alternative is a quiz that
   * silently asks fewer questions than its author wrote — which, once scoring
   * exists, is a score out of the wrong total. Fail-closed is the point.
   */
  for (const quiz of registry.quizzes.values()) {
    const at = pathOf.quiz(quiz)
    quiz.questionIds.forEach((questionId, index) => {
      if (!resolve(registry.questions, questionId)) {
        report(
          issues,
          'error',
          'referential-integrity',
          'quiz',
          at,
          `questionIds[${index}]`,
          `"${questionId}" does not exist`,
        )
      }
    })
  }

  for (const module of registry.modules.values()) {
    const at = pathOf.module(module)
    module.lessons.forEach((lessonId, index) => {
      if (!resolve(registry.lessons, lessonId)) {
        report(
          issues,
          'error',
          'referential-integrity',
          'module',
          at,
          `lessons[${index}]`,
          `"${lessonId}" does not exist`,
        )
      }
    })
    for (const skillId of module.skills) {
      if (!resolve(registry.skills, skillId)) {
        report(
          issues,
          'error',
          'referential-integrity',
          'module',
          at,
          'skills',
          `"${skillId}" does not exist`,
        )
      }
    }
  }

  for (const roadmap of registry.roadmaps.values()) {
    const at = pathOf.roadmap(roadmap)
    if (!resolve(registry.careerPaths, roadmap.careerPath)) {
      report(
        issues,
        'error',
        'referential-integrity',
        'roadmap',
        at,
        'careerPath',
        `"${roadmap.careerPath}" does not exist`,
      )
    }
    roadmap.stages.forEach((stage, stageIndex) => {
      stage.modules.forEach((moduleId, moduleIndex) => {
        if (!resolve(registry.modules, moduleId)) {
          report(
            issues,
            'error',
            'referential-integrity',
            'roadmap',
            at,
            `stages[${stageIndex}].modules[${moduleIndex}]`,
            `"${moduleId}" does not exist`,
          )
        }
      })
    })
  }

  for (const skill of registry.skills.values()) {
    if (skill.parent && !resolve(registry.skills, skill.parent)) {
      report(
        issues,
        'error',
        'referential-integrity',
        'skill',
        'content/skills/skill-tree.ts',
        'parent',
        `"${skill.parent}" does not exist`,
      )
    }
  }

  for (const careerPath of registry.careerPaths.values()) {
    if (careerPath.parent && !resolve(registry.careerPaths, careerPath.parent)) {
      report(
        issues,
        'error',
        'referential-integrity',
        'career-path',
        'content/career-paths.ts',
        'parent',
        `"${careerPath.parent}" does not exist`,
      )
    }
  }
}

/**
 * No duplicate ids. A duplicate silently makes one entity unreachable: the
 * second file's content is dropped by `indexById`, and no other check notices.
 *
 * This reads `registry.parsed` — the validated entities BEFORE id indexing —
 * rather than the Maps. The Maps are built with `new Map(items.map(i => [i.id, i]))`,
 * which keeps only the last entry for a repeated id, so a check reading them
 * is structurally incapable of observing a duplicate. That made the original
 * version of this function unreachable, and the regression test in
 * `duplicate-ids.test.ts` exists to keep it that way.
 *
 * Ids only need to be unique WITHIN an entity type: a skill and a module may
 * legitimately share an id, so the key is scoped by entity.
 */
const checkDuplicateIds = (registry: ContentRegistry, issues: RegistryIssue[]): void => {
  const collections = [
    { entity: 'lesson', entries: registry.parsed.lessons },
    { entity: 'module', entries: registry.parsed.modules },
    { entity: 'exercise', entries: registry.parsed.exercises },
    { entity: 'question', entries: registry.parsed.questions },
    { entity: 'quiz', entries: registry.parsed.quizzes },
    { entity: 'roadmap', entries: registry.parsed.roadmaps },
    { entity: 'skill', entries: registry.parsed.skills },
    { entity: 'career-path', entries: registry.parsed.careerPaths },
  ] as const

  for (const { entity, entries } of collections) {
    const firstSeenAt = new Map<string, string>()
    for (const { value, path } of entries) {
      const previous = firstSeenAt.get(value.id)
      if (previous !== undefined) {
        // Report the second occurrence: the file a human needs to open is the
        // duplicate, not the original.
        report(
          issues,
          'error',
          'duplicate-id',
          entity,
          path,
          'id',
          `duplicate id "${value.id}" (already defined in ${previous})`,
        )
        continue
      }
      firstSeenAt.set(value.id, path)
    }
  }
}

/** Depth-first cycle detection over a parent-pointer graph. */
const findCycle = (
  startId: string,
  parentOf: (id: string) => string | undefined,
): string[] | undefined => {
  const trail: string[] = []
  const onTrail = new Set<string>()
  let current: string | undefined = startId
  while (current !== undefined) {
    if (onTrail.has(current)) return [...trail, current]
    onTrail.add(current)
    trail.push(current)
    current = parentOf(current)
  }
  return undefined
}

const checkCycles = (registry: ContentRegistry, issues: RegistryIssue[]): void => {
  for (const [entity, nodes, parentOf, location] of [
    [
      'skill',
      [...registry.skills.keys()],
      (id: string) => registry.skills.get(id)?.parent,
      'content/skills/skill-tree.ts',
    ],
    [
      'career-path',
      [...registry.careerPaths.keys()],
      (id: string) => registry.careerPaths.get(id)?.parent,
      'content/career-paths.ts',
    ],
  ] as const) {
    for (const id of nodes) {
      const cycle = findCycle(id, parentOf)
      if (cycle) {
        report(
          issues,
          'error',
          'cycle',
          entity,
          location,
          'parent',
          `cycle detected: ${cycle.join(' → ')}`,
        )
        break
      }
    }
  }

  // Lesson prerequisites are a different graph shape. A lesson can have SEVERAL
  // prerequisites, so following "the first one" is not enough — that misses any
  // cycle that does not pass through a node's first prerequisite. This needs a
  // real depth-first search over an adjacency map. A cycle here would make the
  // soft-gating advisory loop forever and the "what next" ranking meaningless.
  const dependencies = new Map<string, string[]>()
  for (const lesson of registry.lessons.values()) {
    dependencies.set(
      lesson.id,
      lesson.prerequisites.map((prerequisite) => prerequisite.id).filter((id) => id !== lesson.id),
    )
  }
  for (const cycle of findCycles(dependencies)) {
    report(
      issues,
      'error',
      'cycle',
      'lesson',
      `content/lessons/**/${cycle[0]}.mdx`,
      'prerequisites',
      `cycle detected: ${cycle.join(' → ')}`,
    )
  }
}

/**
 * Find every distinct cycle in a directed graph.
 *
 * Iterative rather than recursive, so a long dependency chain cannot overflow
 * the call stack. Each cycle is returned as a node list with the entry node
 * repeated at the end: `['a', 'b', 'a']`. Two entry points into the same cycle
 * find it twice; it is reported once.
 */
const findCycles = (edges: ReadonlyMap<string, readonly string[]>): string[][] => {
  const WHITE = 0
  const GREY = 1
  const BLACK = 2
  const colour = new Map<string, number>()
  for (const node of edges.keys()) colour.set(node, WHITE)

  const cycles: string[][] = []
  const seen = new Set<string>()

  for (const start of edges.keys()) {
    if (colour.get(start) !== WHITE) continue
    const path: string[] = []
    const stack: { node: string; index: number }[] = [{ node: start, index: 0 }]

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      if (!frame) break
      const { node } = frame
      const neighbours = edges.get(node) ?? []

      if (frame.index === 0) {
        colour.set(node, GREY)
        path.push(node)
      }

      if (frame.index < neighbours.length) {
        const next = neighbours[frame.index]
        frame.index += 1
        if (next === undefined) continue
        const nextColour = colour.get(next) ?? WHITE
        if (nextColour === GREY) {
          const startIndex = path.indexOf(next)
          const cycle = [...path.slice(startIndex), next]
          const key = cycle.slice(0, -1).sort().join('|')
          if (!seen.has(key)) {
            seen.add(key)
            cycles.push(cycle)
          }
        } else if (nextColour === WHITE) {
          stack.push({ node: next, index: 0 })
        }
        continue
      }

      colour.set(node, BLACK)
      path.pop()
      stack.pop()
    }
  }

  return cycles
}

/**
 * Orphans are warnings, not errors.
 *
 * Work in progress is normal — a lesson is written before the module that
 * contains it. Failing the build on that would make the content pipeline hostile
 * to incremental writing, and a warning in `content:check` is enough to stop
 * anything from quietly rotting.
 */
const checkOrphans = (registry: ContentRegistry, issues: RegistryIssue[]): void => {
  for (const lesson of registry.lessons.values()) {
    if (!(registry.lessonModuleIds.get(lesson.id)?.length ?? 0)) {
      report(
        issues,
        'warning',
        'orphan',
        'lesson',
        pathOf.lesson(lesson),
        'id',
        `"${lesson.id}" is not part of any module`,
      )
    }
  }
  for (const module of registry.modules.values()) {
    if (!(registry.moduleRoadmapIds.get(module.id)?.length ?? 0)) {
      report(
        issues,
        'warning',
        'orphan',
        'module',
        pathOf.module(module),
        'id',
        `"${module.id}" is not part of any roadmap`,
      )
    }
  }
  for (const roadmap of registry.roadmaps.values()) {
    if (!registry.careerPaths.has(roadmap.careerPath)) {
      report(
        issues,
        'warning',
        'orphan',
        'roadmap',
        pathOf.roadmap(roadmap),
        'careerPath',
        'roadmap has no valid career path',
      )
    }
  }
}

/** `published` is a claim that a human signed off. Make it verifiable. */
const checkProvenance = (registry: ContentRegistry, issues: RegistryIssue[]): void => {
  const entries = [
    ...[...registry.lessons.values()].map((entity) => ({
      entity: 'lesson',
      path: pathOf.lesson(entity),
      value: entity,
    })),
    ...[...registry.modules.values()].map((entity) => ({
      entity: 'module',
      path: pathOf.module(entity),
      value: entity,
    })),
    ...[...registry.exercises.values()].map((entity) => ({
      entity: 'exercise',
      path: pathOf.exercise(entity),
      value: entity,
    })),
    ...[...registry.questions.values()].map((entity) => ({
      entity: 'question',
      path: pathOf.question(entity),
      value: entity,
    })),
    ...[...registry.quizzes.values()].map((entity) => ({
      entity: 'quiz',
      path: pathOf.quiz(entity),
      value: entity,
    })),
    ...[...registry.roadmaps.values()].map((entity) => ({
      entity: 'roadmap',
      path: pathOf.roadmap(entity),
      value: entity,
    })),
  ]
  for (const { entity, path, value } of entries) {
    if (value.status === 'published' && (!value.reviewedBy || !value.reviewedAt)) {
      report(
        issues,
        'error',
        'provenance',
        entity,
        path,
        'status',
        'status is "published" but reviewedBy / reviewedAt are missing — nothing should reach a public site unreviewed',
      )
    }
  }
}

export interface ValidationSummary {
  readonly issues: readonly RegistryIssue[]
  readonly errors: number
  readonly warnings: number
  readonly counts: {
    readonly careerPaths: number
    readonly skills: number
    readonly roadmaps: number
    readonly modules: number
    readonly lessons: number
    readonly exercises: number
    readonly questions: number
    readonly quizzes: number
  }
  readonly payloadBytes: number
}

export function validateRegistry(registry: ContentRegistry): ValidationSummary {
  const issues: RegistryIssue[] = [...registry.issues]

  checkDuplicateIds(registry, issues)
  checkReferentialIntegrity(registry, issues)
  checkCycles(registry, issues)
  checkOrphans(registry, issues)
  checkProvenance(registry, issues)
  issues.push(...runQualityChecks(registry))

  return {
    issues,
    errors: issues.filter((issue) => issue.severity === 'error').length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
    counts: {
      careerPaths: registry.careerPaths.size,
      skills: registry.skills.size,
      roadmaps: registry.roadmaps.size,
      modules: registry.modules.size,
      lessons: registry.lessons.size,
      exercises: registry.exercises.size,
      questions: registry.questions.size,
      quizzes: registry.quizzes.size,
    },
    payloadBytes: registry.payloadBytes,
  }
}
