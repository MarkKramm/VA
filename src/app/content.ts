import { registry } from '@/content/registry.ts'
import {
  exerciseBody,
  exercisesOfLesson,
  getModule,
  getQuestion,
  getQuiz,
  getRoadmap,
  lessonBody,
  lessonsByIds,
  lessonsOfModule,
  lessonsOfRoadmap,
  modulesOfRoadmap,
  primaryModuleOfLesson,
  primaryRoadmapOfLesson,
  roadmapsByCareerPath,
  skillsByIds,
} from '@/content/selectors.ts'
import type {
  CareerPath,
  Difficulty,
  Exercise,
  Lesson,
  Module,
  Question,
  Quiz,
  Roadmap,
  Skill,
  Stage,
} from '@/content/schemas/index.ts'
import type { CompiledBody } from '@content/mdx/tree.ts'

/**
 * Content composition for the application layer.
 *
 * WHY THIS FILE EXISTS
 *
 * The ESLint layer-boundary rule forbids `src/features/` and `src/components/`
 * from importing anything matching `content/*` — which includes the `@/content/*`
 * alias. So a feature component cannot read the registry, and cannot import a
 * selector either. `src/app/` is the layer that is allowed to, and it is the
 * layer `ARCHITECTURE.md` describes as "wiring".
 *
 * That makes this file the seam between the curriculum and the UI. It reads the
 * registry through `selectors.ts` — never the raw Maps — and hands plain data to
 * the presentation layer.
 *
 * Two rules this file exists to enforce:
 *
 *  1. **Every read goes through a selector.** No ad-hoc `registry.lessons.get()`
 *     in a component, because that is how the derived-index rule quietly stops
 *     being true. If a query is needed and no selector provides it, add one to
 *     `src/content/selectors.ts` rather than reaching past it here.
 *  2. **Nothing is invented.** Every function returns content that exists. Where
 *     the curriculum is thin — and at M1 it is very thin — the UI shows an
 *     honest empty state instead. Fabricating a plausible-looking lesson list to
 *     fill a dashboard would be a lie the learner discovers later.
 */

/** Every roadmap, in registry order. */
export const allRoadmaps = (): readonly Roadmap[] => [...registry.roadmaps.values()]

/** Every module. */
export const allModules = (): readonly Module[] => [...registry.modules.values()]

/** Every lesson. */
export const allLessons = (): readonly Lesson[] => [...registry.lessons.values()]

/** One roadmap, or undefined if the id is unknown. */
export const findRoadmap = (roadmapId: string): Roadmap | undefined =>
  getRoadmap(registry, roadmapId)

/** One module, or undefined if the id is unknown. */
export const findModule = (moduleId: string): Module | undefined => getModule(registry, moduleId)

/** The modules of a roadmap, in stage order. */
export const modulesInRoadmap = (roadmapId: string): readonly Module[] =>
  modulesOfRoadmap(registry, roadmapId)

/** The lessons of a module, in the module's declared order. */
export const lessonsInModule = (moduleId: string): readonly Lesson[] =>
  lessonsOfModule(registry, moduleId)

/** Every lesson reachable from a roadmap, in order, de-duplicated. */
export const lessonsInRoadmap = (roadmapId: string): readonly Lesson[] =>
  lessonsOfRoadmap(registry, roadmapId)

/**
 * Roadmap stages with their modules resolved, ready to render.
 *
 * Stages are returned as a LIST and each carries its resolved modules. It is
 * deliberately not a map keyed by `kind`: Automation VA has two stages sharing the
 * `specialization` kind, and keying by kind would silently drop one. `NEXT_STEPS.md`
 * calls this out as a thing M1 must set up for M2 without building it, and this
 * return shape is how it is set up.
 */
export interface ResolvedStage {
  readonly stage: Stage
  readonly modules: readonly Module[]
}

export const stagesOfRoadmap = (roadmapId: string): readonly ResolvedStage[] => {
  const roadmap = getRoadmap(registry, roadmapId)
  if (!roadmap) return []
  return roadmap.stages.map((stage) => ({
    stage,
    modules: stage.modules.flatMap((moduleId) => {
      const module = getModule(registry, moduleId)
      return module ? [module] : []
    }),
  }))
}

/** A roadmap plus the totals the shell displays. All derived, never stored. */
export interface RoadmapSummary {
  readonly roadmap: Roadmap
  readonly moduleCount: number
  readonly lessonCount: number
  /**
   * De-duplicated module count.
   *
   * A roadmap may reference the same module in two stages — `beginner-va` does,
   * with `computer-fundamentals` in both "Working habits" and "Choose a
   * direction". Counting it twice would overstate the work, so this counts
   * distinct modules while `modulesInRoadmap` keeps stage order intact.
   */
  readonly distinctModuleCount: number
}

export const summariseRoadmap = (roadmap: Roadmap): RoadmapSummary => {
  const modules = modulesOfRoadmap(registry, roadmap.id)
  const distinct = new Set(roadmap.stages.flatMap((stage) => stage.modules))
  return {
    roadmap,
    moduleCount: modules.length,
    distinctModuleCount: distinct.size,
    lessonCount: lessonsOfRoadmap(registry, roadmap.id).length,
  }
}

/** Every roadmap with its derived totals, for the dashboard and the index page. */
export const allRoadmapSummaries = (): readonly RoadmapSummary[] =>
  allRoadmaps().map(summariseRoadmap)

/** Career paths with their roadmaps resolved, ordered by the path's own `order`. */
export interface CareerPathGroup {
  readonly careerPath: CareerPath
  readonly roadmaps: readonly Roadmap[]
}

export const careerPathGroups = (): readonly CareerPathGroup[] => {
  const grouped = roadmapsByCareerPath(registry)
  const groups: CareerPathGroup[] = []
  for (const [careerPathId, roadmaps] of grouped) {
    const careerPath = registry.careerPaths.get(careerPathId)
    // The selector can produce a group for an id with no career-path record only
    // if content is inconsistent, which referential integrity already forbids.
    // Dropping it here would hide that, so the caller can render it as ungrouped.
    if (careerPath) groups.push({ careerPath, roadmaps })
  }
  return groups
}

/**
 * Total lesson count across the whole curriculum.
 *
 * Used for the "what exists so far" figure on the dashboard. At M1 this is a
 * small number, and that is the honest state of the project rather than a
 * placeholder to be papered over.
 */
export const curriculumTotals = (): {
  readonly roadmaps: number
  readonly modules: number
  readonly lessons: number
  readonly careerPaths: number
} => ({
  roadmaps: registry.roadmaps.size,
  modules: registry.modules.size,
  lessons: registry.lessons.size,
  careerPaths: registry.careerPaths.size,
})

/**
 * The lessons a learner would encounter first, in curriculum order.
 *
 * Deliberately NOT a recommendation. It is the first lessons of the first
 * roadmap, which is a fact about the content rather than a judgement about the
 * learner. Anything that ranks content by what someone should do next is a
 * recommendation engine, and those belong to a later milestone.
 */
export const startingLessons = (limit = 3): readonly Lesson[] => {
  const firstRoadmap = allRoadmaps()[0]
  if (!firstRoadmap) return []
  return lessonsOfRoadmap(registry, firstRoadmap.id).slice(0, limit)
}

/**
 * A lesson with its compiled body, ready for a lesson page (M2.2).
 *
 * This is the seam function the future `LessonPage` consumes. It returns the
 * validated lesson and its compiled tree together, so a component never has to
 * join them itself and never touches the registry. `body` is `undefined` when the
 * lesson has no compiled body, which the page renders as an honest empty state.
 *
 * Deliberately narrow: it does not add navigation, progress, or "next lesson".
 * Those belong to a later milestone, and inventing them here would be exactly the
 * scope creep `AGENTS.md` rule 6 forbids.
 */
export interface LessonWithBody {
  readonly lesson: Lesson
  readonly body: CompiledBody | undefined
}

export const findLesson = (lessonId: string): LessonWithBody | undefined => {
  const lesson = registry.lessons.get(lessonId)
  if (!lesson) return undefined
  return { lesson, body: lessonBody(registry, lessonId) }
}

/**
 * The question bank and the quizzes (M4.1).
 *
 * There is no quiz UI yet, and these four functions exist anyway because they are
 * the SEAM rather than a feature: `src/features/` cannot import `@/content/*`, so
 * when M4.2 renders a quiz it must read questions through this file exactly as
 * the lesson page reads lessons through it. Adding them here is what keeps the
 * layer boundary true from the first commit rather than retrofitting it when a
 * page needs them.
 *
 * They deliberately return validated content unchanged. There is no `QuizView`
 * and no scoring field, because a view shape invented before the renderer exists
 * would be a guess, and a score field would be a promise the platform cannot yet
 * keep.
 */
export const allQuestions = (): readonly Question[] => [...registry.questions.values()]

export const findQuestion = (questionId: string): Question | undefined =>
  getQuestion(registry, questionId)

export const allQuizzes = (): readonly Quiz[] => [...registry.quizzes.values()]

export const findQuiz = (quizId: string): Quiz | undefined => getQuiz(registry, quizId)

/**
 * A resolved reference to another lesson, for navigation and link lists.
 *
 * Only what a link needs: the id (the route), the title, and enough context to
 * tell two lessons apart at a glance. Resolved here rather than in the component
 * so a feature never holds a raw id and never touches the registry.
 */
export interface LessonLink {
  readonly id: string
  readonly title: string
  readonly estimatedMinutes: number
}

const toLessonLink = (lesson: Lesson): LessonLink => ({
  id: lesson.id,
  title: lesson.title,
  estimatedMinutes: lesson.estimatedMinutes,
})

/** Turn lessons into link references, for a page that lists them. */
export const toLessonLinks = (lessons: readonly Lesson[]): readonly LessonLink[] =>
  lessons.map(toLessonLink)

/**
 * Everything a lesson page needs, in one read.
 *
 * WHY ONE FUNCTION AND NOT SIX
 *
 * The page needs the lesson, its body, its position in a roadmap, the previous
 * and next lessons in that roadmap's order, its prerequisites, its related
 * lessons, and its skills. Exposing seven separate seam functions would push the
 * job of joining them — and the job of deciding what "previous lesson" means —
 * into the component, which is precisely where `ARCHITECTURE.md` says it must
 * not live. So the join happens here, once, against selectors.
 *
 * ORDERING IS THE ROADMAP'S ORDER, NOT THE MODULE'S
 *
 * "Previous" and "next" follow `lessonsOfRoadmap` — the roadmap's stage-then-
 * module-then-lesson sequence — because that is the order a learner actually
 * moves through the curriculum. A lesson that appears in more than one module
 * appears once in that sequence (it is de-duplicated), so its neighbours are
 * stable. When a lesson belongs to no roadmap at all, there is no sequence and
 * prev/next are both `undefined`: an honest absence rather than an invented
 * order.
 *
 * The `index` is 1-based within the sequence, for "Lesson 3 of 4" and for the
 * accessible label on the next/previous controls.
 */
/**
 * A prerequisite: the lesson it points at, plus the reason it is advisory.
 *
 * The reason is carried alongside the link rather than looked up in the page,
 * because looking it up in the page means iterating the RAW prerequisite list
 * while the resolved links are separate — and that is how a prerequisite whose
 * lesson did not resolve becomes a link to a non-existent page. Resolving them
 * together means a prerequisite without a lesson is dropped entirely, reason and
 * all, rather than leaving a dead link with a reason attached to it.
 */
export interface PrerequisiteLink extends LessonLink {
  readonly reason: string
}

/**
 * An exercise with its compiled body, ready to render in the Practice section
 * (M2.4).
 *
 * Resolved here rather than in the component so the feature never touches the
 * registry, exactly as `LessonLink` and `PrerequisiteLink` are. `body` is
 * `undefined` when the exercise has no compiled body, which the UI renders as an
 * honest empty state rather than a broken section.
 *
 * There is deliberately no `attempts`, `score` or `completed` field: an exercise
 * is ungraded and unsaved at M2.4, and giving the view a field for something the
 * platform cannot yet record would invite a component to display a lie.
 */
export interface ExerciseView {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly difficulty: Difficulty
  readonly estimatedMinutes: number
  readonly deliverable: string
  readonly selfCheck: readonly string[]
  readonly body: CompiledBody | undefined
}

const toExerciseView = (exercise: Exercise): ExerciseView => ({
  id: exercise.id,
  title: exercise.title,
  summary: exercise.summary,
  difficulty: exercise.difficulty,
  estimatedMinutes: exercise.estimatedMinutes,
  deliverable: exercise.deliverable,
  selfCheck: exercise.selfCheck,
  body: exerciseBody(registry, exercise.id),
})

export interface LessonContext {
  readonly lesson: Lesson
  readonly body: CompiledBody | undefined
  readonly module: Module | undefined
  readonly roadmap: Roadmap | undefined
  /** 1-based position in the roadmap's lesson sequence, or `undefined` if unfiled. */
  readonly position: number | undefined
  /** How many lessons the roadmap contains, or `undefined` if unfiled. */
  readonly total: number | undefined
  readonly previous: LessonLink | undefined
  readonly next: LessonLink | undefined
  readonly prerequisites: readonly PrerequisiteLink[]
  readonly related: readonly LessonLink[]
  readonly skills: readonly Skill[]
  /** The lesson's practice exercises, in the lesson's declared order (M2.4). */
  readonly exercises: readonly ExerciseView[]
}

export const lessonContext = (lessonId: string): LessonContext | undefined => {
  const lesson = registry.lessons.get(lessonId)
  if (!lesson) return undefined

  const module = primaryModuleOfLesson(registry, lessonId)
  const roadmap = primaryRoadmapOfLesson(registry, lessonId)

  // The ordered sequence the learner moves through. Empty when the lesson is not
  // in any roadmap, which makes both neighbours undefined below.
  const sequence = roadmap ? lessonsOfRoadmap(registry, roadmap.id) : []
  const index = sequence.findIndex((candidate) => candidate.id === lessonId)
  const previousLesson = index > 0 ? sequence[index - 1] : undefined
  const nextLesson = index >= 0 ? sequence[index + 1] : undefined

  // Pair each prerequisite with its resolved lesson in one pass, so an
  // unresolvable prerequisite is dropped WITH its reason rather than rendered as
  // a dead link. Referential integrity already forbids an unknown reference, but
  // a link is still only built from an id that resolved.
  const prerequisites: PrerequisiteLink[] = []
  for (const prerequisite of lesson.prerequisites) {
    const target = registry.lessons.get(prerequisite.id)
    if (!target) continue
    prerequisites.push({ ...toLessonLink(target), reason: prerequisite.reason })
  }

  return {
    lesson,
    body: lessonBody(registry, lessonId),
    module,
    roadmap,
    position: index >= 0 ? index + 1 : undefined,
    total: roadmap ? sequence.length : undefined,
    previous: previousLesson ? toLessonLink(previousLesson) : undefined,
    next: nextLesson ? toLessonLink(nextLesson) : undefined,
    prerequisites,
    related: lessonsByIds(registry, lesson.related).map(toLessonLink),
    skills: skillsByIds(registry, lesson.skills),
    exercises: exercisesOfLesson(registry, lessonId).map(toExerciseView),
  }
}
