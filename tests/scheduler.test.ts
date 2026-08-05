import { describe, it, expect } from 'vitest'
import {
  isDue, dueCards, markKnown, markAgain, knownCount, DAY_MS, type Progress,
} from '../src/lib/study/scheduler.js'
import { shuffle, wrapIndex, orderKey } from '../src/lib/study/order.js'
import type { Card } from '../src/lib/cards/schema.js'

const NOW = 1_700_000_000_000
const a: Card = { deck: 'D', en: 'a', pt: 'aa' }
const b: Card = { deck: 'D', en: 'b', pt: 'bb' }

describe('isDue', () => {
  it('treats an unseen card as due', () => {
    expect(isDue({}, a, NOW)).toBe(true)
  })

  it('treats a card with no deferral as due', () => {
    expect(isDue({ 'D::a::aa': { knownCount: 2, nextDue: null } }, a, NOW)).toBe(true)
  })

  it('defers a card whose time has not come', () => {
    expect(isDue({ 'D::a::aa': { knownCount: 1, nextDue: NOW + 1 } }, a, NOW)).toBe(false)
  })

  it('releases a card exactly at its due moment', () => {
    expect(isDue({ 'D::a::aa': { knownCount: 1, nextDue: NOW } }, a, NOW)).toBe(true)
  })
})

describe('markKnown', () => {
  it('defers by the requested number of days', () => {
    const next = markKnown({}, a, 3, NOW)
    expect(next['D::a::aa']).toEqual({ knownCount: 1, nextDue: NOW + 3 * DAY_MS })
  })

  it('accumulates the success count', () => {
    let p: Progress = {}
    p = markKnown(p, a, 1, NOW)
    p = markKnown(p, a, 1, NOW)
    expect(p['D::a::aa']!.knownCount).toBe(2)
  })

  it('does not mutate the input', () => {
    const before: Progress = {}
    markKnown(before, a, 3, NOW)
    expect(before).toEqual({})
  })
})

describe('markAgain', () => {
  it('clears the deferral but keeps the success count', () => {
    const p = markAgain(markKnown({}, a, 30, NOW), a)
    expect(p['D::a::aa']).toEqual({ knownCount: 1, nextDue: null })
    expect(isDue(p, a, NOW)).toBe(true)
  })
})

describe('dueCards', () => {
  it('filters out only the deferred ones', () => {
    const p = markKnown({}, a, 5, NOW)
    expect(dueCards(p, [a, b], NOW)).toEqual([b])
    expect(dueCards(p, [a, b], NOW + 6 * DAY_MS)).toEqual([a, b])
  })
})

describe('knownCount', () => {
  it('counts cards answered correctly at least once', () => {
    let p: Progress = markKnown({}, a, 1, NOW)
    p = markAgain(p, b)
    expect(knownCount(p)).toBe(1)
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
