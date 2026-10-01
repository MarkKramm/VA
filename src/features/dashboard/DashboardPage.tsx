import { Link } from 'react-router'
import { ArrowRight, BookOpen, Compass, Route } from 'lucide-react'
import { allRoadmapSummaries, curriculumTotals, startingLessons } from '@/app/content.ts'
import { Badge } from '@/components/ui/Badge.tsx'
import { LinkButton } from '@/components/ui/Button.tsx'
import { Callout } from '@/components/ui/Callout.tsx'
import { Card, CardBody, CardHeader } from '@/components/ui/Card.tsx'
import { EmptyState } from '@/components/ui/EmptyState.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import { formatDuration } from '@/lib/cn.ts'
import styles from './DashboardPage.module.css'

/**
 * The dashboard.
 *
 * A learner's landing page.
 *
 * WHAT THIS IS NOT
 *
 * It is not a recommendations engine, not adaptive, not personalised, and it has
 * no streaks, achievements or analytics. All of those belong to later milestones
 * and `PLAN.md` §73 forbids building future features because the architecture
 * could support them. Notably there is NO "recommended next lesson" here, because
 * ranking content by what someone should do next is a recommendation engine, and
 * the honest M1 equivalent is the first lessons of the first roadmap — a fact
 * about the content, not a judgement about the learner.
 *
 * WHY IT CAN LOOK INTENTIONAL WITH 4 LESSONS
 *
 * Because nothing here pretends. The curriculum totals are stated plainly, the
 * draft status is shown rather than hidden, and where something does not exist
 * yet the page says so and links to what does. A dashboard that hid its own
 * emptiness would be the dishonest one — and per `AGENTS.md` the agent drafts and
 * the human edits, so surfacing "4 lessons, all drafts" is the accurate state of
 * a project in its first milestone.
 *
 * Data comes entirely from `src/app/content.ts`, because the ESLint boundary rule
 * stops a feature importing the registry directly.
 */

export const DashboardPage = () => {
  const summaries = allRoadmapSummaries()
  const totals = curriculumTotals()
  const starters = startingLessons(3)
  const primary = summaries[0]

  return (
    <div className={styles.page}>
      {/*
        The welcome region.
        Not a "hero": no oversized headline, no gradient, no call to action that
        pretends there is a product to try. It states where the learner is.
      */}
      <section className={styles.welcome} aria-labelledby="welcome-heading">
        <p className={styles.eyebrow}>Welcome</p>
        <h1 id="welcome-heading" className={styles.title}>
          Learn to work as a virtual assistant
        </h1>
        <p className={styles.lede}>
          Structured roadmaps that take you from complete beginner to job-ready, built around what a
          client actually needs you to be able to do.
        </p>
        <div className={styles.welcomeActions}>
          <LinkButton to="/roadmaps" variant="primary" size="lg">
            Browse roadmaps
            <Icon size="sm">
              <ArrowRight />
            </Icon>
          </LinkButton>
        </div>
      </section>

      {/*
        The honest state of the project.

        `status: draft` is per D9 — content is agent-drafted and human-edited, and
        nothing reaches `published` without a named reviewer. Showing it is
        accurate; hiding it would imply the material has been reviewed when it has
        not. The warning tone is a Callout rather than an error because it is
        information, not a problem.
      */}
      <Callout tone="info" title="This platform is being built in the open">
        <p>
          The curriculum currently holds {totals.roadmaps} roadmaps, {totals.modules} modules and{' '}
          {totals.lessons} lessons across {totals.careerPaths} career paths. Every lesson is a{' '}
          <strong>draft</strong>, written with AI assistance and awaiting human review.
        </p>
        <p>
          It grows in the open rather than arriving complete, so you can see exactly what exists and
          judge it for what it is.
        </p>
      </Callout>

      <div className={styles.columns}>
        {/*
          Roadmaps.

          `auto-fit` + `minmax` rather than a fixed column count: this reflows
          continuously from one column at 320 px to as many as fit at 1440 px, with
          no breakpoint anywhere in the file.
        */}
        <section className={styles.column} aria-labelledby="roadmaps-heading">
          <div className={styles.sectionHeader}>
            <h2 id="roadmaps-heading" className={styles.sectionTitle}>
              Roadmaps
            </h2>
            <Link to="/roadmaps" className={styles.sectionLink}>
              All roadmaps
              <Icon size="xs">
                <ArrowRight />
              </Icon>
            </Link>
          </div>

          {summaries.length === 0 ? (
            <EmptyState
              title="No roadmaps yet"
              icon={<Route />}
              compact
              action={
                <LinkButton to="/roadmaps" size="sm">
                  View roadmaps
                </LinkButton>
              }
            />
          ) : (
            <ul className={styles.cardGrid}>
              {summaries.map((summary) => (
                <li key={summary.roadmap.id}>
                  <Card as="div" interactive className={styles.roadmapCard}>
                    <CardHeader
                      title={summary.roadmap.title}
                      description={summary.roadmap.summary}
                      headingLevel={3}
                      actions={<Badge label={summary.roadmap.level} tone="outline" />}
                    />
                    <CardBody>
                      <dl className={styles.facts}>
                        <div className={styles.fact}>
                          <dt className={styles.factLabel}>Modules</dt>
                          <dd className={styles.factValue}>{summary.distinctModuleCount}</dd>
                        </div>
                        <div className={styles.fact}>
                          <dt className={styles.factLabel}>Lessons</dt>
                          <dd className={styles.factValue}>{summary.lessonCount}</dd>
                        </div>
                        <div className={styles.fact}>
                          <dt className={styles.factLabel}>Time</dt>
                          <dd className={styles.factValue}>
                            {summary.roadmap.estimatedWeeks}{' '}
                            {summary.roadmap.estimatedWeeks === 1 ? 'week' : 'weeks'}
                          </dd>
                        </div>
                      </dl>
                      <Link to={`/roadmaps/${summary.roadmap.id}`} className={styles.cardLink}>
                        Open roadmap
                        <Icon size="xs">
                          <ArrowRight />
                        </Icon>
                      </Link>
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className={styles.column}>
          {/*
            Where to start.

            The first lessons of the first roadmap, in content order. Framed as
            "the first lessons" rather than "recommended for you", because it is
            the former and claiming the latter would be a recommendation engine.
          */}
          <section aria-labelledby="start-heading">
            <div className={styles.sectionHeader}>
              <h2 id="start-heading" className={styles.sectionTitle}>
                Start here
              </h2>
            </div>
            {starters.length === 0 ? (
              <EmptyState title="No lessons have been written yet" icon={<BookOpen />} compact>
                <p>The first roadmap exists but has no lessons written for it yet.</p>
              </EmptyState>
            ) : (
              <ol className={styles.lessonList}>
                {starters.map((lesson, index) => (
                  <li key={lesson.id} className={styles.lessonItem}>
                    <span className={styles.lessonNumber} aria-hidden="true">
                      {index + 1}
                    </span>
                    <div className={styles.lessonText}>
                      <p className={styles.lessonTitle}>{lesson.title}</p>
                      <p className={styles.lessonMeta}>
                        {formatDuration(lesson.estimatedMinutes)} · {lesson.difficulty}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {primary ? (
              <div className={styles.startFooter}>
                <Link to={`/roadmaps/${primary.roadmap.id}`} className={styles.cardLink}>
                  Open {primary.roadmap.title}
                  <Icon size="xs">
                    <ArrowRight />
                  </Icon>
                </Link>
              </div>
            ) : null}
          </section>

          {/*
            Progress.

            Shown as an honest empty state rather than a 0% bar. Progress events
            are recorded by lesson and quiz interactions, and at M1 there are no
            lesson pages to complete, so there is nothing to record and a bar
            reading 0% would imply a tracking system that does not yet exist.

            The progress UI — and the event log behind it — is M3. This section is
            a placeholder for the concept, not a stub for the implementation.
          */}
          <section className={styles.progressSection} aria-labelledby="progress-heading">
            <div className={styles.sectionHeader}>
              <h2 id="progress-heading" className={styles.sectionTitle}>
                Your progress
              </h2>
            </div>
            <EmptyState title="No progress to show yet" icon={<Compass />} compact>
              <p>
                Progress tracking arrives once there are lessons to complete. It is stored in this
                browser only and is never uploaded.
              </p>
            </EmptyState>
          </section>
        </div>
      </div>

      {/*
        A plain note, not a disabled button. A disabled control reads as "this
        should work but cannot", which is the wrong message — this is a statement
        of policy, not an unavailable action.
      */}
      <p className={styles.footnote}>
        All curriculum content is drafted with AI assistance and reviewed by a human before
        publication.
      </p>
    </div>
  )
}
