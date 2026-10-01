import { contentPayloadBytes, rawContent } from '@content/index.ts'
import { type z } from 'zod'
import { CareerPathSchema, type CareerPath } from './schemas/career-path.ts'
import { SkillSchema, type Skill } from './schemas/skill.ts'
import { ModuleSchema, type Module } from './schemas/module.ts'
import { LessonSchema, type Lesson } from './schemas/lesson.ts'
import { RoadmapSchema, type Roadmap } from './schemas/roadmap.ts'
import type { RegistryIssue } from './validation.ts'

/**
 * The registry: the only read path to the curriculum.
 *
 * It loads content, validates it, and derives every reverse index the
 * application needs. Nothing hand-maintains "which roadmaps include this module"
 * — the registry computes it by scanning roadmaps, which is what lets 21
 * roadmaps share ~34 modules without becoming a copy-paste farm.
 *
 * At M0 this is a plain function rather than an app-level singleton, so tests
 * can build a registry from fixture content. It becomes a singleton at runtime
 * because the content is compiled into the bundle.
 */

export interface ContentRegistry {
  readonly careerPaths: ReadonlyMap<string, CareerPath>
  readonly skills: ReadonlyMap<string, Skill>
  readonly modules: ReadonlyMap<string, Module>
  readonly lessons: ReadonlyMap<string, Lesson>
  readonly roadmaps: ReadonlyMap<string, Roadmap>
  /** roadmapId -> moduleId, in stage order. The roadmap's spine, resolved. */
  readonly roadmapModuleIds: ReadonlyMap<string, readonly string[]>
  /** moduleId -> roadmapId. Derived, never authored. */
  readonly moduleRoadmapIds: ReadonlyMap<string, readonly string[]>
  /** lessonId -> moduleId. */
  readonly lessonModuleIds: ReadonlyMap<string, readonly string[]>
  /** skillId -> lessonId. */
  readonly skillLessonIds: ReadonlyMap<string, readonly string[]>
  /** skillId -> moduleId. */
  readonly skillModuleIds: ReadonlyMap<string, readonly string[]>
  /** lessonId -> careerPathId, via the owning modules' roadmaps. */
  readonly lessonCareerPathIds: ReadonlyMap<string, readonly string[]>
  /** Entity types this milestone has not created a collection for yet. */
  readonly pendingCollections: readonly string[]
  readonly issues: readonly RegistryIssue[]
  readonly payloadBytes: number
}

/**
 * The minimum a content file must provide. Narrower than RawContentFile on
 * purpose: the registry never needs the body, and tests should not have to
 * fabricate one.
 */
export interface ContentFile {
  readonly path: string
  readonly data: unknown
}

/** Anything the registry can be built from. Production passes the real content. */
export interface ContentSource {
  readonly roadmaps: readonly ContentFile[]
  readonly modules: readonly ContentFile[]
  readonly lessons: readonly ContentFile[]
  readonly careerPaths: readonly unknown[]
  readonly skills: readonly unknown[]
}

/**
 * Appends a value only if it is not already present.
 *
 * A reverse index is a set, not a tally. A module referenced by two stages of
 * the same roadmap must yield that roadmap once, not twice — otherwise
 * "which roadmaps use this module" reports a roadmap as being used twice, and
 * every consumer has to remember to de-duplicate.
 */
const push = (map: Map<string, string[]>, key: string, value: string): void => {
  const existing = map.get(key)
  if (existing) {
    if (!existing.includes(value)) existing.push(value)
  } else map.set(key, [value])
}

const indexById = <T extends { id: string }>(items: readonly T[]): Map<string, T> =>
  new Map(items.map((item) => [item.id, item]))

/**
 * Normalises any input into a `{ location, data }` pair, so the parse step never
 * has to know whether it was handed a bare data object (career paths, skills)
 * or a file wrapper (modules, lessons, roadmaps).
 *
 * Getting this wrong is subtle and loud: validating the wrapper instead of its
 * contents makes every .mdx file fail with "expected string, received
 * undefined", which looks like a frontmatter problem and is not one.
 */
const asEntry = (input: unknown, fallbackLocation: () => string) => {
  if (typeof input === 'object' && input !== null && 'data' in input) {
    const wrapper = input as ContentFile
    return { location: wrapper.path, data: wrapper.data as unknown }
  }
  return { location: fallbackLocation(), data: input }
}

/**
 * Entities that fail validation are dropped rather than kept with partial data.
 * A registry holding a half-valid lesson is worse than one missing it, because
 * every consumer then has to handle the broken case. The failure is reported
 * loudly by `content:check` instead.
 */
const parseAll = <T>(args: {
  schema: z.ZodType<T>
  inputs: readonly unknown[]
  entity: string
  locationOf: () => string
  issues: RegistryIssue[]
}): T[] => {
  const out: T[] = []
  args.inputs.forEach((input) => {
    const { location, data } = asEntry(input, args.locationOf)
    const result = args.schema.safeParse(data)
    if (result.success) {
      out.push(result.data)
      return
    }
    for (const issue of result.error.issues) {
      args.issues.push({
        severity: 'error',
        rule: 'schema',
        entity: args.entity,
        path: location,
        field: issue.path.map(String).join('.') || '(root)',
        message: issue.message,
      })
    }
  })
  return out
}

/**
 * Build a registry from an arbitrary content source.
 *
 * Exported so tests can construct a registry from fixture content — including
 * deliberately broken content, which is the only practical way to test the
 * failure paths that matter. Production calls `buildRegistry()`.
 */
export function buildRegistryFromSource(source: ContentSource): ContentRegistry {
  const issues: RegistryIssue[] = []

  const careerPaths = parseAll<CareerPath>({
    schema: CareerPathSchema,
    inputs: source.careerPaths,
    entity: 'career-path',
    locationOf: () => 'content/career-paths.ts',
    issues,
  })
  const skills = parseAll<Skill>({
    schema: SkillSchema,
    inputs: source.skills,
    entity: 'skill',
    locationOf: () => 'content/skills/skill-tree.ts',
    issues,
  })
  const modules = parseAll<Module>({
    schema: ModuleSchema,
    inputs: source.modules,
    entity: 'module',
    // A file wrapper always supplies the real path, so this is only reached for
    // inline data, which does not happen in production content.
    locationOf: () => 'content/modules/',
    issues,
  })
  const lessons = parseAll<Lesson>({
    schema: LessonSchema,
    inputs: source.lessons,
    entity: 'lesson',
    locationOf: () => 'content/lessons/',
    issues,
  })
  const roadmaps = parseAll<Roadmap>({
    schema: RoadmapSchema,
    inputs: source.roadmaps,
    entity: 'roadmap',
    locationOf: () => 'content/roadmaps/',
    issues,
  })

  // --- derived indexes ----------------------------------------------------
  // Every one of these is computed, never authored. This is what keeps adding a
  // lesson to a second roadmap a one-line change in one file.

  const roadmapModuleIds = new Map<string, string[]>(
    roadmaps.map((roadmap) => [roadmap.id, roadmap.stages.flatMap((stage) => stage.modules)]),
  )

  const moduleRoadmapIds = new Map<string, string[]>()
  for (const [roadmapId, moduleIds] of roadmapModuleIds) {
    for (const moduleId of moduleIds) push(moduleRoadmapIds, moduleId, roadmapId)
  }

  const lessonModuleIds = new Map<string, string[]>()
  const skillLessonIds = new Map<string, string[]>()
  const skillModuleIds = new Map<string, string[]>()
  for (const module of modules) {
    for (const lessonId of module.lessons) push(lessonModuleIds, lessonId, module.id)
    for (const skillId of module.skills) push(skillModuleIds, skillId, module.id)
  }
  for (const lesson of lessons) {
    for (const skillId of lesson.skills) push(skillLessonIds, skillId, lesson.id)
    for (const topic of lesson.topics) {
      for (const skillId of topic.skills) push(skillLessonIds, skillId, lesson.id)
    }
  }

  const moduleCareerPathIds = new Map<string, string[]>()
  for (const roadmap of roadmaps) {
    for (const moduleId of roadmapModuleIds.get(roadmap.id) ?? []) {
      push(moduleCareerPathIds, moduleId, roadmap.careerPath)
    }
  }
  const lessonCareerPathIds = new Map<string, string[]>()
  for (const [lessonId, owningModuleIds] of lessonModuleIds) {
    for (const moduleId of owningModuleIds) {
      for (const careerPathId of moduleCareerPathIds.get(moduleId) ?? []) {
        push(lessonCareerPathIds, lessonId, careerPathId)
      }
    }
  }

  return {
    careerPaths: indexById(careerPaths),
    skills: indexById(skills),
    modules: indexById(modules),
    lessons: indexById(lessons),
    roadmaps: indexById(roadmaps),
    roadmapModuleIds,
    moduleRoadmapIds,
    lessonModuleIds,
    skillLessonIds,
    skillModuleIds,
    lessonCareerPathIds,
    pendingCollections: [
      'tools',
      'resources',
      'exercises',
      'quizzes',
      'questions',
      'assessments',
      'labs',
      'topics',
    ],
    issues,
    payloadBytes: 0,
  }
}

export const buildRegistry = (): ContentRegistry => {
  const built = buildRegistryFromSource(rawContent)
  return { ...built, payloadBytes: contentPayloadBytes }
}

/** The runtime registry. Content is compiled into the bundle, so this is a singleton. */
export const registry: ContentRegistry = buildRegistry()

export type { CareerPath, Skill, Module, Lesson, Roadmap }
