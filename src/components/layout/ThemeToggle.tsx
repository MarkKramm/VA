import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/app/providers/ThemeProvider.tsx'
import type { ThemePreference } from '@/app/storage/theme.ts'
import { Icon } from '@/components/icons/Icon.tsx'
import styles from './ThemeToggle.module.css'

/**
 * Theme toggle.
 *
 * Cycles light -> dark -> system.
 *
 * WHY A CYCLE RATHER THAN A THREE-STATE SELECT
 *
 * A segmented control of three labelled options is more explicit, and it is the
 * right answer for a settings page. This is not a settings page — it is a control
 * that has to fit in a 3.5rem header on a 375 px screen without pushing the logo
 * off. A cycle fits; a three-way control does not.
 *
 * The cost is that the current state is not visible at rest, so the accessible
 * name states it explicitly ("Theme: system. Change theme") rather than relying on
 * the icon. Screen-reader and tooltip users get the same information as everyone
 * else, which is the requirement.
 *
 * The icons are `aria-hidden` (the Icon wrapper's default) and the meaning comes
 * from the label.
 */

/**
 * The cycle order: light -> dark -> system -> light.
 *
 * Declared here rather than derived by incrementing an index, so the mapping is
 * explicit and adding a preference cannot silently reorder the others. `system`
 * is last because it is the least committal choice, and a learner who has not
 * chosen should not have to pass through a choice to get back to default.
 */
const NEXT: Record<ThemePreference, ThemePreference> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const LABEL: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

const ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const

export const ThemeToggle = () => {
  const { preference, setPreference } = useTheme()
  const IconComponent = ICONS[preference]

  return (
    <button
      type="button"
      // Uses the local NEXT map rather than the provider's `cycle`, so the
      // accessible name below can state the value it is about to become. The
      // provider keeps `cycle` for callers that only need to advance.
      onClick={() => setPreference(NEXT[preference])}
      className={styles.toggle}
      // States the current value AND the value it will become. The visible icon
      // only shows the current theme, so without this a screen-reader user cannot
      // tell where one press lands.
      aria-label={`Theme: ${LABEL[preference].toLowerCase()}. Switch to ${LABEL[NEXT[preference]].toLowerCase()}.`}
      title={`Theme: ${LABEL[preference]}`}
    >
      <Icon size="md">
        <IconComponent />
      </Icon>
      {/* Visible only to assistive tech: the icon alone is not a reliable signal,
          and a sighted user gets the value from the tooltip. */}
      <span className={styles.srOnly}>{LABEL[preference]}</span>
    </button>
  )
}
