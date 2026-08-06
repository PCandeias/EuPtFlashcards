<script lang="ts">
  import ThemeToggle from './ThemeToggle.svelte'
  import type { LanguageDef } from '../lib/languages/types.js'
  import type { Theme } from '../lib/storage/progress.js'

  let {
    languages, theme, onpick, ontheme,
  }: {
    languages: readonly LanguageDef[]
    theme: Theme
    onpick: (id: LanguageDef['id']) => void
    ontheme: (theme: Theme) => void
  } = $props()
</script>

<div class="picker">
  <header>
    <div>
      <h1>Flashcards</h1>
      <p class="sub">Pick a language. Each one keeps its own progress.</p>
    </div>
    <ThemeToggle {theme} onchange={ontheme} />
  </header>

  <ul class="choices">
    {#each languages as language (language.id)}
      {@const Flag = language.flag}
      <li>
        <button
          class="choice"
          id="pick-{language.id}"
          onclick={() => onpick(language.id)}
          lang={language.locale}
        >
          <span class="flag"><Flag size={52} /></span>
          <span class="text">
            <span class="native">{language.nativeName}</span>
            <span class="name">{language.name}</span>
            <span class="desc">{language.description}</span>
            <span class="count">{language.cards.length} cards · {language.decks.length} decks</span>
          </span>
        </button>
      </li>
    {/each}
  </ul>

  <p class="foot">
    Everything works offline. Progress, settings and reported cards are kept
    separately for each language, so studying one never disturbs the other.
  </p>
</div>

<style>
  /* Its own page rather than the study screen's: the picker wants the choices in
     the middle of the screen, not a card filling it. */
  .picker {
    min-height: 100svh;
    width: min(1080px, 100%);
    margin: 0 auto;
    padding: 16px;
    padding-top: calc(16px + env(safe-area-inset-top));
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
    padding-left: calc(16px + env(safe-area-inset-left));
    padding-right: calc(16px + env(safe-area-inset-right));
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 24px;
  }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  h1 { margin: 0 0 4px; font-size: clamp(28px, 6vw, 48px); line-height: 1; letter-spacing: -0.04em; }
  .sub { margin: 0; color: var(--muted); font-size: 14px; }

  .choices {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 16px;
    /* Two across where there is room, stacked where there is not. */
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    align-content: center;
  }

  .choice {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 22px;
    text-align: left;
    font: inherit;
    color: inherit;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 24px;
    cursor: pointer;
    transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease;
  }
  .choice:hover, .choice:focus-visible {
    transform: translateY(-2px);
    border-color: var(--accent-line);
    background: var(--panel-strong);
  }
  /* The flag is the thing you aim at, so it leads and it is big. */
  .flag { flex: none; line-height: 0; }
  .text { display: grid; gap: 2px; min-width: 0; }
  .native { font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
  .name { font-size: 13px; color: var(--muted); }
  .desc { font-size: 13px; color: var(--muted); margin-top: 6px; }
  .count { font-size: 12px; color: var(--muted); opacity: 0.8; margin-top: 6px; }

  .foot { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; max-width: 60ch; }

  @media (max-width: 520px) {
    .picker { gap: 18px; }
    .choice { padding: 18px; gap: 14px; }
    .flag :global(svg) { width: 42px; height: 28px; }
    .native { font-size: 19px; }
  }
</style>
