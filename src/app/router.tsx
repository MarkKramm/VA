import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell.tsx'
import { AssessmentPage } from '@/features/assessments/AssessmentPage.tsx'
import { DashboardPage } from '@/features/dashboard/DashboardPage.tsx'
import { LessonPage } from '@/features/lessons/LessonPage.tsx'
import { QuizPage } from '@/features/quizzes/QuizPage.tsx'
import { NotFoundPage, RouteErrorPage } from '@/features/roadmaps/NotFoundPage.tsx'
import { RoadmapDetailPage } from '@/features/roadmaps/RoadmapDetailPage.tsx'
import { RoadmapsPage } from '@/features/roadmaps/RoadmapsPage.tsx'

/**
 * The router.
 *
 * THE BASENAME IS THE WHOLE POINT OF THIS FILE
 *
 * The site is served from `https://markkramm.github.io/VA/` — a SUBPATH. A
 * router told to look at `/roadmaps/beginner-va` when the browser is actually at
 * `/VA/roadmaps/beginner-va` matches nothing, so every route renders the 404 and
 * every `<Link>` points at a URL that leaves the site.
 *
 * `import.meta.env.BASE_URL` is Vite's `base` option — already `'/VA/'` in
 * `vite.config.ts` since the first commit. Reading it here rather than writing
 * `'/VA/'` means changing the deployment path is a one-line change in one file,
 * and the two can never disagree. `ARCHITECTURE.md` states this as a hard rule:
 * **never hard-code `/VA/`.**
 *
 * `createBrowserRouter` (not `createHashRouter`) because hash URLs are uglier,
 * break anchors, and are visible to analytics as a single page. That choice is
 * only safe because the deployment has a `404.html` SPA fallback — see
 * `scripts/copy-spa-fallback.ts`.
 */

export const router = createBrowserRouter(
  [
    {
      /*
       * Every route lives under one layout route, so the shell cannot be
       * forgotten on a future page. A route added outside this element would have
       * no header, no skip link and no `<main>` — three accessibility bugs at
       * once, and a bug a test asserting "the shell renders" would not catch.
       */
      path: '/',
      element: <AppShell />,
      /*
       * A route-level error boundary.
       *
       * `errorElement` rather than a React error boundary component: it catches
       * errors thrown by loaders, by nested routes, and by rendering, and it sits
       * INSIDE the shell. A boundary outside the shell would replace the entire
       * page — losing the header and the skip link precisely when the learner
       * most needs a way out.
       */
      errorElement: <RouteErrorPage />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'roadmaps', element: <RoadmapsPage /> },
        {
          path: 'roadmaps/:roadmapId',
          element: <RoadmapDetailPage />,
        },
        /*
         * Lessons are addressed by their stable ID (`:lessonId`), never by file
         * path. The id is immutable once published (see `primitives.ts`), so a
         * URL stays valid across a content reorganisation — which is the whole
         * reason the route is keyed on it.
         */
        { path: 'lessons/:lessonId', element: <LessonPage /> },
        /*
         * Quizzes follow the same rule: addressed by stable id, never by file
         * path. A learner reaches one from the lesson that declares it
         * (`lesson.quiz`), and an id that does not resolve renders the same
         * in-shell 404 an unknown lesson does.
         */
        { path: 'quizzes/:quizId', element: <QuizPage /> },
        /*
         * Assessments follow the same rule (M5). A learner reaches one from the
         * roadmap that declares it — an assessment is composite and belongs to a
         * roadmap, not to a single lesson — and an unknown id is the same in-shell
         * 404 an unknown lesson gets.
         */
        { path: 'assessments/:assessmentId', element: <AssessmentPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    /*
     * Trailing slash included so a single trailing slash is tolerated, and
     * `caseSensitive: false` because a learner typing a URL by hand should not be
     * punished for a capital letter.
     */
    basename: import.meta.env.BASE_URL,
  },
)
