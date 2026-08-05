/**
 * Turns a card's tags into badge specs.
 *
 * Pure — no DOM, no storage. The side rule lives here rather than in the
 * component so it can be tested directly and stays identical for both faces.
 */
import { TAG_ORDER, type Card, type Tag } from '../cards/schema.js'

export type Side = 'en' | 'pt'

export interface BadgeSpec {
  tag: Tag
  /** Short text shown in the pill. */
  pill: string
  /** Colour class, grouped by family so the card is scannable without reading. */
  cls: string
  /** Expanded term, used for the tooltip and the accessible label. */
  full: string
}

export const BADGES: Record<Tag, Omit<BadgeSpec, 'tag'>> = {
  masc: { pill: 'M', cls: 'gender', full: 'masculine' },
  'masc-mixed': { pill: 'M+', cls: 'gender', full: 'masculine or mixed group' },
  fem: { pill: 'F', cls: 'gender-f', full: 'feminine' },
  plural: { pill: 'PL', cls: 'number', full: 'plural — vocês / eles' },
  informal: { pill: 'INF', cls: 'informal', full: 'informal — tu' },
  formal: { pill: 'FML', cls: 'formal', full: 'formal — você / o senhor' },
  object: { pill: 'OBJ', cls: 'role', full: 'object pronoun' },
  contraction: { pill: 'CTR', cls: 'role', full: 'contraction — preposition + article' },
}

/**
 * Badges for one face.
 *
 * English carries the full tag set because it is the underspecified side —
 * "you come" cannot tell you `tu vens` from `vocês vêm`. Portuguese carries only
 * `ptTags`, because the Portuguese form normally spells the distinction out
 * itself; the exceptions are bare function words like `o` and `na`.
 */
export function badgesFor(card: Card, side: Side): BadgeSpec[] {
  const tags = side === 'en' ? card.tags : card.ptTags
  if (!tags?.length) return []
  return [...tags]
    .sort((a, b) => TAG_ORDER.indexOf(a) - TAG_ORDER.indexOf(b))
    .map(tag => ({ tag, ...BADGES[tag] }))
}

/** Meaning-level disambiguation, shown only where the meaning is ambiguous. */
export function hintFor(card: Card, side: Side): string | undefined {
  return side === 'en' ? card.sense : undefined
}
