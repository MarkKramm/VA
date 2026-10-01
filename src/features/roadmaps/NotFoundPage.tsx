import { Link, useRouteError } from 'react-router'
import { Compass, Home, Map } from 'lucide-react'
import { isRouteErrorResponse } from 'react-router'
import { Button, LinkButton } from '@/components/ui/Button.tsx'
import { EmptyState } from '@/components/ui/EmptyState.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import styles from './NotFoundPage.module.css'

/**
 * Not found, and the route error boundary.
 *
 * ONE COMPONENT, TWO JOBS
 *
 * An in-app 404 and an unexpected error need the same shape — a heading, an
 * explanation, and a way out — so they share a component. What differs is the
 * detail shown, and `useRouteError` is what tells them apart.
 *
 * WHY AN IN-BUILT 404 RATHER THAN THE SERVER'S
 *
 * The site is deployed to GitHub Pages, which has no rewrite rules. A deep link
 * like `/VA/roadmaps/beginner-va` hits the server on refresh and gets Pages'
 * own 404 page, not the app. `scripts/copy-spa-fallback.ts` copies the built
 * `index.html` to `404.html` so the app loads and *then* renders this. That is
 * also why the router needs `basename` from `import.meta.env.BASE_URL` — see
 * `CURRENT_STATE.md`, "the one thing to know before starting M1".
 *
 * The distinction is worth keeping clear in the copy: a mistyped URL is the
 * learner's doing and needs no alarm; an actual error is ours and does.
 */

export const NotFoundPage = () => (
  <div className={styles.page}>
    <EmptyState
      title="That page does not exist"
      icon={<Compass />}
      action={
        <div className={styles.actions}>
          <LinkButton to="/" variant="primary">
            <Icon size="sm">
              <Home />
            </Icon>
            Go to the dashboard
          </LinkButton>
          <LinkButton to="/roadmaps" variant="secondary">
            <Icon size="sm">
              <Map />
            </Icon>
            Browse roadmaps
          </LinkButton>
        </div>
      }
    >
      <p>
        The address may be mistyped, or the page may have moved. Everything that exists is reachable
        from the dashboard or the roadmaps index.
      </p>
    </EmptyState>
  </div>
)

/**
 * Route error boundary.
 *
 * A raw thrown error reaching this point is a bug, so it is reported plainly
 * rather than dressed up. `isRouteErrorResponse` separates a router-thrown 404
 * (a deliberate response, with a status) from a thrown exception.
 *
 * Note what is deliberately NOT here: no stack trace, no error id, no telemetry.
 * There is no backend and no analytics — both explicitly absent per
 * `ARCHITECTURE.md` — so an error report would go nowhere. The honest thing is to
 * say what happened and offer a way out.
 */
export const RouteErrorPage = () => {
  const error = useRouteError()

  const isNotFound = isRouteErrorResponse(error) && error.status === 404
  const status = isRouteErrorResponse(error) ? error.status : null
  const message = isRouteErrorResponse(error)
    ? error.statusText || 'The page could not be loaded.'
    : 'Something went wrong while loading this page.'

  return (
    <div className={styles.page}>
      <div className={styles.error}>
        <p className={styles.status}>
          {status !== null ? status : <span className={styles.statusWord}>Error</span>}
        </p>
        <h1 className={styles.title}>
          {isNotFound ? 'Page not found' : 'This page could not load'}
        </h1>
        <p className={styles.message}>{message}</p>

        {/*
          A deliberate 404 offers the same recovery as NotFoundPage. An actual
          error additionally offers a reload, because a transient failure is worth
          retrying and a mistyped URL is not.
        */}
        <div className={styles.actions}>
          <LinkButton to="/" variant="primary">
            <Icon size="sm">
              <Home />
            </Icon>
            Go to the dashboard
          </LinkButton>
          {!isNotFound ? (
            <Button variant="secondary" onClick={() => globalThis.location.reload()}>
              Try again
            </Button>
          ) : (
            <Link to="/roadmaps" className={styles.textLink}>
              Browse roadmaps instead
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
