<script lang="ts">
  import type { Direction, Settings } from '../lib/storage/progress.js'

  let {
    settings, deckOptions, typing, onchange, onshuffle, ontoggletyping, onreset, onsettings,
  }: {
    settings: Settings
    deckOptions: Array<[string, number]>
    typing: boolean
    onchange: (next: Partial<Settings>) => void
    onshuffle: () => void
    ontoggletyping: () => void
    onreset: () => void
    onsettings: () => void
  } = $props()
</script>

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

  <select
    id="directionSelect"
    aria-label="Direction"
    value={settings.direction}
    onchange={(e) => onchange({ direction: e.currentTarget.value as Direction })}
  >
    <option value="a-b">English → Portuguese</option>
    <option value="b-a">Portuguese → English</option>
  </select>

  <div class="actions">
    <button
      id="typeBtn"
      class:primary={typing}
      aria-pressed={typing}
      title="Type the answer instead of flipping (t)"
      onclick={ontoggletyping}
    >{typing ? 'Typing' : 'Type'}</button>

    <button id="shuffleBtn" onclick={onshuffle} title="Reshuffle this deck">Shuffle</button>

    <!-- Destructive, so it opens a confirmation rather than acting on the click. -->
    <button id="resetBtn" onclick={onreset} title="Reset progress for this deck">Reset</button>

    <button id="settingsBtn" onclick={onsettings} aria-haspopup="dialog" title="Settings">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path
          d="M12 2.8v2.4M12 18.8v2.4M4.5 12H2.1M21.9 12h-2.4M6.7 6.7 5 5M19 19l-1.7-1.7M17.3 6.7 19 5M5 19l1.7-1.7"
          fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
        />
      </svg>
      <span class="label">Settings</span>
    </button>
  </div>
</section>

<style>
  .topbar {
    display: grid;
    grid-template-columns: minmax(170px, 1fr) minmax(160px, 220px) auto;
    gap: 8px;
    align-items: center;
  }
  .actions { display: flex; gap: 8px; }
  #settingsBtn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; }

  /*
   * On a phone the two selects each take a full row and the four actions share
   * one — three rows rather than six, which is what leaves room for the card.
   */
  @media (max-width: 760px) {
    .topbar { grid-template-columns: 1fr; gap: 6px; }
    .actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .actions button { min-height: 38px; padding: 4px 6px; font-size: 13px; }
    #settingsBtn .label { display: none; }
  }
  @media (max-height: 700px) and (max-width: 760px) {
    .topbar { gap: 5px; }
    .actions button { min-height: 34px; font-size: 12px; }
    select { min-height: 34px; }
  }
</style>
