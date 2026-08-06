/**
 * localStorage that cannot take the app down with it.
 *
 * Reading or writing it throws rather than returning null in more situations
 * than is comfortable: Safari with cookies blocked, an iframe with third-party
 * storage partitioned off, a device out of disk. Every one of those threw from
 * the first line of the app, and a flashcards app that will not open is worse
 * than one that forgets.
 *
 * So a failure degrades instead: reads come back empty, writes are kept in
 * memory for the session, and the study screen works for as long as the tab is
 * open. `available` says which of the two you have, for anything that wants to
 * warn about it.
 */
import type { StorageLike } from './progress.js'

export interface SafeStorage extends StorageLike {
  /** False when the real store could not be used and this is memory only. */
  available: boolean
}

function memoryStorage(available: boolean): SafeStorage {
  const map = new Map<string, string>()
  return {
    available,
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
    removeItem: key => { map.delete(key) },
  }
}

export function safeStorage(storage: Storage | undefined): SafeStorage {
  if (!storage) return memoryStorage(false)

  // Probe with a real write: some browsers hand back a Storage object that
  // throws only when you use it.
  try {
    const probe = '__probe__'
    storage.setItem(probe, probe)
    storage.removeItem(probe)
  } catch {
    return memoryStorage(false)
  }

  const fallback = memoryStorage(true)
  return {
    available: true,
    getItem(key) {
      try {
        return storage.getItem(key)
      } catch {
        return fallback.getItem(key)
      }
    },
    setItem(key, value) {
      try {
        storage.setItem(key, value)
      } catch {
        // Out of quota, most likely. Keep it for this session at least.
        fallback.setItem(key, value)
      }
    },
    removeItem(key) {
      try {
        storage.removeItem(key)
      } catch {
        fallback.removeItem(key)
      }
    },
  }
}

/** The app's one store, probed once. */
export const store: SafeStorage = safeStorage(
  typeof localStorage === 'undefined' ? undefined : localStorage,
)
