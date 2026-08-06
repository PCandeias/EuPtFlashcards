/**
 * The shapes a language's grammar is described in.
 *
 * Deliberately thin. A language supplies tables of tenses and persons and a
 * function that conjugates a verb; everything above this file — the card model,
 * the settings, the conjugation panel — works from those tables and never from
 * knowledge of any particular language.
 *
 * Conjugation data is partial throughout, in both directions: a language need not
 * offer every tense, a verb need not have forms for a tense it is offered, and a
 * tense need not have every person. Nothing breaks when a form is missing; the
 * panel simply has less to show.
 */

export interface TenseDef<Id extends string = string> {
  id: Id
  /** As a grammar book for this language would name it. */
  label: string
  /** What it is for, in plain English — this is a learning tool. */
  hint: string
  example: string
}

export interface PersonDef<Id extends string = string> {
  id: Id
  label: string
}

export type Forms<P extends string = string> = Partial<Record<P, string>>

export type Conjugation<T extends string = string, P extends string = string> =
  Partial<Record<T, Forms<P>>>

/**
 * A language's verb engine.
 *
 * `conjugate` returns null for anything it cannot answer confidently — an unknown
 * irregular, a word that is not a verb. Guessing would put a wrong table in front
 * of a learner, which is worse than putting up no table at all.
 */
export interface Conjugator<T extends string = string, P extends string = string> {
  conjugate(infinitive: string): Conjugation<T, P> | null
}
