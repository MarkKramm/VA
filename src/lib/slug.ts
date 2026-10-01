/**
 * Slug helpers.
 *
 * Slugs are the join key of the entire content architecture, so the rules for
 * producing and checking them are worth having in one place rather than
 * scattered. The authoritative pattern lives in the Zod schema
 * (src/content/schemas/primitives.ts); this module mirrors it for use in
 * tooling and tests.
 */

/** The one accepted slug shape: lowercase kebab-case, no leading or trailing dash. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const isSlug = (value: string): boolean => SLUG_PATTERN.test(value)

/**
 * Convert arbitrary text into a slug. Used by tooling, never by hand-authored
 * content — a hand-written id is deliberate, and a generated one is a signal
 * that the id was not thought about.
 */
export const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
