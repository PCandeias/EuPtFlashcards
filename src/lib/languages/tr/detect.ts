/**
 * Deciding whether a card is a verb we can help with.
 *
 * Detection is deliberately narrow. A false positive puts a conjugation panel on
 * a noun; a false negative just means no help on one card. The second is much
 * cheaper, so the rules only fire on cards that are plainly infinitives.
 *
 * Turkish makes this easier than Portuguese in one way and harder in another. An
 * infinitive is unmistakable — it ends in -mak or -mek and nothing else does — but
 * `yemek` is both "to eat" and "food", so the English side still has to agree that
 * a verb is what the card is about.
 */
import type { Card } from '../../cards/schema.js'
import { conjugatePhrase } from './conjugate.js'

export function verbOf(card: Card): string | null {
  if (!/^to\s+\S/i.test(card.en.trim())) return null

  // "to work / to study" -> "çalışmak": one Turkish word, several English senses.
  const first = card.target.split('/')[0]?.trim()
  if (!first) return null

  return conjugatePhrase(first) ? first : null
}

export function isVerbCard(card: Card): boolean {
  return verbOf(card) !== null
}
