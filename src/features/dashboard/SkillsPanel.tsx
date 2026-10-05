import { Sparkles } from 'lucide-react'
import {
  evidenceCounts,
  skillEvidenceOverview,
  type EvidenceTier,
} from '@/app/learning/evidence.ts'
import { useProgressState } from '@/app/progress/ProgressProvider.tsx'
import { Badge } from '@/components/ui/Badge.tsx'
import { EmptyState } from '@/components/ui/EmptyState.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import styles from './SkillsPanel.module.css'

/**
 * Skill evidence, on the dashboard (M5).
 *
 * THE POINT OF THIS PANEL IS THE DISTINCTION, NOT THE COUNT
 *
 * `docs/DATA_MODEL.md` defines three tiers, and the whole reason they exist is
 * that reading a lesson is not competence. So the panel names the tier in words
 * for every skill and says plainly that only "Demonstrated" means a scored check
 * was passed — a learner who has read six lessons has learned nothing the
 * platform can vouch for, and a panel that blurred the three into one progress
 * bar would be lying to them.
 *
 * Deliberately small: no percentages, no levels, no ranking, no streak. Skills
 * the learner has not met are not listed at all, because a wall of "not started"
 * is noise rather than information.
 */

const TIER_LABEL: Record<Exclude<EvidenceTier, 'none'>, string> = {
  exposed: 'Read',
  practised: 'Practised',
  demonstrated: 'Demonstrated',
}

export const SkillsPanel = () => {
  const state = useProgressState()
  const overview = skillEvidenceOverview(state)
  const counts = evidenceCounts(state)

  if (overview.length === 0) {
    return (
      <EmptyState title="No skills yet" icon={<Sparkles />} compact>
        <p>
          Skills appear here once you have read a lesson that teaches one. Passing a quiz or a
          practical assessment is what demonstrates a skill — reading one is not.
        </p>
      </EmptyState>
    )
  }

  return (
    <>
      <p className={styles.counts}>
        <span className={styles.count}>{counts.demonstrated} demonstrated</span>
        <span className={styles.count}>{counts.practised} practised</span>
        <span className={styles.count}>{counts.exposed} read</span>
      </p>

      <ul className={styles.skills}>
        {overview.map(({ skill, tier }) => (
          <li key={skill.id} className={styles.skill}>
            <span className={styles.name}>{skill.title}</span>
            {/* A word, not a colour: the tier is the meaning. */}
            <Badge label={TIER_LABEL[tier as Exclude<EvidenceTier, 'none'>]} tone="neutral" />
            {skill.gloss ? <span className={styles.gloss}>{skill.gloss}</span> : null}
          </li>
        ))}
      </ul>

      <p className={styles.note}>
        <Icon size="xs">
          <Sparkles />
        </Icon>
        Only “Demonstrated” means a scored check was passed. Reading and practising are the steps
        before it, and are not evidence of competence on their own.
      </p>
    </>
  )
}
