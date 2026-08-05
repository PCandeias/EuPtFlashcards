/**
 * Review scheduling.
 *
 * Ported unchanged from the single-file app: marking a card known defers it by a
 * fixed number of days; marking it again clears the deferral. This is deliberately
 * NOT spaced repetition yet — stage 2 replaces it, and keeping stage 1 behaviour
 * identical is what makes the port verifiable.
 */
import { cardId, type Card } from '../cards/schema.js'

export interface CardProgress {
  knownCount: number
  nextDue: number | null
}

export type Progress = Record<string, CardProgress>

export const DAY_MS = 86_400_000

export function isDue(progress: Progress, card: Card, now: number): boolean {
  const entry = progress[cardId(card)]
  if (!entry || entry.nextDue == null) return true
  return entry.nextDue <= now
}

export function dueCards(progress: Progress, cards: readonly Card[], now: number): Card[] {
  return cards.filter(card => isDue(progress, card, now))
}

/** Defers the card by `delayDays` and counts the success. */
export function markKnown(
  progress: Progress, card: Card, delayDays: number, now: number,
): Progress {
  const id = cardId(card)
  const prev = progress[id]
  return {
    ...progress,
    [id]: {
      knownCount: (prev?.knownCount ?? 0) + 1,
      nextDue: now + delayDays * DAY_MS,
    },
  }
}

/** Brings the card back into the due pool without touching its success count. */
export function markAgain(progress: Progress, card: Card): Progress {
  const id = cardId(card)
  const prev = progress[id]
  return { ...progress, [id]: { knownCount: prev?.knownCount ?? 0, nextDue: null } }
}

export function knownCount(progress: Progress): number {
  return Object.values(progress).filter(p => p.knownCount > 0).length
}
