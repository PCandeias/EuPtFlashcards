/**
 * How a verb conjugates.
 *
 * Offered only where the engine can answer confidently, and only for the tenses
 * the user is studying — the same selection that filters the deck.
 */
import ConjugationPanel from '../../components/panels/ConjugationPanel.svelte'
import { conjugatePhrase } from '../verbs/conjugate.js'
import { TENSES, type Conjugation, type TenseId } from '../verbs/tenses.js'
import { verbOf } from '../verbs/detect.js'
import type { Card } from '../cards/schema.js'
import type { AnnotationKind } from './types.js'

export interface ConjugationPayload {
  infinitive: string
  conjugation: Conjugation
  /** Tenses both switched on and actually present for this verb. */
  tenses: TenseId[]
}

export const conjugationKind: AnnotationKind<ConjugationPayload> = {
  id: 'conjugation',
  marker: '?',
  tone: 'accent',
  describe: (card: Card) => `Conjugate ${verbOf(card) ?? card.pt}`,
  resolve(card, { settings }) {
    const infinitive = verbOf(card)
    if (!infinitive) return null

    const conjugation = conjugatePhrase(infinitive)
    if (!conjugation) return null

    const tenses = TENSES
      .filter(t => settings.tenses.includes(t.id) && conjugation[t.id])
      .map(t => t.id)
    // Every tense switched off means there is nothing to show, so no marker.
    if (!tenses.length) return null

    return { infinitive, conjugation, tenses }
  },
  panel: ConjugationPanel as AnnotationKind<ConjugationPayload>['panel'],
}
