/**
 * Export and import of study progress.
 *
 * iOS evicts script-writable storage after 7 days of no interaction; installed
 * home-screen apps are exempt while in use, but a Safari tab is not and deleting
 * the installed app takes its data. This file is the safety net for that, and for
 * the migration.
 *
 * Pure data in, pure data out — the DOM download/upload lives in the component so
 * this stays testable.
 */
import { sanitizeProgress, sanitizeSettings, type Settings, type SettingsScope } from './progress.js'
import type { LanguageDef, LanguageId } from '../languages/types.js'
import type { Progress } from '../study/scheduler.js'
import { sanitizeHistory, type History } from '../study/history.js'
import { sanitizeReports, type Reports } from './reports.js'

export const BACKUP_APP = 'eu-pt-flashcards'
export const BACKUP_VERSION = 3

export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  /**
   * Which language this is the study record of.
   *
   * Version 2 files predate Turkish and have no such field; they can only be
   * Portuguese, so that is what they are read as. Restoring one language's backup
   * into the other is refused rather than merged — the card ids would not match,
   * and the reported cards and tense settings would be nonsense.
   */
  language: LanguageId
  exportedAt: string
  progress: Progress
  settings: Settings
  history: History
  /** Cards reported as wrong. User data, so it travels with a backup. */
  reported: Reports
}

export function buildBackup(
  language: Pick<LanguageDef, 'id'> & SettingsScope,
  progress: Progress,
  settings: Settings,
  exportedAt: string,
  history: History = {},
  reported: Reports = {},
): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    language: language.id,
    exportedAt,
    progress: sanitizeProgress(progress),
    settings: sanitizeSettings(settings, language),
    history: sanitizeHistory(history),
    reported: sanitizeReports(reported),
  }
}

export function backupFilename(exportedAt: string, languageId: string): string {
  return `flashcards-${languageId}-${exportedAt.slice(0, 10)}.json`
}

/**
 * Throws with a message meant to be shown to the user.
 *
 * `language` is the language being restored into: a backup of the other one is
 * refused here rather than silently merged into a deck it has nothing to do with.
 */
export function parseBackup(
  text: string,
  language: Pick<LanguageDef, 'id' | 'name'> & SettingsScope,
): BackupFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('That file could not be read — it is not valid JSON.')
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new Error('That file could not be read — it is not a backup.')
  }

  const v = raw as Record<string, unknown>
  if (v.app !== BACKUP_APP) {
    throw new Error('That is not a flashcards backup.')
  }

  // Version 2 and earlier predate Turkish, so an unmarked backup is Portuguese.
  const from = typeof v.language === 'string' ? v.language : 'pt'
  if (from !== language.id) {
    throw new Error(`That backup is from a different language, so it cannot be restored into ${language.name}.`)
  }

  const progressRaw = v.progress
  if (typeof progressRaw !== 'object' || progressRaw === null) {
    throw new Error('That backup has no readable progress section.')
  }

  const progress = sanitizeProgress(progressRaw)
  if (Object.keys(progress).length !== Object.keys(progressRaw as object).length) {
    throw new Error('That backup has a damaged progress section.')
  }

  return {
    app: BACKUP_APP,
    version: typeof v.version === 'number' ? v.version : BACKUP_VERSION,
    language: language.id,
    exportedAt: typeof v.exportedAt === 'string' ? v.exportedAt : '',
    progress,
    settings: sanitizeSettings(v.settings, language),
    // Older backups predate the review log; an empty one is correct, not an error.
    history: sanitizeHistory(v.history),
    reported: sanitizeReports(v.reported),
  }
}

/** Import is additive: the better-established record wins, so a restore never loses ground. */
export function mergeProgress(current: Progress, incoming: Progress): Progress {
  const out: Progress = { ...current }
  for (const [id, entry] of Object.entries(incoming)) {
    const existing = out[id]
    if (!existing || entry.reviews > existing.reviews) out[id] = entry
  }
  return out
}

/** Days are additive too: whichever record shows more reviews for a day wins. */
export function mergeHistory(current: History, incoming: History): History {
  const out: History = { ...current }
  for (const [key, day] of Object.entries(incoming)) {
    const existing = out[key]
    const total = (d: typeof day) => d.again + d.hard + d.good + d.easy
    if (!existing || total(day) > total(existing)) out[key] = day
  }
  return out
}
