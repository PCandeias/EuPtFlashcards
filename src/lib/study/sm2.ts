/**
 * SM-2 spaced repetition.
 *
 * Replaces the fixed "known → +N days" rule. Intervals grow by an ease factor
 * that rises when a card is easy and falls when it is hard, so cards you know
 * drift out of the way and cards you keep forgetting come back quickly.
 *
 * Pure: `now` and the fuzz source are injected, so every branch is deterministic
 * under test.
 */

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export const RATINGS: readonly Rating[] = ['again', 'hard', 'good', 'easy']

export interface ReviewState {
  /** Multiplier applied to the interval on a `good` answer. */
  ease: number
  /** Current interval in days. 0 means the card has not graduated yet. */
  interval: number
  /** Consecutive successful reviews. Reset by `again`. */
  reps: number
  /** How many times this card has been forgotten after graduating. */
  lapses: number
  /** When the card is next due, epoch ms. null means due now. */
  due: number | null
  /** Total reviews ever, for statistics only — never used for scheduling. */
  reviews: number
}

export const DAY_MS = 86_400_000
/** A lapsed card returns almost immediately, within the same session. */
export const AGAIN_MS = 60_000

const MIN_EASE = 1.3
const DEFAULT_EASE = 2.5

export function newState(due: number | null = null): ReviewState {
  return { ease: DEFAULT_EASE, interval: 0, reps: 0, lapses: 0, due, reviews: 0 }
}

export function isDue(state: ReviewState | undefined, now: number): boolean {
  if (!state || state.due == null) return true
  return state.due <= now
}

/**
 * Intervals in days for each rating, before fuzz.
 *
 * Exposed separately so the buttons can show what each choice will cost —
 * grading blind is how people end up fighting their own scheduler.
 */
export function nextIntervals(state: ReviewState): Record<Rating, number> {
  const { interval, ease, reps } = state
  return {
    again: 0,
    hard: reps === 0 ? 1 : Math.max(1, interval * 1.2),
    good: reps === 0 ? 1 : reps === 1 ? 6 : interval * ease,
    easy: reps === 0 ? 4 : reps === 1 ? 8 : interval * ease * 1.3,
  }
}

/**
 * Spreads due dates by ±5% so a batch reviewed together does not come back in
 * lockstep forever. Only for intervals long enough for a day either way to be
 * meaningless.
 */
function fuzz(days: number, rng: () => number): number {
  if (days < 2.5) return Math.round(days)
  const spread = days * 0.05
  return Math.max(1, Math.round(days + (rng() * 2 - 1) * spread))
}

export function review(
  state: ReviewState,
  rating: Rating,
  now: number,
  rng: () => number = Math.random,
): ReviewState {
  const reviews = state.reviews + 1

  if (rating === 'again') {
    return {
      ease: Math.max(MIN_EASE, state.ease - 0.2),
      interval: 0,
      reps: 0,
      // Only count a lapse if the card had actually graduated.
      lapses: state.lapses + (state.reps > 0 ? 1 : 0),
      due: now + AGAIN_MS,
      reviews,
    }
  }

  const easeDelta = rating === 'hard' ? -0.15 : rating === 'easy' ? 0.15 : 0
  const ease = Math.max(MIN_EASE, state.ease + easeDelta)
  const days = fuzz(nextIntervals(state)[rating], rng)

  return {
    ease,
    interval: days,
    reps: state.reps + 1,
    lapses: state.lapses,
    due: now + days * DAY_MS,
    reviews,
  }
}

/** Human-readable interval for a rating button. */
export function formatInterval(days: number): string {
  if (days <= 0) return '<1m'
  if (days < 30) return `${Math.round(days)}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}
