<script lang="ts">
  import Badge from './Badge.svelte'
  import SpeakButton from './SpeakButton.svelte'
  import ThemeToggle from './ThemeToggle.svelte'
  import { referenceTables, search, slug } from '../lib/reference/build.js'
  import { badgesFor } from '../lib/render/tags.js'
  import { tenseById } from '../lib/grammar/tenses.js'
  import { levelById } from '../lib/cards/levels.js'
  import type { LanguageDef } from '../lib/languages/types.js'
  import type { Theme } from '../lib/storage/progress.js'

  let {
    language, theme, speech = true, onstudy, onleave, ontheme,
  }: {
    language: LanguageDef
    theme: Theme
    /** Whether to offer a word aloud, following the study screen's setting. */
    speech?: boolean
    onstudy: () => void
    onleave: () => void
    ontheme: (next: Theme) => void
  } = $props()

  let Flag = $derived(language.flag)
  let query = $state('')
  let tables = $derived(referenceTables(language))
  /** Enough to scroll through; past this, narrowing the query beats scrolling. */
  const LIMIT = 60
  let hits = $derived(search(language.cards, query, LIMIT))
  let searching = $derived(query.trim().length > 0)

  let input = $state<HTMLInputElement | undefined>()
  $effect(() => { input?.focus() })

  function jump(event: MouseEvent, id: string) {
    const section = document.getElementById(id)
    if (!section) return
    event.preventDefault()
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    section.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
  }
</script>

<div class="reference">
  <header>
    <div class="titles">
      <button class="switch" onclick={onleave} title="Choose another language">
        <span class="flag"><Flag size={26} /></span>
        <span class="visually-hidden">Choose another language</span>
      </button>
      <div>
        <h1>{language.name} reference</h1>
        <p class="sub">
          {language.cards.length} cards · {language.decks.length} decks · the grammar behind them
        </p>
      </div>
    </div>
    <div class="actions">
      <button id="studyBtn" class="primary" onclick={onstudy}>← Study</button>
      <ThemeToggle {theme} onchange={ontheme} />
    </div>
  </header>

  <search class="searchbar">
    <label class="visually-hidden" for="referenceSearch">Search the deck</label>
    <input
      id="referenceSearch"
      bind:this={input}
      bind:value={query}
      type="search"
      autocomplete="off"
      spellcheck="false"
      placeholder="Search {language.cards.length} cards — {language.shortName} or English"
    />
    {#if searching}
      <button class="clear" onclick={() => { query = '' }} aria-label="Clear the search">×</button>
    {/if}
  </search>

  {#if searching}
    <section class="results" aria-live="polite">
      <h2>
        {#if hits.length === 0}
          Nothing found
        {:else if hits.length >= LIMIT}
          The first {LIMIT} matches <span class="more">— narrow the search to see fewer</span>
        {:else}
          {hits.length} card{hits.length === 1 ? '' : 's'}
        {/if}
      </h2>

      {#if hits.length === 0}
        <p class="empty">
          Nothing in the deck matches “{query}”. Accents and case are ignored, so
          the spelling is not the problem.
        </p>
      {:else}
        <ul class="hits">
          {#each hits as hit (hit.card.deck + hit.card.en + hit.card.target)}
            <li>
              <div class="pair">
                <span class="target" lang={language.locale}>{hit.card.target}</span>
                {#if speech}
                  <SpeakButton text={hit.card.target} {language} compact />
                {/if}
              </div>
              <div class="gloss">
                {hit.card.en}
                {#each badgesFor(hit.card, 'en', language.badgeHints) as spec (spec.tag)}
                  <Badge {spec} />
                {/each}
                {#if hit.card.sense}<span class="sense">{hit.card.sense}</span>{/if}
              </div>
              <div class="meta">
                <span class="deck">{hit.card.deck}</span>
                {#if hit.card.tense}
                  <span class="tense">{tenseById(hit.card.tense)?.label ?? hit.card.tense}</span>
                {/if}
                {#if hit.card.level}
                  <span class="level">{levelById(hit.card.level)?.label ?? hit.card.level}</span>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {:else}
    <!--
      The links carry a real href so they can be copied and read as links, but
      the click is handled here: the route lives in the hash too, and letting
      `#levels` reach the router would read as "no language" and bounce you out
      to the picker.
    -->
    <nav class="jump" aria-label="Sections">
      {#each tables as table (table.title)}
        <a href="#{slug(table.title)}" onclick={e => jump(e, slug(table.title))}>{table.title}</a>
      {/each}
    </nav>

    {#each tables as table (table.title)}
      <section class="table" id={slug(table.title)} class:plain={table.emphasiseFirst === false}>
        <h2>{table.title}</h2>
        {#if table.blurb}<p class="blurb">{table.blurb}</p>{/if}
        <div class="scroller">
          <table>
            <thead>
              <tr>
                {#each table.columns as column, i (i)}
                  <th scope="col">{column}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each table.rows as row, r (r)}
                <tr>
                  {#each row as cell, c (c)}
                    {#if c === 0}
                      <th scope="row">{cell}</th>
                    {:else}
                      <td>{cell}</td>
                    {/if}
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/each}
  {/if}
</div>

<style>
  .reference {
    min-height: 100svh;
    width: min(1080px, 100%);
    margin: 0 auto;
    padding: 16px;
    padding-top: calc(16px + env(safe-area-inset-top));
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
    padding-left: calc(16px + env(safe-area-inset-left));
    padding-right: calc(16px + env(safe-area-inset-right));
    display: grid;
    /* A grid track is as wide as its widest item unless it is told otherwise, so
       without this the widest table would stretch the page rather than scroll
       inside its own box. */
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    align-content: start;
  }
  .reference > * { min-width: 0; }

  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .titles { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
  h1 { margin: 0 0 2px; font-size: clamp(20px, 3.4vw, 32px); line-height: 1.1; letter-spacing: -0.03em; }
  .sub { margin: 0; color: var(--muted); font-size: 13px; }
  .actions { display: flex; gap: 8px; flex: 0 0 auto; }
  .switch { padding: 4px 0 0; border: 0; background: none; cursor: pointer; line-height: 0; }
  .flag { display: inline-block; line-height: 0; }
  .visually-hidden {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .searchbar { position: relative; display: block; }
  input {
    width: 100%;
    padding: 12px 40px 12px 14px;
    font: inherit;
    font-size: 16px; /* Under 16px, iOS zooms the page when the field is focused. */
    color: inherit;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 14px;
    outline: none;
  }
  input:focus-visible { border-color: var(--accent-line); }
  /* The field has a clear button of its own below; the browser's would sit on
     top of it. */
  input::-webkit-search-cancel-button, input::-webkit-search-decoration {
    -webkit-appearance: none;
    appearance: none;
  }
  .clear {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 28px; height: 28px;
    display: grid; place-items: center;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--muted);
    font-size: 16px; line-height: 1;
    cursor: pointer;
  }

  h2 { margin: 0 0 4px; font-size: 15px; letter-spacing: -0.01em; }
  .more { color: var(--muted); font-weight: 400; font-size: 12px; }
  .blurb { margin: 0 0 10px; color: var(--muted); font-size: 13px; line-height: 1.5; max-width: 70ch; }
  .empty { color: var(--muted); font-size: 14px; }

  .jump { display: flex; flex-wrap: wrap; gap: 8px; }
  .jump a {
    padding: 6px 11px;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--muted);
    text-decoration: none;
    font-size: 13px;
  }
  .jump a:hover { color: inherit; border-color: var(--accent-line); }

  .table {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 16px;
    scroll-margin-top: 12px;
  }
  /* Wide tables scroll inside their own box rather than the page. */
  .scroller { overflow-x: auto; }
  /* Full width on a phone, where a cell wrapping beats a row hiding off the edge;
     content width above that, so the columns sit next to what they belong to
     instead of being stretched apart. */
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  @media (min-width: 761px) {
    table { width: auto; }
    thead th, tbody th, tbody td { padding-right: 32px; }
    tr > :last-child { padding-right: 0; }
  }
  thead th {
    text-align: left;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    padding: 0 12px 6px 0;
    white-space: nowrap;
  }
  /* The first column is the row's name — a suffix, a tense, a person — and is
     usually in the language being learnt, so it is coloured like one. A table
     whose first column is English says so with emphasiseFirst: false. */
  tbody th {
    text-align: left;
    font-weight: 500;
    color: var(--accent);
    padding: 5px 12px 5px 0;
    vertical-align: baseline;
  }
  .plain tbody th { color: var(--muted); font-weight: 400; }
  tbody td { padding: 5px 12px 5px 0; font-weight: 500; vertical-align: baseline; }
  tbody tr + tr th, tbody tr + tr td {
    border-top: 1px solid var(--line-soft, rgba(148, 163, 184, 0.12));
  }

  .hits { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .hits li {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 10px 14px;
  }
  .pair { display: flex; align-items: center; gap: 8px; }
  .target { font-size: 17px; font-weight: 650; }
  .gloss { color: var(--muted); font-size: 14px; margin-top: 1px; }
  .sense { font-style: italic; opacity: 0.85; margin-left: 6px; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 6px; font-size: 11px; color: var(--muted); }
  .tense { color: var(--warn); }
  .level { text-transform: uppercase; letter-spacing: 0.06em; }

  @media (max-width: 760px) {
    .reference { padding: 10px; gap: 12px; }
    header { gap: 10px; }
    .sub { font-size: 12px; }
    .table { padding: 12px; border-radius: 14px; }
    .blurb { font-size: 12px; }
    /* Narrower columns rather than a sideways scroll: on a phone a cell that
       wraps is easier to read than a row that runs off the edge. */
    table { font-size: 13px; }
    thead th, tbody th, tbody td { padding-right: 8px; }
  }
</style>
