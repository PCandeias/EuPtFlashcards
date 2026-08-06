import { describe, it, expect } from 'vitest'
import { turkish } from '../src/lib/languages/tr/index.js'
import { portuguese } from '../src/lib/languages/pt/index.js'
import { cardId } from '../src/lib/cards/schema.js'
import { LEVEL_IDS } from '../src/lib/cards/levels.js'
import { TR_TENSE_IDS } from '../src/lib/languages/tr/tenses.js'
import { conjugatePhrase } from '../src/lib/languages/tr/conjugate.js'

const CARDS = turkish.cards

describe('the Turkish corpus', () => {
  it('holds the whole corpus', () => {
    expect(CARDS.length).toBe(1277)
  })

  it('covers every deck', () => {
    expect(turkish.decks.length).toBe(24)
  })

  it('has no card id collisions', () => {
    const seen = new Map<string, number>()
    for (const c of CARDS) seen.set(cardId(c), (seen.get(cardId(c)) ?? 0) + 1)
    expect([...seen.entries()].filter(([, n]) => n > 1)).toEqual([])
  })

  it('has no empty words', () => {
    expect(CARDS.filter(c => !c.en.trim() || !c.target.trim())).toEqual([])
  })

  // The same rule as the Portuguese deck: metadata lives in tags, never in the word.
  it('never leaks metadata words into the displayed text', () => {
    const rx = /\b(informal|formal|plural|singular|masculine|feminine|object|auxiliary verb)\b/i
    expect(CARDS.filter(c => rx.test(c.en) || rx.test(c.target)).map(c => c.en)).toEqual([])
  })

  // Turkish has no grammatical gender at all, so those badges can never be right.
  it('uses no gender tags, because Turkish has no gender', () => {
    const gendered = CARDS.filter(c =>
      (c.tags ?? []).some(t => t === 'masc' || t === 'fem' || t === 'masc-mixed'))
    expect(gendered).toEqual([])
  })

  it('uses only the tags this language needs', () => {
    const used = new Set(CARDS.flatMap(c => c.tags ?? []))
    expect([...used].sort()).toEqual(['formal', 'informal', 'object', 'plural'])
  })

  // `sen` and `siz` are the distinction a learner most needs and English hides.
  it('marks the polite and the familiar you', () => {
    const of = (target: string) => CARDS.find(c => c.target === target)
    expect(of('sen')?.tags).toEqual(['informal'])
    expect(of('siz')?.tags).toEqual(['formal', 'plural'])
    expect(of('Nasılsın?')?.tags).toEqual(['informal'])
    expect(of('Nasılsınız?')?.tags).toEqual(['formal'])
  })

  // The source deck was written in two passes and repeated itself; the merge
  // should have left one card per meaning.
  it('carries each word once, except where Turkish means two things by it', () => {
    const byWord = new Map<string, string[]>()
    for (const c of CARDS) byWord.set(c.target, [...(byWord.get(c.target) ?? []), c.en])
    const repeated = [...byWord.entries()].filter(([, glosses]) => glosses.length > 1)
    expect(repeated.map(([w]) => w).sort()).toEqual(
      ['fırın', 'hesap', 'kapı', 'koltuk', 'o', 'onlar', 'saat', 'yemek', 'yüz'],
    )
    // And each of those says which meaning it is.
    for (const [word] of repeated) {
      const cards = CARDS.filter(c => c.target === word)
      expect(cards.every(c => c.sense), word).toBe(true)
    }
  })

  it('corrects the errors found in the source deck', () => {
    // susuz is "waterless"; the word for thirsty is susamış, which is kept.
    expect(CARDS.find(c => c.target === 'susuz')).toBeUndefined()
    expect(CARDS.find(c => c.target === 'susamış')?.en).toBe('thirsty')
    // Turkish capitalises proper nouns only.
    expect(CARDS.find(c => c.target === 'vejetaryen')).toBeTruthy()
    // The second numbers deck was written in digits.
    expect(CARDS.find(c => c.target === 'on bir')?.en).toBe('eleven')
    expect(CARDS.filter(c => /^\d+$/.test(c.en))).toEqual([])
  })
})

describe('Turkish tense tagging', () => {
  const tensed = CARDS.filter(c => c.tense)

  it('tags only what it is sure of', () => {
    const counts: Record<string, number> = {}
    for (const c of tensed) counts[c.tense!] = (counts[c.tense!] ?? 0) + 1
    expect(counts).toEqual({ simdiki: 74, genis: 9, gecmis: 6, gelecek: 3 })
  })

  it('never uses another language’s tense', () => {
    const known = new Set<string>(TR_TENSE_IDS)
    expect(tensed.filter(c => !known.has(c.tense!))).toEqual([])
  })

  it('leaves vocabulary and infinitives alone', () => {
    expect(CARDS.find(c => c.target === 'kitap')?.tense).toBeUndefined()
    expect(CARDS.filter(c => /^to\s/i.test(c.en) && c.tense)).toEqual([])
  })

  // -yor is unmistakable; -mış and -ecek are not, and the tagger knows it.
  it('is not fooled by nouns that end like a verb', () => {
    for (const word of ['altmış', 'yetmiş', 'içecek', 'bacak', 'susamış']) {
      expect(CARDS.find(c => c.target === word)?.tense, word).toBeUndefined()
    }
  })

  it('tags the continuous, which is nearly all of it', () => {
    expect(CARDS.find(c => c.target === 'Gidiyorum')?.tense).toBe('simdiki')
    expect(CARDS.find(c => c.target === 'Bilmiyorum')?.tense).toBe('simdiki')
    expect(CARDS.find(c => c.target === 'Dün geldim')?.tense).toBe('gecmis')
    expect(CARDS.find(c => c.target === 'Yarın geleceğim')?.tense).toBe('gelecek')
    expect(CARDS.find(c => c.target === 'Sonra ararım')?.tense).toBe('genis')
  })
})

describe('Turkish level labelling', () => {
  it('labels every card', () => {
    expect(CARDS.filter(c => !c.level)).toEqual([])
  })

  it('never labels a card outside the registry', () => {
    const known = new Set<string>(LEVEL_IDS)
    expect(CARDS.filter(c => !known.has(c.level!))).toEqual([])
  })

  it('leaves most of the deck at A1', () => {
    const counts: Record<string, number> = {}
    for (const c of CARDS) counts[c.level!] = (counts[c.level!] ?? 0) + 1
    expect(counts.a1! / CARDS.length).toBeGreaterThan(0.6)
  })

  it('puts survival vocabulary at A1', () => {
    const level = (target: string) => CARDS.find(c => c.target === target)?.level
    expect(level('su')).toBe('a1')
    expect(level('anne')).toBe('a1')
    expect(level('Merhaba')).toBe('a1')
  })
})

// The whole point of the conjugation panel is that it agrees with the deck.
describe('the corpus against the conjugation engine', () => {
  const infinitives = CARDS
    .filter(c => /^to\s/i.test(c.en))
    .map(c => c.target.split('/')[0]!.trim())

  it('finds a verb card set worth checking', () => {
    expect(infinitives.filter(i => conjugatePhrase(i)).length).toBeGreaterThan(80)
  })

  /**
   * Every conjugated card in the deck must be a form the engine also produces.
   * This is what caught two real bugs in the Portuguese engine, and it is the
   * only check that ties the hand-written cards to the generated table.
   */
  it('produces every conjugated form the deck teaches', () => {
    const produced = new Set<string>()
    for (const infinitive of infinitives) {
      const c = conjugatePhrase(infinitive)
      if (!c) continue
      for (const forms of Object.values(c)) {
        for (const form of Object.values(forms as Record<string, string>)) {
          for (const word of form.split(/\s+/)) produced.add(word.toLocaleLowerCase('tr'))
        }
      }
    }

    // Positive present-continuous cards only: the deck also teaches negatives and
    // questions, which the engine deliberately does not generate.
    const checked: string[] = []
    const missing: string[] = []
    for (const card of CARDS) {
      if (card.tense !== 'simdiki') continue
      for (const word of card.target.split(/\s+/)) {
        const w = word.replace(/[?.!]/g, '').toLocaleLowerCase('tr')
        if (!/[ıiuü]yor/.test(w)) continue
        if (/m[ıiuü]yor/.test(w)) continue
        checked.push(w)
        if (!produced.has(w)) missing.push(`${w} (${card.target})`)
      }
    }

    expect(checked.length).toBeGreaterThan(40)
    expect(missing).toEqual([])
  })
})

describe('the two languages are separate', () => {
  it('keeps their storage apart', () => {
    expect(turkish.storagePrefix).not.toBe(portuguese.storagePrefix)
  })

  it('shares no card ids, so progress cannot cross over', () => {
    const pt = new Set(portuguese.cards.map(cardId))
    expect(turkish.cards.filter(c => pt.has(cardId(c)))).toEqual([])
  })

  it('gives each its own tenses', () => {
    const pt = new Set(portuguese.tenses.map(t => t.id))
    expect(turkish.tenses.filter(t => pt.has(t.id))).toEqual([])
  })
})
