import type { ContentRegistry } from './registry.ts'
import { runQualityChecks } from './quality-checks.ts'
import type { Lesson, Module, Roadmap } from './schemas/index.ts'

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
}

/**
 * Every id reference in the content must resolve.
 *
 * Collections that this milestone has not created yet (tools, resources,
 * exercises, quizzes, labs, assessments, topics, questions) are skipped rather
 * than failed. That is deliberate: a lesson may legitimately stage a `tools:`
 * list before the tool directory exists at M5, and the build should not block
 * work in progress. A *known* collection is always checked.
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

/** No duplicate ids. A duplicate silently makes one entity unreachable. */
const checkDuplicateIds = (registry: ContentRegistry, issues: RegistryIssue[]): void => {
  const seen = new Set<string>()
  for (const file of [
    ...[...registry.lessons.values()].map((l) => ({
      entity: 'lesson',
      path: pathOf.lesson(l),
      id: l.id,
    })),
    ...[...registry.modules.values()].map((m) => ({
      entity: 'module',
      path: pathOf.module(m),
      id: m.id,
    })),
    ...[...registry.roadmaps.values()].map((r) => ({
      entity: 'roadmap',
      path: pathOf.roadmap(r),
      id: r.id,
    })),
    ...[...registry.skills.values()].map((s) => ({
      entity: 'skill',
      path: 'content/skills/skill-tree.ts',
      id: s.id,
    })),
    ...[...registry.careerPaths.values()].map((c) => ({
      entity: 'career-path',
      path: 'content/career-paths.ts',
      id: c.id,
    })),
  ]) {
    const key = `${file.entity}:${file.id}`
    if (seen.has(key)) {
      report(
        issues,
        'error',
        'duplicate-id',
        file.entity,
        file.path,
        'id',
        `duplicate id "${file.id}"`,
      )
    }
    seen.add(key)
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
    },
    payloadBytes: registry.payloadBytes,
  }
}
