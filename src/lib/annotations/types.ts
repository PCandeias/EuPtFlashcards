/**
 * Card annotations.
 *
 * An annotation is an extra thing a card can say about itself, offered behind a
 * small marker beside the word rather than crowding the card: how a verb
 * conjugates, how it is used in a sentence, and whatever comes next.
 *
 * A kind supplies four things — a marker, a way to decide whether a given card
 * has anything to say, the payload, and a component to render it. Nothing else in
 * the app knows the difference between one kind and another, so adding a kind
 * means adding a file and listing it, not touching the card or the app.
 */
import type { Component } from 'svelte'
import type { Card } from '../cards/schema.js'
import type { Settings } from '../storage/progress.js'

export interface AnnotationContext {
  settings: Settings
}

export interface AnnotationKind<Payload = unknown> {
  /** Stable id: used in the DOM, and to remember which panel is open. */
  id: string
  /** The glyph in the marker. One or two characters, or a short word. */
  marker: string
  /** Colour family, matching a class in the marker's stylesheet. */
  tone: 'accent' | 'warm'
  /**
   * Tooltip and accessible label. Takes the card so it can name the subject —
   * "Conjugate dormir" beats "Show conjugation".
   */
  describe(card: Card): string
  /**
   * What this kind has to say about the card, or null for nothing — in which case
   * no marker appears. This is also where a kind honours settings.
   */
  resolve(card: Card, context: AnnotationContext): Payload | null
  /** Renders the payload. Receives `card`, `payload` and `onclose`. */
  panel: Component<{ card: Card; payload: never; onclose: () => void }>
}

/** A kind paired with the payload it produced for one particular card. */
export interface ResolvedAnnotation {
  kind: AnnotationKind
  payload: unknown
}
