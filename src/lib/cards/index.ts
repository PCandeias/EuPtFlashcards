/**
 * Loads every deck at build time and validates it.
 *
 * The glob is eager so the data is bundled rather than fetched — one less thing
 * that can fail when the app is offline on a phone.
 */
import { parseCard, cardId, type Card } from './schema.js'

interface DeckFile {
  deck: string
  cards: unknown[]
}

const modules = import.meta.glob<{ default: DeckFile }>('../../../data/pt/decks/*.json', {
  eager: true,
})

function load(): Card[] {
  const out: Card[] = []
  const seen = new Set<string>()

  for (const [path, mod] of Object.entries(modules)) {
    if (path.endsWith('index.json')) continue
    const file = mod.default
    if (!file || typeof file.deck !== 'string' || !Array.isArray(file.cards)) {
      throw new Error(`malformed deck file: ${path}`)
    }
    file.cards.forEach((raw, i) => {
      const card = parseCard(raw, file.deck, `${path}[${i}]`)
      const id = cardId(card)
      if (seen.has(id)) throw new Error(`duplicate card id ${id} in ${path}`)
      seen.add(id)
      out.push(card)
    })
  }

  return out
}

export const CARDS: readonly Card[] = load()

export const DECKS: readonly string[] = [...new Set(CARDS.map(c => c.deck))].sort((a, b) =>
  a.localeCompare(b),
)

export function deckCounts(): Map<string, number> {
  const counts = new Map<string, number>()
  for (const c of CARDS) counts.set(c.deck, (counts.get(c.deck) ?? 0) + 1)
  return counts
}

export { cardId }
export type { Card }
