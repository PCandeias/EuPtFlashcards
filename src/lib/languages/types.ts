/**
 * What it takes to be a language in this app.
 *
 * One definition holds everything that differs between Portuguese and Turkish:
 * the corpus, the tenses, how a verb conjugates, which voice reads it aloud, and
 * where its study history is kept. Everything above this file — the study loop,
 * the scheduler, the card, the settings — is written against this interface and
 * knows nothing about either language.
 *
 * Adding a third language means adding a folder and one entry in `index.ts`.
 */
import type { Component } from 'svelte'
import type { Card, Tag } from '../cards/schema.js'
import type { TenseDef, PersonDef } from '../grammar/types.js'
import type { TenseId, PersonId, Conjugation } from '../grammar/tenses.js'
import type { AnnotationKind } from '../annotations/types.js'
import type { ReferenceTable } from '../reference/build.js'
import type { StorageLike } from '../storage/progress.js'
import type { MigrationResult } from '../storage/migrate.js'

export const LANGUAGE_IDS = ['pt', 'tr'] as const
export type LanguageId = (typeof LANGUAGE_IDS)[number]

export interface LanguageDef {
  id: LanguageId
  /** Full name, as the app titles itself. */
  name: string
  /** Short name for running text — "Hear this in Turkish". */
  shortName: string
  /** What the language calls itself, shown on the picker. */
  nativeName: string
  /**
   * The flag, drawn.
   *
   * Not an emoji: Windows ships no flag glyphs and renders 🇵🇹 as the letters PT
   * in two boxes, which is exactly wrong on a screen whose job is to be
   * recognised without reading.
   */
  flag: Component<{ size?: number }>
  /** One line under the title. */
  description: string
  /** BCP 47 tag: the `lang` attribute, and what speech synthesis is asked for. */
  locale: string
  /**
   * Namespace for this language's localStorage keys.
   *
   * Separate namespaces are the whole point: your Turkish progress, your Turkish
   * settings and the Turkish cards you have reported must not follow you into
   * Portuguese. Portuguese keeps `eupt:v4` — the keys it has always written — so
   * an existing user's history survives this change untouched.
   */
  storagePrefix: string

  cards: readonly Card[]
  decks: readonly string[]
  tenses: readonly TenseDef<TenseId>[]
  persons: readonly PersonDef<PersonId>[]
  /** Markers offered beside a word: conjugation, examples, whatever comes next. */
  annotations: readonly AnnotationKind[]
  /** Null for anything the engine cannot answer confidently. */
  conjugate(infinitive: string): Conjugation | null
  /** The infinitive a card is about, or null if it is not a verb card. */
  verbOf(card: Card): string | null
  /** How this language's voice is chosen, and what to say when it is wrong. */
  voice: VoiceSpec
  /**
   * Overrides for badge wording. `plural` means `vocês` in one language and `siz`
   * in the other, and the badge should say so.
   */
  badgeHints?: Partial<Record<Tag, string>>
  /**
   * A regular verb, conjugated in full on the reference page as the pattern the
   * others follow.
   */
  modelVerb?: string
  /**
   * Anything this language has to explain that the shared registries do not
   * cover — Turkish noun endings, Portuguese contractions. Shown first, because
   * it is the part a learner of that language actually looks up.
   */
  reference?: ReferenceTable[]
  /**
   * Carries an earlier version's data forward, if this language has one to carry.
   * Returns what it moved, for the note the app shows once.
   */
  migrate?(storage: StorageLike): MigrationResult | null
}

/**
 * Choosing a voice.
 *
 * `accept` says which voices can read this language at all; `prefer` picks among
 * them when more than one qualifies — Portuguese needs this to keep a Brazilian
 * voice from reading a European deck. `warn` returns the sentence to show when
 * what was found is not what the deck wants, or null when it is fine.
 */
export interface VoiceSpec {
  accept(lang: string): boolean
  prefer?(lang: string): boolean
  /** Shown when no voice for this language is installed at all. */
  missing: string
  /** Shown when a voice was found but is the wrong variant. */
  wrongVariant?(name: string, lang: string): string
}
