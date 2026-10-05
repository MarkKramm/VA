import { contentPayloadBytes, rawContent } from '@content/index.ts'
import { type z } from 'zod'
import type { CompiledBody } from '@content/mdx/tree.ts'
import { CareerPathSchema, type CareerPath } from './schemas/career-path.ts'
import { SkillSchema, type Skill } from './schemas/skill.ts'
import { ModuleSchema, type Module } from './schemas/module.ts'
import { LessonSchema, type Lesson } from './schemas/lesson.ts'
import { ExerciseSchema, type Exercise } from './schemas/exercise.ts'
import { QuestionSchema, type Question } from './schemas/question.ts'
import { QuizSchema, type Quiz } from './schemas/quiz.ts'
import { AssessmentSchema, type Assessment } from './schemas/assessment.ts'
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
  readonly exercises: ReadonlyMap<string, Exercise>
  readonly questions: ReadonlyMap<string, Question>
  readonly quizzes: ReadonlyMap<string, Quiz>
  readonly assessments: ReadonlyMap<string, Assessment>
  readonly roadmaps: ReadonlyMap<string, Roadmap>

  /**
   * The validated entities BEFORE id indexing, each with its source file.
   *
   * These are the same entity objects as the Maps above — only the array and a
   * path string per entry are extra.
   *
   * They exist because `indexById` erases exactly the information duplicate-id
   * detection needs: `new Map(items.map(i => [i.id, i]))` keeps only the last
   * entry for a repeated id. Any check reading the Maps is therefore
   * structurally incapable of seeing a duplicate. Validation reads this instead,
   * and retains the real file path so the error names a file a human can open.
   *
   * Nothing in the application reads `parsed`; it exists for the validator.
   */
  readonly parsed: {
    readonly careerPaths: readonly ParsedEntity<CareerPath>[]
    readonly skills: readonly ParsedEntity<Skill>[]
    readonly modules: readonly ParsedEntity<Module>[]
    readonly lessons: readonly ParsedEntity<Lesson>[]
    readonly exercises: readonly ParsedEntity<Exercise>[]
    readonly questions: readonly ParsedEntity<Question>[]
    readonly quizzes: readonly ParsedEntity<Quiz>[]
    readonly assessments: readonly ParsedEntity<Assessment>[]
    readonly roadmaps: readonly ParsedEntity<Roadmap>[]
  }

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
  /**
   * exerciseId -> lessonId, DERIVED from `lesson.exercises` (M2.4).
   *
   * An exercise does not carry a `lessonId`. The lesson owns the reference, so
   * this reverse index is computed by scanning lessons — exactly as
   * `moduleRoadmapIds` is computed by scanning roadmaps. An exercise reused by
   * two lessons yields both, and no exercise file ever states its lessons.
   */
  readonly exerciseLessonIds: ReadonlyMap<string, readonly string[]>
  /**
   * questionId -> quizId, DERIVED from `quiz.questionIds` (M4.1).
   *
   * The quiz owns the reference and a question does not know which quizzes ask
   * it, so this is computed by scanning quizzes — exactly as `exerciseLessonIds`
   * is computed by scanning lessons and `moduleRoadmapIds` by scanning roadmaps.
   * It is what makes "which quizzes ask this question?" answerable without
   * searching every quiz, and it is the index that proves a question is genuinely
   * reusable rather than nominally so.
   */
  readonly questionQuizIds: ReadonlyMap<string, readonly string[]>
  /**
   * skillId -> assessmentId, DERIVED from `assessment.skills` (M5).
   *
   * The same shape as `skillLessonIds` and `skillModuleIds`: a reverse index over
   * a skill reference, so "which assessments produce evidence for this skill" is a
   * lookup rather than a scan. It is what the skill-evidence model reads.
   */
  readonly assessmentSkillIds: ReadonlyMap<string, readonly string[]>
  /**
   * assessmentId -> roadmapId, DERIVED from `roadmap.finalAssessment` and from
   * `roadmap.outcomes[].evidence` (M5).
   *
   * Both are roadmap-owned references to an assessment, so both feed the index —
   * exactly as `moduleRoadmapIds` is derived by scanning roadmaps rather than
   * being declared anywhere. It lets an assessment say which roadmaps it belongs
   * to without any roadmap being edited to say so.
   */
  readonly assessmentRoadmapIds: ReadonlyMap<string, readonly string[]>
  /**
   * skillId -> quizId, DERIVED through questions (M5).
   *
   * A quiz declares no skills of its own — a question does, and a quiz's skills
   * are the union of its questions'. So this is built by walking each question's
   * skills and looking up the quizzes that ask it, which is why it depends on
   * `questionQuizIds` rather than on any field a quiz carries.
   */
  readonly skillQuizIds: ReadonlyMap<string, readonly string[]>
  /**
   * lessonId -> its compiled body tree (M2.2).
   *
   * Keyed by ID, not path, because the id is the stable identity a route uses.
   * Built by joining each validated lesson's source path to the compiled tree the
   * build produced for that path, so a lesson that fails validation has no body
   * and a body can never be attributed to the wrong lesson.
   */
  readonly lessonBodies: ReadonlyMap<string, CompiledBody>
  /** exerciseId -> its compiled body tree, with the `h4` heading floor (M2.4). */
  readonly exerciseBodies: ReadonlyMap<string, CompiledBody>
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
  /**
   * Exercise files (M2.4). Optional at this seam so a fixture that is only
   * about, say, roadmap validation does not have to fabricate exercises. A
   * lesson that references an exercise when this is absent or empty still fails
   * referential integrity — omitting the collection is not a way to skip the
   * reference.
   */
  readonly exercises?: readonly ContentFile[]
  readonly careerPaths: readonly unknown[]
  readonly skills: readonly unknown[]
  /**
   * Question and quiz files (M4.1).
   *
   * One file per entity, like lessons and exercises, so these are file wrappers
   * rather than bare data — which is what lets a validation error name the exact
   * file to open. Optional at this seam so a fixture that is only about, say,
   * roadmap validation does not have to fabricate a question bank — but a quiz
   * that references a question when this is absent or empty still fails
   * referential integrity. Omitting the collection is not a way to skip the
   * reference.
   */
  readonly questions?: readonly ContentFile[]
  readonly quizzes?: readonly ContentFile[]
  /**
   * Assessment files (M5). One file per entity, like lessons and exercises, so a
   * validation error names the exact file. Optional at this seam for the same
   * reason as the others: a fixture about roadmap validation should not have to
   * fabricate an assessment.
   */
  readonly assessments?: readonly ContentFile[]
  /**
   * Compiled bodies, keyed by source path (M2.2; exercises added at M2.4).
   *
   * Optional because fixtures should not have to fabricate a body: a test that
   * cares about validation has no reason to produce a compiled tree, and forcing
   * one would make every existing fixture verbose for no gain. Production always
   * supplies it (see `buildRegistry`).
   */
  readonly bodies?: ReadonlyMap<string, CompiledBody>
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

/** A validated entity together with the file it came from. */
export interface ParsedEntity<T> {
  readonly value: T
  /** The real source path, so a validation error names a file a human can open. */
  readonly path: string
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
}): ParsedEntity<T>[] => {
  const out: ParsedEntity<T>[] = []
  args.inputs.forEach((input) => {
    const { location, data } = asEntry(input, args.locationOf)
    const result = args.schema.safeParse(data)
    if (result.success) {
      out.push({ value: result.data, path: location })
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
  const exercises = parseAll<Exercise>({
    schema: ExerciseSchema,
    inputs: source.exercises ?? [],
    entity: 'exercise',
    locationOf: () => 'content/exercises/',
    issues,
  })
  const roadmaps = parseAll<Roadmap>({
    schema: RoadmapSchema,
    inputs: source.roadmaps,
    entity: 'roadmap',
    locationOf: () => 'content/roadmaps/',
    issues,
  })
  const questions = parseAll<Question>({
    schema: QuestionSchema,
    inputs: source.questions ?? [],
    entity: 'question',
    // Questions are a data file, not a directory of files, so this fallback is
    // the real location rather than a placeholder.
    locationOf: () => 'content/questions.ts',
    issues,
  })
  const quizzes = parseAll<Quiz>({
    schema: QuizSchema,
    inputs: source.quizzes ?? [],
    entity: 'quiz',
    locationOf: () => 'content/quizzes.ts',
    issues,
  })
  const assessments = parseAll<Assessment>({
    schema: AssessmentSchema,
    inputs: source.assessments ?? [],
    entity: 'assessment',
    locationOf: () => 'content/assessments/',
    issues,
  })

  // Bare entity arrays, for the derived indexes. The `ParsedEntity` arrays
  // (which retain each entity's source file) are kept as `parsed` below.
  const careerPathValues = careerPaths.map((entry) => entry.value)
  const skillValues = skills.map((entry) => entry.value)
  const moduleValues = modules.map((entry) => entry.value)
  const lessonValues = lessons.map((entry) => entry.value)
  const exerciseValues = exercises.map((entry) => entry.value)
  const questionValues = questions.map((entry) => entry.value)
  const quizValues = quizzes.map((entry) => entry.value)
  const assessmentValues = assessments.map((entry) => entry.value)
  const roadmapValues = roadmaps.map((entry) => entry.value)

  // --- derived indexes ----------------------------------------------------
  // Every one of these is computed, never authored. This is what keeps adding a
  // lesson to a second roadmap a one-line change in one file.

  const roadmapModuleIds = new Map<string, string[]>(
    roadmapValues.map((roadmap) => [roadmap.id, roadmap.stages.flatMap((stage) => stage.modules)]),
  )

  const moduleRoadmapIds = new Map<string, string[]>()
  for (const [roadmapId, moduleIds] of roadmapModuleIds) {
    for (const moduleId of moduleIds) push(moduleRoadmapIds, moduleId, roadmapId)
  }

  const lessonModuleIds = new Map<string, string[]>()
  const skillLessonIds = new Map<string, string[]>()
  const skillModuleIds = new Map<string, string[]>()
  for (const module of moduleValues) {
    for (const lessonId of module.lessons) push(lessonModuleIds, lessonId, module.id)
    for (const skillId of module.skills) push(skillModuleIds, skillId, module.id)
  }
  for (const lesson of lessonValues) {
    for (const skillId of lesson.skills) push(skillLessonIds, skillId, lesson.id)
    for (const topic of lesson.topics) {
      for (const skillId of topic.skills) push(skillLessonIds, skillId, lesson.id)
    }
  }

  const moduleCareerPathIds = new Map<string, string[]>()
  for (const roadmap of roadmapValues) {
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

  // exerciseId -> lessonId. Derived from the lesson side, never authored in an
  // exercise file. A set, not a tally: an exercise referenced twice by one lesson
  // yields that lesson once, exactly as the other reverse indexes behave.
  const exerciseLessonIds = new Map<string, string[]>()
  for (const lesson of lessonValues) {
    for (const exerciseId of lesson.exercises) push(exerciseLessonIds, exerciseId, lesson.id)
  }

  // questionId -> quizId. Derived from the quiz side, never authored on a
  // question. A set, not a tally: a question asked by two quizzes yields both,
  // and a question listed twice by one quiz is already a schema error.
  const questionQuizIds = new Map<string, string[]>()
  for (const quiz of quizValues) {
    for (const questionId of quiz.questionIds) push(questionQuizIds, questionId, quiz.id)
  }

  // skillId -> quizId, through questions: a quiz's skills are its questions'.
  const skillQuizIds = new Map<string, string[]>()
  for (const question of questionValues) {
    for (const skillId of question.skills) {
      for (const quizId of questionQuizIds.get(question.id) ?? []) {
        push(skillQuizIds, skillId, quizId)
      }
    }
  }

  // skillId -> assessmentId, from the assessment side. A set, not a tally.
  const assessmentSkillIds = new Map<string, string[]>()
  for (const assessment of assessmentValues) {
    for (const skillId of assessment.skills) push(assessmentSkillIds, skillId, assessment.id)
  }

  // assessmentId -> roadmapId. Both roadmap-owned references feed it: the
  // roadmap's final assessment, and any outcome whose evidence names one.
  const assessmentRoadmapIds = new Map<string, string[]>()
  for (const roadmap of roadmapValues) {
    if (roadmap.finalAssessment !== undefined) {
      push(assessmentRoadmapIds, roadmap.finalAssessment, roadmap.id)
    }
    for (const outcome of roadmap.outcomes) {
      for (const evidence of outcome.evidence) {
        if (evidence.kind === 'assessment') push(assessmentRoadmapIds, evidence.id, roadmap.id)
      }
    }
  }

  // lessonId -> compiled body. The join is on the lesson's SOURCE PATH, because
  // that is what the build compiler keyed its output by. Keying the result by id
  // is what lets a route ask for a lesson body without knowing where the file
  // lives -- file layout is an authoring detail, the id is the contract.
  const lessonBodies = new Map<string, CompiledBody>()
  if (source.bodies) {
    for (const { value, path } of lessons) {
      const body = source.bodies.get(path)
      if (body) lessonBodies.set(value.id, body)
    }
  }

  // exerciseId -> compiled body. Same join as lessons, against the exercise
  // collection, so a page can ask for an exercise body by id.
  const exerciseBodies = new Map<string, CompiledBody>()
  if (source.bodies) {
    for (const { value, path } of exercises) {
      const body = source.bodies.get(path)
      if (body) exerciseBodies.set(value.id, body)
    }
  }

  return {
    careerPaths: indexById(careerPathValues),
    skills: indexById(skillValues),
    modules: indexById(moduleValues),
    lessons: indexById(lessonValues),
    exercises: indexById(exerciseValues),
    questions: indexById(questionValues),
    quizzes: indexById(quizValues),
    assessments: indexById(assessmentValues),
    roadmaps: indexById(roadmapValues),
    // The pre-index entities, each with its source file, so duplicate-id
    // detection still has the evidence indexById is about to discard.
    parsed: {
      careerPaths,
      skills,
      modules,
      lessons,
      exercises,
      questions,
      quizzes,
      assessments,
      roadmaps,
    },
    roadmapModuleIds,
    moduleRoadmapIds,
    lessonModuleIds,
    skillLessonIds,
    skillModuleIds,
    lessonCareerPathIds,
    exerciseLessonIds,
    questionQuizIds,
    skillQuizIds,
    assessmentSkillIds,
    assessmentRoadmapIds,
    lessonBodies,
    exerciseBodies,
    // Questions, quizzes and assessments left this list at M4.1/M5: they are
    // registered collections now, so a reference to one is checked rather than
    // skipped.
    pendingCollections: ['tools', 'resources', 'labs', 'topics'],
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

export type { CareerPath, Skill, Module, Lesson, Exercise, Question, Quiz, Assessment, Roadmap }
