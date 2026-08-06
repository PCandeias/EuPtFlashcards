import { describe, it, expect } from 'vitest'
import { CARDS, DECKS } from '../src/lib/cards/index.js'
import { TAGS, cardId, type Tag } from '../src/lib/cards/schema.js'
import { TENSE_IDS } from '../src/lib/verbs/tenses.js'

const VOCAB = new Set<string>(TAGS)

describe('card corpus', () => {
  it('preserves the whole corpus', () => {
    // 1853 originally; one card was removed by the 2026-08 accuracy review.
    expect(CARDS.length).toBe(1852)
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
      informal: 45, formal: 18, plural: 35, 'masc-mixed': 9,
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

describe('tense tagging', () => {
  const tensed = CARDS.filter(c => c.tense)

  it('tags only cards that are actually in a tense', () => {
    const counts: Record<string, number> = {}
    for (const c of tensed) counts[c.tense!] = (counts[c.tense!] ?? 0) + 1
    expect(counts).toEqual({ presente: 119, presenteContinuo: 139, futuroProximo: 2 })
  })

  // Vocabulary must never be filterable, or unticking a tense would take the
  // nouns and adjectives with it.
  it('leaves nouns, adjectives and phrases untagged', () => {
    expect(CARDS.filter(c => !c.tense).length).toBe(1592)
    expect(CARDS.find(c => c.pt === 'a casa')?.tense).toBeUndefined()
    expect(CARDS.find(c => c.en === 'beautiful / nice')?.tense).toBeUndefined()
  })

  // The infinitive is the dictionary form, and the card the conjugation panel is
  // most useful on.
  it('leaves infinitives untagged', () => {
    const infinitives = CARDS.filter(c => /^to\s/i.test(c.en))
    expect(infinitives.length).toBeGreaterThan(150)
    expect(infinitives.filter(c => c.tense)).toEqual([])
  })

  it('tags the continuous, which is the largest verb group', () => {
    expect(CARDS.find(c => c.pt === 'eu estou a comer')?.tense).toBe('presenteContinuo')
    expect(CARDS.find(c => c.pt === 'eu sou')?.tense).toBe('presente')
  })

  // A phrase is in a tense even without a pronoun to announce it.
  it('tags phrases led by an unmistakable verb form', () => {
    expect(CARDS.find(c => c.pt === 'vou para a escola')?.tense).toBe('presente')
    expect(CARDS.find(c => c.pt === 'tenho fome')?.tense).toBe('presente')
  })

  // `desculpa` is both "sorry" and a form of `desculpar`, and there is no way to
  // tell from the card which it is — so it stays out of the filter's reach.
  it('leaves a word that only looks like a verb form alone', () => {
    expect(CARDS.find(c => c.pt === 'desculpa')?.tense).toBeUndefined()
  })

  it('never tags a card with a tense outside the registry', () => {
    const known = new Set(TENSE_IDS)
    expect(tensed.filter(c => !known.has(c.tense!))).toEqual([])
  })
})
