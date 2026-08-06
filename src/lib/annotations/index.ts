/**
 * The annotation registry.
 *
 * Order here is the order the markers appear beside a word. Adding a kind means
 * adding a file and listing it — the card, the panel host and the app all work
 * from this list and know nothing about any particular kind.
 */
import { conjugationKind } from './conjugation.js'
import { examplesKind } from './examples.js'
import type { Card } from '../cards/schema.js'
import type { AnnotationContext, AnnotationKind, ResolvedAnnotation } from './types.js'

export const ANNOTATION_KINDS: readonly AnnotationKind[] = [
  conjugationKind as AnnotationKind,
  examplesKind as AnnotationKind,
]

/** Every kind that has something to say about this card, in registry order. */
export function annotationsFor(card: Card, context: AnnotationContext): ResolvedAnnotation[] {
  const out: ResolvedAnnotation[] = []
  for (const kind of ANNOTATION_KINDS) {
    const payload = kind.resolve(card, context)
    if (payload != null) out.push({ kind, payload })
  }
  return out
}

export type { AnnotationContext, AnnotationKind, ResolvedAnnotation }
