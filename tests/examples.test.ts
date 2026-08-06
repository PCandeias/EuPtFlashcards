import { describe, it, expect } from 'vitest'
import { examplesFor, subjectOf, MAX_EXAMPLES } from '../src/lib/annotations/examples.js'
import { annotationsFor } from '../src/lib/annotations/index.js'
import { conjugate, parseVerb } from '../src/lib/verbs/conjugate.js'
import { verbOf } from '../src/lib/verbs/detect.js'
import { CARDS } from '../src/lib/cards/index.js'
import { DEFAULT_SETTINGS } from '../src/lib/storage/progress.js'
import verbData from '../data/verb-examples.json'
import wordData from '../data/word-examples.json'
import { TENSE_IDS, isTenseId, type TenseId } from '../src/lib/verbs/tenses.js'

type Ex = { pt: string; en: string; tense: TenseId }
const EXAMPLES = verbData as Record<string, Ex[]>
const WORDS = wordData as Record<string, Ex[]>
const entries = Object.entries(EXAMPLES)

/** Every form the engine produces for a verb, plus its infinitive. */
function formsOf(infinitive: string): Set<string> {
  const out = new Set<string>([infinitive])
  const parsed = parseVerb(infinitive)
  if (parsed) out.add(parsed.stem)
  const c = conjugate(infinitive)
  for (const forms of Object.values(c ?? {})) {
    for (const form of Object.values(forms as Record<string, string>)) {
      for (const word of form.split(/\s+/)) {
        out.add(word)
        // The engine hangs the pronoun off the verb, but Portuguese moves it in
        // front after certain words — "chamas-te" is also "te chamas".
        const bare = word.replace(/-(me|te|se|nos|vos|lhes?)$/, '')
        if (bare !== word) { out.add(bare); out.add(`${bare}s`) }
      }
    }
  }
  return out
}

/**
 * Words of a sentence, each also offered without a trailing clitic: European
 * Portuguese hangs pronouns off the verb — `ajudar-me`, `sinto-me`, `deu-me` —
 * and the bare verb is what the engine produces.
 */
const words = (sentence: string) => {
  const out: string[] = []
  for (const word of sentence.toLowerCase().replace(/[.?!,]/g, '').split(/\s+/)) {
    out.push(word)
    const bare = word.replace(/-(me|te|se|nos|vos|lhes?|[oa]s?|l[oa]s?)$/, '')
    if (bare !== word) {
      out.push(bare)
      // The first person plural drops its -s before -nos: sentámo-nos.
      out.push(`${bare}s`)
    }
  }
  return out
}

describe('verb examples', () => {
  it('covers every conjugable verb the deck teaches', () => {
    const verbs = new Set<string>()
    for (const card of CARDS) {
      const v = verbOf(card)
      if (v && !v.includes(' ')) verbs.add(v)
    }
    const missing = [...verbs].filter(v => !EXAMPLES[v])
    expect(missing).toEqual([])
  })

  it('gives every verb more than one, so the usage is varied', () => {
    const thin = entries.filter(([, ex]) => ex.length < 2).map(([v]) => v)
    expect(thin).toEqual([])
  })

  /**
   * The point of the coverage: narrowing your tenses must not empty the panel.
   * Every verb has at least one sentence in every tense, so whatever single tense
   * is selected there is still something to show.
   */
  it.each(TENSE_IDS)('every verb has a sentence in %s', (tense) => {
    const missing = entries.filter(([, ex]) => !ex.some(e => e.tense === tense)).map(([v]) => v)
    expect(missing).toEqual([])
  })

  it('labels every sentence with a tense from the registry', () => {
    const bad: string[] = []
    for (const [, ex] of [...entries, ...Object.entries(WORDS)]) {
      for (const e of ex) if (!isTenseId(e.tense)) bad.push(`${e.pt} (${e.tense})`)
    }
    expect(bad).toEqual([])
  })

  /**
   * The check that matters: a sentence must actually contain the verb it claims
   * to illustrate. Catches a typo, a wrong form, or an example filed under the
   * wrong verb — all of which would teach the wrong thing.
   */
  it.each(entries)('%s appears in each of its own examples', (infinitive, examples) => {
    const forms = formsOf(infinitive)
    const wrong = examples.filter(ex => !words(ex.pt).some(w => forms.has(w)))
    expect(wrong.map(w => w.pt)).toEqual([])
  })

  it('is in Portuguese on one side and English on the other', () => {
    for (const [, examples] of entries) {
      for (const ex of examples) {
        expect(ex.pt.trim()).not.toBe('')
        expect(ex.en.trim()).not.toBe('')
        expect(ex.pt).not.toBe(ex.en)
      }
    }
  })

  it('has no duplicate sentences within a verb', () => {
    for (const [verb, examples] of entries) {
      const seen = new Set(examples.map(e => e.pt))
      expect(seen.size, verb).toBe(examples.length)
    }
  })

  it('looks up a phrase card through its head verb', () => {
    expect(examplesFor('ir')).toBeTruthy()
    // "ir para a escola" has no examples of its own, so it borrows ir's.
    const card = CARDS.find(c => c.pt === 'ir para a escola')!
    const found = annotationsFor(card, { settings: DEFAULT_SETTINGS })
      .find(a => a.kind.id === 'examples')
    expect(found).toBeTruthy()
  })
})

describe('the annotation registry', () => {
  const settings = DEFAULT_SETTINGS

  it('offers both kinds on a verb card', () => {
    const card = CARDS.find(c => c.en === 'to sleep')!
    expect(annotationsFor(card, { settings }).map(a => a.kind.id))
      .toEqual(['conjugation', 'examples'])
  })

  it('offers nothing on a card that is not a verb', () => {
    const card = CARDS.find(c => c.pt === 'a casa')!
    expect(annotationsFor(card, { settings })).toEqual([])
  })

  // Each kind decides for itself. Narrowing to one tense keeps both, because the
  // examples cover every tense; switching them all off leaves neither.
  it('lets each kind judge the settings for itself', () => {
    const card = CARDS.find(c => c.en === 'to sleep')!
    expect(annotationsFor(card, { settings: { ...settings, tenses: ['futuro'] } })
      .map(a => a.kind.id)).toEqual(['conjugation', 'examples'])
    expect(annotationsFor(card, { settings: { ...settings, tenses: [] } })).toEqual([])
  })

  it('gives each kind its own marker and description', () => {
    const card = CARDS.find(c => c.en === 'to sleep')!
    const found = annotationsFor(card, { settings })
    expect(new Set(found.map(a => a.kind.marker)).size).toBe(found.length)
    for (const a of found) expect(a.kind.describe(card)).toContain('dormir')
  })
})

describe('examples for words that are not verbs', () => {
  const settings = DEFAULT_SETTINGS

  it('covers the adjectives', () => {
    expect(Object.keys(WORDS).length).toBeGreaterThan(50)
    expect(examplesFor('cheio / cheia')).toBeTruthy()
  })

  it('shows an adjective in a whole sentence', () => {
    const card = CARDS.find(c => c.pt === 'cheio / cheia')!
    const found = annotationsFor(card, { settings }).find(a => a.kind.id === 'examples')
    expect(found).toBeTruthy()
    const payload = found!.payload as { examples: Array<{ pt: string }> }
    expect(payload.examples[0]!.pt).toContain('cheio')
  })

  // ser for a property, estar for a state — the distinction the deck teaches.
  it('uses the copula the adjective actually takes', () => {
    expect(examplesFor('grande')!.some(e => / é /.test(e.pt))).toBe(true)
    expect(examplesFor('cheio / cheia')!.some(e => / está /.test(e.pt))).toBe(true)
  })

  it('reaches a good number of cards', () => {
    const matched = CARDS.filter(c => subjectOf(c)).length
    expect(matched).toBeGreaterThan(250)
  })
})

describe('tense filtering', () => {
  const card = () => CARDS.find(c => c.en === 'to sleep')!

  it('shows only sentences in the selected tenses', () => {
    const settings = { ...DEFAULT_SETTINGS, tenses: ['perfeito' as TenseId] }
    const found = annotationsFor(card(), { settings }).find(a => a.kind.id === 'examples')
    const payload = found!.payload as { examples: Array<{ tense: string }>; hidden: number }
    expect(payload.examples.every(e => e.tense === 'perfeito')).toBe(true)
    expect(payload.hidden).toBeGreaterThan(0)
  })

  it('still has something to show for any single tense', () => {
    for (const tense of TENSE_IDS) {
      const settings = { ...DEFAULT_SETTINGS, tenses: [tense] }
      const found = annotationsFor(card(), { settings }).find(a => a.kind.id === 'examples')
      expect(found, `nothing to show for ${tense}`).toBeTruthy()
    }
  })

  it('offers nothing at all when no tense is selected', () => {
    const settings = { ...DEFAULT_SETTINGS, tenses: [] }
    expect(annotationsFor(card(), { settings })).toEqual([])
  })

  it('shows a handful rather than the whole list', () => {
    const found = annotationsFor(card(), { settings: DEFAULT_SETTINGS })
      .find(a => a.kind.id === 'examples')
    const payload = found!.payload as { examples: unknown[] }
    expect(payload.examples.length).toBeLessThanOrEqual(MAX_EXAMPLES)
    expect(payload.examples.length).toBeGreaterThanOrEqual(2)
  })
})
