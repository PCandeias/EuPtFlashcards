/**
 * How a word is used, in whole sentences.
 *
 * Knowing that `ser` means "to be" is not the same as knowing you say
 * "eu sou português". Verbs are keyed by their dictionary form so the several
 * cards teaching the same verb share one set; everything else is keyed by the
 * target-language word as the card writes it.
 *
 * Every sentence records the tense it is in and is filtered by the tense
 * selection, like the cards themselves. Coverage should be wide enough that
 * filtering leaves something to show, so the panel does not empty out just
 * because you narrowed your study.
 *
 * A language with no example data simply never offers the marker.
 */
import ExamplesPanel from '../../components/panels/ExamplesPanel.svelte'
import { isTenseId, type TenseId } from '../grammar/tenses.js'
import type { Card } from '../cards/schema.js'
import type { AnnotationKind } from './types.js'
import type { VoiceSpec } from '../languages/types.js'

export interface Example {
  target: string
  en: string
  /**
   * The tense the sentence is in, when it is in one.
   *
   * Absent means the sentence has no finite verb to be in a tense — `Bu bir
   * kitap`, "this is a book" — and it is shown whatever tenses are selected. The
   * same bargain the cards make, and it is what keeps a word from losing all its
   * examples when the tense selection narrows.
   */
  tense?: TenseId
}

export interface ExamplesPayload {
  /** The word these illustrate — the dictionary form for a verb, else the card's own. */
  subject: string
  examples: Example[]
  /** How many were left out because their tense is not selected. */
  hidden: number
  /**
   * Whether to offer each sentence aloud. Carried here so the panel needs no
   * settings of its own — the kind already has them when it resolves.
   */
  speech: boolean
  /** Which language reads them, when it does. */
  locale: string
  languageName: string
  voice: VoiceSpec
}

/** Shown at once. More than a few stops being an example and becomes a list. */
export const MAX_EXAMPLES = 3

export interface ExamplesSource {
  verbs: Record<string, Example[]>
  words: Record<string, Example[]>
  locale: string
  languageName: string
  voice: VoiceSpec
  /** The dictionary form a card is about, if it is a verb card. */
  verbOf(card: Card): string | null
  /**
   * The head word of a phrase, for a card like "ir para a escola" that should
   * borrow `ir`'s sentences. Optional: a language with no such cards omits it.
   */
  headOf?(infinitive: string): string
}

export interface ExamplesKind extends AnnotationKind<ExamplesPayload> {
  /** The whole set for a word, before any filtering. Used by the tests. */
  examplesFor(subject: string): Example[] | null
  /** Which entry a card draws on, if any. */
  subjectOf(card: Card): string | null
}

export function createExamplesKind(source: ExamplesSource): ExamplesKind {
  const { verbs, words } = source

  const examplesFor = (subject: string): Example[] | null =>
    verbs[subject] ?? words[subject] ?? null

  const subjectOf = (card: Card): string | null => {
    const infinitive = source.verbOf(card)
    if (infinitive) {
      if (verbs[infinitive]) return infinitive
      const head = source.headOf?.(infinitive)
      if (head && verbs[head]) return head
    }
    return words[card.target] ? card.target : null
  }

  return {
    id: 'examples',
    marker: '“',
    tone: 'warm',
    examplesFor,
    subjectOf,
    describe: (card: Card) => `Example sentences with ${subjectOf(card) ?? card.target}`,
    resolve(card, { settings }) {
      const subject = subjectOf(card)
      if (!subject) return null

      const all = examplesFor(subject) ?? []
      const selected = new Set(settings.tenses)
      const matching = all.filter(e => !e.tense || (isTenseId(e.tense) && selected.has(e.tense)))
      if (!matching.length) return null

      return {
        subject,
        examples: matching.slice(0, MAX_EXAMPLES),
        hidden: all.length - matching.length,
        speech: settings.speech,
        locale: source.locale,
        languageName: source.languageName,
        voice: source.voice,
      }
    },
    panel: ExamplesPanel as AnnotationKind<ExamplesPayload>['panel'],
  }
}
