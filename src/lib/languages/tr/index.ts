/**
 * Turkish.
 *
 * Nothing here is a special case: Turkish supplies the same things Portuguese
 * does, and differs in what it supplies rather than in how. Where it does differ
 * is worth stating, because it shapes the deck:
 *
 *   no gender      `o` is he, she and it, so the masculine and feminine badges
 *                  never appear on a Turkish card
 *   one word       what Portuguese says with an auxiliary, Turkish says with a
 *                  suffix — `estou a falar` against `konuşuyorum`
 *   politeness     `siz` is both the plural you and the polite singular you, so
 *                  the formal and plural badges usually travel together
 */
import { loadCorpus, type DeckModules } from '../../cards/load.js'
import { createConjugationKind } from '../../annotations/conjugation.js'
import { createExamplesKind, type Example } from '../../annotations/examples.js'
import { TR_PERSONS, TR_TENSES, TR_TENSE_IDS } from './tenses.js'
import { conjugatePhrase } from './conjugate.js'
import { verbOf } from './detect.js'
import Flag from './Flag.svelte'
import verbData from '../../../../data/tr/verb-examples.json'
import wordData from '../../../../data/tr/word-examples.json'
import type { LanguageDef, VoiceSpec } from '../types.js'
import type { AnnotationKind } from '../../annotations/types.js'

const modules = import.meta.glob<{ default: { deck: string; cards: unknown[] } }>(
  '../../../../data/tr/decks/*.json',
  { eager: true },
)

const corpus = loadCorpus(modules as DeckModules, new Set<string>(TR_TENSE_IDS))

// Turkish has no split to protect, unlike European against Brazilian Portuguese:
// any tr voice is the right one.
const voice: VoiceSpec = {
  accept: lang => lang.startsWith('tr'),
  missing: 'No Turkish voice installed; your device will read it as best it can',
}

export const examplesKind = createExamplesKind({
  verbs: verbData as Record<string, Example[]>,
  words: wordData as Record<string, Example[]>,
  locale: 'tr-TR',
  languageName: 'Turkish',
  voice,
  verbOf,
  // `spor yapmak` borrows nothing: Turkish puts the verb last, so a phrase that
  // conjugates at all already has its own entry under its whole form.
})

export const turkish: LanguageDef = {
  id: 'tr',
  name: 'Turkish',
  shortName: 'Turkish',
  nativeName: 'Türkçe',
  flag: Flag,
  description: 'Beginner Turkish — vowel harmony, suffixes and no gender at all.',
  locale: 'tr-TR',
  storagePrefix: 'eutr:v1',
  cards: corpus.cards,
  decks: corpus.decks,
  tenses: TR_TENSES,
  persons: TR_PERSONS,
  annotations: [
    createConjugationKind({
      tenses: TR_TENSES,
      persons: TR_PERSONS,
      conjugate: conjugatePhrase,
      verbOf,
    }) as AnnotationKind,
    examplesKind as AnnotationKind,
  ],
  conjugate: conjugatePhrase,
  verbOf,
  voice,
  badgeHints: {
    plural: 'plural — siz / onlar',
    informal: 'informal — sen',
    formal: 'polite — siz, and to more than one person',
  },
}
