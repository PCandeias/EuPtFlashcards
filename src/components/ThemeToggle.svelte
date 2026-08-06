<script lang="ts">
  import type { Theme } from '../lib/storage/progress.js'

  let { theme, onchange }: { theme: Theme; onchange: (next: Theme) => void } = $props()

  // Slate is the dark palette, Azulejo the light one, so the two themes map
  // cleanly onto a single toggle.
  let isDark = $derived(theme === 'slate')
  // The icon shows what a click will give you, not what you already have.
  let nextLabel = $derived(isDark ? 'Switch to the light theme' : 'Switch to the dark theme')
</script>

<button
  id="themeBtn"
  onclick={() => onchange(isDark ? 'azulejo' : 'slate')}
  aria-label={nextLabel}
  title={nextLabel}
>
  {#if isDark}
    <!-- Sun: currently dark, so a click brings the light theme. -->
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8" />
      <path
        d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.6 5.6l1.9 1.9M16.5 16.5l1.9 1.9M18.4 5.6l-1.9 1.9M7.5 16.5l-1.9 1.9"
        fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
      />
    </svg>
  {:else}
    <!-- Moon: currently light, so a click brings the dark theme. -->
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2z"
        fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"
      />
    </svg>
  {/if}
</button>

<style>
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 10px;
  }
</style>
