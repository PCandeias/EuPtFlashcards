/**
 * Cards the user has reported as wrong.
 *
 * A reported card is hidden from study immediately — the point of reporting one
 * is to stop being taught it — and kept in a list so it can be looked at, put
 * back, or exported for fixing.
 *
 * The card's text is stored alongside its id rather than just the id, so an
 * export says what was actually wrong even if the card is later edited or
 * removed from the deck.
 */
import type { Card } from '../cards/schema.js'
import { cardId } from '../cards/schema.js'
import type { Keys, StorageLike } from './progress.js'


export interface Report {
  id: string
  deck: string
  en: string
  target: string
  /** ISO timestamp, so an export can say when it was noticed. */
  at: string
}

export type Reports = Record<string, Report>

function isReport(value: unknown): value is Report {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string'
    && typeof v.deck === 'string'
    && typeof v.en === 'string'
    && typeof v.target === 'string'
    && typeof v.at === 'string'
}

export function sanitizeReports(value: unknown): Reports {
  if (typeof value !== 'object' || value === null) return {}
  const out: Reports = {}
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isReport(entry)) out[id] = { ...entry, id }
  }
  return out
}

export function loadReports(storage: StorageLike, keys: Keys): Reports {
  const raw = storage.getItem(keys.reported)
  if (raw == null) return {}
  try {
    return sanitizeReports(JSON.parse(raw))
  } catch {
    // Left in place rather than cleared: it is recoverable by hand.
    return {}
  }
}

export function saveReports(storage: StorageLike, keys: Keys, reports: Reports): void {
  storage.setItem(keys.reported, JSON.stringify(reports))
}

export function reportCard(reports: Reports, card: Card, at: string): Reports {
  const id = cardId(card)
  return { ...reports, [id]: { id, deck: card.deck, en: card.en, target: card.target, at } }
}

export function unreportCard(reports: Reports, id: string): Reports {
  const { [id]: _removed, ...rest } = reports
  return rest
}

export function isReported(reports: Reports, card: Card): boolean {
  return cardId(card) in reports
}

/** Hides reported cards from study. Reporting one is a request to stop seeing it. */
export function withoutReported(cards: readonly Card[], reports: Reports): Card[] {
  if (!Object.keys(reports).length) return [...cards]
  return cards.filter(card => !(cardId(card) in reports))
}

export function reportList(reports: Reports): Report[] {
  return Object.values(reports).sort((a, b) => a.at.localeCompare(b.at))
}

/**
 * A plain-text report, meant to be pasted somewhere and acted on. Deliberately
 * readable rather than machine-shaped: it is for a person fixing cards.
 */
export function reportsAsText(
  reports: Reports, exportedAt: string, languageName: string,
): string {
  const list = reportList(reports)
  const lines = [
    `${languageName} Flashcards — cards reported as incorrect`,
    `Exported ${exportedAt.slice(0, 10)}`,
    `${list.length} card${list.length === 1 ? '' : 's'}`,
    '',
  ]
  for (const r of list) {
    lines.push(`[${r.deck}] ${r.en} = ${r.target}`)
    lines.push(`    reported ${r.at.slice(0, 10)}`)
  }
  return lines.join('\n') + '\n'
}

export function reportsFilename(exportedAt: string, languageId: string): string {
  return `flashcards-${languageId}-reported-${exportedAt.slice(0, 10)}.txt`
}
