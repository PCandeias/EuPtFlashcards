/**
 * One-shot: lift the card blob out of the legacy single-file app into one JSON
 * file per deck. Kept in the repo so the extraction is reproducible and reviewable
 * rather than a thing that happened once on someone's laptop.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const LEGACY = join(root, 'european_portugese_flashcards.html')
const OUT = join(root, 'data', 'decks')

const html = readFileSync(LEGACY, 'utf8')
const match = html.match(/<script id="cards-data" type="application\/json">(.*?)<\/script>/s)
if (!match) throw new Error('card data block not found in the legacy file')

const cards = JSON.parse(match[1])

const slug = (deck) =>
  deck.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const byDeck = new Map()
for (const card of cards) {
  if (!byDeck.has(card.deck)) byDeck.set(card.deck, [])
  // Deck name is implied by the file, so it is dropped from each entry.
  const { deck, ...rest } = card
  byDeck.get(deck).push(rest)
}

mkdirSync(OUT, { recursive: true })

const index = []
for (const [deck, entries] of byDeck) {
  const name = slug(deck)
  writeFileSync(
    join(OUT, `${name}.json`),
    JSON.stringify({ deck, cards: entries }, null, 2) + '\n',
    'utf8',
  )
  index.push({ deck, file: name, count: entries.length })
}

writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8')

console.log(`wrote ${byDeck.size} decks, ${cards.length} cards to data/decks/`)
