/**
 * How a word is used, in whole sentences.
 *
 * Knowing that `ser` means "to be" is not the same as knowing you say
 * "eu sou português". Verbs are keyed by infinitive so the several cards teaching
 * the same verb share one set; everything else is keyed by the Portuguese as the
 * card writes it.
 *
 * Every sentence records the tense it is in and is filtered by the tense
 * selection, like the cards themselves. Coverage is deliberately wide enough that
 * filtering leaves something to show: there is at least one sentence per verb per
 * tense, so the panel does not empty out just because you narrowed your study.
 */
import ExamplesPanel from '../../components/panels/ExamplesPanel.svelte'
import verbData from '../../../data/verb-examples.json'
import wordData from '../../../data/word-examples.json'
import { verbOf } from '../verbs/detect.js'
import { parseVerb } from '../verbs/conjugate.js'
import { isTenseId, type TenseId } from '../verbs/tenses.js'
import type { Card } from '../cards/schema.js'
import type { AnnotationKind } from './types.js'

export interface Example {
  pt: string
  en: string
  tense: TenseId
}

export interface ExamplesPayload {
  /** The word these illustrate — the infinitive for a verb, else the card's own. */
  subject: string
  examples: Example[]
  /** How many were left out because their tense is not selected. */
  hidden: number
}

/** Shown at once. More than a few stops being an example and becomes a list. */
export const MAX_EXAMPLES = 3

const VERBS = verbData as Record<string, Example[]>
const WORDS = wordData as Record<string, Example[]>

/** The whole set for a word, before any filtering. Used by the tests. */
export function examplesFor(subject: string): Example[] | null {
  return VERBS[subject] ?? WORDS[subject] ?? null
}

/** Which entry a card draws on, if any. */
export function subjectOf(card: Card): string | null {
  const infinitive = verbOf(card)
  if (infinitive) {
    if (VERBS[infinitive]) return infinitive
    // A phrase card — "ir para a escola" — borrows its head verb's examples.
    const head = parseVerb(infinitive) ? infinitive : infinitive.split(/\s+/)[0]!
    if (VERBS[head]) return head
  }
  return WORDS[card.pt] ? card.pt : null
}

export const examplesKind: AnnotationKind<ExamplesPayload> = {
  id: 'examples',
  marker: '“',
  tone: 'warm',
  describe: (card: Card) => `Example sentences with ${subjectOf(card) ?? card.pt}`,
  resolve(card, { settings }) {
    const subject = subjectOf(card)
    if (!subject) return null

    const all = examplesFor(subject) ?? []
    const selected = new Set(settings.tenses)
    const matching = all.filter(e => isTenseId(e.tense) && selected.has(e.tense))
    if (!matching.length) return null

    return {
      subject,
      examples: matching.slice(0, MAX_EXAMPLES),
      hidden: all.length - matching.length,
    }
  },
  panel: ExamplesPanel as AnnotationKind<ExamplesPayload>['panel'],
}
