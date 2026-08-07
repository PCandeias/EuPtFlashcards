/**
 * Conjugating a Turkish verb.
 *
 * Turkish is agglutinative and almost entirely regular: a verb is a stem with
 * suffixes stacked on it, and the suffixes change their vowels to match the stem
 * rather than the other way round. That makes an engine viable where Portuguese
 * needed a table of irregulars — nearly every verb in the language falls out of
 * the rules below.
 *
 * The two rules everything rests on:
 *
 *   Vowel harmony   a suffix vowel copies the front/back and rounded/unrounded
 *                   quality of the last vowel of what it attaches to. Two-way
 *                   suffixes pick a or e; four-way pick ı, i, u or ü.
 *   Consonant harmony  a suffix starting with d turns into t after a voiceless
 *                   consonant: geldi, but yaptı.
 *
 * What is left over is a short list of stems that soften before a vowel
 * (git → gid-) and two that change shape before -yor (ye → yi-). Those are named
 * explicitly below; nothing else is guessed at.
 */
import { TR_PERSON_IDS, TR_TENSE_IDS, type TrPersonId, type TrTenseId } from './tenses.js'
import { VOICELESS, fourWay, isVowel, lastVowel, syllables, twoWay } from './harmony.js'
import type { Conjugation as GenericConjugation, Forms as GenericForms } from '../../grammar/types.js'

type Forms = GenericForms<TrPersonId>
type Conjugation = GenericConjugation<TrTenseId, TrPersonId>

/**
 * Stems that voice their final consonant before a vowel.
 *
 * A closed list on purpose. The alternation is real but rare in verbs, and
 * applying it by rule would turn `bakar` into `bağar`.
 */
const SOFTENS: Record<string, string> = {
  git: 'gid',
  et: 'ed',
  tat: 'tad',
  güt: 'güd',
  ait: 'aid',
}

/** `ye` and `de` are the only two stems that change shape before -yor and -ecek. */
const RESHAPES: Record<string, string> = { ye: 'yi', de: 'di' }

/**
 * Monosyllabic stems that take the four-way aorist instead of the two-way one.
 *
 * Every Turkish grammar lists these thirteen, and there is no rule behind them:
 * `gelir`, not `geler`, has to be learned.
 */
const AORIST_IRREGULAR = new Set([
  'al', 'bil', 'bul', 'dur', 'gel', 'gör', 'kal', 'ol', 'öl', 'san', 'var', 'ver', 'vur',
])

export interface Verb {
  infinitive: string
  stem: string
}

/** Splits an infinitive, or null if it is not one. */
export function parseVerb(infinitive: string): Verb | null {
  const word = infinitive.trim().toLocaleLowerCase('tr')
  if (!/^[a-zçğıöşü]+m[ae]k$/.test(word)) return null
  const stem = word.slice(0, -3)
  // A stem needs a vowel to harmonise against.
  if (!stem || !lastVowel(stem)) return null
  return { infinitive: word, stem }
}

/** The stem as it appears before a suffix that begins with a vowel. */
const beforeVowel = (stem: string) => SOFTENS[stem] ?? stem

/**
 * Personal endings for everything except the -di past.
 *
 * One set covers şimdiki, geniş, öğrenilen and gelecek because all four end in a
 * form that behaves like a noun: geliyor-um, gelir-im, gelmiş-im, geleceğ-im.
 */
function predicative(base: string): Forms {
  const i = fourWay(base)
  const a = twoWay(base)
  // Only the endings that begin with a vowel meet the k, and only the future
  // stem ends in one: gelecek + im -> geleceğim.
  const soft = base.endsWith('k') ? `${base.slice(0, -1)}ğ` : base
  return {
    ben: `${soft}${i}m`,
    sen: `${base}s${i}n`,
    o: base,
    biz: `${soft}${i}z`,
    siz: `${base}s${i}n${i}z`,
    onlar: `${base}l${a}r`,
  }
}

/** Endings for the -di past, which are the possessive set rather than the copular one. */
function pastPersonal(base: string): Forms {
  const i = fourWay(base)
  const a = twoWay(base)
  return {
    ben: `${base}m`,
    sen: `${base}n`,
    o: base,
    biz: `${base}k`,
    siz: `${base}n${i}z`,
    onlar: `${base}l${a}r`,
  }
}

/** geliyorum — stem loses a final vowel, then takes the harmony vowel and -yor. */
function simdiki(stem: string): Forms {
  const shaped = RESHAPES[stem] ?? beforeVowel(stem)
  const trimmed = isVowel(shaped[shaped.length - 1]!) ? shaped.slice(0, -1) : shaped
  // `ye` becomes `yi`, so nothing is ever left without a vowel to harmonise on.
  const base = `${trimmed}${fourWay(trimmed || shaped)}yor`
  return predicative(base)
}

/** gelirim — the aorist, and the one tense with a list behind it. */
function genis(stem: string): Forms {
  const shaped = beforeVowel(stem)
  let base: string
  if (isVowel(shaped[shaped.length - 1]!)) {
    base = `${shaped}r`
  } else if (syllables(shaped) === 1 && !AORIST_IRREGULAR.has(stem)) {
    base = `${shaped}${twoWay(shaped)}r`
  } else {
    base = `${shaped}${fourWay(shaped)}r`
  }
  return predicative(base)
}

/** geldim — d after a voiced sound, t after a voiceless one. */
function gecmis(stem: string): Forms {
  const last = stem[stem.length - 1]!
  const d = VOICELESS.includes(last) ? 't' : 'd'
  return pastPersonal(`${stem}${d}${fourWay(stem)}`)
}

/** gelmişim — the past you did not witness yourself. */
function ogrenilen(stem: string): Forms {
  return predicative(`${stem}m${fourWay(stem)}ş`)
}

/** geleceğim — a y appears between two vowels, and the final k softens. */
function gelecek(stem: string): Forms {
  const shaped = RESHAPES[stem] ?? beforeVowel(stem)
  const buffer = isVowel(shaped[shaped.length - 1]!) ? 'y' : ''
  const a = twoWay(shaped)
  // -acak / -ecek: both vowels are the same choice.
  return predicative(`${shaped}${buffer}${a}c${a}k`)
}

const BUILDERS: Record<TrTenseId, (stem: string) => Forms> = {
  simdiki,
  genis,
  gecmis,
  ogrenilen,
  gelecek,
}

/** Every tense of one verb, or null if the word is not an infinitive. */
export function conjugate(infinitive: string): Conjugation | null {
  const verb = parseVerb(infinitive)
  if (!verb) return null

  const out: Conjugation = {}
  for (const tense of TR_TENSE_IDS) out[tense] = BUILDERS[tense](verb.stem)
  return out
}

/**
 * Conjugates a phrase built on a verb: `yardım etmek` -> `yardım ediyorum`.
 *
 * Turkish puts the verb last, so the words before it are carried along unchanged.
 * This is the mirror of Portuguese, where the verb leads and the tail follows.
 */
export function conjugatePhrase(phrase: string): Conjugation | null {
  const words = phrase.trim().split(/\s+/)
  const head = words[words.length - 1]!
  const conjugated = conjugate(head)
  if (!conjugated) return null
  if (words.length === 1) return conjugated

  const prefix = words.slice(0, -1).join(' ')
  const out: Conjugation = {}
  for (const [tense, forms] of Object.entries(conjugated)) {
    const moved: Forms = {}
    for (const person of TR_PERSON_IDS) {
      const form = (forms as Forms)[person]
      if (form) moved[person] = `${prefix} ${form}`
    }
    out[tense as TrTenseId] = moved
  }
  return out
}
