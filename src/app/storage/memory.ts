import type { StorageAdapter } from './port.ts'

/**
 * In-memory adapter. Used by tests, and as the safe fallback when localStorage
 * is unavailable — private browsing modes and some embedded webviews throw on
 * access rather than returning null, and a learner should get a working session
 * rather than a blank page.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private readonly map = new Map<string, string>()

  read<T>(key: string, fallback: T): T {
    const raw = this.map.get(key)
    if (raw === undefined) return fallback
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }

  write<T>(key: string, value: T): void {
    this.map.set(key, JSON.stringify(value))
  }

  remove(key: string): void {
    this.map.delete(key)
  }

  listKeys(): string[] {
    return [...this.map.keys()]
  }

  clear(): void {
    this.map.clear()
  }
}
