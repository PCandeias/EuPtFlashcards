<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte'

  // Deliberately a prompt, not an auto-reload: refreshing mid-review would drop
  // you back to the start of the deck.
  const { needRefresh, updateServiceWorker } = useRegisterSW()
</script>

{#if $needRefresh}
  <div class="update" role="status">
    <span>A new version is ready.</span>
    <button onclick={() => updateServiceWorker(true)}>Reload</button>
    <button class="dismiss" onclick={() => needRefresh.set(false)}>Later</button>
  </div>
{/if}

<style>
  .update {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(12px + env(safe-area-inset-bottom));
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: rgba(17, 24, 39, 0.96);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    font-size: 13px;
  }
  .update button { min-height: 34px; padding: 4px 10px; font-size: 13px; }
  .dismiss { color: var(--muted); }
</style>
