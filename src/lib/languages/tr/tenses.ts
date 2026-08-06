/**
 * Turkish tenses and persons.
 *
 * Turkish marks tense with a suffix on the stem rather than with a separate word,
 * so what Portuguese needs an auxiliary for — "estou a falar" — Turkish does
 * inside one word: `konuşuyorum`. The labels below are the Turkish names, since
 * that is what a grammar or a class will call them.
 *
 * `geniş zaman` has no clean English equivalent and is the one that catches people
 * out: it is not the present. `geliyorum` is "I am coming (now)"; `gelirim` is "I
 * come (as a rule)" and doubles as a soft promise.
 */
import type { PersonDef, TenseDef } from '../../grammar/types.js'

export const TR_TENSE_IDS = [
  'simdiki',
  'genis',
  'gecmis',
  'ogrenilen',
  'gelecek',
] as const

export type TrTenseId = (typeof TR_TENSE_IDS)[number]

export const TR_TENSES: readonly TenseDef<TrTenseId>[] = [
  {
    id: 'simdiki',
    label: 'Şimdiki zaman',
    hint: 'what is happening now — the everyday present',
    example: 'geliyorum',
  },
  {
    id: 'genis',
    label: 'Geniş zaman',
    hint: 'what happens as a rule, and what you are willing to do',
    example: 'gelirim',
  },
  {
    id: 'gecmis',
    label: 'Görülen geçmiş zaman',
    hint: 'what happened, and you know it did',
    example: 'geldim',
  },
  {
    id: 'ogrenilen',
    label: 'Öğrenilen geçmiş zaman',
    hint: 'what happened by all accounts — hearsay, or a surprise',
    example: 'gelmişim',
  },
  {
    id: 'gelecek',
    label: 'Gelecek zaman',
    hint: 'what will happen',
    example: 'geleceğim',
  },
]

/**
 * Persons.
 *
 * Turkish has no gender, so `o` covers he, she and it with one word — and `siz`
 * is both the plural you and the polite singular you, exactly as `você` is not.
 */
export const TR_PERSON_IDS = ['ben', 'sen', 'o', 'biz', 'siz', 'onlar'] as const
export type TrPersonId = (typeof TR_PERSON_IDS)[number]

export const TR_PERSONS: readonly PersonDef<TrPersonId>[] = [
  { id: 'ben', label: 'ben' },
  { id: 'sen', label: 'sen' },
  { id: 'o', label: 'o — he / she / it' },
  { id: 'biz', label: 'biz' },
  { id: 'siz', label: 'siz — you plural or polite' },
  { id: 'onlar', label: 'onlar' },
]
