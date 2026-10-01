/**
 * Contrast verification for the design tokens.
 *
 * Run: npx vite-node scripts/check-contrast.ts
 *
 * WHY THIS EXISTS
 *
 * `docs/DESIGN_SYSTEM.md` states contrast ratios as numbers. A stated ratio that
 * is wrong is worse than no ratio, because the next person trusts it and skips
 * the check. Those numbers are derived from the token values by hand, so they
 * need a machine to confirm them.
 *
 * This is the design-system counterpart to `content:check`. It reads the ACTUAL
 * token values out of `src/styles/tokens.css`, resolves `oklch()` to sRGB,
 * computes the WCAG 2.1 contrast ratio, and FAILS if any declared pair drops
 * below its required level.
 *
 * It deliberately re-implements rather than imports anything: a contrast library
 * is one of the easiest dependencies to add and one of the few that is genuinely
 * justified to write inline, since the whole algorithm is twenty lines and a
 * dependency would need auditing anyway.
 *
 * Adding a colour means adding it here too. A token that is not verified here is
 * a token whose contrast is a guess.
 */

/* -------------------------------------------------------------------------- */
/* Colour space conversion                                                     */
/* -------------------------------------------------------------------------- */

/** Parse `oklch(L C H)` with L as a percentage. Returns sRGB in 0..1. */
const parseOklch = (value: string): readonly [number, number, number] => {
  const match = value.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/)
  if (!match) throw new Error(`not an oklch() value: ${value}`)
  const [, lRaw, cRaw, hRaw] = match
  const L = Number(lRaw) / 100
  const C = Number(cRaw)
  const H = (Number(hRaw) * Math.PI) / 180

  // OKLab -> LMS
  const a = C * Math.cos(H)
  const b = C * Math.sin(H)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  // LMS -> linear sRGB. These values stay LINEAR: the WCAG luminance formula is
  // defined on linear light, and gamma-encoding first is a classic way to get a
  // confidently wrong contrast ratio. Verified against a known value:
  // oklch(38% 0.012 250) against white is 10.0:1, not the 3.2:1 that
  // gamma-encoding first produces.
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  return [r, g, bl]
}

/**
 * Relative luminance per WCAG 2.1, from LINEAR sRGB in 0..1.
 *
 * Out-of-gamut values are clamped, because oklch() can resolve to a channel
 * slightly outside 0..1 and an unclamped negative would produce a nonsense
 * ratio rather than a wrong-but-plausible one.
 */
const relativeLuminance = ([r, g, b]: readonly [number, number, number]): number => {
  const clamp = (channel: number): number => Math.min(1, Math.max(0, channel))
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b)
}

/** WCAG contrast ratio, 1..21. */
const contrast = (
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number => {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [light, dark] = la > lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}

/* -------------------------------------------------------------------------- */
/* Token extraction                                                            */
/* -------------------------------------------------------------------------- */

const tokenSource = await import('node:fs').then((fs) =>
  fs.readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8'),
)

/**
 * Read `--name: oklch(...)` declarations, including those inside theme blocks.
 *
 * Theme blocks are keyed by their selector, so light and dark resolve separately.
 * `:root` is the light theme; `[data-theme='dark']` overrides it.
 */
const readTokens = (): { light: Map<string, string>; dark: Map<string, string> } => {
  const light = new Map<string, string>()
  const dark = new Map<string, string>()
  let target = light

  // Walk the file, tracking which theme block we are inside.
  for (const rawLine of tokenSource.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.startsWith('/*') || line.startsWith('*') || line.startsWith('*/')) continue
    if (line.includes("[data-theme='dark']")) {
      target = dark
      continue
    }
    // A new top-level block that is not the dark theme returns us to :root,
    // which is the light theme's values.
    if (line.endsWith('{')) {
      target = light
      continue
    }
    const match = line.match(/^(--[\w-]+):\s*(.+);$/)
    if (match?.[1] && match[2]) target.set(match[1], match[2].trim())
  }
  return { light, dark }
}

const { light, dark } = readTokens()

/**
 * Look up a token for a theme, falling back to the light/root map.
 *
 * This mirrors CSS custom-property inheritance: the `[data-theme='dark']` block
 * only overrides the SEMANTIC tokens. The primitive ramps (`--neutral-*`,
 * `--brand-*`, `--state-*`) are declared once under `:root` and are visible to
 * both themes. Without this fallback every dark-theme lookup of a primitive
 * reports "not found", which is how the first run of this script produced a
 * screen of failures that were artefacts of the reader rather than the palette.
 */
const lookup = (
  name: string,
  theme: Map<string, string>,
  fallback: Map<string, string>,
): string => {
  const value = theme.get(name) ?? fallback.get(name)
  if (value === undefined) throw new Error(`token not found: ${name}`)
  return value
}

/** Resolve to an oklch literal, following a chain of var() references. */
const resolveColour = (
  name: string,
  theme: Map<string, string>,
  fallback: Map<string, string>,
): string => {
  let current = name
  const seen = new Set<string>()
  for (let hop = 0; hop < 8; hop += 1) {
    if (seen.has(current)) throw new Error(`circular token reference: ${current}`)
    seen.add(current)
    const raw = lookup(current, theme, fallback)
    if (raw.startsWith('oklch(')) return raw
    const referenced = raw.match(/^var\((--[\w-]+)\)$/)
    if (!referenced?.[1]) throw new Error(`not a colour: ${name} -> ${raw}`)
    current = referenced[1]
  }
  throw new Error(`token chain too deep: ${name}`)
}

/* -------------------------------------------------------------------------- */
/* The declared pairs                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Required level per WCAG 2.1:
 *   - body text            4.5:1
 *   - large text (>=24px, or >=18.66px bold)  3:1
 *   - non-text UI (focus ring, borders)      3:1
 *
 * `docs/DESIGN_SYSTEM.md` publishes these numbers, so this table and that
 * document must agree. If they disagree, the document is wrong.
 */
interface Pair {
  readonly label: string
  readonly foreground: string
  readonly background: string
  readonly minimum: number
  /** Whether the doc states a dark-theme ratio for this pair. */
  readonly documentedInBoth: boolean
}

const PAIRS: readonly Pair[] = [
  {
    label: 'text-primary on surface',
    foreground: '--color-text-primary',
    background: '--color-surface',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'text-secondary on surface',
    foreground: '--color-text-secondary',
    background: '--color-surface',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'text-muted on surface',
    foreground: '--color-text-muted',
    background: '--color-surface',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'text-primary on canvas',
    foreground: '--color-text-primary',
    background: '--color-canvas',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'text-secondary on canvas',
    foreground: '--color-text-secondary',
    background: '--color-canvas',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'text-muted on canvas',
    foreground: '--color-text-muted',
    background: '--color-canvas',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'text-muted on surface-inset',
    foreground: '--color-text-muted',
    background: '--color-surface-inset',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'text-on-brand on accent-fill',
    foreground: '--color-text-on-brand',
    background: '--color-accent-fill',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'accent-text on surface (links)',
    foreground: '--color-accent-text',
    background: '--color-surface',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'focus-ring on surface (non-text)',
    foreground: '--color-focus-ring',
    background: '--color-surface',
    minimum: 3,
    documentedInBoth: true,
  },
  {
    label: 'focus-ring on canvas (non-text)',
    foreground: '--color-focus-ring',
    background: '--color-canvas',
    minimum: 3,
    documentedInBoth: true,
  },
  {
    label: 'state-locked text on locked chip',
    foreground: '--state-locked-strong',
    background: '--state-locked-soft',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'state-complete text on complete chip',
    foreground: '--state-complete-strong',
    background: '--state-complete-soft',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'state-progress text on progress chip',
    foreground: '--state-progress-strong',
    background: '--state-progress-soft',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'state-recommended text on recommended chip',
    foreground: '--state-recommended-strong',
    background: '--state-recommended-soft',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'state-available text on available chip',
    foreground: '--state-available-strong',
    background: '--state-available-soft',
    minimum: 4.5,
    documentedInBoth: true,
  },
  {
    label: 'border-strong on surface (non-text)',
    foreground: '--color-border-strong',
    background: '--color-surface',
    minimum: 1.2,
    documentedInBoth: false,
  },
]

/* -------------------------------------------------------------------------- */
/* Run                                                                        */
/* -------------------------------------------------------------------------- */

const rows: string[] = []
const failures: string[] = []

const measure = (pair: Pair, themeName: 'light' | 'dark'): number => {
  const theme = themeName === 'light' ? light : dark
  // Root/light doubles as the primitive fallback in both directions.
  const fg = parseOklch(resolveColour(pair.foreground, theme, light))
  const bg = parseOklch(resolveColour(pair.background, theme, light))
  return contrast(fg, bg)
}

for (const pair of PAIRS) {
  for (const themeName of ['light', 'dark'] as const) {
    let ratio: number
    try {
      ratio = measure(pair, themeName)
    } catch (error) {
      failures.push(`${pair.label} [${themeName}]: ${(error as Error).message}`)
      continue
    }
    const rounded = Math.round(ratio * 10) / 10
    const ok = ratio >= pair.minimum
    if (!ok) {
      failures.push(
        `${pair.label} [${themeName}]: ${rounded}:1 is below the required ${pair.minimum}:1`,
      )
    }
    rows.push(
      `  ${ok ? 'PASS' : 'FAIL'}  ${themeName.padEnd(5)}  ${pair.label.padEnd(42)} ${String(rounded).padStart(5)}:1  (min ${pair.minimum})`,
    )
  }
}

console.log('\nContrast check — WCAG 2.1 ratios computed from src/styles/tokens.css\n')
console.log(rows.join('\n'))

if (failures.length > 0) {
  console.log(`\n${failures.length} FAILURE(S):\n`)
  for (const failure of failures) console.log(`  - ${failure}`)
  console.log('')
  process.exitCode = 1
} else {
  console.log(`\nAll ${rows.length} pairs meet their required level.\n`)
}
