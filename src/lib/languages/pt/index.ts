/**
 * European Portuguese.
 *
 * The deck is deliberately the Portuguese of Portugal: `autocarro` not `ônibus`,
 * `estar a falar` not `estar falando`. That shows up here twice — in the voice
 * spec, which refuses to call a Brazilian voice good enough, and in the tense
 * list, which includes the `estar a` continuous.
 */
import { loadCorpus, type DeckModules } from '../../cards/load.js'
import { createConjugationKind } from '../../annotations/conjugation.js'
import { createExamplesKind, type Example } from '../../annotations/examples.js'
import { PT_PERSONS, PT_TENSES, PT_TENSE_IDS } from './tenses.js'
import { conjugatePhrase, parseVerb } from './conjugate.js'
import { verbOf } from './detect.js'
import { runMigration, migrateTenseScope } from '../../storage/migrate.js'
import verbData from '../../../../data/pt/verb-examples.json'
import wordData from '../../../../data/pt/word-examples.json'
import Flag from './Flag.svelte'
import type { LanguageDef, VoiceSpec } from '../types.js'
import type { AnnotationKind } from '../../annotations/types.js'

const modules = import.meta.glob<{ default: { deck: string; cards: unknown[] } }>(
  '../../../../data/pt/decks/*.json',
  { eager: true },
)

const corpus = loadCorpus(modules as DeckModules, new Set<string>(PT_TENSE_IDS))

const voice: VoiceSpec = {
  // Bare `pt` means European Portuguese by convention; `pt-BR` never does.
  accept: lang => lang.startsWith('pt'),
  prefer: lang => lang === 'pt' || lang === 'pt-pt' || (lang.startsWith('pt-') && !lang.startsWith('pt-br')),
  missing: 'No Portuguese voice installed; your device will read it as best it can',
  wrongVariant: (name, lang) => `${name} (${lang}) — not European Portuguese`,
}

export const examplesKind = createExamplesKind({
  verbs: verbData as Record<string, Example[]>,
  words: wordData as Record<string, Example[]>,
  locale: 'pt-PT',
  languageName: 'Portuguese',
  voice,
  verbOf,
  // "ir para a escola" borrows `ir`'s sentences.
  headOf: infinitive => (parseVerb(infinitive) ? infinitive : infinitive.split(/\s+/)[0]!),
})

export const portuguese: LanguageDef = {
  id: 'pt',
  name: 'European Portuguese',
  shortName: 'Portuguese',
  nativeName: 'Português',
  flag: Flag,
  description: 'The Portuguese of Portugal — autocarro, not ônibus.',
  locale: 'pt-PT',
  // The keys this app has always written. Changing them would strand every
  // existing user's study history behind a name nothing reads.
  storagePrefix: 'eupt:v4',
  cards: corpus.cards,
  decks: corpus.decks,
  tenses: PT_TENSES,
  persons: PT_PERSONS,
  annotations: [
    createConjugationKind({
      tenses: PT_TENSES,
      persons: PT_PERSONS,
      conjugate: conjugatePhrase,
      verbOf,
    }) as AnnotationKind,
    examplesKind as AnnotationKind,
  ],
  conjugate: conjugatePhrase,
  verbOf,
  voice,
  // The single-file app and both earlier storage schemas were Portuguese, so
  // this is the only language with anything to carry forward.
  migrate(storage) {
    const result = runMigration(storage, corpus.cards, { tenses: PT_TENSES })
    migrateTenseScope(storage, { tenses: PT_TENSES })
    return result
  },
  badgeHints: {
    plural: 'plural — vocês / eles',
    informal: 'informal — tu',
    formal: 'formal — você / o senhor',
    contraction: 'contraction — preposition + article',
  },
}
