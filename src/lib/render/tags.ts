/**
 * Turns a card's tags into badge specs.
 *
 * Pure — no DOM, no storage. The side rule lives here rather than in the
 * component so it can be tested directly and stays identical for both faces.
 */
import { TAG_ORDER, type Card, type Tag } from '../cards/schema.js'

export type Side = 'en' | 'target'

export interface BadgeSpec {
  tag: Tag
  /** Short text shown in the pill. */
  pill: string
  /** Colour class, grouped by family so the card is scannable without reading. */
  cls: string
  /** Expanded term, used for the tooltip and the accessible label. */
  full: string
}

/**
 * The pill and its colour are the same in every language; the wording is not.
 * `plural` means `vocês` in one language and `siz` in the other, so a language
 * may override the expansion through its `badgeHints`.
 */
export const BADGES: Record<Tag, Omit<BadgeSpec, 'tag'>> = {
  masc: { pill: 'M', cls: 'gender', full: 'masculine' },
  'masc-mixed': { pill: 'M+', cls: 'gender', full: 'masculine or mixed group' },
  fem: { pill: 'F', cls: 'gender-f', full: 'feminine' },
  plural: { pill: 'PL', cls: 'number', full: 'plural' },
  informal: { pill: 'INF', cls: 'informal', full: 'informal' },
  formal: { pill: 'FML', cls: 'formal', full: 'formal' },
  object: { pill: 'OBJ', cls: 'role', full: 'object pronoun' },
  contraction: { pill: 'CTR', cls: 'role', full: 'contraction' },
}

/**
 * Badges for one face.
 *
 * English carries the full tag set because it is the underspecified side —
 * "you come" cannot tell you `tu vens` from `vocês vêm`, nor `geliyorsun` from
 * `geliyorsunuz`. The target language carries only `targetTags`, because its own
 * form normally spells the distinction out; the exceptions are bare function
 * words like `o` and `na`.
 */
export function badgesFor(
  card: Card, side: Side, hints?: Partial<Record<Tag, string>>,
): BadgeSpec[] {
  const tags = side === 'en' ? card.tags : card.targetTags
  if (!tags?.length) return []
  return [...tags]
    .sort((a, b) => TAG_ORDER.indexOf(a) - TAG_ORDER.indexOf(b))
    .map(tag => ({ tag, ...BADGES[tag], full: hints?.[tag] ?? BADGES[tag].full }))
}

/**
 * The line under the word: the sense before the flip, the note after it.
 *
 * The English face is the question, so it only gets what tells two cards
 * apart. Anything that would name the answer waits for the target face.
 */
export function hintFor(card: Card, side: Side): string | undefined {
  return side === 'en' ? card.sense : card.note
}
