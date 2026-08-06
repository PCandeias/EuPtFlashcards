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

export const KEYS = {
  progress: 'eupt:v4:progress',
  settings: 'eupt:v4:settings',
  history: 'eupt:v4:history',
  migrated: 'eupt:v4:migrated',
} as const

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
}

export const DEFAULT_SETTINGS: Settings = { deck: 'All', direction: 'a-b', theme: 'slate' }

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

export function loadProgress(storage: StorageLike): Progress {
  return sanitizeProgress(readJson(storage, KEYS.progress))
}

export function saveProgress(storage: StorageLike, progress: Progress): void {
  storage.setItem(KEYS.progress, JSON.stringify(progress))
}

export function sanitizeSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null) return { ...DEFAULT_SETTINGS }
  const v = value as Record<string, unknown>
  return {
    deck: typeof v.deck === 'string' && v.deck ? v.deck : DEFAULT_SETTINGS.deck,
    direction: v.direction === 'a-b' || v.direction === 'b-a'
      ? v.direction
      : DEFAULT_SETTINGS.direction,
    theme: THEMES.includes(v.theme as Theme) ? (v.theme as Theme) : DEFAULT_SETTINGS.theme,
  }
}

export function loadSettings(storage: StorageLike): Settings {
  return sanitizeSettings(readJson(storage, KEYS.settings))
}

export function saveSettings(storage: StorageLike, settings: Settings): void {
  storage.setItem(KEYS.settings, JSON.stringify(sanitizeSettings(settings)))
}

export function loadHistory(storage: StorageLike): History {
  return sanitizeHistory(readJson(storage, KEYS.history))
}

export function saveHistory(storage: StorageLike, history: History): void {
  storage.setItem(KEYS.history, JSON.stringify(history))
}
