/**
 * How a verb conjugates.
 *
 * The kind is built per language from that language's engine, so the marker, the
 * panel and the tense dropdown are shared while the grammar behind them is not.
 * Offered only where the engine can answer confidently, and only for the tenses
 * the user is studying — the same selection that filters the deck.
 */
import ConjugationPanel from '../../components/panels/ConjugationPanel.svelte'
import type { PersonDef, TenseDef } from '../grammar/types.js'
import type { Conjugation, PersonId, TenseId } from '../grammar/tenses.js'
import type { Card } from '../cards/schema.js'
import type { AnnotationKind } from './types.js'

export interface ConjugationPayload {
  infinitive: string
  conjugation: Conjugation
  /** Tenses both switched on and actually present for this verb, in order. */
  tenses: readonly TenseDef<TenseId>[]
  persons: readonly PersonDef<PersonId>[]
}

export interface ConjugationSource {
  tenses: readonly TenseDef<TenseId>[]
  persons: readonly PersonDef<PersonId>[]
  conjugate(infinitive: string): Conjugation | null
  verbOf(card: Card): string | null
}

export function createConjugationKind(source: ConjugationSource): AnnotationKind<ConjugationPayload> {
  return {
    id: 'conjugation',
    marker: '?',
    tone: 'accent',
    describe: (card: Card) => `Conjugate ${source.verbOf(card) ?? card.target}`,
    resolve(card, { settings }) {
      const infinitive = source.verbOf(card)
      if (!infinitive) return null

      const conjugation = source.conjugate(infinitive)
      if (!conjugation) return null

      const tenses = source.tenses.filter(t => settings.tenses.includes(t.id) && conjugation[t.id])
      // Every tense switched off means there is nothing to show, so no marker.
      if (!tenses.length) return null

      return { infinitive, conjugation, tenses, persons: source.persons }
    },
    panel: ConjugationPanel as AnnotationKind<ConjugationPayload>['panel'],
  }
}
