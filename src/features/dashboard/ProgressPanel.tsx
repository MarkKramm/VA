import { Link } from 'react-router'
import { ArrowRight, Compass } from 'lucide-react'
import { allRoadmapSummaries } from '@/app/content.ts'
import {
  continueLearning,
  curriculumProgress,
  roadmapLessonProgress,
} from '@/app/progress/composition.ts'
import { useProgressState } from '@/app/progress/ProgressProvider.tsx'
import { ProgressBar } from '@/components/ui/ProgressBar.tsx'
import { EmptyState } from '@/components/ui/EmptyState.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import { formatDuration } from '@/lib/cn.ts'
import { DataTransfer } from './DataTransfer.tsx'
import styles from './ProgressPanel.module.css'

/**
 * The learner's progress (M3).
 *
 * WHAT IT SHOWS, AND WHY ONLY THIS
 *
 * Real state the domain already models: lessons completed, exercises practised,
 * overall curriculum progress, per-roadmap progress, and the lesson to resume.
 * Nothing is fabricated — no XP, no levels, no streaks, no achievements, no
 * "recommended for you", no weak areas. Those belong to later milestones and are
 * recorded in `BACKLOG.md`; a dashboard that invented them would be the dishonest
 * kind, which is exactly what the M1 version of this section refused to be.
 *
 * THE EMPTY STATE IS A REAL STATE
 *
 * A learner with no events sees an explanation, not a 0% bar. A bar reading 0%
 * implies a tracking system that has noticed them doing nothing; an honest empty
 * state says what to do to change it. The distinction is driven by
 * `events.length`, not by the completion count — viewing a lesson and completing
 * nothing is a real, different state.
 */

export const ProgressPanel = () => {
  const state = useProgressState()
  const progress = curriculumProgress(state)
  const resume = continueLearning(state)
  const started = state.events.length > 0

  // Only roadmaps that actually have lessons get a line — a 0 of 0 would mean
  // "nothing here yet", which is not progress.
  const roadmapsWithLessons = allRoadmapSummaries().filter((summary) => summary.lessonCount > 0)

  return (
    <div className={styles.panel}>
      {started ? (
        <>
          <ProgressBar
            value={progress.ratio}
            label={`${progress.completed} of ${progress.total} lessons complete`}
            state={progress.total > 0 && progress.ratio === 1 ? 'complete' : 'in-progress'}
          />

          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Lessons completed</dt>
              <dd className={styles.factValue}>{progress.completed}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Exercises practised</dt>
              <dd className={styles.factValue}>{progress.practisedLessons}</dd>
            </div>
          </dl>

          {resume ? (
            <div className={styles.resume}>
              <p className={styles.resumeLabel}>Continue learning</p>
              <Link to={`/lessons/${resume.id}`} className={styles.resumeLink}>
                {resume.title}
                <Icon size="xs">
                  <ArrowRight />
                </Icon>
              </Link>
              <p className={styles.resumeMeta}>{formatDuration(resume.estimatedMinutes)}</p>
            </div>
          ) : null}

          {roadmapsWithLessons.length > 0 ? (
            <ul className={styles.roadmaps}>
              {roadmapsWithLessons.map((summary) => {
                const roadmapProgress = roadmapLessonProgress(state, summary.roadmap.id)
                if (!roadmapProgress) return null
                return (
                  <li key={summary.roadmap.id} className={styles.roadmap}>
                    <Link to={`/roadmaps/${summary.roadmap.id}`} className={styles.roadmapLink}>
                      {summary.roadmap.title}
                    </Link>
                    <ProgressBar
                      value={roadmapProgress.ratio}
                      size="sm"
                      label={`${roadmapProgress.completed} of ${roadmapProgress.total} lessons complete`}
                    />
                  </li>
                )
              })}
            </ul>
          ) : null}
        </>
      ) : (
        <EmptyState title="No progress to show yet" icon={<Compass />} compact>
          <p>
            Open a lesson and mark it complete, and your progress will appear here. It is stored in
            this browser only and is never uploaded.
          </p>
        </EmptyState>
      )}

      {/*
        The data controls are shown to EVERY learner, including one with no
        progress: importing a saved file is exactly how a learner restores their
        work on a new device, and hiding the control until they have progress
        would make that impossible.
      */}
      <DataTransfer />
    </div>
  )
}
