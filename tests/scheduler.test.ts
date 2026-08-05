import { describe, it, expect } from 'vitest'
import { dueCards, gradeCard, stateFor, stats, type Progress } from '../src/lib/study/scheduler.js'
import { newState, DAY_MS } from '../src/lib/study/sm2.js'
import { shuffle, wrapIndex, orderKey } from '../src/lib/study/order.js'
import type { Card } from '../src/lib/cards/schema.js'

const NOW = 1_700_000_000_000
const noFuzz = () => 0.5
const a: Card = { deck: 'D', en: 'a', pt: 'aa' }
const b: Card = { deck: 'D', en: 'b', pt: 'bb' }

describe('stateFor', () => {
  it('gives an unseen card a fresh state', () => {
    expect(stateFor({}, a)).toEqual(newState())
  })

  it('returns the stored state when there is one', () => {
    const stored = { ...newState(), reps: 2 }
    expect(stateFor({ 'D::a::aa': stored }, a)).toBe(stored)
  })
})

describe('dueCards', () => {
  it('includes every unseen card', () => {
    expect(dueCards({}, [a, b], NOW)).toEqual([a, b])
  })

  it('excludes a card scheduled for later', () => {
    const p = gradeCard({}, a, 'good', NOW, noFuzz)
    expect(dueCards(p, [a, b], NOW)).toEqual([b])
  })

  it('brings it back once the interval has elapsed', () => {
    const p = gradeCard({}, a, 'good', NOW, noFuzz)
    expect(dueCards(p, [a, b], NOW + DAY_MS)).toEqual([a, b])
  })

  // A lapsed card should reappear in the same session, not tomorrow.
  it('returns a lapsed card almost immediately', () => {
    const p = gradeCard({}, a, 'again', NOW, noFuzz)
    expect(dueCards(p, [a], NOW)).toEqual([])
    expect(dueCards(p, [a], NOW + 60_000)).toEqual([a])
  })
})

describe('gradeCard', () => {
  it('records a rating against the right card', () => {
    const p = gradeCard({}, a, 'good', NOW, noFuzz)
    expect(p['D::a::aa']!.reps).toBe(1)
    expect(p['D::b::bb']).toBeUndefined()
  })

  it('does not mutate the input', () => {
    const before: Progress = {}
    gradeCard(before, a, 'good', NOW, noFuzz)
    expect(before).toEqual({})
  })

  it('accumulates across reviews', () => {
    let p = gradeCard({}, a, 'good', NOW, noFuzz)
    p = gradeCard(p, a, 'good', NOW, noFuzz)
    expect(p['D::a::aa']!.interval).toBe(6)
    expect(p['D::a::aa']!.reviews).toBe(2)
  })
})

describe('stats', () => {
  it('counts a card as learned once it has been answered correctly', () => {
    const p = gradeCard({}, a, 'good', NOW, noFuzz)
    expect(stats(p).learned).toBe(1)
  })

  it('does not count a lapsed card as learned', () => {
    let p = gradeCard({}, a, 'good', NOW, noFuzz)
    p = gradeCard(p, a, 'again', NOW, noFuzz)
    expect(stats(p).learned).toBe(0)
  })

  it('counts a card as mature past three weeks', () => {
    const young: Progress = { x: { ...newState(), interval: 20, reps: 3 } }
    const old: Progress = { x: { ...newState(), interval: 21, reps: 3 } }
    expect(stats(young).mature).toBe(0)
    expect(stats(old).mature).toBe(1)
  })

  it('totals every review ever made', () => {
    let p = gradeCard({}, a, 'good', NOW, noFuzz)
    p = gradeCard(p, a, 'again', NOW, noFuzz)
    p = gradeCard(p, b, 'good', NOW, noFuzz)
    expect(stats(p).reviews).toBe(3)
  })
})

describe('shuffle', () => {
  it('is deterministic given a fixed source', () => {
    const rng = () => 0.5
    expect(shuffle([1, 2, 3, 4], rng)).toEqual(shuffle([1, 2, 3, 4], rng))
  })

  it('preserves every element', () => {
    let seed = 42
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
    expect(shuffle([1, 2, 3, 4, 5], rng).sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('does not mutate the input', () => {
    const input = [1, 2, 3]
    shuffle(input, () => 0)
    expect(input).toEqual([1, 2, 3])
  })
})

describe('wrapIndex', () => {
  it('wraps forwards and backwards', () => {
    expect(wrapIndex(5, 3)).toBe(2)
    expect(wrapIndex(-1, 3)).toBe(2)
    expect(wrapIndex(0, 3)).toBe(0)
  })

  it('survives an empty deck', () => {
    expect(wrapIndex(3, 0)).toBe(0)
  })
})

describe('orderKey', () => {
  it('changes when the card set changes', () => {
    expect(orderKey('D', false, [a])).not.toBe(orderKey('D', false, [a, b]))
  })
  it('is stable for the same set', () => {
    expect(orderKey('D', false, [a, b])).toBe(orderKey('D', false, [a, b]))
  })
})
