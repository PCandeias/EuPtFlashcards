<script lang="ts">
  import { THEMES, THEME_LABELS, type Direction, type Settings, type Theme } from '../lib/storage/progress.js'

  let {
    settings, deckOptions, typing, onchange, onshuffle, onreset, ontoggletyping,
  }: {
    settings: Settings
    deckOptions: Array<[string, number]>
    typing: boolean
    onchange: (next: Partial<Settings>) => void
    onshuffle: () => void
    onreset: () => void
    ontoggletyping: () => void
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

  <select
    id="themeSelect"
    aria-label="Theme"
    value={settings.theme}
    onchange={(e) => onchange({ theme: e.currentTarget.value as Theme })}
  >
    {#each THEMES as theme (theme)}
      <option value={theme}>{THEME_LABELS[theme]}</option>
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
  <button id="resetBtn" onclick={onreset}>Reset deck</button>
</section>

<style>
  .topbar {
    display: grid;
    grid-template-columns: minmax(150px, 1fr) minmax(170px, 230px) minmax(96px, 120px) auto auto auto;
    gap: 8px;
    align-items: center;
  }
  @media (max-width: 760px) {
    .topbar { grid-template-columns: 1fr 1fr; gap: 6px; }
    #deckSelect { grid-column: 1 / -1; }
    #typeBtn, #shuffleBtn, #resetBtn { min-height: 38px; font-size: 13px; }
    select { min-height: 40px; font-size: 14px; }
  }
  /* Six full-width rows on a narrow phone left no room for the card. Two columns
     halves the toolbar's height, which is what the card needs back. */
  @media (max-width: 420px) {
    .topbar { grid-template-columns: 1fr 1fr; }
    #deckSelect { grid-column: 1 / -1; }
  }
  /* These used to be hidden on short screens to claw back vertical space. The
     card now absorbs the slack instead, and hiding them would put the typing
     toggle out of reach entirely. */
  @media (max-height: 700px) and (max-width: 760px) {
    .topbar button { min-height: 34px; font-size: 12px; padding: 4px 8px; }
    select { min-height: 34px; }
  }
</style>
