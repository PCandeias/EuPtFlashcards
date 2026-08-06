/**
 * How a verb is used, in whole sentences.
 *
 * Knowing that `ser` means "to be" is not the same as knowing you say
 * "eu sou português". The examples are kept per infinitive rather than per card,
 * so the several cards that teach the same verb all show the same ones.
 */
import ExamplesPanel from '../../components/panels/ExamplesPanel.svelte'
import data from '../../../data/verb-examples.json'
import { verbOf } from '../verbs/detect.js'
import { parseVerb } from '../verbs/conjugate.js'
import type { Card } from '../cards/schema.js'
import type { AnnotationKind } from './types.js'

export interface Example {
  pt: string
  en: string
}

export interface ExamplesPayload {
  infinitive: string
  examples: Example[]
}

const EXAMPLES = data as Record<string, Example[]>

/** Exposed for the tests that check every sentence against the conjugation engine. */
export function examplesFor(infinitive: string): Example[] | null {
  return EXAMPLES[infinitive] ?? null
}

export const examplesKind: AnnotationKind<ExamplesPayload> = {
  id: 'examples',
  marker: '“',
  tone: 'warm',
  describe: (card: Card) => `Example sentences with ${verbOf(card) ?? card.pt}`,
  resolve(card) {
    const infinitive = verbOf(card)
    if (!infinitive) return null

    // A phrase card — "ir para a escola" — takes the head verb's examples.
    const head = parseVerb(infinitive) ? infinitive : infinitive.split(/\s+/)[0]!
    const examples = EXAMPLES[infinitive] ?? EXAMPLES[head]
    if (!examples?.length) return null

    return { infinitive: EXAMPLES[infinitive] ? infinitive : head, examples }
  },
  panel: ExamplesPanel as AnnotationKind<ExamplesPayload>['panel'],
}
