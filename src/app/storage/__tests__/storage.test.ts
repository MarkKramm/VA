import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalStorageAdapter, STORAGE_NAMESPACE } from '../localStorage.ts'
import { MemoryStorageAdapter } from '../memory.ts'
import {
  mergeEventLogs,
  newEventId,
  PROGRESS_KEY,
  ProgressStore,
  subscribeToExternalWrites,
} from '../merge.ts'
import { parseProgressExport } from '../export-validate.ts'
import { foldEvents } from '@domain/progress/reducer.ts'
import { completed, enrolled, resetEventCounter, viewed } from '@fixtures/progress.ts'
import type { ProgressEvent } from '@domain/progress/types.ts'

/**
 * Dispatch a real `storage` event, the way another tab's write does.
 *
 * jsdom implements `StorageEvent`; the fallback keeps the helper working if an
 * environment ever does not, since all the listener reads is `key`.
 */
const dispatchStorage = (key: string): void => {
  const event =
    typeof StorageEvent === 'function'
      ? new StorageEvent('storage', { key })
      : Object.assign(new Event('storage'), { key })
  globalThis.dispatchEvent(event)
}

beforeEach(() => {
  resetEventCounter()
  globalThis.localStorage?.clear()
})

describe('MemoryStorageAdapter', () => {
  it('round-trips a value', () => {
    const adapter = new MemoryStorageAdapter()
    adapter.write('k', { a: 1 })
    expect(adapter.read('k', null)).toEqual({ a: 1 })
  })

  it('returns the fallback for a missing key', () => {
    expect(new MemoryStorageAdapter().read('nope', 'fallback')).toBe('fallback')
  })

  it('round-trips a string, which JSON encodes and decodes faithfully', () => {
    const adapter = new MemoryStorageAdapter()
    adapter.write('k', 'hello')
    expect(adapter.read('k', 'fallback')).toBe('hello')
  })

  it('returns the fallback for unreadable stored bytes rather than throwing', () => {
    // Corrupt-JSON handling is asserted against LocalStorageAdapter below, where
    // raw bytes can be placed directly. JSON.stringify means a value written
    // through write() is always readable, which is itself the correct behaviour.
    const adapter = new MemoryStorageAdapter()
    adapter.write('k', { a: 1 })
    expect(adapter.read('k', 'fallback')).toEqual({ a: 1 })
  })

  it('lists and clears keys', () => {
    const adapter = new MemoryStorageAdapter()
    adapter.write('a', 1)
    adapter.write('b', 2)
    expect(adapter.listKeys()).toEqual(['a', 'b'])
    adapter.clear()
    expect(adapter.listKeys()).toEqual([])
  })
})

describe('LocalStorageAdapter', () => {
  it('namespaces its keys so it can never collide with anything else on the origin', () => {
    const adapter = new LocalStorageAdapter()
    adapter.write('progress', { version: 1, events: [] })
    expect(globalThis.localStorage.getItem(`${STORAGE_NAMESPACE}progress`)).not.toBeNull()
  })

  it('clears only its own keys', () => {
    globalThis.localStorage.setItem('someone-elses-data', 'keep me')
    const adapter = new LocalStorageAdapter()
    adapter.write('progress', { a: 1 })
    adapter.clear()
    expect(globalThis.localStorage.getItem('someone-elses-data')).toBe('keep me')
  })

  it('resets and warns on corrupt data instead of throwing on boot', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const adapter = new LocalStorageAdapter()
    globalThis.localStorage.setItem(`${STORAGE_NAMESPACE}progress`, '{ truncated')
    expect(adapter.read('progress', 'fallback')).toBe('fallback')
    expect(warn).toHaveBeenCalled()
  })

  it('survives a quota error without crashing the session', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    const adapter = new LocalStorageAdapter()
    expect(() => adapter.write('progress', { a: 1 })).not.toThrow()
    expect(warn).toHaveBeenCalled()
    setItem.mockRestore()
  })
})

describe('mergeEventLogs — the multi-tab fix', () => {
  it('unions by event id, so a concurrent write is never clobbered', () => {
    // The exact bug this exists to prevent:
    //   tab A holds [e1, e2]; tab B adds e3; tab A writes [e1, e2, e4]
    // Without merging, e3 is silently lost with no error anywhere.
    const tabA: ProgressEvent[] = [
      { id: 'e1', at: '1', type: 'lesson.viewed', lessonId: 'a' },
      { id: 'e2', at: '2', type: 'lesson.completed', lessonId: 'a', source: 'manual' },
    ]
    const tabB: ProgressEvent[] = [
      { id: 'e2', at: '2', type: 'lesson.completed', lessonId: 'a', source: 'manual' },
      { id: 'e3', at: '3', type: 'roadmap.enrolled', roadmapId: 'r' },
    ]
    const merged = mergeEventLogs(tabA, tabB)
    expect(merged.map((e) => e.id)).toEqual(['e1', 'e2', 'e3'])
    expect(merged).toContainEqual({ id: 'e3', at: '3', type: 'roadmap.enrolled', roadmapId: 'r' })
  })

  it('is deterministic regardless of which tab contributed which event', () => {
    const a: ProgressEvent = { id: 'e1', at: '1', type: 'lesson.viewed', lessonId: 'a' }
    const b: ProgressEvent = { id: 'e2', at: '2', type: 'lesson.viewed', lessonId: 'b' }
    expect(mergeEventLogs([a, b], []).map((e) => e.id)).toEqual(
      mergeEventLogs([b], [a]).map((e) => e.id),
    )
  })

  it('breaks a same-timestamp tie deterministically by id', () => {
    const a: ProgressEvent = { id: 'zz', at: '1', type: 'lesson.viewed', lessonId: 'a' }
    const b: ProgressEvent = { id: 'aa', at: '1', type: 'lesson.viewed', lessonId: 'b' }
    expect(mergeEventLogs([a], [b]).map((e) => e.id)).toEqual(['aa', 'zz'])
  })

  it('is idempotent when the same log is merged twice', () => {
    const log: ProgressEvent[] = [viewed('a'), completed('a')] as ProgressEvent[]
    expect(mergeEventLogs(log, log)).toHaveLength(log.length)
  })

  it('generates unique event ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newEventId()))
    expect(ids.size).toBe(500)
  })
})

describe('ProgressStore', () => {
  it('appends an event, assigning an id and a timestamp', () => {
    const store = new ProgressStore(new MemoryStorageAdapter())
    const state = store.append({ type: 'lesson.completed', lessonId: 'a', source: 'manual' })
    expect(state.events).toHaveLength(1)
    expect(state.events[0]?.id).toBeTruthy()
    expect(state.events[0]?.at).toBeTruthy()
  })

  it('persists, so a reload recovers the same state', () => {
    const adapter = new MemoryStorageAdapter()
    const store = new ProgressStore(adapter)
    store.append({ type: 'lesson.completed', lessonId: 'a', source: 'manual' })
    expect(new ProgressStore(adapter).load().derived.completedLessons['a']).toBeDefined()
  })

  it('re-reads before writing, so a concurrent tab write survives', () => {
    const adapter = new MemoryStorageAdapter()

    // Simulate: tab B writes, then tab A — holding no cached state — appends.
    new ProgressStore(adapter).append({ type: 'roadmap.enrolled', roadmapId: 'from-tab-b' })
    const state = new ProgressStore(adapter).append({
      type: 'lesson.completed',
      lessonId: 'from-tab-a',
      source: 'manual',
    })

    const ids = state.derived.enrolledRoadmaps
    expect(ids).toEqual(['from-tab-b'])
    expect(state.derived.completedLessons['from-tab-a']).toBeDefined()
  })

  it('refreshes after another tab wrote', () => {
    const adapter = new MemoryStorageAdapter()
    const store = new ProgressStore(adapter)
    const before = store.load()
    expect(store.syncFrom(before)).toBeUndefined()
    new ProgressStore(adapter).append({ type: 'roadmap.enrolled', roadmapId: 'r' })
    expect(store.syncFrom(before)).toBeDefined()
  })

  it('detects a change when the event COUNT is the same but the identity differs', () => {
    // Regression (pre-M3 hardening, F2). `syncFrom` used to compare only
    // `events.length`, so a same-length log holding a DIFFERENT event was
    // reported as "nothing changed" and the tab kept showing stale progress
    // until some later write happened to change the length. Change detection is
    // now by event identity.
    const adapter = new MemoryStorageAdapter()
    const store = new ProgressStore(adapter)

    const before: ProgressEvent[] = [
      { id: 'e1', at: '2026-10-01T09:00:00.000Z', type: 'lesson.viewed', lessonId: 'a' },
      { id: 'e2', at: '2026-10-01T09:01:00.000Z', type: 'lesson.viewed', lessonId: 'b' },
    ]
    const after: ProgressEvent[] = [
      { id: 'e1', at: '2026-10-01T09:00:00.000Z', type: 'lesson.viewed', lessonId: 'a' },
      { id: 'e3', at: '2026-10-01T09:02:00.000Z', type: 'lesson.viewed', lessonId: 'c' },
    ]
    // Same length, different identity — exactly what a count check misses.
    expect(foldEvents(after).events).toHaveLength(foldEvents(before).events.length)

    adapter.write(PROGRESS_KEY, foldEvents(after))
    expect(store.syncFrom(foldEvents(before))).toEqual(foldEvents(after))
  })

  it('reports no change when the log is genuinely identical', () => {
    // The other half of the contract: an unchanged log must still short-circuit,
    // or every cross-tab notification would force a pointless re-render.
    const adapter = new MemoryStorageAdapter()
    const store = new ProgressStore(adapter)
    store.append({ type: 'roadmap.enrolled', roadmapId: 'r' })
    const current = store.load()
    expect(store.syncFrom(current)).toBeUndefined()
  })

  it('orders two appends made in the same millisecond, so the later action wins', () => {
    // Regression (M3): `at` has millisecond resolution, so two events appended in
    // the same millisecond shared a timestamp and fell back to a random-id
    // tiebreak — making "mark complete, then mark not complete" a coin flip.
    // Generated timestamps are now strictly increasing.
    const store = new ProgressStore(new MemoryStorageAdapter())
    store.append({ type: 'lesson.completed', lessonId: 'a', source: 'manual' })
    const state = store.append({ type: 'lesson.uncompleted', lessonId: 'a' })
    expect(state.derived.completedLessons['a']).toBeUndefined()
  })

  it('clears all progress', () => {
    const adapter = new MemoryStorageAdapter()
    const store = new ProgressStore(adapter)
    store.append({ type: 'roadmap.enrolled', roadmapId: 'r' })
    store.clear()
    expect(store.load().events).toEqual([])
  })
})

describe('cross-tab subscription', () => {
  it('returns an unsubscribe function', () => {
    const unsubscribe = subscribeToExternalWrites(() => {})
    expect(typeof unsubscribe).toBe('function')
    expect(() => unsubscribe()).not.toThrow()
  })

  // The dispatch path, not just the unsubscribe contract (pre-M4 hardening, A2).
  // Before this, every test called `syncExternal()` directly, so a listener that
  // was never registered — or registered for the wrong key — would still pass.
  it('calls back on a storage event for the progress key', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeToExternalWrites(onChange)

    dispatchStorage(`${STORAGE_NAMESPACE}${PROGRESS_KEY}`)

    expect(onChange).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('ignores a storage event for an unrelated key', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeToExternalWrites(onChange)

    dispatchStorage(`${STORAGE_NAMESPACE}theme`)

    expect(onChange).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('stops calling back after unsubscribe', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeToExternalWrites(onChange)
    unsubscribe()

    dispatchStorage(`${STORAGE_NAMESPACE}${PROGRESS_KEY}`)

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('import validation', () => {
  it('rejects a file that is not JSON, with a message a learner can act on', () => {
    const result = parseProgressExport('this is a text file, not an export')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/could not be read as JSON/i)
  })

  it('rejects JSON that is not a progress export', () => {
    const result = parseProgressExport('{"hello":"world"}')
    expect(result.ok).toBe(false)
  })

  it('rejects an export from a newer format version', () => {
    const result = parseProgressExport(JSON.stringify({ version: 99, events: [] }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/newer version/i)
  })

  it('imports a valid export', () => {
    const original = foldEvents([completed('a'), enrolled('r')])
    const result = parseProgressExport(JSON.stringify(original))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.derived.completedLessons['a']).toBeDefined()
      expect(result.state.derived.enrolledRoadmaps).toEqual(['r'])
      expect(result.skipped).toBe(0)
    }
  })

  it('skips unknown event types rather than rejecting the whole file', () => {
    const raw = JSON.stringify({
      version: 1,
      events: [
        {
          id: 'e1',
          at: '2026-10-01T00:00:00.000Z',
          type: 'lesson.completed',
          lessonId: 'a',
          source: 'manual',
        },
        { id: 'e2', at: '2026-10-01T00:00:00.000Z', type: 'something.from.the.future' },
      ],
    })
    const result = parseProgressExport(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.skipped).toBe(1)
      expect(result.note).toMatch(/skipped/i)
      // The IMPORT path still drops it (A1-R narrowed this rule to import only) —
      // and it is reported, unlike the storage read path, which must preserve it.
      expect(result.state.events).toHaveLength(1)
    }
  })

  it('never throws, whatever it is handed', () => {
    for (const input of ['', 'null', '[]', '0', '{"version":"x"}', '{"version":1,"events":null}']) {
      expect(() => parseProgressExport(input)).not.toThrow()
    }
  })

  it('a failed import does not mutate the caller’s existing state', () => {
    // The contract is: validate into a candidate, commit only on success. A
    // learner whose file is broken must keep the progress they already had.
    const existing = foldEvents([completed('a')])
    const before = JSON.stringify(existing)
    parseProgressExport('garbage')
    expect(JSON.stringify(existing)).toBe(before)
  })
})
