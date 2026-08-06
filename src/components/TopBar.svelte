<script lang="ts">
  import ThemeToggle from './ThemeToggle.svelte'
  import type { Direction, Settings, Theme } from '../lib/storage/progress.js'
  import type { LanguageDef } from '../lib/languages/types.js'

  let {
    settings, language, deckOptions, typing, onchange, onshuffle, ontoggletyping,
    onreset, onsettings,
  }: {
    settings: Settings
    language: LanguageDef
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
    <option value="a-b">English → {language.shortName}</option>
    <option value="b-a">{language.shortName} → English</option>
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

    <ThemeToggle
      theme={settings.theme}
      onchange={(theme: Theme) => onchange({ theme })}
    />

    <!-- Destructive, so it opens a confirmation rather than acting on the click. -->
    <button id="resetBtn" onclick={onreset} title="Reset progress for this deck">Reset</button>

    <button id="settingsBtn" onclick={onsettings} aria-haspopup="dialog" title="Settings">
      <!-- Sliders, not a cog: a cog's ring-and-spokes reads as a sun next to the
           theme toggle sitting two buttons away. -->
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
        <path
          d="M4 7h9M17.5 7H20M4 12h3M11.5 12H20M4 17h9M17.5 17H20"
          fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
        />
        <circle cx="15.2" cy="7" r="2.1" fill="none" stroke="currentColor" stroke-width="1.8" />
        <circle cx="9.2" cy="12" r="2.1" fill="none" stroke="currentColor" stroke-width="1.8" />
        <circle cx="15.2" cy="17" r="2.1" fill="none" stroke="currentColor" stroke-width="1.8" />
      </svg>
      <span class="label">Settings</span>
    </button>
  </div>
</section>

<style>
  /*
   * Flex rather than grid so the actions can wrap to their own line when the
   * two selects and five buttons do not fit side by side. As a grid its
   * min-content was 765px, which is wider than an iPad in portrait has room for
   * once the page padding is taken off — the whole page scrolled sideways.
   */
  .topbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  #deckSelect { flex: 1 1 220px; min-width: 0; }
  #directionSelect { flex: 0 1 220px; min-width: 0; }
  .actions { display: flex; gap: 8px; flex: 0 0 auto; margin-left: auto; }
  #settingsBtn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; }

  /*
   * On a phone the two selects each take a full row and the four actions share
   * one — three rows rather than six, which is what leaves room for the card.
   */
  @media (max-width: 760px) {
    .topbar { display: grid; grid-template-columns: 1fr; gap: 6px; }
    .actions { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
    .actions button { min-height: 38px; padding: 4px 4px; font-size: 12px; }
    #settingsBtn .label { display: none; }
  }
  /* Short screens, at any width: a phone in landscape has 390px of height and
     needs the same compact toolbar a small phone does. */
  @media (max-height: 700px) {
    .topbar { gap: 5px; }
    .actions button { min-height: 34px; font-size: 12px; }
    select { min-height: 34px; }
  }
  @media (max-height: 520px) {
    #settingsBtn .label { display: none; }
  }
</style>
