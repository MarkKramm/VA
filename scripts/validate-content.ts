/**
 * `npm run content:check`
 *
 * A standalone validator: no dev server, no test runner, no browser. It runs
 * through vite-node so the content plugin's virtual module â€? a Vite transform,
 * not a Node feature â€? resolves the same way it does in the app and in tests.
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

/**
 * "3 questions", "1 quiz" ¡ª the summary reads as prose, so the counts are
 * pluralised. The plural is a parameter because English is not regular
 * (`quiz` ¡ú `quizzes`), and a helper that guessed would be wrong the first time
 * a collection ended in `y` or `s`.
 */
const count = (n: number, singular: string, plural = `${singular}s`): string =>
  `${n} ${n === 1 ? singular : plural}`

process.stdout.write('\n')
process.stdout.write('Content validation\n')
process.stdout.write('==================\n\n')

process.stdout.write(
  `Loaded ${count(summary.counts.careerPaths, 'career path')}, ` +
    `${count(summary.counts.roadmaps, 'roadmap')}, ` +
    `${count(summary.counts.modules, 'module')}, ` +
    `${count(summary.counts.lessons, 'lesson')}, ` +
    `${count(summary.counts.exercises, 'exercise')}, ` +
    `${count(summary.counts.questions, 'question')}, ` +
    `${count(summary.counts.quizzes, 'quiz', 'quizzes')}, ` +
    `${count(summary.counts.skills, 'skill')}\n`,
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
        `(${issues.length}) â€? ${rule}\n`,
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
