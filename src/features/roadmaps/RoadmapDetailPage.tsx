import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, BookOpen, Layers } from 'lucide-react'
import { findRoadmap, lessonsInModule, lessonsInRoadmap, stagesOfRoadmap } from '@/app/content.ts'
import { lessonProgressFor, roadmapLessonProgress } from '@/app/progress/composition.ts'
import { useProgressState } from '@/app/progress/ProgressProvider.tsx'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs.tsx'
import { Badge } from '@/components/ui/Badge.tsx'
import { Callout } from '@/components/ui/Callout.tsx'
import { Card, CardBody, CardHeader } from '@/components/ui/Card.tsx'
import { LinkButton } from '@/components/ui/Button.tsx'
import { EmptyState } from '@/components/ui/EmptyState.tsx'
import { ProgressBar } from '@/components/ui/ProgressBar.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import { formatDuration } from '@/lib/cn.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import styles from './RoadmapDetailPage.module.css'

/**
 * Roadmap detail.
 *
 * Shows a roadmap's stages, the modules in each stage, and the lessons in each
 * module — resolved through the registry's derived indexes.
 *
 * THE STAGE RENDERER ITERATES A LIST
 *
 * `NEXT_STEPS.md` flags this explicitly: Automation VA has two stages sharing the
 * `specialization` kind, so a renderer keyed by `stage.kind` — a map, a lookup,
 * `kind` as a React `key` — would silently drop one. `stagesOfRoadmap` returns an
 * ordered array of `{ stage, modules }`, the stage index is the React key, and a
 * duplicate kind renders twice. This is the one thing M1 must set up correctly for
 * M2, and it costs one array instead of one object.
 *
 * WHAT THIS PAGE DELIBERATELY DOES NOT DO
 *
 * It does not render lesson bodies itself, track progress, or gate content. Each
 * lesson title links to its own page (`/lessons/:lessonId`), which renders the
 * compiled body — see `LessonPage`. This page stays a structural index.
 *
 * At M3 it shows real progress: a completed-lesson bar for the roadmap and a
 * "Completed" badge on lessons the learner has finished. Gating is still absent —
 * every stage is reachable, and nothing is locked or recommended. The bar's label
 * states the count in words, so progress is never colour alone
 * (`DESIGN_SYSTEM.md` §2.1).
 */

const STAGE_LABEL: Record<string, string> = {
  foundation: 'Foundation',
  core: 'Core skills',
  tool: 'Tools',
  specialization: 'Specialisation',
  projects: 'Projects',
  practice: 'Practice',
  portfolio: 'Portfolio',
  'career-prep': 'Career preparation',
  assessment: 'Assessment',
}

const LANE_LABEL = {
  employment: 'Employment',
  freelance: 'Freelance',
  both: 'Employment & freelance',
} as const

export const RoadmapDetailPage = () => {
  const { roadmapId } = useParams<{ roadmapId: string }>()
  const state = useProgressState()

  // An unknown id is a 404, not an error state. `roadmapId` is guaranteed by the
  // route pattern to exist, but an empty string is possible from a malformed URL.
  const roadmap = roadmapId ? findRoadmap(roadmapId) : undefined
  if (!roadmap) return <NotFoundPage />

  const stages = stagesOfRoadmap(roadmap.id)
  // The roadmap's lessons in curriculum order. The sequence is the same one the
  // lesson page uses for previous/next navigation, so "start", "next" and the
  // progress count cannot disagree about which lessons the roadmap contains.
  const roadmapLessons = lessonsInRoadmap(roadmap.id)
  const firstLesson = roadmapLessons[0]
  const progress = roadmapLessonProgress(state, roadmap.id)

  return (
    <div className={styles.page}>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Roadmaps', to: '/roadmaps' },
          // No `to`: this is the current page, and linking it would be a dead control.
          { label: roadmap.title },
        ]}
      />

      <header className={styles.header}>
        <Link to="/roadmaps" className={styles.backLink}>
          <Icon size="xs">
            <ArrowLeft />
          </Icon>
          All roadmaps
        </Link>
        <h1 className={styles.title}>{roadmap.title}</h1>
        <p className={styles.summary}>{roadmap.summary}</p>
        <div className={styles.badges}>
          <Badge label={roadmap.level} tone="outline" />
          <Badge label={LANE_LABEL[roadmap.lane]} tone="accent" />
          <Badge
            label={`${roadmap.estimatedWeeks} ${roadmap.estimatedWeeks === 1 ? 'week' : 'weeks'}`}
            tone="neutral"
          />
        </div>
      </header>

      {/*
        Progress (M3). Shown only when the roadmap has lessons: a bar over an empty
        roadmap would read as "you have done nothing" rather than "there is nothing
        here". The label states the count, so the number is never colour alone.
      */}
      {progress && progress.total > 0 ? (
        <ProgressBar
          value={progress.ratio}
          label={`${progress.completed} of ${progress.total} lessons complete`}
          state={progress.ratio === 1 ? 'complete' : undefined}
        />
      ) : null}

      <Callout tone="info" title="Draft content">
        <p>
          This roadmap is a draft. Its lessons are written with AI assistance and have not yet been
          reviewed by a person, so treat them as a starting point rather than finished instruction.
        </p>
      </Callout>

      {/*
        Job readiness.
        `outcomes` exists because D6 settled that readiness is evidence-weighted,
        not completion-weighted. Every M0 roadmap has an empty `evidence` array
        because quizzes and labs arrive at M4 and M6. Showing the outcomes without
        a readiness score is therefore the honest rendering — and stating why
        there is no score is more useful than showing a misleading 0%.
      */}
      <section aria-labelledby="outcomes-heading">
        <h2 id="outcomes-heading" className={styles.sectionTitle}>
          What you will be able to do
        </h2>
        <ul className={styles.outcomes}>
          {roadmap.outcomes.map((outcome) => (
            <li key={outcome.statement} className={styles.outcome}>
              {outcome.statement}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="stages-heading">
        <h2 id="stages-heading" className={styles.sectionTitle}>
          Stages
        </h2>

        {stages.length === 0 ? (
          <EmptyState title="This roadmap has no stages yet" icon={<Layers />} compact />
        ) : (
          <ol className={styles.stages}>
            {stages.map(({ stage, modules }, index) => (
              // Keyed by INDEX, deliberately. Two stages may share a `kind`, so
              // `kind` is not unique; the index is. The trade-off is that
              // reordering stages changes React's reconciliation, which is correct
              // behaviour anyway since the order is meaningful.
              <li key={`${index}-${stage.kind}`} className={styles.stage}>
                <div className={styles.stageHeader}>
                  <p className={styles.stageIndex}>Stage {index + 1}</p>
                  <h3 className={styles.stageTitle}>
                    {stage.title ?? STAGE_LABEL[stage.kind] ?? stage.kind}
                  </h3>
                  {/* The kind is shown as a badge too: it is editorial metadata
                      that differs from the display title, and a learner comparing
                      two roadmaps needs to see it. */}
                  <Badge label={STAGE_LABEL[stage.kind] ?? stage.kind} tone="outline" />
                </div>

                {stage.note ? <p className={styles.stageNote}>{stage.note}</p> : null}

                <ul className={styles.modules}>
                  {modules.map((module) => {
                    const lessons = lessonsInModule(module.id)
                    return (
                      <li key={module.id}>
                        <Card as="div" tone="sunken" padding="sm" className={styles.module}>
                          <p className={styles.moduleTitle}>{module.title}</p>
                          <p className={styles.moduleOutcome}>{module.outcome}</p>
                          {lessons.length > 0 ? (
                            <ol className={styles.lessons}>
                              {lessons.map((lesson, lessonIndex) => {
                                const { complete } = lessonProgressFor(state, lesson.id)
                                return (
                                  <li key={lesson.id} className={styles.lesson}>
                                    <span className={styles.lessonIndex} aria-hidden="true">
                                      {lessonIndex + 1}
                                    </span>
                                    {/*
                                      The lesson title is a real link to the lesson
                                      page (M2.3). Before this slice there was
                                      nowhere to go and the title was plain text —
                                      a link to a non-existent page would have been
                                      worse than none.
                                    */}
                                    <Link
                                      to={`/lessons/${lesson.id}`}
                                      className={styles.lessonTitle}
                                    >
                                      {lesson.title}
                                    </Link>
                                    {/* A word, not a colour: completion is stated. */}
                                    {complete ? <Badge label="Completed" state="complete" /> : null}
                                    <span className={styles.lessonMeta}>
                                      <Icon size="xs">
                                        <BookOpen />
                                      </Icon>
                                      {formatDuration(lesson.estimatedMinutes)}
                                    </span>
                                  </li>
                                )
                              })}
                            </ol>
                          ) : (
                            <p className={styles.noLessons}>
                              No lessons written for this module yet.
                            </p>
                          )}
                        </Card>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/*
        A clear next action. The honest one now that lesson pages exist (M2.3):
        start at the first lesson of this roadmap. When a roadmap has no lessons
        yet, there is nothing to open and the card explains that rather than
        offering a dead link.
      */}
      <div className={styles.nextAction}>
        <Card tone="raised" padding="lg">
          {firstLesson ? (
            <>
              <CardHeader
                title="Start this roadmap"
                description="Begin with the first lesson. Lessons are read in order, and each one links to the next."
                headingLevel={2}
              />
              <CardBody>
                <LinkButton to={`/lessons/${firstLesson.id}`} variant="primary">
                  <Icon size="sm">
                    <BookOpen />
                  </Icon>
                  Open {firstLesson.title}
                </LinkButton>
              </CardBody>
            </>
          ) : (
            <>
              <CardHeader
                title="No lessons yet"
                description="This roadmap's structure is defined but no lessons have been written for it yet."
                headingLevel={2}
              />
              <CardBody>
                <Link to="/roadmaps" className={styles.nextLink}>
                  <Icon size="xs">
                    <ArrowRight />
                  </Icon>
                  Compare roadmaps
                </Link>
              </CardBody>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
