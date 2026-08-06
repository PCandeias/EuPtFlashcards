/**
 * The tense and person registry.
 *
 * Everything downstream is driven by this list rather than by a hardcoded set, so
 * adding or removing a tense means editing here and nowhere else. Conjugation data
 * is partial throughout: a verb that has no forms for a tense simply does not
 * offer it, and nothing breaks.
 */

export const TENSE_IDS = [
  'presente',
  'perfeito',
  'imperfeito',
  'futuro',
  'futuroProximo',
] as const

export type TenseId = (typeof TENSE_IDS)[number]

export interface TenseDef {
  id: TenseId
  label: string
  /** What it is for, in plain English — this is a learning tool. */
  hint: string
  example: string
}

export const TENSES: readonly TenseDef[] = [
  { id: 'presente', label: 'Presente', hint: 'what happens now', example: 'eu falo' },
  { id: 'perfeito', label: 'Pretérito perfeito', hint: 'what happened', example: 'eu falei' },
  { id: 'imperfeito', label: 'Pretérito imperfeito', hint: 'what used to happen', example: 'eu falava' },
  { id: 'futuro', label: 'Futuro', hint: 'what will happen', example: 'eu falarei' },
  {
    id: 'futuroProximo',
    label: 'Futuro próximo',
    hint: 'what is going to happen — the everyday future',
    example: 'eu vou falar',
  },
]

const TENSE_BY_ID = new Map(TENSES.map(t => [t.id, t]))

export function tenseById(id: string): TenseDef | undefined {
  return TENSE_BY_ID.get(id as TenseId)
}

export function isTenseId(value: unknown): value is TenseId {
  return typeof value === 'string' && TENSE_BY_ID.has(value as TenseId)
}

/**
 * Persons, European Portuguese.
 *
 * `vós` is deliberately absent: it is archaic outside liturgy and some northern
 * dialects, and this deck teaches what is spoken in Portugal today.
 */
export const PERSON_IDS = ['eu', 'tu', 'ele', 'nos', 'eles'] as const
export type PersonId = (typeof PERSON_IDS)[number]

export interface PersonDef {
  id: PersonId
  label: string
}

export const PERSONS: readonly PersonDef[] = [
  { id: 'eu', label: 'eu' },
  { id: 'tu', label: 'tu' },
  { id: 'ele', label: 'ele / ela / você' },
  { id: 'nos', label: 'nós' },
  { id: 'eles', label: 'eles / elas / vocês' },
]

/** A tense may be missing entirely, and a person may be missing within one. */
export type Forms = Partial<Record<PersonId, string>>
export type Conjugation = Partial<Record<TenseId, Forms>>
