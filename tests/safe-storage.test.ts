import { describe, it, expect } from 'vitest'
import { safeStorage } from '../src/lib/storage/safe.js'

/** A store that throws on everything, like Safari with storage blocked. */
const hostile = (): Storage => ({
  get length() { throw new Error('denied') },
  clear() { throw new Error('denied') },
  key() { throw new Error('denied') },
  getItem() { throw new Error('denied') },
  setItem() { throw new Error('denied') },
  removeItem() { throw new Error('denied') },
}) as unknown as Storage

/** A store that works until it is full. */
const full = (): Storage => {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (k !== '__probe__') throw new Error('QuotaExceededError')
      map.set(k, v)
    },
    removeItem: (k: string) => { map.delete(k) },
  } as unknown as Storage
}

describe('safeStorage', () => {
  it('uses the real store when the real store works', () => {
    const map = new Map<string, string>()
    const real = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { map.set(k, v) },
      removeItem: (k: string) => { map.delete(k) },
    } as unknown as Storage

    const store = safeStorage(real)
    store.setItem('a', '1')
    expect(store.available).toBe(true)
    expect(store.getItem('a')).toBe('1')
    expect(map.get('a')).toBe('1')
    store.removeItem('a')
    expect(store.getItem('a')).toBeNull()
  })

  // The point of the whole file: a flashcards app that will not open is worse
  // than one that forgets.
  it('falls back to memory rather than throwing', () => {
    const store = safeStorage(hostile())
    expect(store.available).toBe(false)
    expect(() => store.setItem('a', '1')).not.toThrow()
    expect(store.getItem('a')).toBe('1')
    expect(store.getItem('missing')).toBeNull()
  })

  it('handles there being no storage object at all', () => {
    const store = safeStorage(undefined)
    expect(store.available).toBe(false)
    store.setItem('a', '1')
    expect(store.getItem('a')).toBe('1')
  })

  // A full quota fails only on write, and only for the session.
  it('keeps a write that the real store rejected', () => {
    const store = safeStorage(full())
    expect(store.available).toBe(true)
    expect(() => store.setItem('a', '1')).not.toThrow()
    expect(store.getItem('a')).toBe('1')
  })
})
