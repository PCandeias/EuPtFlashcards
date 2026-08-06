/**
 * Persistence.
 *
 * Storage is injected rather than reaching for `localStorage` directly, so every
 * branch here is testable without a browser — which matters, because this is the
 * module that can destroy real study history.
 *
 * Reads are defensive: anything unparseable falls back to a default and the
 * stored value is left alone so it stays recoverable.
 */
import type { Progress } from '../study/scheduler.js'
import type { ReviewState } from '../study/sm2.js'
import { sanitizeHistory, type History } from '../study/history.js'
import { isTenseId, type TenseId } from '../grammar/tenses.js'
import type { LanguageDef } from '../languages/types.js'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Written by the single-file app. Read during migration, never written again. */
export const LEGACY_KEYS = {
  progress: 'pt_standalone_progress',
  deck: 'pt_standalone_deck',
  direction: 'pt_standalone_direction',
  delay: 'pt_standalone_delay',
} as const

/** The fixed-delay schema, superseded by SM-2. Read during migration only. */
export const V3_KEYS = {
  progress: 'eupt:v3:progress',
  migrated: 'eupt:v3:migrated',
} as const

export interface Keys {
  progress: string
  settings: string
  history: string
  reported: string
  migrated: string
  /**
   * Stamped once the tense selection has been widened. The setting used to
   * choose only what the conjugation panel offered; now it also decides which
   * cards appear, so an old selection would hide cards the user never chose to
   * hide.
   */
  tenseScope: string
}

/**
 * Where one language keeps its data.
 *
 * Every key is namespaced, so studying Turkish cannot show you the Portuguese
 * cards you reported, reset your Portuguese deck, or count towards your
 * Portuguese streak. Portuguese keeps the `eupt:v4` prefix it has always written.
 */
export function keysFor(prefix: string): Keys {
  return {
    progress: `${prefix}:progress`,
    settings: `${prefix}:settings`,
    history: `${prefix}:history`,
    reported: `${prefix}:reported`,
    migrated: `${prefix}:migrated`,
    tenseScope: `${prefix}:tense-scope`,
  }
}

/** Portuguese, which is the only language with anything to migrate. */
export const KEYS = keysFor('eupt:v4')

export type Direction = 'a-b' | 'b-a'

/**
 * Two complete palettes rather than a light/dark pair: Slate is the original cool
 * dark, Azulejo is deep tile blue on cream. Chosen explicitly, because they are
 * different looks rather than two renderings of one.
 */
export const THEMES = ['slate', 'azulejo'] as const
export type Theme = (typeof THEMES)[number]

export const THEME_LABELS: Record<Theme, string> = {
  slate: 'Slate',
  azulejo: 'Azulejo',
}

export interface Settings {
  deck: string
  direction: Direction
  theme: Theme
  /** Tenses offered in the conjugation panel. Empty means the panel is off. */
  tenses: TenseId[]
  /** Whether to offer spoken pronunciation at all. Off hides every speaker. */
  speech: boolean
}

/**
 * Defaults for one language.
 *
 * Every tense is on: the list also decides which cards appear, so anything less
 * would hide part of the deck before the user had asked for that.
 */
export function defaultSettings(language: Pick<LanguageDef, 'tenses'>): Settings {
  return {
    deck: 'All',
    direction: 'a-b',
    theme: 'slate',
    tenses: language.tenses.map(t => t.id),
    speech: true,
  }
}

function readJson(storage: StorageLike, key: string): unknown {
  const raw = storage.getItem(key)
  if (raw == null) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    // Deliberately not removed: a parse failure must stay recoverable by hand.
    return undefined
  }
}

function isReviewState(value: unknown): value is ReviewState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.ease === 'number'
    && typeof v.interval === 'number'
    && typeof v.reps === 'number'
    && typeof v.lapses === 'number'
    && typeof v.reviews === 'number'
    && (v.due === null || typeof v.due === 'number')
}

export function sanitizeProgress(value: unknown): Progress {
  if (typeof value !== 'object' || value === null) return {}
  const out: Progress = {}
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isReviewState(entry)) {
      out[id] = {
        ease: entry.ease,
        interval: entry.interval,
        reps: entry.reps,
        lapses: entry.lapses,
        due: entry.due,
        reviews: entry.reviews,
      }
    }
  }
  return out
}

export function loadProgress(storage: StorageLike, keys: Keys): Progress {
  return sanitizeProgress(readJson(storage, keys.progress))
}

export function saveProgress(storage: StorageLike, keys: Keys, progress: Progress): void {
  storage.setItem(keys.progress, JSON.stringify(progress))
}

/** The language a stored setting is read against: its tenses, and its order. */
export type SettingsScope = Pick<LanguageDef, 'tenses'>

export function sanitizeSettings(value: unknown, language: SettingsScope): Settings {
  const defaults = defaultSettings(language)
  if (typeof value !== 'object' || value === null) return defaults
  const order = language.tenses.map(t => t.id)
  const v = value as Record<string, unknown>
  return {
    deck: typeof v.deck === 'string' && v.deck ? v.deck : defaults.deck,
    direction: v.direction === 'a-b' || v.direction === 'b-a'
      ? v.direction
      : defaults.direction,
    theme: THEMES.includes(v.theme as Theme) ? (v.theme as Theme) : defaults.theme,
    // Unknown ids are dropped rather than rejected wholesale, so a stored setting
    // survives a tense being renamed or removed — and a tense belonging to another
    // language cannot leak in through a hand-edited or restored file. An empty
    // list is legitimate: it turns the panel off.
    tenses: Array.isArray(v.tenses)
      ? [...new Set(v.tenses.filter(isTenseId).filter(t => order.includes(t)))]
          .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      : [...defaults.tenses],
    speech: typeof v.speech === 'boolean' ? v.speech : defaults.speech,
  }
}

export function loadSettings(
  storage: StorageLike, keys: Keys, language: SettingsScope,
): Settings {
  return sanitizeSettings(readJson(storage, keys.settings), language)
}

export function saveSettings(
  storage: StorageLike, keys: Keys, language: SettingsScope, settings: Settings,
): void {
  storage.setItem(keys.settings, JSON.stringify(sanitizeSettings(settings, language)))
}

export function loadHistory(storage: StorageLike, keys: Keys): History {
  return sanitizeHistory(readJson(storage, keys.history))
}

export function saveHistory(storage: StorageLike, keys: Keys, history: History): void {
  storage.setItem(keys.history, JSON.stringify(history))
}
