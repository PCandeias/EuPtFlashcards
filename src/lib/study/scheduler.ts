/**
 * Study session queries over the card corpus.
 *
 * The scheduling itself lives in sm2.ts; this module only decides what to show
 * and keeps the progress map immutable.
 */
import { cardId, type Card } from '../cards/schema.js'
import type { TenseId } from '../verbs/tenses.js'
import { isDue, newState, review, type Rating, type ReviewState } from './sm2.js'

export type Progress = Record<string, ReviewState>

export function stateFor(progress: Progress, card: Card): ReviewState {
  return progress[cardId(card)] ?? newState()
}

export function dueCards(progress: Progress, cards: readonly Card[], now: number): Card[] {
  return cards.filter(card => isDue(progress[cardId(card)], now))
}

/** Applies a rating and returns a new progress map. */
export function gradeCard(
  progress: Progress,
  card: Card,
  rating: Rating,
  now: number,
  rng?: () => number,
): Progress {
  const id = cardId(card)
  return { ...progress, [id]: review(progress[id] ?? newState(), rating, now, rng) }
}

export interface Stats {
  /** Cards answered correctly at least once and not currently lapsed. */
  learned: number
  /** Cards whose interval has grown past three weeks. */
  mature: number
  reviews: number
}

const MATURE_DAYS = 21

export function stats(progress: Progress): Stats {
  let learned = 0
  let mature = 0
  let reviews = 0
  for (const state of Object.values(progress)) {
    reviews += state.reviews
    if (state.reps > 0) learned++
    if (state.interval >= MATURE_DAYS) mature++
  }
  return { learned, mature, reviews }
}

export { isDue, newState }
export type { Rating, ReviewState }

/**
 * Keeps only cards whose tense is being studied.
 *
 * A card without a tense — a noun, an adjective, a fixed phrase, an infinitive —
 * is never filtered out. Only a card that carries one can be hidden by it, so
 * unticking a tense removes conjugated forms and leaves the vocabulary alone.
 */
export function inSelectedTenses(cards: readonly Card[], tenses: readonly TenseId[]): Card[] {
  const selected = new Set(tenses)
  return cards.filter(card => !card.tense || selected.has(card.tense))
}
