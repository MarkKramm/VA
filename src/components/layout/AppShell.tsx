import { Link, Outlet } from 'react-router'
import { AppHeader, AppSidebarNav } from './AppHeader.tsx'
import { SkipLink } from './SkipLink.tsx'
import { cn } from '@/lib/cn.ts'
import styles from './AppShell.module.css'

/**
 * The application shell.
 *
 * Every route renders inside this: skip link, header, sidebar, main, footer. It
 * owns the page furniture so that no route has to remember to include it — a
 * missing `<main>` or a missing skip link on one route is an accessibility bug
 * that a test asserting "the shell renders" would not catch.
 *
 * LAYOUT
 *
 * Two columns from `md` (48rem) upward: a fixed-width sidebar and a fluid main
 * region. Below `md` the sidebar is removed from the flow entirely and the mobile
 * disclosure in the header takes over. That is the one structural breakpoint in
 * the shell; everything else is fluid via `clamp()` and grid.
 *
 * THE `tabIndex={-1}` ON `<main>`
 *
 * The skip link points at `#main-content`. Browsers scroll to the fragment but
 * historically did not always move *focus* there, which means a keyboard user
 * following the skip link would carry on tabbing from the header. Making `<main>`
 * programmatically focusable is the standard fix, and it costs nothing: it is not
 * in the tab order, so it is never reached by normal Tab.
 *
 * NOTE: no props. The route content arrives through `<Outlet />`, because
 * react-router renders a layout route without children.
 */

export const AppShell = () => (
  <div className={styles.shell}>
    <SkipLink />
    <AppHeader />

    <div className={cn(styles.body, 'container')}>
      {/*
        The sidebar. `hidden` below `md` is paired with `display: none` in CSS so
        it is removed from the accessibility tree — a visually hidden but focusable
        sidebar is a keyboard trap on mobile.
      */}
      <aside className={styles.sidebar}>
        <AppSidebarNav className={styles.sidebarNav} />
      </aside>

      <main id="main-content" tabIndex={-1} className={styles.main}>
        {/*
          `focus` styling is suppressed on main: it is a programmatic focus target,
          not an interactive element, and a ring around the entire page region
          after using the skip link is visual noise.
        */}
        {/*
          `<Outlet />`, not `children`.

          react-router renders a layout route with NO children and delivers the
          matched child through `<Outlet />`. Rendering `children` here compiles
          and typechecks, and produces an empty page on every route — a bug the
          type system is happy with and only a rendering test catches.
        */}
        <Outlet />
      </main>
    </div>

    <AppFooter />
  </div>
)

export const AppFooter = () => (
  <footer className={styles.footer}>
    <div className={cn(styles.footerInner, 'container')}>
      <p className={styles.footerText}>
        Free and open. Your progress is stored in this browser only — it never leaves your device.
      </p>
      <nav aria-label="Footer" className={styles.footerNav}>
        <ul className={styles.footerList}>
          <li>
            <Link to="/roadmaps" className={styles.footerLink}>
              Roadmaps
            </Link>
          </li>
          <li>
            <a
              className={styles.footerLink}
              href="https://github.com/MarkKramm/VA"
              // External link: `noopener` prevents the opened page reaching back
              // through `window.opener`. `noreferrer` also stops the referrer leak.
              target="_blank"
              rel="noopener noreferrer"
            >
              Source
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </footer>
)
