import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from '@/app/router.tsx'
import { ProgressProvider } from '@/app/progress/ProgressProvider.tsx'
import { ThemeProvider } from '@/app/providers/ThemeProvider.tsx'
import '@/styles/tokens.css'
import '@/styles/global.css'

/**
 * Application entry point.
 *
 * ORDER MATTERS HERE
 *
 * Stylesheets are imported before the app renders so the tokens are defined on
 * first paint. Importing them inside a component would mean a flash of unstyled
 * content on a slow connection.
 *
 * Both providers wrap `RouterProvider` rather than sitting inside it, so a route
 * that throws still has a working theme toggle and a working progress store — an
 * error boundary inside a provider would render with no way to change theme and
 * no progress.
 */

const container = document.getElementById('root')

// A missing #root means index.html and this file disagree, which is a build
// problem rather than a runtime condition. Failing loudly beats rendering nothing.
if (!container) {
  throw new Error('Root element #root not found in index.html')
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <ProgressProvider>
        <RouterProvider router={router} />
      </ProgressProvider>
    </ThemeProvider>
  </StrictMode>,
)
