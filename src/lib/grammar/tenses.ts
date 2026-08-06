/**
 * Every tense and person the app knows, across all languages.
 *
 * The union exists so one card model can serve both languages: a card's `tense`
 * is checked against this list for spelling, and against its own language's list
 * for sense. A Portuguese card claiming `simdiki` is caught by the data tests,
 * not by the type — that is the trade for keeping one schema.
 */
import { PT_TENSES, PT_PERSONS, type PtPersonId, type PtTenseId } from '../languages/pt/tenses.js'
import { TR_TENSES, TR_PERSONS, type TrPersonId, type TrTenseId } from '../languages/tr/tenses.js'
import type { Conjugation as GenericConjugation, Forms as GenericForms, TenseDef } from './types.js'

export type TenseId = PtTenseId | TrTenseId
export type PersonId = PtPersonId | TrPersonId

export type Forms = GenericForms<PersonId>
export type Conjugation = GenericConjugation<TenseId, PersonId>

export const ALL_TENSES: readonly TenseDef<TenseId>[] = [...PT_TENSES, ...TR_TENSES]
export const ALL_PERSONS = [...PT_PERSONS, ...TR_PERSONS]

const TENSE_BY_ID = new Map(ALL_TENSES.map(t => [t.id, t]))

export function tenseById(id: string): TenseDef<TenseId> | undefined {
  return TENSE_BY_ID.get(id as TenseId)
}

export function isTenseId(value: unknown): value is TenseId {
  return typeof value === 'string' && TENSE_BY_ID.has(value as TenseId)
}
