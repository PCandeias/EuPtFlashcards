import { describe, it, expect, beforeEach } from 'vitest'
import {
  LEGACY_KEYS, V3_KEYS, KEYS, loadProgress, saveProgress, loadSettings, saveSettings,
  DEFAULT_SETTINGS, type StorageLike,
} from '../src/lib/storage/progress.js'
import { remapIds, seedFromFixedDelay, runMigration } from '../src/lib/storage/migrate.js'
import { buildBackup, parseBackup, mergeProgress } from '../src/lib/storage/backup.js'
import { newState } from '../src/lib/study/sm2.js'
import type { Card } from '../src/lib/cards/schema.js'
import type { Progress } from '../src/lib/study/scheduler.js'

class FakeStorage implements StorageLike {
  map = new Map<string, string>()
  getItem(k: string) { return this.map.get(k) ?? null }
  setItem(k: string, v: string) { this.map.set(k, v) }
  removeItem(k: string) { this.map.delete(k) }
}

// Mirrors the real corpus closely enough to exercise every migration branch,
// including the duplicate deck+pt pair that must never be guessed at.
const CARDS: Card[] = [
  { deck: 'Class', en: 'you come', pt: 'vocês vêm', tags: ['plural'] },
  { deck: 'Class', en: 'you come', pt: 'tu vens', tags: ['informal'] },
  { deck: 'Class', en: 'friend', pt: 'o amigo', tags: ['masc'] },
  { deck: 'Greetings', en: 'hello', pt: 'olá' },
  { deck: 'Class', en: 'they', pt: 'eles', tags: ['masc-mixed'] },
  { deck: 'Class', en: 'they masculine', pt: 'eles' },
]

let store: FakeStorage
beforeEach(() => { store = new FakeStorage() })

describe('remapIds', () => {
  it('rewrites an id whose English still contained metadata', () => {
    const r = remapIds({ 'Class::you plural come::vocês vêm': { knownCount: 3, nextDue: 1 } }, CARDS)
    expect(r.progress['Class::you come::vocês vêm']).toEqual({ knownCount: 3, nextDue: 1 })
    expect(r.migrated).toBe(1)
  })

  it('carries a current id through untouched', () => {
    const r = remapIds({ 'Greetings::hello::olá': { knownCount: 9, nextDue: null } }, CARDS)
    expect(r.carried).toBe(1)
    expect(r.migrated).toBe(0)
  })

  it('drops a key matching no card rather than inventing one', () => {
    const r = remapIds({ 'Class::ghost::não existe': { knownCount: 5, nextDue: 1 } }, CARDS)
    expect(r.progress).toEqual({})
    expect(r.dropped).toBe(1)
  })

  // Guessing here would silently attach study history to the wrong card.
  it('skips an ambiguous deck+pt pair instead of guessing', () => {
    const r = remapIds({ 'Class::they whatever::eles': { knownCount: 4, nextDue: 1 } }, CARDS)
    expect(r.progress).toEqual({})
    expect(r.ambiguous).toBe(1)
  })

  it('does not let a remapped id clobber an existing one', () => {
    const r = remapIds({
      'Class::you come::vocês vêm': { knownCount: 10, nextDue: 99 },
      'Class::you plural come::vocês vêm': { knownCount: 1, nextDue: 1 },
    }, CARDS)
    expect(r.progress['Class::you come::vocês vêm']!.knownCount).toBe(10)
  })

  it('ignores entries that are not shaped like progress', () => {
    const r = remapIds({ 'Greetings::hello::olá': 'nonsense' as unknown }, CARDS)
    expect(r.progress).toEqual({})
    expect(r.dropped).toBe(1)
  })
})

describe('seedFromFixedDelay', () => {
  // knownCount counted taps on a button, not retention, so it cannot honestly
  // become an interval. Scheduling starts fresh.
  it('starts every card fresh in SM-2 terms', () => {
    const seeded = seedFromFixedDelay({ 'a': { knownCount: 7, nextDue: 123 } })
    expect(seeded['a']!.reps).toBe(0)
    expect(seeded['a']!.interval).toBe(0)
    expect(seeded['a']!.ease).toBe(2.5)
  })

  it('preserves the due date so nothing floods back at once', () => {
    expect(seedFromFixedDelay({ 'a': { knownCount: 1, nextDue: 123 } })['a']!.due).toBe(123)
    expect(seedFromFixedDelay({ 'a': { knownCount: 1, nextDue: null } })['a']!.due).toBeNull()
  })

  it('keeps the review count for statistics', () => {
    expect(seedFromFixedDelay({ 'a': { knownCount: 7, nextDue: null } })['a']!.reviews).toBe(7)
  })
})

describe('runMigration', () => {
  it('migrates legacy progress into SM-2 state', () => {
    store.setItem(LEGACY_KEYS.progress, JSON.stringify({
      'Class::you plural come::vocês vêm': { knownCount: 3, nextDue: 1 },
    }))
    const result = runMigration(store, CARDS)
    expect(result?.migrated).toBe(1)
    const migrated = loadProgress(store)['Class::you come::vocês vêm']
    expect(migrated).toMatchObject({ reps: 0, ease: 2.5, due: 1, reviews: 3 })
  })

  it('migrates v3 progress into SM-2 state', () => {
    store.setItem(V3_KEYS.progress, JSON.stringify({
      'Greetings::hello::olá': { knownCount: 9, nextDue: 42 },
    }))
    const result = runMigration(store, CARDS)
    expect(result?.carried).toBe(1)
    expect(loadProgress(store)['Greetings::hello::olá']).toMatchObject({ due: 42, reviews: 9 })
  })

  it('prefers v3 over legacy when both exist', () => {
    store.setItem(LEGACY_KEYS.progress, JSON.stringify({
      'Greetings::hello::olá': { knownCount: 1, nextDue: 1 },
    }))
    store.setItem(V3_KEYS.progress, JSON.stringify({
      'Greetings::hello::olá': { knownCount: 99, nextDue: 2 },
    }))
    runMigration(store, CARDS)
    expect(loadProgress(store)['Greetings::hello::olá']!.reviews).toBe(99)
  })

  it('runs only once', () => {
    store.setItem(LEGACY_KEYS.progress, JSON.stringify({
      'Greetings::hello::olá': { knownCount: 9, nextDue: null },
    }))
    expect(runMigration(store, CARDS)).not.toBeNull()
    expect(runMigration(store, CARDS)).toBeNull()
  })

  it('is idempotent — a second run cannot change the result', () => {
    store.setItem(LEGACY_KEYS.progress, JSON.stringify({
      'Class::you plural come::vocês vêm': { knownCount: 3, nextDue: 1 },
    }))
    runMigration(store, CARDS)
    const first = store.getItem(KEYS.progress)
    runMigration(store, CARDS)
    expect(store.getItem(KEYS.progress)).toBe(first)
  })

  // Losing months of study history to a parse error would be unforgivable.
  it('preserves unreadable data instead of destroying it', () => {
    store.setItem(LEGACY_KEYS.progress, '{ this is not json')
    const result = runMigration(store, CARDS)
    expect(result?.failed).toBe(true)
    expect(store.getItem(LEGACY_KEYS.progress)).toBe('{ this is not json')
    expect(store.getItem(KEYS.progress)).toBeNull()
  })

  it('leaves the earlier keys intact after a successful migration', () => {
    const raw = JSON.stringify({ 'Greetings::hello::olá': { knownCount: 9, nextDue: null } })
    store.setItem(LEGACY_KEYS.progress, raw)
    runMigration(store, CARDS)
    expect(store.getItem(LEGACY_KEYS.progress)).toBe(raw)
  })

  it('carries legacy settings across', () => {
    store.setItem(LEGACY_KEYS.deck, 'Class')
    store.setItem(LEGACY_KEYS.direction, 'b-a')
    runMigration(store, CARDS)
    expect(loadSettings(store)).toEqual({ deck: 'Class', direction: 'b-a' })
  })

  it('stamps the flag even with nothing to migrate, so it never reruns', () => {
    expect(runMigration(store, CARDS)).toBeNull()
    expect(store.getItem(KEYS.migrated)).toBeTruthy()
  })
})

describe('loadProgress', () => {
  it('returns empty progress when nothing is stored', () => {
    expect(loadProgress(store)).toEqual({})
  })

  it('falls back to empty on corrupt data without erasing it', () => {
    store.setItem(KEYS.progress, 'not json')
    expect(loadProgress(store)).toEqual({})
    expect(store.getItem(KEYS.progress)).toBe('not json')
  })

  it('rejects entries that are not review states', () => {
    store.setItem(KEYS.progress, JSON.stringify({ a: { knownCount: 2, nextDue: 1 } }))
    expect(loadProgress(store)).toEqual({})
  })

  it('round-trips through save', () => {
    const p: Progress = { 'D::a::b': { ...newState(), interval: 6, reps: 2, reviews: 3 } }
    saveProgress(store, p)
    expect(loadProgress(store)).toEqual(p)
  })
})

describe('settings', () => {
  it('defaults when absent', () => {
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS)
  })

  it('rejects an unknown direction', () => {
    store.setItem(KEYS.settings, JSON.stringify({ deck: 'All', direction: 'sideways' }))
    expect(loadSettings(store).direction).toBe(DEFAULT_SETTINGS.direction)
  })

  it('round-trips', () => {
    saveSettings(store, { deck: 'Numbers', direction: 'b-a' })
    expect(loadSettings(store)).toEqual({ deck: 'Numbers', direction: 'b-a' })
  })
})

describe('backup', () => {
  const progress: Progress = { 'D::a::b': { ...newState(), interval: 6, reps: 2, reviews: 4 } }
  const settings = { deck: 'Class', direction: 'b-a' as const }

  it('round-trips', () => {
    const file = buildBackup(progress, settings, '2026-08-06T00:00:00.000Z')
    const parsed = parseBackup(JSON.stringify(file))
    expect(parsed.progress).toEqual(progress)
    expect(parsed.settings).toEqual(settings)
  })

  it('rejects a file from another app', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'anki', version: 1, progress: {} })))
      .toThrow(/not a .* backup/i)
  })

  it('rejects malformed JSON with a readable message', () => {
    expect(() => parseBackup('{{{')).toThrow(/could not be read/i)
  })

  it('rejects progress entries of the wrong shape', () => {
    const bad = { app: 'eu-pt-flashcards', version: 2, exportedAt: 'x', progress: { k: 5 } }
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(/progress/i)
  })
})

describe('mergeProgress', () => {
  it('keeps whichever record shows more review history', () => {
    const current: Progress = { a: { ...newState(), reviews: 1 } }
    const incoming: Progress = { a: { ...newState(), reviews: 5 } }
    expect(mergeProgress(current, incoming)['a']!.reviews).toBe(5)
    expect(mergeProgress(incoming, current)['a']!.reviews).toBe(5)
  })

  it('adds cards the current record has never seen', () => {
    expect(Object.keys(mergeProgress({}, { a: newState() }))).toEqual(['a'])
  })
})
