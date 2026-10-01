/**
 * `npm run content:check`
 *
 * A standalone validator: no dev server, no test runner, no browser. It runs
 * through vite-node so the content plugin's virtual module — a Vite transform,
 * not a Node feature — resolves the same way it does in the app and in tests.
 *
 * A reference that does not resolve fails the build here rather than producing a
 * broken page for a learner. Content errors get their own named CI step so they
 * are visible in the log rather than hidden inside a failing test run.
 */
import { registry } from '../src/content/registry.ts'
import { validateRegistry, type Severity } from '../src/content/validation.ts'

const summary = validateRegistry(registry)

const ICON: Record<Severity, string> = { error: 'x', warning: '!', info: 'i' }
const COLOUR: Record<Severity, string> = { error: '[31m', warning: '[33m', info: '[36m' }
const RESET = '[0m'

const formatKb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`

process.stdout.write('\n')
process.stdout.write('Content validation\n')
process.stdout.write('==================\n\n')

process.stdout.write(
  `Loaded ${summary.counts.careerPaths} career paths, ${summary.counts.roadmaps} roadmaps, ` +
    `${summary.counts.modules} modules, ${summary.counts.lessons} lessons, ${summary.counts.skills} skills\n`,
)
process.stdout.write(`Content payload (bodies): ${formatKb(summary.payloadBytes)}\n`)
process.stdout.write(`Pending collections: ${registry.pendingCollections.join(', ')}\n\n`)

if (summary.issues.length === 0) {
  process.stdout.write('No issues found.\n\n')
} else {
  const grouped = new Map<string, typeof summary.issues>()
  for (const issue of summary.issues) {
    const key = `${issue.severity}:${issue.rule}`
    grouped.set(key, [...(grouped.get(key) ?? []), issue])
  }

  for (const [key, issues] of grouped) {
    const [severity = 'info', rule = 'unknown'] = key.split(':')
    process.stdout.write(
      `${COLOUR[severity as Severity] ?? ''}${ICON[severity as Severity] ?? '?'} ${severity.toUpperCase()}${RESET} ` +
        `(${issues.length}) — ${rule}\n`,
    )
    for (const issue of issues) {
      process.stdout.write(`    ${issue.path}\n`)
      process.stdout.write(`      ${issue.field}: ${issue.message}\n`)
    }
    process.stdout.write('\n')
  }
}

process.stdout.write(`${summary.errors} error(s), ${summary.warnings} warning(s)\n\n`)

if (summary.errors > 0) process.exit(1)
