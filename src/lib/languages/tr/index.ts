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
import { createSuffixKind } from '../../annotations/suffixes.js'
import { TR_PERSONS, TR_TENSES, TR_TENSE_IDS } from './tenses.js'
import { conjugatePhrase } from './conjugate.js'
import { attach, canSuffix, suffixTable, TR_SUFFIXES } from './suffixes.js'
import { BACK, lastVowel } from './harmony.js'
import { verbOf } from './detect.js'
import Flag from './Flag.svelte'
import verbData from '../../../../data/tr/verb-examples.json'
import wordData from '../../../../data/tr/word-examples.json'
import type { LanguageDef, VoiceSpec } from '../types.js'
import type { ReferenceTable } from '../../reference/build.js'
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

/**
 * The deck that teaches the endings themselves — `evde`, `okula`, `kitabım`.
 * Its cards are already inflected, so the reference has nothing to add to them:
 * it would offer `evdeler` and `evdede`, which are not words.
 */
const ENDINGS_DECK = 'Suffixes & Vowel Harmony'

/**
 * A card whose English begins like this is already carrying the ending the
 * panel would add: `my mother` is `annem`, not `anne`.
 */
const ALREADY_INFLECTED = /^(in|at|to|from|of|my|your|his|her|with|without)\b/i

/**
 * The endings a noun takes.
 *
 * Offered on the dictionary form of a word — `ev`, `okul`, `kitap` — and not on
 * a phrase, a sentence, a verb, or a form that already has an ending on it.
 */
export const suffixKind = createSuffixKind({
  table: word => suffixTable(word),
  wordOf: card => {
    if (/^to\s/i.test(card.en.trim())) return null
    if (card.deck === ENDINGS_DECK) return null
    if (ALREADY_INFLECTED.test(card.en.trim())) return null
    const word = card.target.trim()
    return canSuffix(word) ? word : null
  },
  describeHarmony: word => {
    const v = lastVowel(word)
    const back = v !== null && BACK.includes(v)
    return back
      ? `The last vowel is ${v}, a back vowel, so the endings take a, ı or u.`
      : `The last vowel is ${v}, a front vowel, so the endings take e, i or ü.`
  },
})

/**
 * The endings, worked on two words at once.
 *
 * `ev` has a front vowel and `okul` a back one, so every row shows the same
 * suffix in both of its shapes. That side-by-side is the whole of vowel harmony.
 */
const suffixReference: ReferenceTable = {
  title: 'Noun endings',
  blurb: 'Turkish puts on an ending where English puts a word in front. The '
    + 'ending changes shape to match the word: ev takes e and i, okul takes a '
    + 'and ı. Every noun card carries a + with its own full set.',
  columns: ['Ending', 'Meaning', 'ev — front', 'okul — back'],
  rows: TR_SUFFIXES.map(s => [
    s.shape, s.gloss, attach('ev', s.id) ?? '—', attach('okul', s.id) ?? '—',
  ]),
}

const harmonyReference: ReferenceTable = {
  title: 'Vowel harmony',
  blurb: 'The last vowel of a word decides the vowel of everything that follows '
    + 'it. Two-way endings pick from the first column, four-way endings from the '
    + 'second.',
  columns: ['Last vowel', 'Two-way (a/e)', 'Four-way (ı/i/u/ü)', 'For example'],
  rows: [
    ['a, ı', 'a', 'ı', 'kız → kızda, kızı'],
    ['e, i', 'e', 'i', 'ev → evde, evi'],
    ['o, u', 'a', 'u', 'okul → okulda, okulu'],
    ['ö, ü', 'e', 'ü', 'göz → gözde, gözü'],
  ],
}

/**
 * The one thing a conjugation panel cannot show, because there is no verb in it.
 *
 * `öğrenciyim` is a noun with a person on the end. The deck teaches the forms one
 * at a time; this is the whole pattern in one place.
 */
const copulaReference: ReferenceTable = {
  title: 'Saying what something is',
  blurb: 'Turkish has no verb for "am" or "is": the person goes on the end of the '
    + 'word itself. A y appears when the word already ends in a vowel, and the '
    + 'ending harmonises like any other.',
  columns: ['', 'öğrenci — student', 'doktor — doctor', 'not'],
  rows: [
    ['ben', 'öğrenciyim', 'doktorum', 'öğrenci değilim'],
    ['sen', 'öğrencisin', 'doktorsun', 'öğrenci değilsin'],
    ['o', 'öğrenci', 'doktor', 'öğrenci değil'],
    ['biz', 'öğrenciyiz', 'doktoruz', 'öğrenci değiliz'],
    ['siz', 'öğrencisiniz', 'doktorsunuz', 'öğrenci değilsiniz'],
    ['onlar', 'öğrenciler', 'doktorlar', 'öğrenci değiller'],
  ],
}

/**
 * Questions, and the two words that carry every sentence about having something.
 */
const questionReference: ReferenceTable = {
  title: 'Asking, and having',
  blurb: 'A question is not word order in Turkish, it is a word: mi, written '
    + 'apart, harmonised to what comes before it, with the person ending on its '
    + 'back. There is no verb "to have" either — you say a thing exists.',
  columns: ['Word', 'What it does', 'For example'],
  rows: [
    ['mı mi mu mü', 'turns anything into a question', 'Öğrenci misin? — are you a student?'],
    ['…on a verb', 'the same word, after the tense', 'Çay istiyor musun? — do you want tea?'],
    ['değil', 'not, for anything that is not a verb', 'Bu iyi değil — this is not good'],
    ['var', 'there is — and so, I have', 'Evde çay var — there is tea at home'],
    ['yok', 'there is not — and so, I have not', 'Vaktim yok — I have no time'],
    ['var mı?', 'is there? do you have?', 'Çay var mı? — is there any tea?'],
  ],
}

const consonantReference: ReferenceTable = {
  title: 'Consonants that change',
  blurb: 'Two more rules and one thing that is not a rule. Which words soften is '
    + 'a fact about each word, so the app keeps a list and says nothing for a '
    + 'word it has not been told about.',
  columns: ['What happens', 'When', 'For example'],
  emphasiseFirst: false,
  rows: [
    ['d becomes t', 'after ç f h k p s ş t', 'kitap → kitapta, not kitapda'],
    ['p becomes b, ç becomes c, t becomes d', 'before a vowel, for some words', 'kitap → kitabı'],
    ['…but not for others', 'no rule tells you which', 'sepet → sepeti'],
    ['k becomes ğ', 'before a vowel', 'ekmek → ekmeği'],
    ['nk becomes ng', 'before a vowel', 'renk → rengi'],
    ['a y appears', 'between two vowels', 'araba → arabayı'],
  ],
}

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
    suffixKind as AnnotationKind,
  ],
  conjugate: conjugatePhrase,
  verbOf,
  voice,
  modelVerb: 'gelmek',
  reference: [
    suffixReference,
    harmonyReference,
    consonantReference,
    copulaReference,
    questionReference,
  ],
  badgeHints: {
    plural: 'plural — siz / onlar',
    informal: 'informal — sen',
    formal: 'polite — siz, and to more than one person',
  },
}
