import styles from './SkipLink.module.css'

/**
 * SkipLink.
 *
 * The first focusable element on every page.
 *
 * A keyboard user tabbing through a page with a header, a nav of five links and a
 * theme toggle would otherwise have to traverse all of it before reaching the
 * content — on every single page. This collapses that to one keystroke.
 *
 * It is visually hidden until focused, then appears at the top-left. The hiding is
 * done with a transform rather than `display: none`, because a `display: none`
 * element cannot receive focus at all and the link would simply never appear.
 *
 * The href is `#main-content`, and `<main>` carries that id — a fragment
 * navigation, which moves focus in browsers that support it and scrolls in all of
 * them. The `tabIndex={-1}` on main is what makes focus land there rather than on
 * the top of the document; see AppShell.
 */

export const SkipLink = () => (
  <a href="#main-content" className={styles.skipLink}>
    Skip to main content
  </a>
)
