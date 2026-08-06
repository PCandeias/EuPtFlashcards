/**
 * Deciding whether a card is a verb we can help with.
 *
 * Detection is deliberately narrow. A false positive puts a conjugation panel on
 * a noun; a false negative just means no help on one card. The second is much
 * cheaper, so the rules only fire on cards that are plainly infinitives.
 */
import type { Card } from '../cards/schema.js'
import { conjugatePhrase } from './conjugate.js'

/**
 * Cards written as an infinitive: "to sleep" / "dormir".
 *
 * The English side must begin with "to ", which is what distinguishes the card
 * "to sleep" from the card "I sleep" — only the first is asking about the verb
 * itself.
 */
export function verbOf(card: Card): string | null {
  if (!/^to\s+\S/i.test(card.en.trim())) return null

  // "to work / study" -> "trabalhar / estudar": take the first, which pairs with
  // the first English sense. Phrases keep their tail: "ir para a escola".
  const first = card.pt.split('/')[0]?.trim()
  if (!first) return null

  return conjugatePhrase(first) ? first : null
}

export function isVerbCard(card: Card): boolean {
  return verbOf(card) !== null
}
