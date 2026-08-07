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
  details: [
    'The capital letters in the shapes are placeholders, not spellings. A stands '
      + 'for a or e, I for ı, i, u or ü, and D for d or t — which one you get is '
      + 'what the next two sections are about.',
    'They stack, and always in this order: plural, then possessive, then case. '
      + 'ev + ler + im + de is evlerimde, "in my houses". Turkish will keep going '
      + 'far past anything English would attempt.',
    'The accusative marks a definite object and nothing else. Kitap okuyorum is '
      + '"I am reading a book"; kitabı okuyorum is "I am reading the book". There '
      + 'is no word for "the" — this ending is it.',
    'The dative and locative do the work of half the English prepositions: eve '
      + 'gidiyorum is "I am going home", evde is "at home", evden is "from home".',
  ],
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
  details: [
    'The rule is about the mouth rather than the alphabet. a, ı, o and u are made '
      + 'at the back; e, i, ö and ü at the front. A suffix follows the last vowel '
      + 'to wherever it was made, so a word is pronounced in one position '
      + 'throughout.',
    'Four-way endings copy rounding as well as position. That is why o and u both '
      + 'give u, and ö and ü both give ü: the lips were already rounded.',
    'o and ö never appear in a suffix, only in a root. A four-way ending after '
      + 'okul is u, never o.',
    'Borrowed words are where it breaks. saat is spelled with a back vowel and '
      + 'takes front endings — saati, not saatı — and there is nothing in the '
      + 'spelling to warn you. Those are listed by hand rather than derived.',
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
  details: [
    'The endings are the same ones the tenses use — geliyorum, öğrenciyim — which '
      + 'is why they are worth learning once. Only the -di past takes a different '
      + 'set.',
    'The third person needs no ending at all. O öğrenci is a whole sentence. There '
      + 'is a formal -dir (öğrencidir) but it belongs to signs and announcements '
      + 'rather than to speech.',
    'The past is -ydi and it goes in the same place: öğrenciydim, "I was a '
      + 'student"; yorgundum, "I was tired".',
    'Turkish puts the verb last, so this ending is the last thing in the sentence '
      + 'and the thing that finishes it. Ben bugün çok yorgunum.',
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
  details: [
    'mi is written apart from the word it questions but harmonises with it, which '
      + 'no other suffix does at a distance: Öğrenci mi? Doktor mu? Güzel mi?',
    'Where mi sits is what the question is about. Yarın sinemaya gidiyor musun? '
      + 'asks whether you are going; yarın mı sinemaya gidiyorsun? asks whether it '
      + 'is tomorrow.',
    'Having something is existing: benim bir arabam var is literally "my one car '
      + 'exists". The thing owned takes the possessive and var does the rest.',
    'A question word makes mi unnecessary. Nereye gidiyorsun? already asks; adding '
      + 'mi to it would not.',
    'The negative of a verb is not değil but -me-: gitmiyorum, "I am not going". '
      + 'değil is for everything that is not a verb.',
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
  details: [
    'Hardening is a rule and you can trust it: after ç, f, h, k, p, s, ş or t — the '
      + 'eight voiceless consonants, remembered in Turkey as fıstıkçı şahap — a '
      + 'suffix starting with d is written with t. It is the same rule in the past '
      + 'tense: geldi, but yaptı.',
    'Softening is not a rule and cannot be made into one. kitap softens and sepet '
      + 'does not; çocuk softens and Türk does not. This app keeps a list and says '
      + 'nothing at all for a word it has not been told about, because a missing '
      + 'panel costs one card its reference and a guessed one teaches a word that '
      + 'does not exist.',
    'Two shapes of the same idea are worth naming: the buffer letters. y goes '
      + 'between two vowels (arabayı), n appears before a possessive (evinde), and '
      + 's marks a third-person possessive on a word ending in a vowel (arabası).',
    'su is irregular in exactly the places a rule would get wrong: suyu, suyun, '
      + 'suyum — a y where everything else takes n or s.',
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
