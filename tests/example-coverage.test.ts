import { describe, it, expect } from 'vitest'
import { portuguese } from '../src/lib/languages/pt/index.js'
import { turkish } from '../src/lib/languages/tr/index.js'
import { PT_TENSE_IDS } from '../src/lib/languages/pt/tenses.js'
import { TR_TENSE_IDS } from '../src/lib/languages/tr/tenses.js'
import ptVerbs from '../data/pt/verb-examples.json'
import ptWords from '../data/pt/word-examples.json'
import trVerbs from '../data/tr/verb-examples.json'
import trWords from '../data/tr/word-examples.json'
import type { Card } from '../src/lib/cards/schema.js'

interface Ex { target: string; en: string; tense?: string }

const LANGUAGES = [
  {
    id: 'pt',
    name: 'Portuguese',
    cards: portuguese.cards,
    verbs: ptVerbs as Record<string, Ex[]>,
    words: ptWords as Record<string, Ex[]>,
    tenses: new Set<string>(PT_TENSE_IDS),
    /** Portuguese sentences all have a verb, so all of them name a tense. */
    everySentenceHasTense: true,
  },
  {
    id: 'tr',
    name: 'Turkish',
    cards: turkish.cards,
    verbs: trVerbs as Record<string, Ex[]>,
    words: trWords as Record<string, Ex[]>,
    tenses: new Set<string>(TR_TENSE_IDS),
    // Turkish says "Bu bir kitap" with no verb at all, and such a sentence has
    // no tense to name. Those are shown whatever the tense selection is.
    everySentenceHasTense: false,
  },
]

/** The word a sentence is meant to illustrate, as it would appear in one. */
function bare(subject: string): string {
  return subject.replace(/^(o|a|os|as)\s+/i, '').split('/')[0]!.trim()
}

for (const language of LANGUAGES) {
  const wordEntries = Object.entries(language.words)
  const all = [...Object.entries(language.verbs), ...wordEntries]

  describe(`${language.name} example sentences`, () => {
    it('gives every subject at least one sentence', () => {
      expect(all.filter(([, ex]) => !ex.length).map(([w]) => w)).toEqual([])
    })

    /**
     * The check that matters for a generated corpus: a sentence must actually
     * contain the word it claims to illustrate. A frame that failed to
     * substitute, or a word filed under the wrong subject, shows up here.
     */
    it('names its subject in every one of its word sentences', () => {
      const wrong: string[] = []
      for (const [subject, examples] of wordEntries) {
        const needle = bare(subject).toLocaleLowerCase(language.id)
        for (const ex of examples) {
          if (!ex.target.toLocaleLowerCase(language.id).includes(needle)) {
            wrong.push(`${subject}: ${ex.target}`)
          }
        }
      }
      expect(wrong).toEqual([])
    })

    it('leaves no template slot unfilled', () => {
      const leaks: string[] = []
      for (const [, examples] of all) {
        for (const ex of examples) {
          if (/[{}]/.test(ex.target) || /[{}]/.test(ex.en)) leaks.push(ex.target)
        }
      }
      expect(leaks).toEqual([])
    })

    it('uses only this language’s tenses', () => {
      const bad: string[] = []
      for (const [, examples] of all) {
        for (const ex of examples) {
          if (ex.tense && !language.tenses.has(ex.tense)) bad.push(`${ex.target} (${ex.tense})`)
          if (!ex.tense && language.everySentenceHasTense) bad.push(`${ex.target} (no tense)`)
        }
      }
      expect(bad).toEqual([])
    })

    it('has no empty or duplicated sentences within a subject', () => {
      const bad: string[] = []
      for (const [subject, examples] of all) {
        if (examples.some(e => !e.target.trim() || !e.en.trim())) bad.push(`${subject}: empty`)
        const seen = new Set(examples.map(e => e.target))
        if (seen.size !== examples.length) bad.push(`${subject}: repeats itself`)
      }
      expect(bad).toEqual([])
    })

    // Whatever tense you narrow to, a subject that has examples should still
    // have one — otherwise the marker appears and disappears with the settings.
    it('covers every tense for most subjects', () => {
      for (const tense of language.tenses) {
        const withThis = all.filter(([, ex]) => ex.some(e => e.tense === tense || !e.tense))
        expect(withThis.length / all.length, tense).toBeGreaterThan(0.9)
      }
    })

    it('reaches most of the deck', () => {
      const has = (card: Card) =>
        language.verbs[card.target.split('/')[0]!.trim()] || language.words[card.target]
      const covered = language.cards.filter(has).length
      // The rest is greetings, function words and cards that are already whole
      // sentences — a frame around `olá` or `Eu falo português` teaches nothing.
      expect(covered / language.cards.length).toBeGreaterThan(0.45)
    })
  })
}

describe('Portuguese agreement in the generated sentences', () => {
  const sentences = Object.values(ptWords as Record<string, Ex[]>).flatMap(ex => ex.map(e => e.target))

  // de + o is do, em + a is na. An uncontracted pair means the generator lost
  // track of the article, which is also how it tracks gender.
  // Anchored on whitespace rather than \b: JavaScript's word boundary does not
  // know that ç is a letter, so `Conheço as` looked like `o as`.
  it('contracts every preposition and article pair', () => {
    expect(sentences.filter(s => /(^|\s)(de|em)\s+(o|a|os|as)(\s|$)/i.test(s))).toEqual([])
  })

  it('never doubles an article', () => {
    expect(sentences.filter(s => /(^|\s)(o|a|os|as)\s+(o|a|os|as)(\s|$)/i.test(s))).toEqual([])
  })
})

describe('English in the generated sentences', () => {
  const english = [...Object.values(ptWords as Record<string, Ex[]>),
    ...Object.values(ptVerbs as Record<string, Ex[]>),
    ...Object.values(trWords as Record<string, Ex[]>),
    ...Object.values(trVerbs as Record<string, Ex[]>)].flatMap(ex => ex.map(e => e.en))

  it('never writes "the the" or "my the"', () => {
    expect(english.filter(e => /\b(the|my|a)\s+the\b/i.test(e))).toEqual([])
  })

  it('never leaves the verb uninflected after "I am"', () => {
    // "I am eat" and "I am am eating" are both the inflector having slipped.
    expect(english.filter(e => /\bam\s+am\b/i.test(e))).toEqual([])
    expect(english.filter(e => /^I be\b/.test(e))).toEqual([])
  })
})
