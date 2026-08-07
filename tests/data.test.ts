import { describe, it, expect } from 'vitest'
import { portuguese } from '../src/lib/languages/pt/index.js'

const CARDS = portuguese.cards
const DECKS = portuguese.decks
import { TAGS, cardId, type Tag } from '../src/lib/cards/schema.js'
import { PT_TENSE_IDS as TENSE_IDS } from '../src/lib/languages/pt/tenses.js'
import { LEVEL_IDS } from '../src/lib/cards/levels.js'
import { conjugate } from '../src/lib/languages/pt/conjugate.js'

const VOCAB = new Set<string>(TAGS)

describe('card corpus', () => {
  it('holds the whole corpus', () => {
    expect(CARDS.length).toBe(3128)
  })

  it('covers every deck', () => {
    expect(DECKS.length).toBe(37)
  })

  it('uses only tags from the closed vocabulary', () => {
    const bad = CARDS.filter(c =>
      (c.tags ?? []).some(t => !VOCAB.has(t)) || (c.targetTags ?? []).some(t => !VOCAB.has(t)))
    expect(bad).toEqual([])
  })

  it('keeps targetTags a subset of tags', () => {
    const bad = CARDS.filter(c => (c.targetTags ?? []).some(t => !(c.tags ?? []).includes(t)))
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
    const leaks = CARDS.filter(c => rx.test(c.en) || rx.test(c.target))
      .map(c => `${c.en} / ${c.target}`)
    expect(leaks).toEqual([])
  })

  it('has no empty words', () => {
    expect(CARDS.filter(c => !c.en.trim() || !c.target.trim())).toEqual([])
  })

  it('carries the tags the badge work established', () => {
    const counts: Record<string, number> = {}
    for (const c of CARDS) for (const t of c.tags ?? []) counts[t] = (counts[t] ?? 0) + 1
    expect(counts).toEqual({
      informal: 122, formal: 22, plural: 78, 'masc-mixed': 9,
      fem: 37, masc: 25, contraction: 2, object: 6,
    })
  })

  it('marks exactly the eight ambiguous bare Portuguese words with targetTags', () => {
    const withPt = CARDS.filter(c => c.targetTags?.length).map(c => c.target).sort()
    expect(withPt).toEqual(['a', 'as', 'na', 'no', 'o', 'os', 'te', 'vos'])
  })

  it('keeps sense hints for meaning-level disambiguation', () => {
    const senses = CARDS.filter(c => c.sense).length
    expect(senses).toBe(72)
  })
})

describe('cardId', () => {
  it('is deck::en::pt', () => {
    const card = { deck: 'Class', en: 'you come', target: 'vocês vêm', tags: ['plural' as Tag] }
    expect(cardId(card)).toBe('Class::you come::vocês vêm')
  })
})

describe('tense tagging', () => {
  const tensed = CARDS.filter(c => c.tense)

  it('tags only cards that are actually in a tense', () => {
    const counts: Record<string, number> = {}
    for (const c of tensed) counts[c.tense!] = (counts[c.tense!] ?? 0) + 1
    expect(counts).toEqual({
      presente: 195,
      presenteContinuo: 140,
      perfeito: 89,
      imperfeito: 87,
      futuro: 85,
      futuroProximo: 82,
    })
  })

  // Vocabulary must never be filterable, or unticking a tense would take the
  // nouns and adjectives with it.
  it('leaves nouns, adjectives and phrases untagged', () => {
    expect(CARDS.filter(c => !c.tense).length).toBe(2450)
    expect(CARDS.find(c => c.target === 'a casa')?.tense).toBeUndefined()
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
    expect(CARDS.find(c => c.target === 'eu estou a comer')?.tense).toBe('presenteContinuo')
    expect(CARDS.find(c => c.target === 'eu sou')?.tense).toBe('presente')
  })

  // A phrase is in a tense even without a pronoun to announce it.
  it('tags phrases led by an unmistakable verb form', () => {
    expect(CARDS.find(c => c.target === 'vou para a escola')?.tense).toBe('presente')
    expect(CARDS.find(c => c.target === 'tenho fome')?.tense).toBe('presente')
  })

  // `desculpa` is both "sorry" and a form of `desculpar`, and there is no way to
  // tell from the card which it is — so it stays out of the filter's reach.
  it('leaves a word that only looks like a verb form alone', () => {
    expect(CARDS.find(c => c.target === 'desculpa')?.tense).toBeUndefined()
  })

  it('never tags a card with a tense outside the registry', () => {
    const known = new Set<string>(TENSE_IDS)
    expect(tensed.filter(c => !known.has(c.tense!))).toEqual([])
  })
})

describe('level labelling', () => {
  it('labels every card', () => {
    expect(CARDS.filter(c => !c.level)).toEqual([])
  })

  it('never labels a card outside the registry', () => {
    const known = new Set(LEVEL_IDS)
    expect(CARDS.filter(c => !known.has(c.level!))).toEqual([])
  })

  // The deck was built as an A1 deck, so A1 has to stay the bulk of it. A
  // labelling pass that pushed most cards up would be wrong about the deck.
  it('leaves most of the corpus at A1', () => {
    const counts: Record<string, number> = {}
    for (const c of CARDS) counts[c.level!] = (counts[c.level!] ?? 0) + 1
    expect(counts).toEqual({ a1: 1887, a2: 1104, b1: 137 })
    expect(counts.a1! / CARDS.length).toBeGreaterThan(0.6)
  })

  it('agrees with itself: one meaning, one level', () => {
    const byPair = new Map<string, Set<string>>()
    for (const c of CARDS) {
      const key = `${c.en}::${c.target}`
      byPair.set(key, (byPair.get(key) ?? new Set()).add(c.level!))
    }
    expect([...byPair].filter(([, levels]) => levels.size > 1)).toEqual([])
  })

  it('puts survival vocabulary at A1 and paperwork above it', () => {
    const level = (target: string) => CARDS.find(c => c.target === target)?.level
    expect(level('a água')).toBe('a1')
    expect(level('o pai')).toBe('a1')
    expect(level('obrigado')).toBe('a1')
    expect(level('a fatura')).toBe('b1')
    expect(level('a garantia')).toBe('b1')
    expect(level('a bagagem')).toBe('a2')
  })

  // A card is as hard as its hardest part, so the tense can raise a card past
  // the level of the word it is built on.
  it('takes the tense into account', () => {
    const of = (tense: string) => new Set(CARDS.filter(c => c.tense === tense).map(c => c.level))
    // The present does not raise a card, so its cards sit wherever their
    // vocabulary does.
    expect(of('presente')).toEqual(new Set(['a1', 'a2']))
    // The past does, so nothing in it can still be A1.
    expect(of('perfeito').has('a1')).toBe(false)
    // The synthetic future is B1 whatever it is built on — speech uses `vou`.
    expect([...of('futuro')]).toEqual(['b1'])
    expect(of('futuroProximo').has('a1')).toBe(true)
  })

  // Third-person object clitics are not an A1 construction, whatever the verb.
  it('raises object-clitic cards above the bare verb', () => {
    expect(CARDS.find(c => c.target === 'chamar')?.level).toBe('a1')
    expect(CARDS.find(c => c.target === 'eu chamo-a')?.level).toBe('a2')
    expect(CARDS.find(c => c.target === 'eu respondo-lhes')?.level).toBe('a2')
  })

  // Reflexives are not clitic-hard: `chamo-me Pedro` is the first sentence
  // anyone says.
  it('leaves reflexives where the verb is', () => {
    expect(CARDS.find(c => c.target === 'chamo-me Pedro')?.level).toBe('a1')
  })
})

describe('the generated tense decks', () => {
  const decks = [
    'Present Tense (Presente)',
    'Past Tense (Perfeito)',
    'Past Habits (Imperfeito)',
    'Future Tense (Futuro)',
    'Near Future (Ir + Infinitive)',
  ]

  it.each(decks)('%s is entirely in one tense', (deck) => {
    const cards = CARDS.filter(c => c.deck === deck)
    expect(cards.length).toBeGreaterThan(40)
    expect(new Set(cards.map(c => c.tense)).size).toBe(1)
  })

  /**
   * The conjugation cards were generated by the engine, so they must still agree
   * with it. Only those: a card is one when the pronoun is followed by a bare
   * form ("eu fui") or an auxiliary plus infinitive ("eu vou comer"). Anything
   * longer is one of the hand-written sentences, which the engine never saw.
   */
  it.each(decks)('%s agrees with the conjugation engine', (deck) => {
    const produced = new Set<string>()
    for (const card of CARDS) {
      if (!/^to\s/i.test(card.en)) continue
      const c = conjugate(card.target.split('/')[0]!.trim())
      if (!c) continue
      for (const forms of Object.values(c)) {
        for (const form of Object.values(forms as Record<string, string>)) produced.add(form)
      }
    }

    const unknown: string[] = []
    let checked = 0
    for (const card of CARDS.filter(c => c.deck === deck)) {
      const m = card.target.match(/^(?:eu|tu|ele \/ ela|nós|eles \/ elas)\s+(.+)$/)
      if (!m) continue
      const rest = m[1]!
      if (rest.split(/\s+/).length > 2) continue
      checked++
      if (!produced.has(rest)) unknown.push(card.target)
    }

    expect(checked, 'should have found conjugation cards to check').toBeGreaterThan(40)
    expect(unknown).toEqual([])
  })

  // "vou ir" is not something a Portuguese speaker says.
  it('does not build the near future on ir itself', () => {
    const near = CARDS.filter(c => c.tense === 'futuroProximo')
    expect(near.filter(c => /\bvou ir\b|\bvais ir\b|\bvamos ir\b/.test(c.target))).toEqual([])
  })

  it('agrees with English on to be, which is irregular in the past', () => {
    const past = CARDS.filter(c => c.deck === 'Past Tense (Perfeito)')
    expect(past.find(c => c.target === 'eu fui')?.en).toBe('I was')
    expect(past.find(c => c.target === 'nós fomos')?.en).toBe('we were')
    expect(past.find(c => c.target === 'tu foste')?.en).toBe('you were')
  })
})
