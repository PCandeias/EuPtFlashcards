/**
 * Which language the app is showing.
 *
 * The route lives in the hash — `#/tr` — rather than the path, because this is a
 * static site on GitHub Pages: a real path would need the server to rewrite
 * unknown URLs back to index.html, and the service worker would have to be told
 * about it too. A hash needs neither, and it survives a reload and the back
 * button, which is what the route is for.
 *
 * No hash means the picker. That is deliberate: the app opens on the choice
 * rather than on whichever language was last used, so neither is the default one.
 */
import { isLanguageId, type LanguageId } from './languages/index.js'

/** Remembered only so the picker can open in the theme you last chose. */
export const THEME_KEY = 'flash:v1:theme'

export function routeFrom(hash: string): LanguageId | null {
  const id = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return isLanguageId(id) ? id : null
}

export function currentRoute(): LanguageId | null {
  return typeof location === 'undefined' ? null : routeFrom(location.hash)
}

export function hashFor(id: LanguageId): string {
  return `#/${id}`
}

export function open(id: LanguageId): void {
  location.hash = hashFor(id)
}

/** Back to the picker, as a new history entry so Back returns to the deck. */
export function leave(): void {
  location.hash = ''
}

/** Calls back whenever the route changes. Returns the unsubscribe. */
export function onRouteChange(listener: (id: LanguageId | null) => void): () => void {
  const handler = () => listener(currentRoute())
  window.addEventListener('hashchange', handler)
  return () => window.removeEventListener('hashchange', handler)
}
