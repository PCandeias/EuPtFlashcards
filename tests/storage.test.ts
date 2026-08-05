import { describe, it, expect, beforeEach } from 'vitest'
import {
  LEGACY_KEYS, KEYS, loadProgress, saveProgress, loadSettings, saveSettings,
  DEFAULT_SETTINGS, type StorageLike,
} from '../src/lib/storage/progress.js'
import { migrateLegacy, runMigration } from '../src/lib/storage/migrate.js'
import { buildBackup, parseBackup } from '../src/lib/storage/backup.js'
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
  // Two cards sharing deck+pt — the ambiguous case.
  { deck: 'Class', en: 'they', pt: 'eles', tags: ['masc-mixed'] },
  { deck: 'Class', en: 'they masculine', pt: 'eles' },
]

let store: FakeStorage
beforeEach(() => { store = new FakeStorage() })

describe('migrateLegacy', () => {
  it('remaps a v1 id whose English still contained metadata', () => {
    const r = migrateLegacy(
      { 'Class::you plural come::vocês vêm': { knownCount: 3, nextDue: 1 } }, CARDS)
    expect(r.progress['Class::you come::vocês vêm']).toEqual({ knownCount: 3, nextDue: 1 })
    expect(r.migrated).toBe(1)
  })

  it('carries a v2 id through untouched', () => {
    const r = migrateLegacy({ 'Greetings::hello::olá': { knownCount: 9, nextDue: null } }, CARDS)
    expect(r.progress['Greetings::hello::olá']!.knownCount).toBe(9)
    expect(r.carried).toBe(1)
    expect(r.migrated).toBe(0)
  })

  it('drops a key matching no card rather than inventing one', () => {
    const r = migrateLegacy({ 'Class::ghost::não existe': { knownCount: 5, nextDue: 1 } }, CARDS)
    expect(r.progress).toEqual({})
    expect(r.dropped).toBe(1)
  })

  // Guessing here would silently attach study history to the wrong card.
  it('skips an ambiguous deck+pt pair instead of guessing', () => {
    const r = migrateLegacy({ 'Class::they whatever::eles': { knownCount: 4, nextDue: 1 } }, CARDS)
    expect(r.progress).toEqual({})
    expect(r.ambiguous).toBe(1)
  })

  it('does not let a remapped id clobber an existing one', () => {
    const r = migrateLegacy({
      'Class::you come::vocês vêm': { knownCount: 10, nextDue: 99 },
      'Class::you plural come::vocês vêm': { knownCount: 1, nextDue: 1 },
    }, CARDS)
    expect(r.progress['Class::you come::vocês vêm']!.knownCount).toBe(10)
  })

  it('ignores entries that are not shaped like progress', () => {
    const r = migrateLegacy({ 'Greetings::hello::olá': 'nonsense' as unknown }, CARDS)
    expect(r.progress).toEqual({})
    expect(r.dropped).toBe(1)
  })
})

describe('runMigration', () => {
  it('migrates legacy progress into the v3 key', () => {
    store.setItem(LEGACY_KEYS.progress, JSON.stringify({
      'Class::you plural come::vocês vêm': { knownCount: 3, nextDue: 1 },
    }))
    const result = runMigration(store, CARDS)
    expect(result?.migrated).toBe(1)
    expect(loadProgress(store)['Class::you come::vocês vêm']!.knownCount).toBe(3)
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

  // Losing months of study history to a parse error would be unforgivable, so
  // the unreadable original is never overwritten.
  it('preserves unreadable legacy data instead of destroying it', () => {
    store.setItem(LEGACY_KEYS.progress, '{ this is not json')
    const result = runMigration(store, CARDS)
    expect(result?.dropped).toBe(0)
    expect(result?.failed).toBe(true)
    expect(store.getItem(LEGACY_KEYS.progress)).toBe('{ this is not json')
  })

  it('leaves the legacy key intact after a successful migration', () => {
    const raw = JSON.stringify({ 'Greetings::hello::olá': { knownCount: 9, nextDue: null } })
    store.setItem(LEGACY_KEYS.progress, raw)
    runMigration(store, CARDS)
    expect(store.getItem(LEGACY_KEYS.progress)).toBe(raw)
  })

  it('carries legacy settings across', () => {
    store.setItem(LEGACY_KEYS.deck, 'Class')
    store.setItem(LEGACY_KEYS.direction, 'b-a')
    store.setItem(LEGACY_KEYS.delay, '7')
    runMigration(store, CARDS)
    expect(loadSettings(store)).toEqual({ deck: 'Class', direction: 'b-a', delayDays: 7 })
  })

  it('does nothing when there is no legacy data', () => {
    expect(runMigration(store, CARDS)).toBeNull()
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

  it('round-trips through save', () => {
    const p: Progress = { 'D::a::b': { knownCount: 2, nextDue: 123 } }
    saveProgress(store, p)
    expect(loadProgress(store)).toEqual(p)
  })
})

describe('settings', () => {
  it('defaults when absent', () => {
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS)
  })

  it('rejects an out-of-range delay rather than trusting it', () => {
    saveSettings(store, { deck: 'All', direction: 'a-b', delayDays: 9999 })
    expect(loadSettings(store).delayDays).toBe(DEFAULT_SETTINGS.delayDays)
  })

  it('rejects an unknown direction', () => {
    store.setItem(KEYS.settings, JSON.stringify({ deck: 'All', direction: 'sideways', delayDays: 3 }))
    expect(loadSettings(store).direction).toBe(DEFAULT_SETTINGS.direction)
  })
})

describe('backup', () => {
  const progress: Progress = { 'D::a::b': { knownCount: 2, nextDue: 123 } }
  const settings = { deck: 'Class', direction: 'b-a' as const, delayDays: 7 }

  it('round-trips', () => {
    const file = buildBackup(progress, settings, '2026-08-05T00:00:00.000Z')
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
    const bad = { app: 'eu-pt-flashcards', version: 1, exportedAt: 'x', progress: { k: 5 } }
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(/progress/i)
  })
})
