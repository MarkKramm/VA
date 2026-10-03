/**
 * Content fixtures.
 *
 * Validation and the quality checks are pure functions over a registry, so they
 * are tested against constructed data rather than against files on disk. That is
 * deliberate: it is the only practical way to test the *invalid* cases, which
 * are the ones that matter.
 */

export const validCareerPath = (overrides: Record<string, unknown> = {}) => ({
  id: 'data',
  title: 'Data and Research',
  summary: 'Roles built around accurate data handling and structured research.',
  order: 0,
  status: 'draft' as const,
  updatedAt: '2026-10-01',
  ...overrides,
})

export const validSkill = (overrides: Record<string, unknown> = {}) => ({
  id: 'data-cleaning',
  title: 'Data Cleaning',
  gloss: 'Making a messy spreadsheet reliable enough to use.',
  parent: 'data',
  relation: 'contains' as const,
  order: 0,
  ...overrides,
})

/** The parent skill. Every other fixture skill hangs off this. */
export const rootSkill = (overrides: Record<string, unknown> = {}) =>
  validSkill({ id: 'data', parent: undefined, order: 1, ...overrides })

/** The leaf skill that the fixture lesson and module both reference. */
export const leafSkill = (overrides: Record<string, unknown> = {}) =>
  validSkill({ id: 'data-cleaning', parent: 'data', ...overrides })

export const validLesson = (overrides: Record<string, unknown> = {}) => ({
  id: 'cleaning-a-spreadsheet',
  title: 'Cleaning a Spreadsheet',
  summary: 'Fixing inconsistent formatting, duplicates and errors in a dataset.',
  objectives: ['Remove duplicate rows', 'Standardise date formats'],
  topics: [],
  skills: ['data-cleaning'],
  tools: [],
  resources: [],
  prerequisites: [],
  difficulty: 'beginner' as const,
  estimatedMinutes: 12,
  exercises: ['clean-a-sheet'],
  quiz: 'cleaning-basics',
  status: 'draft' as const,
  updatedAt: '2026-10-01',
  ...overrides,
})

/**
 * The exercise the fixture lesson references by default (`clean-a-sheet`).
 *
 * A valid content set must include it: `lesson.exercises` is checked
 * unconditionally against the exercise collection, so a lesson that references
 * an exercise the set does not contain is now a referential-integrity error —
 * which is the point of the fail-closed rule, not an accident of the fixture.
 */
export const validExercise = (overrides: Record<string, unknown> = {}) => ({
  id: 'clean-a-sheet',
  title: 'Clean a Messy Sheet',
  summary: 'Remove duplicate rows and standardise date formats in a small dataset.',
  difficulty: 'beginner' as const,
  estimatedMinutes: 15,
  deliverable: 'A cleaned spreadsheet with no duplicate rows and a single date format.',
  selfCheck: ['No duplicate rows remain', 'Every date uses the same format'],
  skills: ['data-cleaning'],
  status: 'draft' as const,
  updatedAt: '2026-10-01',
  ...overrides,
})

export const validModule = (overrides: Record<string, unknown> = {}) => ({
  id: 'data-cleaning',
  title: 'Data Cleaning',
  summary: 'Fixing inconsistent formatting, duplicates and errors in a dataset.',
  outcome: 'Clean a spreadsheet with duplicate and inconsistent rows.',
  lessons: ['cleaning-a-spreadsheet'],
  skills: ['data-cleaning'],
  tools: [],
  topics: [],
  kind: 'specialization' as const,
  estimatedMinutes: 20,
  status: 'draft' as const,
  updatedAt: '2026-10-01',
  ...overrides,
})

export const validRoadmap = (overrides: Record<string, unknown> = {}) => ({
  id: 'data-entry-va',
  title: 'Data Entry VA',
  summary: 'A roadmap for accurate data work and the habits that make it reliable.',
  careerPath: 'data',
  lane: 'both' as const,
  stages: [{ kind: 'specialization' as const, modules: ['data-cleaning'] }],
  outcomes: [
    {
      statement: 'Clean a spreadsheet with duplicate and inconsistent rows',
      evidence: [{ kind: 'quiz' as const, id: 'cleaning-basics' }],
      weight: 1,
    },
  ],
  estimatedWeeks: 2,
  level: 'beginner' as const,
  status: 'draft' as const,
  updatedAt: '2026-10-01',
  ...overrides,
})
