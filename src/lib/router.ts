/**
 * Where the app is: which language, and which of its pages.
 *
 * The route lives in the hash — `#/tr`, `#/tr/reference` — rather than the path,
 * because this is a static site on GitHub Pages: a real path would need the
 * server to rewrite unknown URLs back to index.html, and the service worker would
 * have to be told about it too. A hash needs neither, and it survives a reload
 * and the back button, which is what the route is for.
 *
 * No hash means the picker. That is deliberate: the app opens on the choice
 * rather than on whichever language was last used, so neither is the default one.
 */
import { isLanguageId, type LanguageId } from './languages/index.js'

/** Remembered only so the picker can open in the theme you last chose. */
export const THEME_KEY = 'flash:v1:theme'

/** The pages a language has. */
export const VIEWS = ['study', 'reference'] as const
export type View = (typeof VIEWS)[number]

export interface Route {
  language: LanguageId
  view: View
}

export function routeFrom(hash: string): Route | null {
  const [id, section] = hash.replace(/^#\/?/, '').split(/[/?]/)
  if (!isLanguageId(id)) return null
  // An unknown section is the language's own front page rather than an error:
  // a stale bookmark should still land you somewhere useful.
  const view = VIEWS.includes(section as View) ? (section as View) : 'study'
  return { language: id, view }
}

export function currentRoute(): Route | null {
  return typeof location === 'undefined' ? null : routeFrom(location.hash)
}

export function hashFor(id: LanguageId, view: View = 'study'): string {
  return view === 'study' ? `#/${id}` : `#/${id}/${view}`
}

export function open(id: LanguageId, view: View = 'study'): void {
  location.hash = hashFor(id, view)
}

/** Back to the picker, as a new history entry so Back returns to the deck. */
export function leave(): void {
  location.hash = ''
}

/** Calls back whenever the route changes. Returns the unsubscribe. */
export function onRouteChange(listener: (route: Route | null) => void): () => void {
  const handler = () => listener(currentRoute())
  window.addEventListener('hashchange', handler)
  return () => window.removeEventListener('hashchange', handler)
}
