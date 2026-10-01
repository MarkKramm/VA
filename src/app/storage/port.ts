/**
 * The persistence port.
 *
 * The whole reason this file exists is that progress must be swappable. Today it
 * is localStorage, in one browser, on one device — which is fine, and is the
 * right trade for a free platform with no accounts. If a backend is ever
 * justified, `HttpStorageAdapter` implements this same interface and NO domain
 * code changes, because nothing above this line knows where bytes are stored.
 *
 * Deliberately small and deliberately synchronous. localStorage is synchronous,
 * and shaping the interface so an async backend can be introduced later costs
 * nothing now.
 *
 * It also deliberately knows nothing about progress. It stores and retrieves
 * values. Whether those values are progress state, a theme preference, or a
 * future reading position is not its concern.
 */
export interface StorageAdapter {
  read<T>(key: string, fallback: T): T
  write<T>(key: string, value: T): void
  remove(key: string): void
  listKeys(): string[]
  clear(): void
}
