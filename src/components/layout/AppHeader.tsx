import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Compass, Menu, X } from 'lucide-react'
import { AppNav, NavRow } from './AppNav.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'
import { Icon } from '@/components/icons/Icon.tsx'
import { PRIMARY_NAV } from '@/app/navigation.ts'
import { cn } from '@/lib/cn.ts'
import styles from './AppHeader.module.css'

/**
 * Application header.
 *
 * Holds the brand, the mobile navigation disclosure, and the theme toggle. On
 * desktop the nav itself moves into the sidebar, so the header is just the top
 * bar.
 *
 * THE MOBILE DISCLOSURE IS A DIALOGUE, NOT A DRAWER
 *
 * It is marked `role="dialog"` `aria-modal="true"` and it behaves like one:
 * Escape closes it, Tab is trapped inside it, focus moves in on open and returns
 * to the toggle on close, and the rest of the page is inert to a screen reader.
 * A non-modal drawer that only slides in visually is the single most common
 * mobile nav accessibility failure — a keyboard user tabs straight out of the open
 * menu and into invisible page content behind it.
 *
 * The focus trap is ~15 lines of keydown handling. It is hand-written rather than
 * pulled from a library because a dialog primitive is the kind of abstraction that
 * arrives with a whole design system attached, and this is the only dialog in the
 * M1 shell. `DESIGN_SYSTEM.md` §10 records that a reusable primitive is a known
 * gap, to be revisited when a second dialog exists.
 *
 * Body scroll is locked while open, because a background that scrolls under a
 * modal panel is disorienting on a phone.
 */

export interface AppHeaderProps {
  /** Brand name shown next to the logo. */
  readonly productName?: string
}

export const AppHeader = ({ productName = 'VA Learning Platform' }: AppHeaderProps) => {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()
  const panelId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setNavOpen(false), [])

  // Close on navigation. Without this, tapping a link inside the panel changes the
  // route but leaves the panel covering the page the learner just asked for.
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  // Escape closes, Tab is trapped, and focus is managed across open/close.
  useEffect(() => {
    if (!navOpen) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    // Move focus into the panel. Focusing the panel itself rather than its first
    // control means a screen reader announces the dialog's context before its
    // contents, which is the correct order.
    panelRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      // Wrap at both ends. Without this, Tab from the last control escapes to the
      // page behind the modal.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    // Lock background scroll. Restored on close, including on unmount.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      // Return focus to the control that opened the panel, so a keyboard user is
      // not dropped at the top of the document.
      previouslyFocused?.focus()
    }
  }, [navOpen, close])

  return (
    <header className={styles.header}>
      <div className={cn(styles.inner, 'container')}>
        <Link to="/" className={styles.brand}>
          {/* Decorative: the product name is right beside it as text. */}
          <Icon size="md">
            <Compass />
          </Icon>
          <span className={styles.brandName}>{productName}</span>
        </Link>

        <div className={styles.actions}>
          <ThemeToggle />
          <button
            ref={toggleRef}
            type="button"
            className={styles.navToggle}
            aria-expanded={navOpen}
            aria-controls={panelId}
            onClick={() => setNavOpen((open) => !open)}
          >
            <Icon size="md">{navOpen ? <X /> : <Menu />}</Icon>
            {/* The label changes with state, so the accessible name says what the
                button will do rather than only what it currently is. */}
            <span className={styles.navToggleLabel}>{navOpen ? 'Close' : 'Menu'}</span>
          </button>
        </div>
      </div>

      {/*
        The mobile panel. Rendered only when open rather than hidden with CSS,
        so its contents are not focusable while closed — a hidden-but-present
        nav is a keyboard trap of the opposite kind.
      */}
      {navOpen ? (
        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          // Focusable so focus can land on it programmatically, but not in the
          // tab order: Tab moves to the first link inside.
          tabIndex={-1}
          className={styles.mobilePanel}
        >
          <nav aria-label="Primary" className={styles.mobileNav}>
            {PRIMARY_NAV.map((group) => (
              <div key={group.id} className={styles.mobileGroup}>
                <h2 className={styles.mobileGroupLabel}>{group.label}</h2>
                <ul className={styles.mobileList}>
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavRow item={item} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  )
}

/**
 * The desktop sidebar nav.
 *
 * A separate export rather than part of AppHeader, because the sidebar is a child
 * of the shell's main region and not of the header. Splitting it out keeps the
 * header's concern to "the top bar" and the shell's to "page furniture".
 */
export const AppSidebarNav = ({ className }: { className?: string }) => (
  <AppNav bordered className={className} />
)
