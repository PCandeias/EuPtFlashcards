<script lang="ts">
  import type { Settings } from '../lib/storage/progress.js'

  let {
    settings, deckOptions, typing, onchange, onshuffle, ontoggletyping, onsettings,
  }: {
    settings: Settings
    deckOptions: Array<[string, number]>
    typing: boolean
    onchange: (next: Partial<Settings>) => void
    onshuffle: () => void
    ontoggletyping: () => void
    onsettings: () => void
  } = $props()
</script>

<!--
  Only what changes mid-session lives here. Theme, direction, conjugation tenses,
  backup and reset moved into Settings — six controls in a row left no room for the
  card on a narrow phone.
-->
<section class="topbar">
  <select
    id="deckSelect"
    aria-label="Deck"
    value={settings.deck}
    onchange={(e) => onchange({ deck: e.currentTarget.value })}
  >
    {#each deckOptions as [deck, count] (deck)}
      <option value={deck}>{deck} ({count})</option>
    {/each}
  </select>

  <button
    id="typeBtn"
    class:primary={typing}
    aria-pressed={typing}
    title="Type the answer instead of flipping (t)"
    onclick={ontoggletyping}
  >{typing ? 'Typing' : 'Type'}</button>

  <button id="shuffleBtn" onclick={onshuffle}>Shuffle</button>

  <button id="settingsBtn" onclick={onsettings} aria-haspopup="dialog" title="Settings">
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8" />
      <path
        d="M12 2.8v2.4M12 18.8v2.4M4.5 12H2.1M21.9 12h-2.4M6.7 6.7 5 5M19 19l-1.7-1.7M17.3 6.7 19 5M5 19l1.7-1.7"
        fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
      />
    </svg>
    <span>Settings</span>
  </button>
</section>

<style>
  .topbar {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) auto auto auto;
    gap: 8px;
    align-items: center;
  }
  #settingsBtn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; }

  @media (max-width: 760px) {
    .topbar { grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
    #deckSelect { grid-column: 1 / -1; }
    #typeBtn, #shuffleBtn, #settingsBtn { min-height: 38px; font-size: 13px; }
  }
  @media (max-height: 700px) and (max-width: 760px) {
    .topbar button { min-height: 34px; font-size: 12px; padding: 4px 8px; }
    select { min-height: 34px; }
  }
</style>
