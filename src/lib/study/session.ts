/**
 * The study queue for one sitting.
 *
 * Deriving the running order from "cards currently due" reshuffles the deck on
 * every answer, because answering changes what is due. That makes Prev/Next
 * meaningless and the position counter jump around.
 *
 * So the queue is built once and then mutated deliberately: a graded card leaves
 * it, and a card you failed is pushed back a few places so it returns before you
 * finish rather than tomorrow.
 */
import { cardId, type Card } from '../cards/schema.js'

/** How many cards to bury a failed card behind, when the queue is long enough. */
export const RELEARN_GAP = 4

export interface Session {
  cards: Card[]
  index: number
}

export function startSession(cards: readonly Card[]): Session {
  return { cards: [...cards], index: 0 }
}

export function currentCard(session: Session): Card | undefined {
  return session.cards[session.index]
}

export function move(session: Session, delta: number): Session {
  if (!session.cards.length) return session
  const length = session.cards.length
  return { ...session, index: ((session.index + delta) % length + length) % length }
}

/**
 * Removes the graded card from the queue.
 *
 * `requeue` puts it back near the front-ish of the remaining cards so a card you
 * just failed comes round again this session — that is the whole point of the
 * `again` rating.
 */
export function completeCurrent(session: Session, requeue: boolean): Session {
  const card = currentCard(session)
  if (!card) return session

  const remaining = session.cards.filter((_, i) => i !== session.index)

  if (requeue) {
    const at = Math.min(session.index + RELEARN_GAP, remaining.length)
    remaining.splice(at, 0, card)
    // Staying put lands on the next card, since the graded one moved away.
    return { cards: remaining, index: Math.min(session.index, remaining.length - 1) }
  }

  if (!remaining.length) return { cards: [], index: 0 }
  // Removing the current card shifts the next one into this slot.
  return { cards: remaining, index: session.index % remaining.length }
}

/** True when the queue no longer holds a given card — used to keep it in sync. */
export function sessionMatches(session: Session, cards: readonly Card[]): boolean {
  if (session.cards.length !== cards.length) return false
  const wanted = new Set(cards.map(cardId))
  return session.cards.every(c => wanted.has(cardId(c)))
}
