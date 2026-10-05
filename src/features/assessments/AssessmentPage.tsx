import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ClipboardCheck, Clock, ListChecks } from 'lucide-react'
import { assessmentContext } from '@/app/content.ts'
import {
  assessmentGate,
  scoreSelfAssessment,
  type AssessmentResult,
} from '@/app/learning/assessment.ts'
import { useProgressActions, useProgressState } from '@/app/progress/ProgressProvider.tsx'
import { newEventId } from '@/app/storage/merge.ts'
import { summariseAttempts } from '@domain/progress/selectors.ts'
import { Badge } from '@/components/ui/Badge.tsx'
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs.tsx'
import { Button, LinkButton } from '@/components/ui/Button.tsx'
import { Callout } from '@/components/ui/Callout.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import { NotFoundPage } from '@/features/roadmaps/NotFoundPage.tsx'
import styles from './AssessmentPage.module.css'

/**
 * A practical assessment (M5).
 *
 * THE HONEST BIT, FIRST
 *
 * The platform cannot inspect a learner's work: there is no backend to put a file
 * in (`docs/ARCHITECTURE.md` lists upload as a deliberate non-feature) and no
 * automated evaluator. So the rubric is published, the learner marks the lines
 * they met, and the result is recorded as `evaluatedBy: 'self'`. The page says so
 * in words, before and after submission, because a self-report presented as a
 * marked result would be the single most dishonest thing this product could do.
 *
 * THE ONE HARD LOCK
 *
 * `assessmentGate` refuses until every prerequisite lesson is complete — and
 * practised, where it has something to practise. That is the platform's only
 * refusal, and `docs/DATA_MODEL.md` reserves it for claiming a demonstrated
 * outcome. The task itself stays READABLE while locked: the learner can see what
 * is expected and even do the work, they simply cannot record a pass until the
 * groundwork is done. Hiding the task would be a wall; hiding the outcome is a
 * gate.
 *
 * WHAT SUBMITTING DOES
 *
 * Exactly one `assessment.attempted` event, in the click handler — never in an
 * effect, so a re-render cannot record a second attempt. Marking criteria before
 * submitting records nothing at all.
 */

export const AssessmentPage = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const progress = useProgressState()
  const actions = useProgressActions()
  const [metCriteria, setMetCriteria] = useState<readonly string[]>([])
  const [result, setResult] = useState<AssessmentResult | undefined>(undefined)

  const context = assessmentId ? assessmentContext(assessmentId) : undefined
  if (!context || !assessmentId) return <NotFoundPage />

  const gate = assessmentGate(progress, assessmentId)
  const attempts = progress.derived.assessmentAttempts[assessmentId] ?? []
  const summary = summariseAttempts(attempts)

  const toggleCriterion = (criterionId: string) => {
    setMetCriteria((previous) =>
      previous.includes(criterionId)
        ? previous.filter((id) => id !== criterionId)
        : [...previous, criterionId],
    )
  }

  const submit = () => {
    const marked = scoreSelfAssessment(assessmentId, context.criteria, metCriteria)
    setResult(marked)
    actions.submitAssessmentAttempt({
      assessmentId,
      attemptId: newEventId(),
      score: marked.score,
      maxScore: marked.maxScore,
      passed: marked.passed,
      evaluatedBy: marked.evaluatedBy,
    })
  }

  /** Start a fresh attempt. History is untouched — a retry adds, never replaces. */
  const retry = () => {
    setMetCriteria([])
    setResult(undefined)
  }

  const roadmap = context.roadmaps[0]
  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    ...(roadmap ? [{ label: roadmap.title, to: `/roadmaps/${roadmap.id}` }] : []),
    { label: context.title },
  ]

  return (
    <div className={styles.page}>
      <Breadcrumbs items={crumbs} />

      <article className={styles.article}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>
            <Icon size="sm">
              <ClipboardCheck />
            </Icon>
            Practical assessment
          </p>
          <h1 className={styles.title}>{context.title}</h1>
          <p className={styles.summary}>{context.summary}</p>
          <ul className={styles.badges}>
            <li>
              <Badge label={context.difficulty} tone="neutral" />
            </li>
            <li>
              <Badge
                label={`about ${context.estimatedMinutes} minutes`}
                tone="neutral"
                icon={
                  <Icon size="xs">
                    <Clock />
                  </Icon>
                }
              />
            </li>
          </ul>
          <p className={styles.purpose}>{context.purpose}</p>
          {attempts.length > 0 ? (
            <p className={styles.history}>
              {attempts.length === 1 ? 'Attempted once' : `Attempted ${attempts.length} times`} ·{' '}
              {summary.best > 0 ? 'passed' : 'not passed yet'}
            </p>
          ) : null}
        </header>

        <section className={styles.section} aria-labelledby="scenario-heading">
          <h2 id="scenario-heading" className={styles.sectionTitle}>
            The situation
          </h2>
          <p className={styles.prose}>{context.scenario}</p>
        </section>

        <section className={styles.section} aria-labelledby="requirements-heading">
          <h2 id="requirements-heading" className={styles.sectionTitle}>
            What it has to satisfy
          </h2>
          <ul className={styles.list}>
            {context.requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="steps-heading">
          <h2 id="steps-heading" className={styles.sectionTitle}>
            <Icon size="sm">
              <ListChecks />
            </Icon>
            How to work through it
          </h2>
          <ol className={styles.steps}>
            {context.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="deliverable-heading">
          <h2 id="deliverable-heading" className={styles.sectionTitle}>
            What you hand over
          </h2>
          <p className={styles.prose}>{context.deliverable}</p>
        </section>

        <section className={styles.section} aria-labelledby="criteria-heading">
          <h2 id="criteria-heading" className={styles.sectionTitle}>
            How it is judged
          </h2>
          <ul className={styles.list}>
            {context.criteria.map((criterion) => (
              <li key={criterion.id}>{criterion.description}</li>
            ))}
          </ul>
        </section>

        {context.hints.length > 0 ? (
          <Callout tone="note" title="Hints">
            <ul className={styles.list}>
              {context.hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </Callout>
        ) : null}

        {context.commonMistakes.length > 0 ? (
          <Callout tone="warning" title="Common mistakes">
            <ul className={styles.list}>
              {context.commonMistakes.map((mistake) => (
                <li key={mistake}>{mistake}</li>
              ))}
            </ul>
          </Callout>
        ) : null}

        {context.referenceGuidance ? (
          <section className={styles.section} aria-labelledby="reference-heading">
            <h2 id="reference-heading" className={styles.sectionTitle}>
              What a good answer looks like
            </h2>
            <p className={styles.prose}>{context.referenceGuidance}</p>
          </section>
        ) : null}

        {context.skills.length > 0 ? (
          <section className={styles.section} aria-labelledby="skills-heading">
            <h2 id="skills-heading" className={styles.sectionTitle}>
              Skills this proves
            </h2>
            <ul className={styles.badges}>
              {context.skills.map((skill) => (
                <li key={skill.id}>
                  <Badge label={skill.title} tone="neutral" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>

      {result ? (
        <section className={styles.footer} aria-labelledby="assessment-result-heading">
          <h2 id="assessment-result-heading" className={styles.footerTitle}>
            Your result
          </h2>
          <p className={styles.verdict} data-passed={result.passed} role="status">
            {result.passed ? 'Recorded as passed' : 'Not passed yet'}
          </p>
          <dl className={styles.figures}>
            <div className={styles.figure}>
              <dt className={styles.figureLabel}>Criteria met</dt>
              <dd className={styles.figureValue}>
                {result.score} of {result.maxScore}
              </dd>
            </div>
            <div className={styles.figure}>
              <dt className={styles.figureLabel}>Assessed by</dt>
              <dd className={styles.figureValue}>You</dd>
            </div>
          </dl>
          {result.unmet.length > 0 ? (
            <div className={styles.unmet}>
              <h3 className={styles.subheading}>Still to do</h3>
              <ul className={styles.list}>
                {context.criteria
                  .filter((criterion) => result.unmet.includes(criterion.id))
                  .map((criterion) => (
                    <li key={criterion.id}>{criterion.description}</li>
                  ))}
              </ul>
            </div>
          ) : null}
          <p className={styles.note}>
            This is a self-assessment. The platform did not inspect your work, so this records what
            you reported against the rubric — not a marked result.
          </p>
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </section>
      ) : gate.eligible ? (
        <section className={styles.footer} aria-labelledby="self-check-heading">
          <h2 id="self-check-heading" className={styles.footerTitle}>
            Check your work against the rubric
          </h2>
          <p className={styles.note}>
            Mark each line you honestly met. All of them are needed to pass — a practical task is
            finished or it is not.
          </p>
          <ul className={styles.criteria}>
            {context.criteria.map((criterion) => (
              <li key={criterion.id}>
                <label className={styles.criterion} data-met={metCriteria.includes(criterion.id)}>
                  <input
                    type="checkbox"
                    checked={metCriteria.includes(criterion.id)}
                    onChange={() => toggleCriterion(criterion.id)}
                    className={styles.checkbox}
                  />
                  <span className={styles.criterionText}>{criterion.description}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className={styles.progress} role="status">
            {metCriteria.length} of {context.criteria.length} criteria marked as met
          </p>
          <Button variant="primary" disabled={metCriteria.length === 0} onClick={submit}>
            Record my result
          </Button>
          <p className={styles.note}>
            This is a self-assessment. Nothing here is marked automatically, and your work itself is
            not uploaded or stored.
          </p>
        </section>
      ) : (
        <section className={styles.footer} aria-labelledby="gate-heading">
          <h2 id="gate-heading" className={styles.footerTitle}>
            Not ready to record a result yet
          </h2>
          <Callout tone="warning" title="Finish this first">
            <ul className={styles.list}>
              {gate.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </Callout>
          <p className={styles.note}>
            You can read the task and do the work meanwhile — this only gates recording a result.
          </p>
          {context.prerequisites.map((prerequisite) => (
            <Link
              key={prerequisite.lesson.id}
              to={`/lessons/${prerequisite.lesson.id}`}
              className={styles.prereqLink}
            >
              {prerequisite.lesson.title}
            </Link>
          ))}
        </section>
      )}

      {roadmap ? (
        <p className={styles.back}>
          <LinkButton to={`/roadmaps/${roadmap.id}`} variant="ghost">
            Back to {roadmap.title}
          </LinkButton>
        </p>
      ) : null}
    </div>
  )
}
