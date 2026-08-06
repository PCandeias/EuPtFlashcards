import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadReports, saveReports, reportCard, unreportCard, isReported,
  withoutReported, reportList, reportsAsText, reportsFilename, sanitizeReports,
  type Reports,
} from '../src/lib/storage/reports.js'
import { keysFor, type StorageLike } from '../src/lib/storage/progress.js'

const KEYS = keysFor('eupt:v4')
import type { Card } from '../src/lib/cards/schema.js'

class FakeStorage implements StorageLike {
  map = new Map<string, string>()
  getItem(k: string) { return this.map.get(k) ?? null }
  setItem(k: string, v: string) { this.map.set(k, v) }
  removeItem(k: string) { this.map.delete(k) }
}

const a: Card = { deck: 'Class', en: 'to sleep', target: 'dormir' }
const b: Card = { deck: 'Numbers', en: 'zero', target: 'zero' }
const AT = '2026-08-06T10:00:00.000Z'

let store: FakeStorage
beforeEach(() => { store = new FakeStorage() })

describe('reporting', () => {
  it('records the card, not just its id, so an export still reads later', () => {
    const r = reportCard({}, a, AT)
    expect(r['Class::to sleep::dormir']).toEqual({
      id: 'Class::to sleep::dormir', deck: 'Class', en: 'to sleep', target: 'dormir', at: AT,
    })
  })

  it('does not mutate the input', () => {
    const before: Reports = {}
    reportCard(before, a, AT)
    expect(before).toEqual({})
  })

  it('reporting the same card twice leaves one entry', () => {
    const r = reportCard(reportCard({}, a, AT), a, '2026-08-07T10:00:00.000Z')
    expect(Object.keys(r)).toHaveLength(1)
  })

  it('can be undone', () => {
    const r = reportCard({}, a, AT)
    expect(isReported(r, a)).toBe(true)
    expect(isReported(unreportCard(r, 'Class::to sleep::dormir'), a)).toBe(false)
  })
})

describe('hiding reported cards', () => {
  // The point of reporting a card is to stop being taught it.
  it('removes a reported card from the deck', () => {
    const r = reportCard({}, a, AT)
    expect(withoutReported([a, b], r)).toEqual([b])
  })

  it('leaves the deck alone when nothing is reported', () => {
    expect(withoutReported([a, b], {})).toEqual([a, b])
  })

  it('does not mutate the input', () => {
    const cards = [a, b]
    withoutReported(cards, reportCard({}, a, AT))
    expect(cards).toHaveLength(2)
  })
})

describe('storage', () => {
  it('round-trips', () => {
    const r = reportCard({}, a, AT)
    saveReports(store, KEYS, r)
    expect(loadReports(store, KEYS)).toEqual(r)
  })

  it('is empty when nothing is stored', () => {
    expect(loadReports(store, KEYS)).toEqual({})
  })

  it('falls back to empty on corrupt data without erasing it', () => {
    store.setItem(KEYS.reported, 'not json')
    expect(loadReports(store, KEYS)).toEqual({})
    expect(store.getItem(KEYS.reported)).toBe('not json')
  })

  it('drops entries of the wrong shape', () => {
    expect(sanitizeReports({ x: { en: 'only half a record' } })).toEqual({})
  })
})

describe('the text export', () => {
  const two = reportCard(reportCard({}, a, AT), b, '2026-08-07T09:00:00.000Z')

  it('names every reported card with its deck', () => {
    const text = reportsAsText(two, AT, "European Portuguese")
    expect(text).toContain('[Class] to sleep = dormir')
    expect(text).toContain('[Numbers] zero = zero')
  })

  it('says how many and when', () => {
    const text = reportsAsText(two, AT, "European Portuguese")
    expect(text).toContain('2 cards')
    expect(text).toContain('Exported 2026-08-06')
    expect(text).toContain('reported 2026-08-06')
  })

  it('reads sensibly when there is nothing', () => {
    expect(reportsAsText({}, AT, "European Portuguese")).toContain('0 cards')
  })

  it('gets the plural right for one', () => {
    expect(reportsAsText(reportCard({}, a, AT), AT, "European Portuguese")).toContain('1 card\n')
  })

  it('is ordered oldest first', () => {
    expect(reportList(two).map(r => r.en)).toEqual(['to sleep', 'zero'])
  })

  it('is named as a dated text file', () => {
    expect(reportsFilename(AT, 'pt')).toBe('flashcards-pt-reported-2026-08-06.txt')
    expect(reportsFilename(AT, 'tr')).toBe('flashcards-tr-reported-2026-08-06.txt')
  })
})
