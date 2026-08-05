import { describe, it, expect } from 'vitest'
import {
  dayKey, recordReview, reviewsOn, streak, retention, totalReviews, recentDays,
  sanitizeHistory, type History,
} from '../src/lib/study/history.js'

const DAY = 86_400_000
// Local noon, so a timezone shift cannot push these onto a neighbouring day.
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime()
const TODAY = at(2026, 8, 6)

describe('dayKey', () => {
  it('formats the local calendar day', () => {
    expect(dayKey(at(2026, 8, 6))).toBe('2026-08-06')
  })

  it('pads single digits', () => {
    expect(dayKey(at(2026, 1, 3))).toBe('2026-01-03')
  })

  // A session at 23:30 belongs to the day you felt you studied, not to UTC's idea.
  it('keeps a late-evening session on the same day', () => {
    expect(dayKey(new Date(2026, 7, 6, 23, 30).getTime())).toBe('2026-08-06')
  })
})

describe('recordReview', () => {
  it('counts a review under its rating', () => {
    const h = recordReview({}, 'good', TODAY)
    expect(h['2026-08-06']).toEqual({ again: 0, hard: 0, good: 1, easy: 0 })
  })

  it('accumulates across a day', () => {
    let h = recordReview({}, 'good', TODAY)
    h = recordReview(h, 'good', TODAY)
    h = recordReview(h, 'again', TODAY)
    expect(h['2026-08-06']).toEqual({ again: 1, hard: 0, good: 2, easy: 0 })
  })

  it('keeps days apart', () => {
    let h = recordReview({}, 'good', TODAY)
    h = recordReview(h, 'good', TODAY - DAY)
    expect(Object.keys(h).sort()).toEqual(['2026-08-05', '2026-08-06'])
  })

  it('does not mutate the input', () => {
    const before: History = {}
    recordReview(before, 'good', TODAY)
    expect(before).toEqual({})
  })
})

describe('streak', () => {
  const withDays = (...offsets: number[]) =>
    offsets.reduce<History>((h, o) => recordReview(h, 'good', TODAY - o * DAY), {})

  it('is zero with no history', () => {
    expect(streak({}, TODAY)).toBe(0)
  })

  it('counts today alone as one', () => {
    expect(streak(withDays(0), TODAY)).toBe(1)
  })

  it('counts consecutive days back from today', () => {
    expect(streak(withDays(0, 1, 2), TODAY)).toBe(3)
  })

  // It is still early — not having studied yet today should not read as a break.
  it('survives today not being studied yet', () => {
    expect(streak(withDays(1, 2), TODAY)).toBe(2)
  })

  it('breaks once a whole day has been missed', () => {
    expect(streak(withDays(2, 3), TODAY)).toBe(0)
  })

  it('stops at the gap rather than counting everything', () => {
    expect(streak(withDays(0, 1, 3, 4), TODAY)).toBe(2)
  })
})

describe('retention', () => {
  it('is null with nothing to measure, rather than zero', () => {
    // Zero would read as "you failed everything", which is not what happened.
    expect(retention({}, 30, TODAY)).toBeNull()
  })

  it('counts anything that is not again as recalled', () => {
    let h = recordReview({}, 'good', TODAY)
    h = recordReview(h, 'hard', TODAY)
    h = recordReview(h, 'easy', TODAY)
    h = recordReview(h, 'again', TODAY)
    expect(retention(h, 30, TODAY)).toBe(0.75)
  })

  it('is 1 when nothing was forgotten', () => {
    expect(retention(recordReview({}, 'good', TODAY), 30, TODAY)).toBe(1)
  })

  it('is 0 when everything was forgotten', () => {
    expect(retention(recordReview({}, 'again', TODAY), 30, TODAY)).toBe(0)
  })

  it('ignores days outside the window', () => {
    let h = recordReview({}, 'again', TODAY - 40 * DAY)
    h = recordReview(h, 'good', TODAY)
    expect(retention(h, 30, TODAY)).toBe(1)
  })
})

describe('totalReviews', () => {
  it('sums every rating on every day', () => {
    let h = recordReview({}, 'good', TODAY)
    h = recordReview(h, 'again', TODAY - DAY)
    h = recordReview(h, 'easy', TODAY - DAY)
    expect(totalReviews(h)).toBe(3)
  })
})

describe('recentDays', () => {
  it('returns the window oldest first, including empty days', () => {
    const h = recordReview({}, 'good', TODAY)
    const days = recentDays(h, 3, TODAY)
    expect(days.map(d => d.total)).toEqual([0, 0, 1])
    expect(days[2]!.key).toBe('2026-08-06')
  })
})

describe('reviewsOn', () => {
  it('counts a given day', () => {
    expect(reviewsOn(recordReview({}, 'good', TODAY), TODAY)).toBe(1)
    expect(reviewsOn({}, TODAY)).toBe(0)
  })
})

describe('sanitizeHistory', () => {
  it('accepts a well-formed record', () => {
    const raw = { '2026-08-06': { again: 1, hard: 2, good: 3, easy: 4 } }
    expect(sanitizeHistory(raw)).toEqual(raw)
  })

  it('drops keys that are not dates', () => {
    expect(sanitizeHistory({ nonsense: { again: 1, hard: 0, good: 0, easy: 0 } })).toEqual({})
  })

  it('coerces missing or negative counts to zero', () => {
    expect(sanitizeHistory({ '2026-08-06': { good: 2, again: -5 } }))
      .toEqual({ '2026-08-06': { again: 0, hard: 0, good: 2, easy: 0 } })
  })

  it('survives rubbish', () => {
    expect(sanitizeHistory(null)).toEqual({})
    expect(sanitizeHistory('nope')).toEqual({})
  })
})
