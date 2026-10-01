import { describe, expect, it } from 'vitest'
import { lessonContext, findLesson } from '../content.ts'

/**
 * THE LESSON CONTENT SEAM (M2.3).
 *
 * `lessonContext` is the single function the lesson page reads. These tests
 * assert the JOIN it performs — lesson plus body plus position plus neighbours
 * plus prerequisites plus related plus skills — against the REAL content tree,
 * not a fixture. That matters because the failure mode this guards against is a
 * join that is subtly wrong for real data (a neighbour computed from the wrong
 * sequence, a prerequisite that resolves to the wrong lesson) and would look
 * fine against a hand-made fixture that was written to match the code.
 *
 * The roadmap order is a fact of the committed content:
 *
 *   what-is-a-virtual-assistant -> who-hires-virtual-assists
 *     -> files-and-folders -> browser-basics
 */

const FIRST = 'what-is-a-virtual-assistant'
const SECOND = 'who-hires-virtual-assists'
const THIRD = 'files-and-folders'
const FOURTH = 'browser-basics'

describe('lessonContext — resolution', () => {
  it('returns undefined for an unknown lesson id, so the page can 404', () => {
    expect(lessonContext('no-such-lesson')).toBeUndefined()
  })

  it('resolves a real lesson with its compiled body', () => {
    const context = lessonContext(FIRST)
    expect(context).toBeDefined()
    expect(context?.lesson.id).toBe(FIRST)
    // The body is the compiled tree from M2.2, not raw text.
    expect(context?.body).toBeDefined()
    expect((context?.body ?? []).length).toBeGreaterThan(0)
  })

  it('resolves the owning module and roadmap', () => {
    const context = lessonContext(FIRST)
    expect(context?.module?.id).toBe('va-foundations')
    // The first roadmap to contain it, in registry order.
    expect(context?.roadmap?.id).toBe('beginner-va')
  })

  it('resolves the lesson’s skills as records, not bare ids', () => {
    const context = lessonContext(FIRST)
    expect(context?.skills.length).toBeGreaterThan(0)
    for (const skill of context?.skills ?? []) {
      // A resolved skill has a title; a bare id would not.
      expect(skill.title.length).toBeGreaterThan(0)
    }
  })
})

describe('lessonContext — deterministic ordering', () => {
  it('numbers lessons 1-based within the roadmap sequence', () => {
    expect(lessonContext(FIRST)?.position).toBe(1)
    expect(lessonContext(SECOND)?.position).toBe(2)
    expect(lessonContext(THIRD)?.position).toBe(3)
    expect(lessonContext(FOURTH)?.position).toBe(4)
  })

  it('reports a consistent total across the sequence', () => {
    const total = lessonContext(FIRST)?.total
    expect(total).toBe(4)
    for (const id of [FIRST, SECOND, THIRD, FOURTH]) {
      expect(lessonContext(id)?.total).toBe(total)
    }
  })

  it('gives the first lesson no previous and the last no next', () => {
    const first = lessonContext(FIRST)
    expect(first?.previous).toBeUndefined()
    expect(first?.next?.id).toBe(SECOND)

    const last = lessonContext(FOURTH)
    expect(last?.previous?.id).toBe(THIRD)
    expect(last?.next).toBeUndefined()
  })

  it('orders the middle neighbours in roadmap order', () => {
    const second = lessonContext(SECOND)
    expect(second?.previous?.id).toBe(FIRST)
    expect(second?.next?.id).toBe(THIRD)
  })

  it('is stable — the same call returns the same neighbours', () => {
    const a = lessonContext(SECOND)
    const b = lessonContext(SECOND)
    expect(a?.previous?.id).toBe(b?.previous?.id)
    expect(a?.next?.id).toBe(b?.next?.id)
    expect(a?.position).toBe(b?.position)
  })
})

describe('lessonContext — prerequisites and related', () => {
  it('resolves a prerequisite to the lesson it points at', () => {
    // `who-hires-virtual-assists` declares a prerequisite on the first lesson.
    const context = lessonContext(SECOND)
    expect(context?.prerequisites.map((link) => link.id)).toContain(FIRST)
  })

  it('carries the reason with the resolved link, so the page never has to join them', () => {
    const prerequisite = lessonContext(SECOND)?.prerequisites[0]
    expect(prerequisite?.title.length).toBeGreaterThan(0)
    // The reason is advisory text and must survive resolution.
    expect(prerequisite?.reason.length).toBeGreaterThan(0)
  })

  it('returns an empty list rather than undefined when there are none', () => {
    const context = lessonContext(FIRST)
    // The page maps over these unconditionally, so the empty case must be a list.
    expect(context?.prerequisites).toEqual([])
    expect(context?.related).toEqual([])
  })
})

describe('findLesson — the M2.2 seam still behaves', () => {
  it('returns the lesson and its body together', () => {
    const found = findLesson(FIRST)
    expect(found?.lesson.id).toBe(FIRST)
    expect(found?.body?.length).toBeGreaterThan(0)
  })

  it('returns undefined for an unknown id', () => {
    expect(findLesson('nope')).toBeUndefined()
  })
})
