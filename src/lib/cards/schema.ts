import { isTenseId, type TenseId } from '../grammar/tenses.js'
import { isLevelId, type LevelId } from './levels.js'
/**
 * The card model, shared by every language.
 *
 * Grammatical metadata lives in `tags`, never inside `en` or `target` — the word
 * fields hold only the word. Tags are a closed vocabulary so a typo is a
 * compile error rather than a silently missing badge.
 *
 * The vocabulary is the union across languages and no language uses all of it:
 * Turkish has no grammatical gender, so `masc` and `fem` never appear on a
 * Turkish card. Each language's data test asserts which tags it actually uses.
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
  target: string
  /**
   * The tense this card is in, when it is in one.
   *
   * Absent means the card is not tense-bearing — a noun, an adjective, a fixed
   * phrase, or an infinitive — and it is always shown whatever tenses are
   * selected. Only a card that carries a tense can be filtered out by one.
   */
  tense?: TenseId
  /**
   * How far into the language this card sits.
   *
   * Internal for now: nothing filters on it yet. Absent means unclassified, and
   * an unclassified card is always shown — the same bargain as `tense`, so a
   * card that slips through the labelling is never silently lost.
   */
  level?: LevelId
  /** Badges for the English face — the underspecified side. */
  tags?: Tag[]
  /**
   * Badges for the target-language face. Only for bare function words that are
   * ambiguous alone (`o`, `a`, `no`, `na`); the target language normally spells
   * the distinction out itself. Always a subset of `tags`.
   */
  targetTags?: Tag[]
  /** Meaning-level disambiguation that cannot compress to a letter (ser vs estar). */
  sense?: string
}

const TAG_SET = new Set<string>(TAGS)

export function isTag(value: unknown): value is Tag {
  return typeof value === 'string' && TAG_SET.has(value)
}

export function cardId(card: Pick<Card, 'deck' | 'en' | 'target'>): string {
  return `${card.deck}::${card.en}::${card.target}`
}

function fail(where: string, why: string): never {
  throw new Error(`invalid card in ${where}: ${why}`)
}

/**
 * Validates one raw entry. Throws rather than coercing — bad data fails the build.
 *
 * `tenses` narrows the check to one language's tenses, so a Turkish tense in a
 * Portuguese deck fails at load rather than quietly becoming a card no filter can
 * ever reach. Omit it and any registered tense is accepted.
 */
export function parseCard(
  value: unknown,
  deck: string,
  where: string,
  tenses?: ReadonlySet<string>,
): Card {
  if (typeof value !== 'object' || value === null) fail(where, 'not an object')
  const raw = value as Record<string, unknown>

  if (typeof raw.en !== 'string' || !raw.en.trim()) fail(where, '`en` must be a non-empty string')
  if (typeof raw.target !== 'string' || !raw.target.trim()) fail(where, "`target` must be a non-empty string")

  const card: Card = { deck, en: raw.en, target: raw.target }

  if (raw.tags !== undefined) {
    if (!Array.isArray(raw.tags)) fail(where, '`tags` must be an array')
    for (const t of raw.tags) if (!isTag(t)) fail(where, `unknown tag ${JSON.stringify(t)}`)
    card.tags = raw.tags as Tag[]
  }

  if (raw.targetTags !== undefined) {
    if (!Array.isArray(raw.targetTags)) fail(where, '`targetTags` must be an array')
    for (const t of raw.targetTags) {
      if (!isTag(t)) fail(where, `unknown targetTag ${JSON.stringify(t)}`)
      if (!card.tags?.includes(t)) fail(where, `targetTag ${t} is not present in tags`)
    }
    card.targetTags = raw.targetTags as Tag[]
  }

  if (raw.tense !== undefined) {
    if (!isTenseId(raw.tense)) fail(where, `unknown tense ${JSON.stringify(raw.tense)}`)
    if (tenses && !tenses.has(raw.tense)) {
      fail(where, `tense ${JSON.stringify(raw.tense)} belongs to another language`)
    }
    card.tense = raw.tense
  }

  if (raw.level !== undefined) {
    if (!isLevelId(raw.level)) fail(where, `unknown level ${JSON.stringify(raw.level)}`)
    card.level = raw.level
  }

  if (raw.sense !== undefined) {
    if (typeof raw.sense !== 'string' || !raw.sense.trim()) fail(where, '`sense` must be a non-empty string')
    card.sense = raw.sense
  }

  return card
}
