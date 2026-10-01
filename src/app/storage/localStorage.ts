import type { StorageAdapter } from './port.ts'
import { MemoryStorageAdapter } from './memory.ts'

/**
 * localStorage adapter.
 *
 * Three things it does beyond get/set, all of which exist because the failure
 * they prevent is silent:
 *
 *  1. A NAMESPACE (`va:`), so the app never collides with anything else served
 *     from the same origin, and so `clear()` is safe.
 *  2. A guarded parse. Corrupt JSON resets to the fallback and warns; it never
 *     throws on boot. A learner whose storage was truncated by a crash gets a
 *     working empty session, not a white screen.
 *  3. A safe constructor. Some environments throw on touching `localStorage`
 *     (private browsing, sandboxed iframes, some webviews). Falling back to
 *     memory keeps the session usable.
 */

export const STORAGE_NAMESPACE = 'va:'

const isStorageAvailable = (): boolean => {
  try {
    if (typeof globalThis.localStorage === 'undefined') return false
    const probe = `${STORAGE_NAMESPACE}__probe__`
    globalThis.localStorage.setItem(probe, '1')
    globalThis.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  private readonly storage: globalThis.Storage
  /** True when we had to fall back to memory. Surfaced in the UI at M3. */
  readonly isPersistent: boolean

  constructor() {
    this.isPersistent = isStorageAvailable()
    this.storage = this.isPersistent
      ? globalThis.localStorage
      : (new MemoryStorageAdapter() as unknown as globalThis.Storage)
  }

  private fullKey(key: string): string {
    return `${STORAGE_NAMESPACE}${key}`
  }

  read<T>(key: string, fallback: T): T {
    const raw = this.storage.getItem(this.fullKey(key))
    if (raw === null) return fallback
    try {
      return JSON.parse(raw) as T
    } catch (error) {
      console.warn(
        `[storage] "${key}" contained unreadable data and was reset to its default.`,
        error,
      )
      this.remove(key)
      return fallback
    }
  }

  write<T>(key: string, value: T): void {
    try {
      this.storage.setItem(this.fullKey(key), JSON.stringify(value))
    } catch (error) {
      // Quota exceeded is the realistic case: a very long event history, or a
      // browser in low-disk mode. Losing persistence is preferable to a crash,
      // and the in-memory session keeps working.
      console.warn(
        `[storage] could not persist "${key}". Progress will not survive a reload.`,
        error,
      )
    }
  }

  remove(key: string): void {
    this.storage.removeItem(this.fullKey(key))
  }

  listKeys(): string[] {
    const keys: string[] = []
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index)
      if (key?.startsWith(STORAGE_NAMESPACE)) keys.push(key.slice(STORAGE_NAMESPACE.length))
    }
    return keys
  }

  /**
   * Wipe everything this app stored. A one-click "clear my data" control is a
   * disproportionate trust payoff for an audience we are actively asking to hand
   * over their data — and the platform claims, in its dashboard, that nothing
   * leaves the browser. Making deletion easy is what makes that claim credible.
   */
  clear(): void {
    for (const key of this.listKeys()) this.remove(key)
  }
}
