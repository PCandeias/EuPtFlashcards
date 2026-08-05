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
import { sanitizeProgress, sanitizeSettings, type Settings } from './progress.js'
import type { Progress } from '../study/scheduler.js'

export const BACKUP_APP = 'eu-pt-flashcards'
export const BACKUP_VERSION = 1

export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  progress: Progress
  settings: Settings
}

export function buildBackup(progress: Progress, settings: Settings, exportedAt: string): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt,
    progress: sanitizeProgress(progress),
    settings: sanitizeSettings(settings),
  }
}

export function backupFilename(exportedAt: string): string {
  return `eu-pt-flashcards-${exportedAt.slice(0, 10)}.json`
}

/** Throws with a message meant to be shown to the user. */
export function parseBackup(text: string): BackupFile {
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
    throw new Error('That is not a European Portuguese Flashcards backup.')
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
    exportedAt: typeof v.exportedAt === 'string' ? v.exportedAt : '',
    progress,
    settings: sanitizeSettings(v.settings),
  }
}

/** Import is additive: the better record of a card wins, so a restore never loses ground. */
export function mergeProgress(current: Progress, incoming: Progress): Progress {
  const out: Progress = { ...current }
  for (const [id, entry] of Object.entries(incoming)) {
    const existing = out[id]
    if (!existing || entry.knownCount > existing.knownCount) out[id] = entry
  }
  return out
}
