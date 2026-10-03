import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'
import type { ProgressState } from '@domain/progress/types.ts'
import { LocalStorageAdapter } from '@/app/storage/localStorage.ts'
import { subscribeToExternalWrites } from '@/app/storage/merge.ts'
import type { StorageAdapter } from '@/app/storage/port.ts'
import { LearnerProgress } from './store.ts'

/**
 * The progress provider (M3).
 *
 * React's bridge to `LearnerProgress`. It does three things and no more:
 *
 *   1. Creates the store ONCE (a store rebuilt per render would re-read storage
 *      on every render and lose every subscription).
 *   2. Reads it through `useSyncExternalStore`, so a change — from this tab or
 *      another — re-renders exactly the components that read it.
 *   3. Subscribes to `storage` events so a write in another tab is noticed.
 *
 * The store is deliberately NOT held in `useState`: it is a stable object with
 * its own subscription, and React only needs to know when its value changes.
 *
 * The provider takes the `StorageAdapter` as a prop for the same reason
 * `ThemeProvider` does — tests inject a memory adapter, production gets the
 * localStorage adapter, and neither the components nor the store know which.
 */

interface ProgressContextValue {
  readonly actions: LearnerProgress
  readonly state: ProgressState
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export interface ProgressProviderProps {
  readonly children: ReactNode
  /** Injected in tests. Production uses the localStorage adapter. */
  readonly storage?: StorageAdapter
}

export const ProgressProvider = ({ children, storage }: ProgressProviderProps) => {
  const [actions] = useState(() => new LearnerProgress(storage ?? new LocalStorageAdapter()))
  const state = useSyncExternalStore(actions.subscribe, actions.getState, actions.getState)

  // Writes from OTHER tabs. The `storage` event does not fire in the tab that
  // wrote, so this cannot loop: our own writes never call back into us.
  useEffect(() => subscribeToExternalWrites(() => actions.syncExternal()), [actions])

  const value = useMemo<ProgressContextValue>(() => ({ actions, state }), [actions, state])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

/**
 * Read the progress context.
 *
 * Throws outside a provider rather than returning an empty state. A silent
 * default would mean a component rendered in the wrong place shows "no progress"
 * and looks plausible, which is the failure mode worth preventing.
 */
const useProgressContext = (): ProgressContextValue => {
  const context = useContext(ProgressContext)
  if (context === null) {
    throw new Error('useProgressState / useProgressActions must be used within a ProgressProvider')
  }
  return context
}

/** The current progress state. Re-renders the caller when it changes. */
export const useProgressState = (): ProgressState => useProgressContext().state

/** The store's actions. Stable identity, so it is safe in a dependency array. */
export const useProgressActions = (): LearnerProgress => useProgressContext().actions
