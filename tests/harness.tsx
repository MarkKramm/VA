import { createMemoryRouter, RouterProvider } from 'react-router'
import { render } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import { AppShell } from '@/components/layout/AppShell.tsx'
import { ThemeProvider } from '@/app/providers/ThemeProvider.tsx'
import { MemoryStorageAdapter } from '@/app/storage/memory.ts'
import { DashboardPage } from '@/features/dashboard/DashboardPage.tsx'
import { NotFoundPage, RouteErrorPage } from '@/features/roadmaps/NotFoundPage.tsx'
import { RoadmapDetailPage } from '@/features/roadmaps/RoadmapDetailPage.tsx'
import { RoadmapsPage } from '@/features/roadmaps/RoadmapsPage.tsx'

/**
 * Test harness.
 *
 * WHY A MEMORY ROUTER AND NOT THE REAL ONE
 *
 * `src/app/router.tsx` is a module-level singleton created with
 * `createBrowserRouter`. Importing it in a test would share one router across
 * every test in the file, so state leaks between them and the tests would have to
 * run in a strict order. A fresh `createMemoryRouter` per test is isolated by
 * construction.
 *
 * The real router is still covered — `router.test.ts` asserts on its shape and,
 * critically, on its `basename` — so this is a harness choice rather than an
 * untested router.
 *
 * The route table is DUPLICATED here on purpose. If it were imported from
 * `router.tsx` the duplication would be invisible, and the harness would keep
 * passing if the real router lost a route. Duplicating it means a route added to
 * the real router but not here shows up as a test that cannot reach it.
 */

/** Mirrors `src/app/router.tsx`. Keep in sync — that is the point. */
export const testRoutes = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'roadmaps', element: <RoadmapsPage /> },
      { path: 'roadmaps/:roadmapId', element: <RoadmapDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export interface RenderAppOptions {
  /** Initial location, e.g. '/roadmaps'. Defaults to the dashboard. */
  readonly initialEntries?: string[]
  /** A storage adapter to inject, so theme tests do not touch real storage. */
  readonly storage?: MemoryStorageAdapter
}

/** Render the whole shell at a route, with an isolated router and storage. */
export const renderApp = (
  options: RenderAppOptions = {},
): RenderResult & {
  readonly storage: MemoryStorageAdapter
} => {
  const storage = options.storage ?? new MemoryStorageAdapter()
  const router = createMemoryRouter(testRoutes, {
    initialEntries: options.initialEntries ?? ['/'],
  })

  const result = render(
    <ThemeProvider storage={storage}>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )

  return Object.assign(result, { storage })
}

/** Render a single component with the providers it needs, and no router. */
export const renderWithTheme = (
  ui: React.ReactElement,
  storage: MemoryStorageAdapter = new MemoryStorageAdapter(),
): RenderResult & { readonly storage: MemoryStorageAdapter } => {
  const result = render(<ThemeProvider storage={storage}>{ui}</ThemeProvider>)
  return Object.assign(result, { storage })
}
