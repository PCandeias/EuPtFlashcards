/**
 * What a word looks like with each ending on it.
 *
 * Turkish is where this earns its place: the endings are the grammar, and the
 * same one is spelled four ways depending on the word it lands on. Seeing `ev`
 * and `okul` side by side as `evde` and `okulda` teaches vowel harmony faster
 * than any rule does.
 *
 * The kind is built from a language's own suffix table, so nothing here is
 * Turkish-specific — a language that has no such table simply never offers the
 * marker.
 */
import SuffixPanel from '../../components/panels/SuffixPanel.svelte'
import type { Card } from '../cards/schema.js'
import type { AnnotationKind } from './types.js'

export interface SuffixRow {
  id: string
  label: string
  shape: string
  gloss: string
  form: string
}

export interface SuffixPayload {
  word: string
  rows: SuffixRow[]
  /** One line naming the harmony the learner is looking at. */
  harmony: string
}

export interface SuffixSource {
  /** The endings for this word, or null where the language will not answer. */
  table(word: string): SuffixRow[] | null
  /** The word a card is about, if the card is about one word. */
  wordOf(card: Card): string | null
  /** Explains, for this word, which way the vowels went. */
  describeHarmony(word: string): string
}

export function createSuffixKind(source: SuffixSource): AnnotationKind<SuffixPayload> {
  return {
    id: 'suffixes',
    marker: '+',
    tone: 'accent',
    describe: (card: Card) => `Endings on ${source.wordOf(card) ?? card.target}`,
    resolve(card) {
      const word = source.wordOf(card)
      if (!word) return null
      const rows = source.table(word)
      if (!rows?.length) return null
      return { word, rows, harmony: source.describeHarmony(word) }
    },
    panel: SuffixPanel as AnnotationKind<SuffixPayload>['panel'],
  }
}
