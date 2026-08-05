/**
 * One-time migration from the single-file app.
 *
 * Two earlier id schemes exist on this origin:
 *
 *   v1  `deck::<English with metadata words>::pt`   e.g. "Class::you plural come::vocês vêm"
 *   v2  `deck::<English>::pt`                       e.g. "Class::you come::vocês vêm"
 *
 * v2 ids are already correct. v1 ids are remapped by `deck::pt`, which the badge
 * work left untouched. localStorage is scoped per origin rather than per path, so
 * the app at /EuPtFlashcards/ can read what the loose HTML file wrote.
 *
 * Where the mapping is not certain, the entry is dropped rather than guessed —
 * attaching study history to the wrong card is worse than losing one card's.
 */
import { cardId, type Card } from '../cards/schema.js'
import { sanitizeProgress, LEGACY_KEYS, KEYS, saveProgress, saveSettings, sanitizeSettings, type StorageLike } from './progress.js'
import type { Progress } from '../study/scheduler.js'

export interface MigrationResult {
  progress: Progress
  /** Entries whose id was rewritten from a v1 id. */
  migrated: number
  /** Entries already using the current id scheme. */
  carried: number
  /** Entries matching no current card. */
  dropped: number
  /** Entries whose deck+pt pair matched more than one card, so were left alone. */
  ambiguous: number
  /** True when the legacy value could not be parsed and was left untouched. */
  failed: boolean
}

export function migrateLegacy(raw: unknown, cards: readonly Card[]): MigrationResult {
  const live = new Set(cards.map(cardId))

  // deck::pt -> id, or null when more than one card shares the pair.
  const byDeckPt = new Map<string, string | null>()
  for (const card of cards) {
    const key = `${card.deck}::${card.pt}`
    byDeckPt.set(key, byDeckPt.has(key) ? null : cardId(card))
  }

  const result: MigrationResult = {
    progress: {}, migrated: 0, carried: 0, dropped: 0, ambiguous: 0, failed: false,
  }

  const entries = sanitizeProgress(raw)
  const total = typeof raw === 'object' && raw !== null ? Object.keys(raw).length : 0
  // Entries dropped by sanitizeProgress were malformed, not merely unmatched.
  result.dropped += total - Object.keys(entries).length

  for (const [id, value] of Object.entries(entries)) {
    if (live.has(id)) {
      result.progress[id] = value
      result.carried++
      continue
    }

    const parts = id.split('::')
    if (parts.length < 3) { result.dropped++; continue }

    const target = byDeckPt.get(`${parts[0]}::${parts[parts.length - 1]}`)
    if (target === undefined) { result.dropped++; continue }
    if (target === null) { result.ambiguous++; continue }
    // Never let a remapped entry overwrite one that already arrived correctly.
    if (result.progress[target]) { result.dropped++; continue }

    result.progress[target] = value
    result.migrated++
  }

  return result
}

/**
 * Runs the migration once. Returns null when there is nothing to do, so the
 * caller can tell "migrated" from "already current".
 *
 * The legacy keys are never cleared — they are the backstop if this goes wrong.
 */
export function runMigration(storage: StorageLike, cards: readonly Card[]): MigrationResult | null {
  if (storage.getItem(KEYS.migrated)) return null

  const rawProgress = storage.getItem(LEGACY_KEYS.progress)
  const rawDeck = storage.getItem(LEGACY_KEYS.deck)
  const rawDirection = storage.getItem(LEGACY_KEYS.direction)
  const rawDelay = storage.getItem(LEGACY_KEYS.delay)

  if (rawProgress == null && rawDeck == null && rawDirection == null && rawDelay == null) {
    return null
  }

  let parsed: unknown
  let failed = false
  if (rawProgress != null) {
    try {
      parsed = JSON.parse(rawProgress)
    } catch {
      failed = true
    }
  }

  const result = failed
    ? { progress: {}, migrated: 0, carried: 0, dropped: 0, ambiguous: 0, failed: true }
    : { ...migrateLegacy(parsed, cards), failed: false }

  // On failure nothing is written to the progress key either, so a later manual
  // recovery is not competing with an empty record.
  if (!failed) saveProgress(storage, result.progress)

  saveSettings(storage, sanitizeSettings({
    deck: rawDeck ?? undefined,
    direction: rawDirection ?? undefined,
    delayDays: rawDelay != null ? Number(rawDelay) : undefined,
  }))

  storage.setItem(KEYS.migrated, new Date().toISOString())
  return result
}
