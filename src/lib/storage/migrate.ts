/**
 * Migration from earlier versions of this app.
 *
 * Three schemas exist on this origin:
 *
 *   legacy  ids `deck::<English with metadata words>::pt`, progress {knownCount, nextDue}
 *   v3      ids `deck::<English>::pt`,                     progress {knownCount, nextDue}
 *   v4      same ids,                                      progress = SM-2 ReviewState
 *
 * The steps chain and each is independently flagged, so a user arriving from any
 * version lands in the same place. localStorage is scoped per origin rather than
 * per path, so the app at /EuPtFlashcards/ can read what the loose HTML file wrote.
 *
 * Where a mapping is not certain the entry is dropped rather than guessed —
 * attaching study history to the wrong card is worse than losing one card's.
 */
import { cardId, type Card } from '../cards/schema.js'
import { newState, type ReviewState } from '../study/sm2.js'
import {
  LEGACY_KEYS, V3_KEYS, KEYS, saveProgress, saveSettings, sanitizeSettings,
  loadSettings, type StorageLike,
} from './progress.js'
import { TENSE_IDS } from '../verbs/tenses.js'
import type { Progress } from '../study/scheduler.js'

/** The shape both legacy and v3 stored. */
interface FixedDelayEntry {
  knownCount: number
  nextDue: number | null
}

export interface MigrationResult {
  /** Entries whose id was rewritten from a legacy id. */
  migrated: number
  /** Entries already using the current id scheme. */
  carried: number
  /** Entries matching no current card. */
  dropped: number
  /** Entries whose deck+pt pair matched more than one card, so were left alone. */
  ambiguous: number
  /** True when stored data could not be parsed and was left untouched. */
  failed: boolean
}

function isFixedDelayEntry(value: unknown): value is FixedDelayEntry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.knownCount === 'number'
    && (v.nextDue === null || typeof v.nextDue === 'number')
}

function sanitizeFixedDelay(value: unknown): Record<string, FixedDelayEntry> {
  if (typeof value !== 'object' || value === null) return {}
  const out: Record<string, FixedDelayEntry> = {}
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isFixedDelayEntry(entry)) out[id] = { knownCount: entry.knownCount, nextDue: entry.nextDue }
  }
  return out
}

/** Rewrites legacy ids onto current cards. Shape is unchanged. */
export function remapIds(
  raw: unknown,
  cards: readonly Card[],
): { progress: Record<string, FixedDelayEntry> } & Omit<MigrationResult, 'failed'> {
  const live = new Set(cards.map(cardId))

  // deck::pt -> id, or null when more than one card shares the pair.
  const byDeckPt = new Map<string, string | null>()
  for (const card of cards) {
    const key = `${card.deck}::${card.pt}`
    byDeckPt.set(key, byDeckPt.has(key) ? null : cardId(card))
  }

  const progress: Record<string, FixedDelayEntry> = {}
  let migrated = 0
  let carried = 0
  let dropped = 0
  let ambiguous = 0

  const entries = sanitizeFixedDelay(raw)
  const total = typeof raw === 'object' && raw !== null ? Object.keys(raw).length : 0
  // Entries dropped by the sanitizer were malformed, not merely unmatched.
  dropped += total - Object.keys(entries).length

  for (const [id, value] of Object.entries(entries)) {
    if (live.has(id)) {
      progress[id] = value
      carried++
      continue
    }

    const parts = id.split('::')
    if (parts.length < 3) { dropped++; continue }

    const target = byDeckPt.get(`${parts[0]}::${parts[parts.length - 1]}`)
    if (target === undefined) { dropped++; continue }
    if (target === null) { ambiguous++; continue }
    // Never let a remapped entry overwrite one that already arrived correctly.
    if (progress[target]) { dropped++; continue }

    progress[target] = value
    migrated++
  }

  return { progress, migrated, carried, dropped, ambiguous }
}

/**
 * Seeds SM-2 state from fixed-delay progress.
 *
 * Scheduling starts fresh — the old `knownCount` said how many times a card was
 * marked known, not how well it is retained, so it cannot honestly be turned into
 * an interval. The existing due date is preserved so nothing floods back at once,
 * and the review count is kept for statistics only.
 */
export function seedFromFixedDelay(
  entries: Record<string, FixedDelayEntry>,
): Record<string, ReviewState> {
  const out: Record<string, ReviewState> = {}
  for (const [id, entry] of Object.entries(entries)) {
    out[id] = { ...newState(entry.nextDue), reviews: Math.max(0, entry.knownCount) }
  }
  return out
}

function readRaw(storage: StorageLike, key: string): { value: unknown; failed: boolean } {
  const raw = storage.getItem(key)
  if (raw == null) return { value: undefined, failed: false }
  try {
    return { value: JSON.parse(raw), failed: false }
  } catch {
    return { value: undefined, failed: true }
  }
}

/**
 * Runs every outstanding migration step. Returns null when there was nothing to
 * do, so the caller can tell "upgraded" from "already current".
 *
 * Earlier keys are never cleared — they are the backstop if this goes wrong.
 */
export function runMigration(storage: StorageLike, cards: readonly Card[]): MigrationResult | null {
  if (storage.getItem(KEYS.migrated)) return null

  const legacy = readRaw(storage, LEGACY_KEYS.progress)
  const v3 = readRaw(storage, V3_KEYS.progress)

  const hasLegacy = storage.getItem(LEGACY_KEYS.progress) != null
    || storage.getItem(LEGACY_KEYS.deck) != null
    || storage.getItem(LEGACY_KEYS.direction) != null
  const hasV3 = storage.getItem(V3_KEYS.progress) != null

  if (!hasLegacy && !hasV3) {
    // Nothing to carry forward, but stamp the flag so this never runs again.
    storage.setItem(KEYS.migrated, new Date().toISOString())
    return null
  }

  // v3 is nearer, so it wins where both exist.
  const source = hasV3 ? v3 : legacy
  const result: MigrationResult = {
    migrated: 0, carried: 0, dropped: 0, ambiguous: 0, failed: source.failed,
  }

  if (!source.failed) {
    const remapped = remapIds(source.value, cards)
    result.migrated = remapped.migrated
    result.carried = remapped.carried
    result.dropped = remapped.dropped
    result.ambiguous = remapped.ambiguous
    saveProgress(storage, seedFromFixedDelay(remapped.progress) as Progress)
  }

  saveSettings(storage, sanitizeSettings({
    deck: storage.getItem(LEGACY_KEYS.deck) ?? undefined,
    direction: storage.getItem(LEGACY_KEYS.direction) ?? undefined,
  }))

  storage.setItem(KEYS.migrated, new Date().toISOString())
  return result
}

/**
 * Widens a tense selection made when the setting meant something narrower.
 *
 * It used to control only which tenses the conjugation panel offered. Now it also
 * decides which cards appear, so a selection of two tenses — the old default —
 * would quietly remove every card in the others. Runs once.
 */
export function migrateTenseScope(storage: StorageLike): boolean {
  if (storage.getItem(KEYS.tenseScope)) return false
  storage.setItem(KEYS.tenseScope, new Date().toISOString())

  // Nothing stored yet means a new user, who already gets the full default.
  if (storage.getItem(KEYS.settings) == null) return false

  const settings = loadSettings(storage)
  if (settings.tenses.length === TENSE_IDS.length) return false

  saveSettings(storage, { ...settings, tenses: [...TENSE_IDS] })
  return true
}
