/**
 * Resolving a card's annotations.
 *
 * Which kinds exist is a property of the language, not of the app: Portuguese
 * offers conjugation and examples, another language may offer neither or more.
 * This module only asks each of them what it has to say, in the order the
 * language lists them — which is the order the markers appear beside the word.
 */
import type { Card } from '../cards/schema.js'
import type { AnnotationContext, AnnotationKind, ResolvedAnnotation } from './types.js'

/** Every kind that has something to say about this card, in registry order. */
export function annotationsFor(
  card: Card,
  kinds: readonly AnnotationKind[],
  context: AnnotationContext,
): ResolvedAnnotation[] {
  const out: ResolvedAnnotation[] = []
  for (const kind of kinds) {
    const payload = kind.resolve(card, context)
    if (payload != null) out.push({ kind, payload })
  }
  return out
}

export type { AnnotationContext, AnnotationKind, ResolvedAnnotation }
