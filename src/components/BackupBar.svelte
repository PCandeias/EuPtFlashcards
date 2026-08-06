<script lang="ts">
  import type { MigrationResult } from '../lib/storage/migrate.js'

  let {
    migrationNote, message,
  }: {
    migrationNote: MigrationResult | null
    /** Result of the last export or import, shown until something else happens. */
    message: string
  } = $props()

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
  {#if message}<p class="message" id="backupMessage">{message}</p>{/if}
  <p class="keys">Keyboard: Space flips · ←/→ moves · 1–4 grades · T types.</p>
</footer>

<style>
  .footer { color: var(--muted); font-size: 12px; line-height: 1.4; text-align: center; }
  .migration { margin: 0 0 6px; color: var(--accent); }
  .message { margin: 0 0 6px; }
  .keys { margin: 0; }
  @media (max-width: 760px) {
    .keys { display: none; }
  }
</style>
