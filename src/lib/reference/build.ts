/**
 * The reference page's content, derived rather than written.
 *
 * Every table here is built from the same registries the study screen uses — the
 * tense list, the verb engine, the tag vocabulary, the corpus itself — so the
 * reference cannot fall out of step with what the app teaches. A language that
 * has something extra to say supplies it as `reference` tables of its own.
 */
import type { LanguageDef } from '../languages/types.js'
import type { Card } from '../cards/schema.js'
import { BADGES } from '../render/tags.js'
import { LEVELS } from '../cards/levels.js'
import { TAG_ORDER } from '../cards/schema.js'

export interface ReferenceTable {
  /** Short heading, used as the section title and the jump-link label. */
  title: string
  /** A sentence or two saying what the table is for. */
  blurb?: string
  columns: string[]
  rows: string[][]
  /** Renders the first column in the target language's face. */
  emphasiseFirst?: boolean
}

/** The tenses this language has, and what each is for. */
function tenses(language: LanguageDef): ReferenceTable {
  return {
    title: 'Tenses',
    blurb: 'Ticking a tense off in Settings removes its cards from the deck and '
      + 'its column from the conjugation panel. Vocabulary is never affected.',
    columns: ['Tense', 'What it is for', 'Example'],
    rows: language.tenses.map(t => [t.label, t.hint, t.example]),
  }
}

/**
 * One verb, fully conjugated, as the worked example.
 *
 * The model verb is regular on purpose: it is there to show the pattern, and the
 * irregular ones are a tap away on their own cards.
 */
function modelConjugation(language: LanguageDef): ReferenceTable | null {
  if (!language.modelVerb) return null
  const table = language.conjugate(language.modelVerb)
  if (!table) return null

  const shown = language.tenses.filter(t => table[t.id])
  if (!shown.length) return null

  return {
    title: 'A verb in full',
    blurb: `${language.modelVerb} conjugated across every tense, as the pattern a `
      + 'regular verb follows.',
    columns: ['', ...shown.map(t => t.label)],
    rows: language.persons.map(person => [
      person.label,
      ...shown.map(t => table[t.id]?.[person.id] ?? '—'),
    ]),
  }
}

/** What each badge on a card means, in this language's terms. */
function badges(language: LanguageDef): ReferenceTable | null {
  const used = new Set(language.cards.flatMap(c => c.tags ?? []))
  const rows = TAG_ORDER
    .filter(tag => used.has(tag))
    .map(tag => [BADGES[tag].pill, language.badgeHints?.[tag] ?? BADGES[tag].full])
  if (!rows.length) return null
  return {
    title: 'Badges',
    blurb: 'Grammar the English side cannot show on its own. A badge sits beside '
      + 'the word rather than inside it.',
    columns: ['Badge', 'Meaning'],
    rows,
    emphasiseFirst: false,
  }
}

/** How far into the language the deck goes, and how much of it sits where. */
function levels(language: LanguageDef): ReferenceTable {
  const counts = new Map<string, number>()
  for (const card of language.cards) {
    if (card.level) counts.set(card.level, (counts.get(card.level) ?? 0) + 1)
  }
  return {
    title: 'Levels',
    blurb: 'Every card carries a CEFR band. Nothing filters on it yet — it is '
      + 'recorded so that it can.',
    columns: ['Level', 'Covers', 'Cards'],
    emphasiseFirst: false,
    rows: LEVELS
      .filter(level => counts.get(level.id))
      .map(level => [level.label, level.hint, String(counts.get(level.id))]),
  }
}

/** The decks, with how many cards each holds. */
function decks(language: LanguageDef): ReferenceTable {
  const counts = new Map<string, number>()
  for (const card of language.cards) counts.set(card.deck, (counts.get(card.deck) ?? 0) + 1)
  return {
    title: 'Decks',
    columns: ['Deck', 'Cards'],
    emphasiseFirst: false,
    rows: [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([deck, n]) => [deck, String(n)]),
  }
}

/** Everything the reference page shows, in the order it shows it. */
export function referenceTables(language: LanguageDef): ReferenceTable[] {
  return [
    ...(language.reference ?? []),
    tenses(language),
    modelConjugation(language),
    badges(language),
    levels(language),
    decks(language),
  ].filter((t): t is ReferenceTable => t !== null)
}

/**
 * A section's anchor, from its title.
 *
 * Punctuation is dropped rather than escaped: `Which "to be"` has to survive
 * being written into an href, and a quote there would end the attribute.
 */
export function slug(title: string): string {
  return fold(title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export interface SearchHit {
  card: Card
  /** Which side matched, so the list can say why a card is there. */
  matched: 'target' | 'en' | 'sense'
}

/** Diacritics off, case folded, so `cafe` finds `café` and `ogrenci` finds `öğrenci`. */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase('en')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // Turkish ı and Portuguese ç survive NFD, so they are folded by hand.
    .replace(/[ıİ]/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
}

/**
 * Cards matching a query, best first.
 *
 * A word that starts with the query outranks one that merely contains it, which
 * is what makes typing `ev` put `ev` above `evet` and `kahve`.
 */
export function search(cards: readonly Card[], query: string, limit = 60): SearchHit[] {
  const q = fold(query.trim())
  if (!q) return []

  const scored: { hit: SearchHit; score: number }[] = []
  for (const card of cards) {
    const fields: [SearchHit['matched'], string][] = [
      ['target', card.target],
      ['en', card.en],
      ...(card.sense ? [['sense', card.sense] as [SearchHit['matched'], string]] : []),
    ]
    let best: { matched: SearchHit['matched']; score: number } | null = null
    for (const [matched, value] of fields) {
      const folded = fold(value)
      const at = folded.indexOf(q)
      if (at < 0) continue
      // Exact, then word-initial, then anywhere; the target side outranks the gloss.
      const exact = folded === q ? 0 : at === 0 ? 1 : /\s/.test(folded[at - 1] ?? '') ? 2 : 3
      const side = matched === 'target' ? 0 : 1
      const score = exact * 2 + side
      if (!best || score < best.score) best = { matched, score }
    }
    if (best) scored.push({ hit: { card, matched: best.matched }, score: best.score })
  }

  return scored
    .sort((a, b) => a.score - b.score
      || a.hit.card.target.localeCompare(b.hit.card.target))
    .slice(0, limit)
    .map(s => s.hit)
}
