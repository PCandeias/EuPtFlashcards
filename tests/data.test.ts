import { describe, it, expect } from 'vitest'
import { CARDS, DECKS } from '../src/lib/cards/index.js'
import { TAGS, cardId, type Tag } from '../src/lib/cards/schema.js'

const VOCAB = new Set<string>(TAGS)

describe('card corpus', () => {
  it('preserves all 1853 cards from the legacy file', () => {
    expect(CARDS.length).toBe(1853)
  })

  it('covers all 27 decks', () => {
    expect(DECKS.length).toBe(27)
  })

  it('uses only tags from the closed vocabulary', () => {
    const bad = CARDS.filter(c =>
      (c.tags ?? []).some(t => !VOCAB.has(t)) || (c.ptTags ?? []).some(t => !VOCAB.has(t)))
    expect(bad).toEqual([])
  })

  it('keeps ptTags a subset of tags', () => {
    const bad = CARDS.filter(c => (c.ptTags ?? []).some(t => !(c.tags ?? []).includes(t)))
    expect(bad).toEqual([])
  })

  it('has no card id collisions', () => {
    const seen = new Map<string, number>()
    for (const c of CARDS) seen.set(cardId(c), (seen.get(cardId(c)) ?? 0) + 1)
    expect([...seen.entries()].filter(([, n]) => n > 1)).toEqual([])
  })

  // The whole point of the badge work: metadata lives in `tags`, never in the word.
  it('never leaks metadata words into the displayed text', () => {
    const rx = /\b(informal|formal|plural|singular|masculine|feminine|mixed|object|contraction|permanent|temporary|identity)\b/i
    const leaks = CARDS.filter(c => rx.test(c.en) || rx.test(c.pt))
      .map(c => `${c.en} / ${c.pt}`)
    expect(leaks).toEqual([])
  })

  it('has no empty words', () => {
    expect(CARDS.filter(c => !c.en.trim() || !c.pt.trim())).toEqual([])
  })

  it('carries the tags the badge work established', () => {
    const counts: Record<string, number> = {}
    for (const c of CARDS) for (const t of c.tags ?? []) counts[t] = (counts[t] ?? 0) + 1
    expect(counts).toEqual({
      informal: 45, formal: 18, plural: 35, 'masc-mixed': 10,
      fem: 37, masc: 25, contraction: 2, object: 6,
    })
  })

  it('marks exactly the eight ambiguous bare Portuguese words with ptTags', () => {
    const withPt = CARDS.filter(c => c.ptTags?.length).map(c => c.pt).sort()
    expect(withPt).toEqual(['a', 'as', 'na', 'no', 'o', 'os', 'te', 'vos'])
  })

  it('keeps sense hints for meaning-level disambiguation', () => {
    const senses = CARDS.filter(c => c.sense).length
    expect(senses).toBe(27)
  })
})

describe('cardId', () => {
  it('is deck::en::pt', () => {
    const card = { deck: 'Class', en: 'you come', pt: 'vocês vêm', tags: ['plural' as Tag] }
    expect(cardId(card)).toBe('Class::you come::vocês vêm')
  })
})
