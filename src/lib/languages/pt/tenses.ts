/**
 * European Portuguese tenses and persons.
 *
 * Everything downstream is driven by these lists rather than by a hardcoded set,
 * so adding or removing a tense means editing here and nowhere else.
 */
import type { PersonDef, TenseDef } from '../../grammar/types.js'

export const PT_TENSE_IDS = [
  'presente',
  'presenteContinuo',
  'perfeito',
  'imperfeito',
  'futuro',
  'futuroProximo',
] as const

export type PtTenseId = (typeof PT_TENSE_IDS)[number]

export const PT_TENSES: readonly TenseDef<PtTenseId>[] = [
  { id: 'presente', label: 'Presente', hint: 'what happens now', example: 'eu falo' },
  {
    id: 'presenteContinuo',
    label: 'Presente contínuo',
    hint: 'what is happening right now',
    example: 'eu estou a falar',
  },
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

/**
 * Persons, European Portuguese.
 *
 * `vós` is deliberately absent: it is archaic outside liturgy and some northern
 * dialects, and this deck teaches what is spoken in Portugal today.
 */
export const PT_PERSON_IDS = ['eu', 'tu', 'ele', 'nos', 'eles'] as const
export type PtPersonId = (typeof PT_PERSON_IDS)[number]

export const PT_PERSONS: readonly PersonDef<PtPersonId>[] = [
  { id: 'eu', label: 'eu' },
  { id: 'tu', label: 'tu' },
  { id: 'ele', label: 'ele / ela / você' },
  { id: 'nos', label: 'nós' },
  { id: 'eles', label: 'eles / elas / vocês' },
]
