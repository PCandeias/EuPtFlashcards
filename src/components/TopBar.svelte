<script lang="ts">
  import type { Direction, Settings } from '../lib/storage/progress.js'

  let {
    settings, deckOptions, onchange, onshuffle, onreset,
  }: {
    settings: Settings
    deckOptions: Array<[string, number]>
    onchange: (next: Partial<Settings>) => void
    onshuffle: () => void
    onreset: () => void
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
    <option value="a-b">English → Portuguese · Portugal</option>
    <option value="b-a">Portuguese · Portugal → English</option>
  </select>

  <button id="shuffleBtn" onclick={onshuffle}>Shuffle</button>
  <button id="resetBtn" onclick={onreset}>Reset deck</button>
</section>

<style>
  .topbar {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) minmax(180px, 260px) auto auto;
    gap: 8px;
    align-items: center;
  }
  @media (max-width: 760px) {
    .topbar { grid-template-columns: 1fr 1fr; gap: 6px; }
    #deckSelect { grid-column: 1 / -1; }
    #shuffleBtn, #resetBtn { min-height: 38px; font-size: 13px; }
    select { min-height: 40px; font-size: 14px; }
  }
  @media (max-width: 420px) {
    .topbar { grid-template-columns: 1fr; }
  }
  @media (max-height: 700px) and (max-width: 760px) {
    .topbar button { display: none; }
  }
</style>
