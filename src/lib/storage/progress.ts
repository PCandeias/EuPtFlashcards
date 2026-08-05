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
import type { Progress, CardProgress } from '../study/scheduler.js'

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

export const KEYS = {
  progress: 'eupt:v3:progress',
  settings: 'eupt:v3:settings',
  migrated: 'eupt:v3:migrated',
} as const

export type Direction = 'a-b' | 'b-a'

export interface Settings {
  deck: string
  direction: Direction
  delayDays: number
}

export const DELAY_OPTIONS = [1, 3, 7, 14, 30] as const

export const DEFAULT_SETTINGS: Settings = { deck: 'All', direction: 'a-b', delayDays: 3 }

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

function isCardProgress(value: unknown): value is CardProgress {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.knownCount === 'number'
    && (v.nextDue === null || typeof v.nextDue === 'number')
}

export function sanitizeProgress(value: unknown): Progress {
  if (typeof value !== 'object' || value === null) return {}
  const out: Progress = {}
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isCardProgress(entry)) out[id] = { knownCount: entry.knownCount, nextDue: entry.nextDue }
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
  const delay = typeof v.delayDays === 'number' && (DELAY_OPTIONS as readonly number[]).includes(v.delayDays)
    ? v.delayDays
    : DEFAULT_SETTINGS.delayDays
  return {
    deck: typeof v.deck === 'string' && v.deck ? v.deck : DEFAULT_SETTINGS.deck,
    direction: v.direction === 'a-b' || v.direction === 'b-a' ? v.direction : DEFAULT_SETTINGS.direction,
    delayDays: delay,
  }
}

export function loadSettings(storage: StorageLike): Settings {
  return sanitizeSettings(readJson(storage, KEYS.settings))
}

export function saveSettings(storage: StorageLike, settings: Settings): void {
  storage.setItem(KEYS.settings, JSON.stringify(sanitizeSettings(settings)))
}
