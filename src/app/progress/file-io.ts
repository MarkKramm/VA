/**
 * The browser file I/O for progress export and import (M3).
 *
 * ISOLATED ON PURPOSE. Download and file-picker APIs are the one part of the
 * export/import path that is not pure and cannot run in the test environment, so
 * they live here, behind two small functions, and nothing else in the app knows
 * they exist. The domain and application logic — serialization, validation,
 * merging — is tested directly through `LearnerProgress`, without a browser.
 *
 * Both functions degrade rather than throw: a learner in a webview with no
 * `URL.createObjectURL` should not see the whole page fall over because they
 * pressed Export.
 */

/**
 * Trigger a download of `text` as `filename`.
 *
 * No-ops when the platform APIs are unavailable (some webviews, jsdom). The
 * caller does not need to know: the export is a convenience, and failing to save
 * a file must never break the session.
 */
export const downloadTextFile = (text: string, filename: string): void => {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  if (typeof URL.createObjectURL !== 'function') return

  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  // Appended so the click works in every browser, then removed so it never
  // becomes a stray node in the document.
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/**
 * Read a user-selected file as text.
 *
 * `FileReader` rather than `File.text()` because FileReader is the more widely
 * available of the two, including in the test environment. Rejects on a read
 * error so the caller can show a message rather than silently doing nothing.
 */
export const readTextFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'))
    reader.readAsText(file)
  })
