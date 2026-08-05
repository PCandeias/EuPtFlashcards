/**
 * A daily record of reviews.
 *
 * Kept separate from card progress because it answers a different question: not
 * "when is this card due" but "am I actually turning up". A streak and a retention
 * figure are the two numbers that tell you whether the habit is working.
 *
 * Stored per local calendar day. Study sessions belong to the day you felt you
 * studied, so UTC would put a late-evening session on tomorrow's date.
 */
import type { Rating } from './sm2.js'

export interface DayRecord {
  again: number
  hard: number
  good: number
  easy: number
}

export type History = Record<string, DayRecord>

const EMPTY: DayRecord = { again: 0, hard: 0, good: 0, easy: 0 }

/** Local-calendar YYYY-MM-DD. */
export function dayKey(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function recordReview(history: History, rating: Rating, timestamp: number): History {
  const key = dayKey(timestamp)
  const day = history[key] ?? EMPTY
  return { ...history, [key]: { ...day, [rating]: day[rating] + 1 } }
}

export function dayTotal(day: DayRecord | undefined): number {
  if (!day) return 0
  return day.again + day.hard + day.good + day.easy
}

export function reviewsOn(history: History, timestamp: number): number {
  return dayTotal(history[dayKey(timestamp)])
}

/**
 * Consecutive days studied, counting back from today.
 *
 * Today not being studied yet does not break the streak — it is still early. It
 * breaks once a whole day has passed with nothing.
 */
export function streak(history: History, now: number): number {
  const day = 86_400_000
  let count = 0
  let cursor = now

  if (!reviewsOn(history, cursor)) {
    cursor -= day
    if (!reviewsOn(history, cursor)) return 0
  }

  while (reviewsOn(history, cursor)) {
    count++
    cursor -= day
  }
  return count
}

/**
 * Share of reviews that were not failures.
 *
 * `again` means the card was forgotten; everything else means it was recalled.
 * Returns null rather than 0 when there is nothing to measure, so the UI can say
 * "—" instead of implying total failure.
 */
export function retention(history: History, sinceDays: number, now: number): number | null {
  const cutoff = now - sinceDays * 86_400_000
  let recalled = 0
  let total = 0

  for (const [key, day] of Object.entries(history)) {
    // Parsed as local midnight, matching how the key was made.
    const [y, m, d] = key.split('-').map(Number)
    const stamp = new Date(y!, m! - 1, d!).getTime()
    if (stamp < cutoff) continue
    recalled += day.hard + day.good + day.easy
    total += dayTotal(day)
  }

  return total ? recalled / total : null
}

export function totalReviews(history: History): number {
  return Object.values(history).reduce((sum, day) => sum + dayTotal(day), 0)
}

/** The last `days` days, oldest first — for a sparkline or bar chart. */
export function recentDays(
  history: History,
  days: number,
  now: number,
): Array<{ key: string; total: number }> {
  const out: Array<{ key: string; total: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(now - i * 86_400_000)
    out.push({ key, total: dayTotal(history[key]) })
  }
  return out
}

export function sanitizeHistory(value: unknown): History {
  if (typeof value !== 'object' || value === null) return {}
  const out: History = {}
  for (const [key, day] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
    if (typeof day !== 'object' || day === null) continue
    const d = day as Record<string, unknown>
    const num = (v: unknown) => (typeof v === 'number' && v >= 0 ? v : 0)
    out[key] = {
      again: num(d.again), hard: num(d.hard), good: num(d.good), easy: num(d.easy),
    }
  }
  return out
}
