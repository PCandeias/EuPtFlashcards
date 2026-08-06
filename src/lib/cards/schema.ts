import { isTenseId, type TenseId } from '../verbs/tenses.js'
/**
 * The card model.
 *
 * Grammatical metadata lives in `tags`, never inside `en` or `pt` — the word
 * fields hold only the word. Tags are a closed vocabulary so a typo is a
 * compile error rather than a silently missing badge.
 */

export const TAGS = [
  'masc',
  'masc-mixed',
  'fem',
  'plural',
  'informal',
  'formal',
  'object',
  'contraction',
] as const

export type Tag = (typeof TAGS)[number]

/** Display order, so two cards with the same tags always render them the same way. */
export const TAG_ORDER: readonly Tag[] = TAGS

export interface Card {
  deck: string
  en: string
  pt: string
  /**
   * The tense this card is in, when it is in one.
   *
   * Absent means the card is not tense-bearing — a noun, an adjective, a fixed
   * phrase, or an infinitive — and it is always shown whatever tenses are
   * selected. Only a card that carries a tense can be filtered out by one.
   */
  tense?: TenseId
  /** Badges for the English face — the underspecified side. */
  tags?: Tag[]
  /**
   * Badges for the Portuguese face. Only for bare function words that are
   * ambiguous alone (`o`, `a`, `no`, `na`); the Portuguese normally spells the
   * distinction out itself. Always a subset of `tags`.
   */
  ptTags?: Tag[]
  /** Meaning-level disambiguation that cannot compress to a letter (ser vs estar). */
  sense?: string
}

const TAG_SET = new Set<string>(TAGS)

export function isTag(value: unknown): value is Tag {
  return typeof value === 'string' && TAG_SET.has(value)
}

export function cardId(card: Pick<Card, 'deck' | 'en' | 'pt'>): string {
  return `${card.deck}::${card.en}::${card.pt}`
}

function fail(where: string, why: string): never {
  throw new Error(`invalid card in ${where}: ${why}`)
}

/** Validates one raw entry. Throws rather than coercing — bad data fails the build. */
export function parseCard(value: unknown, deck: string, where: string): Card {
  if (typeof value !== 'object' || value === null) fail(where, 'not an object')
  const raw = value as Record<string, unknown>

  if (typeof raw.en !== 'string' || !raw.en.trim()) fail(where, '`en` must be a non-empty string')
  if (typeof raw.pt !== 'string' || !raw.pt.trim()) fail(where, '`pt` must be a non-empty string')

  const card: Card = { deck, en: raw.en, pt: raw.pt }

  if (raw.tags !== undefined) {
    if (!Array.isArray(raw.tags)) fail(where, '`tags` must be an array')
    for (const t of raw.tags) if (!isTag(t)) fail(where, `unknown tag ${JSON.stringify(t)}`)
    card.tags = raw.tags as Tag[]
  }

  if (raw.ptTags !== undefined) {
    if (!Array.isArray(raw.ptTags)) fail(where, '`ptTags` must be an array')
    for (const t of raw.ptTags) {
      if (!isTag(t)) fail(where, `unknown ptTag ${JSON.stringify(t)}`)
      if (!card.tags?.includes(t)) fail(where, `ptTag ${t} is not present in tags`)
    }
    card.ptTags = raw.ptTags as Tag[]
  }

  if (raw.tense !== undefined) {
    if (!isTenseId(raw.tense)) fail(where, `unknown tense ${JSON.stringify(raw.tense)}`)
    card.tense = raw.tense
  }

  if (raw.sense !== undefined) {
    if (typeof raw.sense !== 'string' || !raw.sense.trim()) fail(where, '`sense` must be a non-empty string')
    card.sense = raw.sense
  }

  return card
}
