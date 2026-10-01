/**
 * Small utilities with no framework dependency.
 *
 * Deliberately implemented here rather than pulled from a package. `cn` is four
 * lines and a class-name library is one of the most common accidental
 * dependencies in a React project; the whole point of the dependency budget is
 * that every dependency has to justify itself, and this one does not.
 */

/** Join class names, dropping falsy values. */
export const cn = (...values: (string | false | null | undefined)[]): string =>
  values.filter(Boolean).join(' ')

/** Format a duration in minutes as a short human string: "45 min", "2 hr 30 min". */
export const formatDuration = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}
