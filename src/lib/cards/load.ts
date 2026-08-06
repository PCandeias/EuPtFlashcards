/**
 * Turning deck files into a validated corpus.
 *
 * The glob that finds the files lives with each language rather than here, because
 * Vite can only see a glob written as a literal. This module takes what the glob
 * found and does the part that is the same for every language.
 *
 * Loading is eager so the cards are bundled rather than fetched — one less thing
 * that can fail when the app is offline on a phone.
 */
import { parseCard, cardId, type Card } from './schema.js'

export interface DeckFile {
  deck: string
  cards: unknown[]
}

export type DeckModules = Record<string, { default: DeckFile }>

export interface Corpus {
  cards: readonly Card[]
  decks: readonly string[]
}

export function loadCorpus(modules: DeckModules, tenses?: ReadonlySet<string>): Corpus {
  const cards: Card[] = []
  const seen = new Set<string>()

  for (const [path, mod] of Object.entries(modules)) {
    if (path.endsWith('index.json')) continue
    const file = mod.default
    if (!file || typeof file.deck !== 'string' || !Array.isArray(file.cards)) {
      throw new Error(`malformed deck file: ${path}`)
    }
    file.cards.forEach((raw, i) => {
      const card = parseCard(raw, file.deck, `${path}[${i}]`, tenses)
      const id = cardId(card)
      if (seen.has(id)) throw new Error(`duplicate card id ${id} in ${path}`)
      seen.add(id)
      cards.push(card)
    })
  }

  const decks = [...new Set(cards.map(c => c.deck))].sort((a, b) => a.localeCompare(b))
  return { cards, decks }
}

export function deckCounts(cards: readonly Card[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const c of cards) counts.set(c.deck, (counts.get(c.deck) ?? 0) + 1)
  return counts
}
