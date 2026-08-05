/**
 * Deck ordering.
 *
 * The random source is injected so ordering is deterministic under test; the app
 * passes `Math.random`.
 */
import { cardId, type Card } from '../cards/schema.js'

export type Rng = () => number

/** Fisher–Yates, non-mutating. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * A key identifying "the same set of cards in the same situation". When it
 * changes the order is regenerated; while it holds, the order is stable so
 * paging back and forth does not reshuffle under you.
 */
export function orderKey(deck: string, includeDeferred: boolean, cards: readonly Card[]): string {
  return `${deck}::${includeDeferred}::${cards.map(cardId).join('|')}`
}

/** Wraps an index into range, including negatives. */
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return ((index % length) + length) % length
}
