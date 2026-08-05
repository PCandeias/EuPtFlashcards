import { describe, it, expect } from 'vitest'
import {
  newState, review, isDue, nextIntervals, formatInterval,
  DAY_MS, AGAIN_MS, type ReviewState,
} from '../src/lib/study/sm2.js'

const NOW = 1_700_000_000_000
// Midpoint fuzz is a no-op, which keeps interval arithmetic exact in tests.
const noFuzz = () => 0.5

const after = (state: ReviewState, ...ratings: Parameters<typeof review>[1][]) =>
  ratings.reduce((s, r) => review(s, r, NOW, noFuzz), state)

describe('newState', () => {
  it('starts a card unseen and due', () => {
    const s = newState()
    expect(s).toEqual({ ease: 2.5, interval: 0, reps: 0, lapses: 0, due: null, reviews: 0 })
    expect(isDue(s, NOW)).toBe(true)
  })

  it('can carry a due date forward', () => {
    expect(newState(NOW + DAY_MS).due).toBe(NOW + DAY_MS)
  })
})

describe('isDue', () => {
  it('treats an unknown card as due', () => {
    expect(isDue(undefined, NOW)).toBe(true)
  })
  it('releases a card exactly at its due moment', () => {
    expect(isDue({ ...newState(), due: NOW }, NOW)).toBe(true)
  })
  it('holds a card back before then', () => {
    expect(isDue({ ...newState(), due: NOW + 1 }, NOW)).toBe(false)
  })
})

describe('the graduating sequence', () => {
  it('walks 1 day, then 6 days, then by ease', () => {
    const first = review(newState(), 'good', NOW, noFuzz)
    expect(first.interval).toBe(1)
    expect(first.due).toBe(NOW + DAY_MS)

    const second = review(first, 'good', NOW, noFuzz)
    expect(second.interval).toBe(6)

    // 6 × 2.5 = 15
    const third = review(second, 'good', NOW, noFuzz)
    expect(third.interval).toBe(15)

    // 15 × 2.5 = 37.5 -> 38
    expect(review(third, 'good', NOW, noFuzz).interval).toBe(38)
  })

  it('counts every review', () => {
    expect(after(newState(), 'good', 'good', 'good').reviews).toBe(3)
  })
})

describe('again', () => {
  it('brings the card straight back and clears progress', () => {
    const mature = after(newState(), 'good', 'good', 'good')
    const lapsed = review(mature, 'again', NOW, noFuzz)

    expect(lapsed.interval).toBe(0)
    expect(lapsed.reps).toBe(0)
    expect(lapsed.due).toBe(NOW + AGAIN_MS)
    expect(isDue(lapsed, NOW + AGAIN_MS)).toBe(true)
  })

  it('drops the ease by 0.20', () => {
    expect(review(newState(), 'again', NOW, noFuzz).ease).toBeCloseTo(2.3, 5)
  })

  it('counts a lapse only for a card that had graduated', () => {
    // Failing a brand-new card is not forgetting it.
    expect(review(newState(), 'again', NOW, noFuzz).lapses).toBe(0)
    const graduated = review(newState(), 'good', NOW, noFuzz)
    expect(review(graduated, 'again', NOW, noFuzz).lapses).toBe(1)
  })
})

describe('ease', () => {
  it('falls on hard and rises on easy', () => {
    expect(review(newState(), 'hard', NOW, noFuzz).ease).toBeCloseTo(2.35, 5)
    expect(review(newState(), 'easy', NOW, noFuzz).ease).toBeCloseTo(2.65, 5)
  })

  it('is unchanged by good', () => {
    expect(review(newState(), 'good', NOW, noFuzz).ease).toBe(2.5)
  })

  // Without a floor, a card you keep failing would come back forever at
  // ever-shorter intervals.
  it('never falls below 1.3', () => {
    let s = newState()
    for (let i = 0; i < 20; i++) s = review(s, 'again', NOW, noFuzz)
    expect(s.ease).toBe(1.3)
  })
})

describe('hard', () => {
  it('grows the interval far more slowly than good', () => {
    const mature = after(newState(), 'good', 'good', 'good')   // interval 15
    expect(review(mature, 'hard', NOW, noFuzz).interval).toBe(18)  // 15 × 1.2
    expect(review(mature, 'good', NOW, noFuzz).interval).toBe(38)  // 15 × 2.5
  })

  it('never goes below one day', () => {
    expect(review(newState(), 'hard', NOW, noFuzz).interval).toBe(1)
  })
})

describe('easy', () => {
  it('jumps a new card straight past the learning steps', () => {
    expect(review(newState(), 'easy', NOW, noFuzz).interval).toBe(4)
  })

  it('outpaces good on a mature card', () => {
    const mature = after(newState(), 'good', 'good', 'good')
    const easy = review(mature, 'easy', NOW, noFuzz).interval
    const good = review(mature, 'good', NOW, noFuzz).interval
    expect(easy).toBeGreaterThan(good)
  })
})

describe('fuzz', () => {
  it('leaves short intervals exact', () => {
    // A day either way matters when the interval is a day.
    expect(review(newState(), 'good', NOW, () => 0).interval).toBe(1)
    expect(review(newState(), 'good', NOW, () => 1).interval).toBe(1)
  })

  it('spreads long intervals so batches do not return in lockstep', () => {
    const mature = after(newState(), 'good', 'good', 'good')
    const low = review(mature, 'good', NOW, () => 0).interval
    const high = review(mature, 'good', NOW, () => 1).interval
    expect(low).toBeLessThan(high)
    // ±5% of 37.5 is under two days either way.
    expect(high - low).toBeLessThanOrEqual(4)
  })
})

describe('nextIntervals', () => {
  it('previews every rating without advancing the card', () => {
    const s = newState()
    const preview = nextIntervals(s)
    expect(preview.again).toBe(0)
    expect(preview.good).toBe(1)
    expect(preview.easy).toBe(4)
    expect(s).toEqual(newState())
  })

  it('orders the options sensibly for a mature card', () => {
    const mature = after(newState(), 'good', 'good', 'good')
    const p = nextIntervals(mature)
    expect(p.again).toBeLessThan(p.hard)
    expect(p.hard).toBeLessThan(p.good)
    expect(p.good).toBeLessThan(p.easy)
  })
})

describe('formatInterval', () => {
  it('reads naturally at each scale', () => {
    expect(formatInterval(0)).toBe('<1m')
    expect(formatInterval(1)).toBe('1d')
    expect(formatInterval(15)).toBe('15d')
    expect(formatInterval(60)).toBe('2mo')
    expect(formatInterval(400)).toBe('1.1y')
  })
})

describe('a card learned then forgotten', () => {
  it('rebuilds from scratch but with a lower ease, so it returns sooner', () => {
    const learned = after(newState(), 'good', 'good', 'good')
    expect(learned.interval).toBe(15)

    const relearning = review(learned, 'again', NOW, noFuzz)
    const rebuilt = after(relearning, 'good', 'good', 'good')

    expect(rebuilt.interval).toBeLessThan(learned.interval)
    expect(rebuilt.ease).toBeLessThan(learned.ease)
    expect(rebuilt.lapses).toBe(1)
  })
})
