import { describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { renderApp } from '../../../../tests/harness.tsx'
import { STORAGE_NAMESPACE } from '@/app/storage/localStorage.ts'
import { PROGRESS_KEY } from '@/app/storage/merge.ts'
import { MemoryStorageAdapter } from '@/app/storage/memory.ts'
import { foldEvents } from '@domain/progress/reducer.ts'
import { completed } from '@fixtures/progress.ts'
import type { ProgressEvent } from '@domain/progress/types.ts'

/**
 * CROSS-TAB SYNCHRONIZATION, THROUGH THE REAL WIRING (pre-M4 hardening, A2).
 *
 * The unit tests call `store.syncExternal()` directly, which proves the merge but
 * NOT the wiring: `storage` event → `subscribeToExternalWrites` → `syncExternal`
 * → store → React subscriber → UI. A listener that was never registered, or
 * registered for the wrong key, would pass every one of those tests while
 * cross-tab sync was silently dead.
 *
 * So these tests dispatch a real `StorageEvent` on `window` — the same event the
 * browser fires in the OTHER tab — and assert what a learner would see. The only
 * thing simulated is that jsdom does not fire `storage` for a same-window write,
 * so the event is dispatched by hand.
 */

const LESSON = 'what-is-a-virtual-assistant'
/** The key `LocalStorageAdapter` actually writes, namespace included. */
const PROGRESS_STORAGE_KEY = `${STORAGE_NAMESPACE}${PROGRESS_KEY}`

/** Dispatch a real `storage` event, as another tab's write would. */
const dispatchStorage = (key: string): void => {
  act(() => {
    const event =
      typeof StorageEvent === 'function'
        ? new StorageEvent('storage', { key })
        : Object.assign(new Event('storage'), { key })
    globalThis.dispatchEvent(event)
  })
}

describe('cross-tab progress sync (A2)', () => {
  it('reaches the UI through the real storage event', () => {
    const storage = new MemoryStorageAdapter()
    renderApp({ initialEntries: ['/'], storage })

    // A brand-new learner: the honest empty state.
    expect(screen.getByText(/no progress to show yet/i)).toBeInTheDocument()

    // Another tab completes a lesson and the browser notifies this one.
    storage.write(PROGRESS_KEY, foldEvents([completed(LESSON)] as ProgressEvent[]))
    dispatchStorage(PROGRESS_STORAGE_KEY)

    // No reload, and the test never called `syncExternal` itself.
    expect(screen.queryByText(/no progress to show yet/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/1 of 4 lessons complete/i).length).toBeGreaterThan(0)
  })

  it('does not write back, so an external change cannot start a loop', () => {
    const storage = new MemoryStorageAdapter()
    renderApp({ initialEntries: ['/'], storage })

    // The other tab's write, before the spy goes on.
    storage.write(PROGRESS_KEY, foldEvents([completed(LESSON)] as ProgressEvent[]))
    const write = vi.spyOn(storage, 'write')

    dispatchStorage(PROGRESS_STORAGE_KEY)

    // Synchronizing reads and re-renders; it must never write, or two tabs would
    // bounce events at each other forever.
    expect(write).not.toHaveBeenCalled()
  })

  it('ignores a storage event for an unrelated key', () => {
    const storage = new MemoryStorageAdapter()
    renderApp({ initialEntries: ['/'], storage })

    // Storage changed, but the notification is for a different key, so this tab
    // is not asked to re-read progress.
    storage.write(PROGRESS_KEY, foldEvents([completed(LESSON)] as ProgressEvent[]))
    dispatchStorage(`${STORAGE_NAMESPACE}theme`)

    expect(screen.getByText(/no progress to show yet/i)).toBeInTheDocument()
  })
})
