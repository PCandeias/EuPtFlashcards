<script lang="ts">
  import {
    buildBackup, parseBackup, backupFilename, mergeProgress, mergeHistory,
  } from '../lib/storage/backup.js'
  import type { History } from '../lib/study/history.js'
  import type { Settings } from '../lib/storage/progress.js'
  import type { Progress } from '../lib/study/scheduler.js'
  import type { MigrationResult } from '../lib/storage/migrate.js'
  import TenseSettings from './TenseSettings.svelte'
  import type { TenseId } from '../lib/verbs/tenses.js'

  let {
    progress, settings, history, migrationNote, onimport, ontenses,
  }: {
    progress: Progress
    settings: Settings
    history: History
    migrationNote: MigrationResult | null
    onimport: (progress: Progress, history: History) => void
    ontenses: (tenses: TenseId[]) => void
  } = $props()

  let message = $state('')
  let fileInput: HTMLInputElement

  // iOS evicts script-writable storage after 7 days of no interaction, and
  // deleting an installed web app takes its data with it. This is the safety net.
  function exportBackup() {
    const exportedAt = new Date().toISOString()
    const file = buildBackup(progress, settings, exportedAt, history)
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFilename(exportedAt)
    link.click()
    URL.revokeObjectURL(url)
    message = `Exported ${Object.keys(progress).length} cards.`
  }

  async function importBackup(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      const parsed = parseBackup(await file.text())
      // Additive: a restore should never lose ground you have since gained.
      const merged = mergeProgress(progress, parsed.progress)
      onimport(merged, mergeHistory(history, parsed.history))
      message = `Restored ${Object.keys(parsed.progress).length} cards.`
    } catch (error) {
      message = error instanceof Error ? error.message : 'That backup could not be read.'
    } finally {
      input.value = ''
    }
  }

  let migrationMessage = $derived.by(() => {
    if (!migrationNote) return ''
    if (migrationNote.failed) {
      return 'Your previous progress could not be read. It has been left untouched — nothing was deleted.'
    }
    const moved = migrationNote.migrated + migrationNote.carried
    if (!moved) return ''
    const skipped = migrationNote.dropped + migrationNote.ambiguous
    return `Brought ${moved} cards of progress across from the old version` +
      (skipped ? `, skipping ${skipped} that could not be matched.` : '.')
  })
</script>

<footer class="footer">
  {#if migrationMessage}
    <p class="migration">{migrationMessage}</p>
  {/if}
  <TenseSettings selected={settings.tenses} onchange={ontenses} />

  <div class="row">
    <button onclick={exportBackup}>Export backup</button>
    <button onclick={() => fileInput.click()}>Import backup</button>
    <input
      bind:this={fileInput}
      type="file"
      accept="application/json,.json"
      onchange={importBackup}
      hidden
    />
  </div>
  {#if message}<p class="message">{message}</p>{/if}
  <p class="keys">Keyboard: Space flips · ←/→ moves · 1–4 grades · T types.</p>
</footer>

<style>
  .footer { color: var(--muted); font-size: 12px; line-height: 1.4; text-align: center; }
  .row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
  .row button { min-height: 36px; font-size: 12px; }
  .migration { margin: 0 0 8px; color: var(--accent); }
  .message { margin: 8px 0 0; }
  .keys { margin: 8px 0 0; }
  @media (max-width: 760px) {
    .keys { display: none; }
  }
</style>
