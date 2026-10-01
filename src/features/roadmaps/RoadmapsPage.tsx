import { useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Route } from 'lucide-react'
import { allRoadmapSummaries, careerPathGroups } from '@/app/content.ts'
import { Badge } from '@/components/ui/Badge.tsx'
import { LinkButton } from '@/components/ui/Button.tsx'
import { Card, CardBody, CardHeader } from '@/components/ui/Card.tsx'
import { EmptyState } from '@/components/ui/EmptyState.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import styles from './RoadmapsPage.module.css'

/**
 * The roadmaps index.
 *
 * Lists every roadmap, grouped under the career path it belongs to.
 *
 * WHY GROUP BY CAREER PATH
 *
 * The registry already derives `careerPath -> roadmaps`, and a roadmap's career
 * path is a validated id reference rather than a label (D1). Grouping therefore
 * needs no new content and cannot be wrong. It also communicates the taxonomy a
 * learner will navigate by later — which is `ARCHITECTURE.md`'s point that the UI
 * should make the information architecture visible early, without building the
 * later pages that fill it in.
 *
 * A roadmap with no career-path record is not silently dropped: the section
 * below the grouped ones catches it, because an invisible roadmap is the failure
 * mode of a group-by implementation.
 */

/** Maps the lane enum to a human label. */
const LANE_LABEL = {
  employment: 'Employment',
  freelance: 'Freelance',
  both: 'Employment & freelance',
} as const

export const RoadmapsPage = () => {
  const groups = useMemo(() => careerPathGroups(), [])
  const summaries = useMemo(() => allRoadmapSummaries(), [])

  // Roadmaps not covered by any group. Expected to be empty — referential
  // integrity forbids it — but rendered rather than assumed, so a content mistake
  // is visible instead of invisible.
  const groupedIds = useMemo(
    () => new Set(groups.flatMap((group) => group.roadmaps.map((roadmap) => roadmap.id))),
    [groups],
  )
  const ungrouped = summaries.filter((summary) => !groupedIds.has(summary.roadmap.id))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Roadmaps</h1>
        <p className={styles.lede}>
          Each roadmap is an ordered path through modules that already exist, so the same material
          can appear in more than one path without being duplicated.
        </p>
      </header>

      {summaries.length === 0 ? (
        <EmptyState
          title="No roadmaps have been written yet"
          icon={<Route />}
          action={
            <LinkButton to="/" variant="secondary">
              Back to the dashboard
            </LinkButton>
          }
        >
          <p>Once roadmaps are authored they will be listed here, grouped by career path.</p>
        </EmptyState>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) =>
            group.roadmaps.length === 0 ? null : (
              <section key={group.careerPath.id} aria-labelledby={`path-${group.careerPath.id}`}>
                <div className={styles.groupHeader}>
                  <h2 id={`path-${group.careerPath.id}`} className={styles.groupTitle}>
                    {group.careerPath.title}
                  </h2>
                  <p className={styles.groupSummary}>{group.careerPath.summary}</p>
                </div>
                <ul className={styles.list}>
                  {group.roadmaps.map((roadmap) => {
                    const summary = summaries.find((entry) => entry.roadmap.id === roadmap.id)
                    if (!summary) return null
                    return (
                      <li key={roadmap.id}>
                        <Card as="div" interactive className={styles.card}>
                          <CardHeader
                            title={roadmap.title}
                            description={roadmap.summary}
                            headingLevel={3}
                            actions={
                              <div className={styles.badges}>
                                <Badge label={roadmap.level} tone="outline" />
                                <Badge label={LANE_LABEL[roadmap.lane]} tone="accent" />
                              </div>
                            }
                          />
                          <CardBody>
                            {/*
                              Counts come from the registry's derived indexes via
                              `summariseRoadmap`, so they cannot drift from the
                              content. `distinctModuleCount` rather than
                              `moduleCount`, because `beginner-va` references one
                              module in two stages and counting it twice would
                              overstate the work.
                            */}
                            <ul className={styles.facts}>
                              <li>
                                <span className={styles.factValue}>
                                  {summary.distinctModuleCount}
                                </span>{' '}
                                <span className={styles.factLabel}>modules</span>
                              </li>
                              <li>
                                <span className={styles.factValue}>{summary.lessonCount}</span>{' '}
                                <span className={styles.factLabel}>lessons</span>
                              </li>
                              <li>
                                <span className={styles.factValue}>{roadmap.estimatedWeeks}</span>{' '}
                                <span className={styles.factLabel}>
                                  {roadmap.estimatedWeeks === 1 ? 'week' : 'weeks'}
                                </span>
                              </li>
                            </ul>
                            <Link to={`/roadmaps/${roadmap.id}`} className={styles.cardLink}>
                              Open roadmap
                              <Icon size="xs">
                                <ArrowRight />
                              </Icon>
                            </Link>
                          </CardBody>
                        </Card>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ),
          )}

          {ungrouped.length > 0 ? (
            <section aria-labelledby="path-ungrouped">
              <h2 id="path-ungrouped" className={styles.groupTitle}>
                Other roadmaps
              </h2>
              <ul className={styles.list}>
                {ungrouped.map((summary) => (
                  <li key={summary.roadmap.id}>
                    <Link to={`/roadmaps/${summary.roadmap.id}`}>{summary.roadmap.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
