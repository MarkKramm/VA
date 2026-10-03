import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, BookOpen, Clock, ListChecks, Target } from 'lucide-react'
import { lessonContext, type LessonLink } from '@/app/content.ts'
import { useProgressActions } from '@/app/progress/ProgressProvider.tsx'
import { MdxContent } from '@/components/mdx/render.tsx'
import { Badge } from '@/components/ui/Badge.tsx'
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs.tsx'
import { Callout } from '@/components/ui/Callout.tsx'
import { EmptyState } from '@/components/ui/EmptyState.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import { formatDuration } from '@/lib/cn.ts'
import { NotFoundPage } from '@/features/roadmaps/NotFoundPage.tsx'
import { CompletionControl } from './CompletionControl.tsx'
import { PracticeSection } from './PracticeSection.tsx'
import styles from './LessonPage.module.css'

/**
 * The lesson page.
 *
 * The first place the compiled MDX body (M2.2) actually reaches a learner. Every
 * piece of data here comes from `lessonContext` in `src/app/content.ts` — the
 * lesson, its body, its position in the roadmap, its neighbours, prerequisites,
 * related lessons and skills — because a feature component may not touch the
 * content layer directly. See `ARCHITECTURE.md` and `DECISIONS.md` D16.
 *
 * WHAT THIS PAGE DELIBERATELY DOES NOT DO
 *
 * It records progress (M3): opening the lesson records a view, and the learner
 * can explicitly mark the lesson complete (with undo) and record an exercise
 * attempt. Completion is never inferred from a page view — the event model's
 * `source` field keeps a view and a completion apart. It still does not gate
 * anything, and a quiz and a lab do not exist yet.
 *
 * THE HEADING LEVEL IS FIXED AT h1
 *
 * The page owns the single `<h1>`, and the body's own headings start at `h2`
 * (content is authored that way; a lesson body that began with `#` would produce
 * a second h1 and a broken outline). The lesson title is the page's h1 so a
 * screen-reader user hears the page name once, at the top, in the outline.
 */

const DIFFICULTY_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const

/** A link to another lesson, as a list row for prerequisites and related reading. */
const LessonLinkList = ({ lessons }: { readonly lessons: readonly LessonLink[] }) => (
  <ul className={styles.linkList}>
    {lessons.map((lesson) => (
      <li key={lesson.id} className={styles.linkItem}>
        <Link to={`/lessons/${lesson.id}`} className={styles.linkRow}>
          <span className={styles.linkTitle}>{lesson.title}</span>
          <span className={styles.linkMeta}>
            <Icon size="xs">
              <Clock />
            </Icon>
            {formatDuration(lesson.estimatedMinutes)}
          </span>
        </Link>
      </li>
    ))}
  </ul>
)

export const LessonPage = () => {
  const { lessonId } = useParams<{ lessonId: string }>()
  const actions = useProgressActions()

  // An unknown id is a 404, not an error. The same treatment `RoadmapDetailPage`
  // gives an unknown roadmap: a mistyped URL is the learner's doing and must not
  // read as a failure.
  const context = lessonId ? lessonContext(lessonId) : undefined
  const isValidLesson = context !== undefined

  /*
   * Record that the learner OPENED this lesson (M3).
   *
   * A view, never a completion — `lesson.viewed` powers "continue learning" and
   * nothing else. It is guarded by a ref so React's StrictMode double-invocation
   * (and any incidental re-render) records it once per lesson visit rather than
   * appending the same view repeatedly. The dependency is the lesson ID, NOT the
   * `context` object: `lessonContext` returns a fresh object on every render, so
   * depending on it would record a view on every render, forever.
   */
  const recordedView = useRef<string | null>(null)
  useEffect(() => {
    if (!lessonId || !isValidLesson || recordedView.current === lessonId) return
    recordedView.current = lessonId
    actions.recordLessonViewed(lessonId)
  }, [actions, lessonId, isValidLesson])

  if (!context) return <NotFoundPage />

  const { lesson, body, module, roadmap, position, total, previous, next } = context

  /*
   * The breadcrumb trail. The roadmap crumb is only shown when the lesson is
   * actually filed under one — an unfiled lesson would otherwise get a crumb
   * pointing at a roadmap it is not part of, which is a link that lies.
   */
  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Roadmaps', to: '/roadmaps' },
    ...(roadmap ? [{ label: roadmap.title, to: `/roadmaps/${roadmap.id}` }] : []),
    // No `to`: the current page is marked `aria-current`, not linked.
    { label: lesson.title },
  ]

  return (
    <div className={styles.page}>
      <Breadcrumbs items={crumbs} />

      <article className={styles.article}>
        <header className={styles.header}>
          {roadmap ? (
            <Link to={`/roadmaps/${roadmap.id}`} className={styles.backLink}>
              <Icon size="xs">
                <ArrowLeft />
              </Icon>
              {roadmap.title}
            </Link>
          ) : null}

          <h1 className={styles.title}>{lesson.title}</h1>

          <p className={styles.summary}>{lesson.summary}</p>

          <div className={styles.badges}>
            <Badge label={DIFFICULTY_LABEL[lesson.difficulty]} tone="outline" />
            <Badge label={formatDuration(lesson.estimatedMinutes)} tone="neutral" />
            {typeof position === 'number' && typeof total === 'number' ? (
              <Badge label={`Lesson ${position} of ${total}`} tone="neutral" />
            ) : null}
          </div>
        </header>

        {/*
          The draft notice, mirroring the roadmap page. Every M0 lesson is a
          draft, and saying so is the accurate state of the project rather than a
          disclaimer bolted on. It is not conditional on `status` because there is
          no `published` content yet; when there is, this becomes a conditional.
        */}
        <Callout tone="info" title="Draft lesson">
          <p>
            This lesson was written with AI assistance and has not yet been reviewed by a person.
            Treat it as a starting point, and check anything important against a qualified source.
          </p>
        </Callout>

        {/*
          Objectives. Required and non-empty by schema — a lesson without a stated
          objective is a page, not a lesson — so there is no empty branch here.
        */}
        <section className={styles.objectives} aria-labelledby="objectives-heading">
          <h2 id="objectives-heading" className={styles.sectionTitle}>
            <Icon size="sm">
              <Target />
            </Icon>
            What you will learn
          </h2>
          <ul className={styles.objectiveList}>
            {lesson.objectives.map((objective) => (
              <li key={objective} className={styles.objective}>
                {objective}
              </li>
            ))}
          </ul>
        </section>

        {/*
          Prerequisites. Advisory, never a lock (Q6): the links are plain links a
          learner can follow or ignore, and the reason is shown so the advice is
          specific rather than a vague "you may be missing something".
        */}
        {context.prerequisites.length > 0 ? (
          <section className={styles.prereq} aria-labelledby="prereq-heading">
            <h2 id="prereq-heading" className={styles.sectionTitle}>
              <Icon size="sm">
                <ListChecks />
              </Icon>
              Before this lesson
            </h2>
            <p className={styles.prereqIntro}>
              These are recommendations, not requirements — you can read on without them, but they
              make the lesson easier to follow.
            </p>
            <ul className={styles.prereqList}>
              {context.prerequisites.map((prerequisite) => (
                <li key={prerequisite.id} className={styles.prereqItem}>
                  <Link to={`/lessons/${prerequisite.id}`} className={styles.prereqLink}>
                    {prerequisite.title}
                  </Link>
                  <span className={styles.prereqReason}>{prerequisite.reason}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* --- the compiled body ------------------------------------------------ *
         * The whole point of M2.2: the build-time tree rendered into semantic
         * HTML. `MdxContent` is the only renderer, and it re-checks the safety
         * boundary the compiler already enforced.
         */}
        {body && body.length > 0 ? (
          <MdxContent nodes={body} className={styles.prose} keyPrefix={`lesson-${lesson.id}`} />
        ) : (
          <EmptyState title="This lesson has no content yet" icon={<BookOpen />} compact>
            <p>
              The lesson exists in the curriculum but its body has not been written. Rather than
              show an empty page, this is the honest state.
            </p>
          </EmptyState>
        )}

        {/*
          Practice (M2.4). Placed after the reading and before the remaining
          metadata: a learner reads the lesson, then does something with it. The
          section renders nothing when the lesson has no exercises, so a
          reading-only lesson is not given an empty "Practice" heading.
        */}
        <PracticeSection exercises={context.exercises} lessonId={lesson.id} />

        {/*
          Completion (M3). Placed after the reading and the practice, because that
          is the point at which a learner can honestly say they are done. It is an
          explicit act: opening the lesson does not complete it.
        */}
        <CompletionControl lessonId={lesson.id} />

        {/*
          Skills. Shown as plain labels, not links, because the skill pages do not
          exist yet. A link to a non-existent page is worse than a label — it
          promises a destination and 404s.
        */}
        {context.skills.length > 0 ? (
          <section className={styles.skills} aria-labelledby="skills-heading">
            <h2 id="skills-heading" className={styles.sectionTitle}>
              Skills in this lesson
            </h2>
            <ul className={styles.skillList}>
              {context.skills.map((skill) => (
                <li key={skill.id}>
                  <Badge label={skill.title} tone="neutral" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {context.related.length > 0 ? (
          <section className={styles.related} aria-labelledby="related-heading">
            <h2 id="related-heading" className={styles.sectionTitle}>
              Related lessons
            </h2>
            <LessonLinkList lessons={context.related} />
          </section>
        ) : null}
      </article>

      {/*
        Previous / next navigation, in the roadmap's order.
        Both are OPTIONAL: the first lesson has no previous and the last has no
        next, and rendering a disabled control there is worse than rendering
        nothing — a disabled arrow reads as "this should work but cannot".
      */}
      {previous || next ? (
        <nav className={styles.pager} aria-label="Lesson navigation">
          {previous ? (
            <Link
              to={`/lessons/${previous.id}`}
              className={`${styles.pagerLink} ${styles.pagerPrev}`}
            >
              <span className={styles.pagerDirection}>
                <Icon size="xs">
                  <ArrowLeft />
                </Icon>
                Previous
              </span>
              <span className={styles.pagerTitle}>{previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/lessons/${next.id}`} className={`${styles.pagerLink} ${styles.pagerNext}`}>
              <span className={styles.pagerDirection}>
                Next
                <Icon size="xs">
                  <ArrowRight />
                </Icon>
              </span>
              <span className={styles.pagerTitle}>{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      {/*
        Where this lesson sits. A plain statement of the module it belongs to,
        with a link back to the roadmap. Not a "you are here" trail repeated from
        the breadcrumb — it names the MODULE, which the breadcrumb does not.
      */}
      {module && roadmap ? (
        <p className={styles.filedUnder}>
          Part of <strong>{module.title}</strong> in{' '}
          <Link to={`/roadmaps/${roadmap.id}`} className={styles.filedLink}>
            {roadmap.title}
          </Link>
          .
        </p>
      ) : null}
    </div>
  )
}
