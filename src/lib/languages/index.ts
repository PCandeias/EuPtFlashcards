/**
 * The language registry.
 *
 * The order here is the order the picker shows them in. Adding a language means
 * adding a folder and one entry below; nothing else in the app has a list of
 * languages in it.
 */
import { portuguese } from './pt/index.js'
import { turkish } from './tr/index.js'
import { LANGUAGE_IDS, type LanguageDef, type LanguageId } from './types.js'

export const LANGUAGES: readonly LanguageDef[] = [portuguese, turkish]

const BY_ID = new Map(LANGUAGES.map(l => [l.id, l]))

export function languageById(id: string): LanguageDef | undefined {
  return BY_ID.get(id as LanguageId)
}

export function isLanguageId(value: unknown): value is LanguageId {
  return typeof value === 'string' && BY_ID.has(value as LanguageId)
}

export { LANGUAGE_IDS }
export type { LanguageDef, LanguageId }
