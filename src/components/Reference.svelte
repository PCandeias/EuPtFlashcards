<script lang="ts">
  import Badge from './Badge.svelte'
  import SpeakButton from './SpeakButton.svelte'
  import ThemeToggle from './ThemeToggle.svelte'
  import { referenceTables, search, slug } from '../lib/reference/build.js'
  import { badgesFor } from '../lib/render/tags.js'
  import { tenseById } from '../lib/grammar/tenses.js'
  import { levelById } from '../lib/cards/levels.js'
  import type { LanguageDef } from '../lib/languages/types.js'
  import { store } from '../lib/storage/safe.js'
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

  /**
   * Which sections you have folded away, remembered per language.
   *
   * Everything starts open, so the page reads the same as a page of prose until
   * you decide otherwise; what is stored is the folding you did, not the reading.
   */
  let closedKey = $derived(`${language.storagePrefix}:reference-closed`)
  // Read through a counter rather than held in state, so the very first render
  // already knows what you folded away: held in state it would draw everything
  // open and then shut it again.
  let saved = $state(0)
  let closed = $derived.by(() => {
    saved
    return new Set(readClosed(closedKey))
  })

  function readClosed(key: string): string[] {
    try {
      const raw = store.getItem(key)
      const parsed = raw ? JSON.parse(raw) as unknown : null
      return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : []
    } catch {
      // A corrupt list is worth nothing and costs nothing: open everything.
      return []
    }
  }

  function remember(next: Set<string>) {
    store.setItem(closedKey, JSON.stringify([...next]))
    saved += 1
  }

  function setOpen(id: string, open: boolean) {
    if (open === !closed.has(id)) return
    const next = new Set(closed)
    if (open) next.delete(id)
    else next.add(id)
    remember(next)
  }

  let allOpen = $derived(tables.every(t => !closed.has(slug(t.title))))

  function foldAll(open: boolean) {
    remember(open ? new Set<string>() : new Set(tables.map(t => slug(t.title))))
  }

  let input = $state<HTMLInputElement | undefined>()
  $effect(() => { input?.focus() })

  function jump(event: MouseEvent, id: string) {
    const section = document.getElementById(id)
    if (!section) return
    event.preventDefault()
    // A jump to a folded section unfolds it; landing on a closed heading would
    // look like the link had failed.
    if (section instanceof HTMLDetailsElement && !section.open) {
      section.open = true
      setOpen(id, true)
    }
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    section.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
  }
</script>

<div class="reference" lang="en">
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
      <button id="foldAllBtn" class="fold" onclick={() => foldAll(!allOpen)}>
        {allOpen ? 'Collapse all' : 'Expand all'}
      </button>
    </nav>

    {#each tables as table (table.title)}
      {@const id = slug(table.title)}
      <details
        class="table"
        {id}
        class:plain={table.emphasiseFirst === false}
        open={!closed.has(id)}
        ontoggle={e => setOpen(id, e.currentTarget.open)}
      >
        <summary>
          <span class="chev" aria-hidden="true"></span>
          <h2>{table.title}</h2>
          <span class="count">{table.rows.length}</span>
        </summary>

        <div class="body">
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

          {#if table.details?.length}
            <details class="detail">
              <summary><span class="chev" aria-hidden="true"></span>More detail</summary>
              <ul>
                {#each table.details as point, i (i)}
                  <li>{point}</li>
                {/each}
              </ul>
            </details>
          {/if}
        </div>
      </details>
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
  .fold {
    padding: 6px 11px;
    min-height: 0;
    border-radius: 999px;
    font-size: 13px;
    color: var(--muted);
    margin-left: auto;
  }

  /*
   * Each section is a card with a rule down its left edge, so the eye can see
   * where one explanation ends and the next begins even at a glance down the
   * page. Folded, the summary rows read as an index.
   */
  .table {
    background: var(--panel);
    border: 1px solid var(--line);
    border-left: 3px solid var(--accent-line);
    border-radius: 18px;
    scroll-margin-top: 12px;
    overflow: hidden;
  }
  .table + .table { margin-top: 2px; }

  summary {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 16px;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }
  summary::-webkit-details-marker { display: none; }
  summary:hover { background: var(--surface-strong, rgba(148, 163, 184, 0.06)); }
  summary:focus-visible { outline: 2px solid var(--accent-line); outline-offset: -2px; }

  /* A triangle drawn in CSS rather than the browser's marker, which cannot be
     positioned or animated consistently across engines. */
  .chev {
    flex: 0 0 auto;
    width: 0; height: 0;
    border-left: 5px solid currentColor;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    color: var(--muted);
    transition: transform var(--t-base, 160ms) var(--ease, ease);
  }
  details[open] > summary .chev { transform: rotate(90deg); }
  @media (prefers-reduced-motion: reduce) {
    .chev { transition: none; }
  }

  .count {
    margin-left: auto;
    flex: 0 0 auto;
    padding: 1px 8px;
    border-radius: 999px;
    border: 1px solid var(--line);
    color: var(--muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .body { padding: 0 16px 16px; }

  /* The second fold: what a learner asks next, out of the way until asked for. */
  .detail {
    margin-top: 14px;
    border-top: 1px solid var(--line);
    padding-top: 10px;
  }
  .detail > summary {
    padding: 2px 0;
    gap: 8px;
    font-size: 12px;
    color: var(--muted);
    letter-spacing: 0.02em;
  }
  .detail > summary:hover { background: none; color: inherit; }
  .detail ul {
    margin: 8px 0 0;
    padding: 0 0 0 18px;
    display: grid;
    gap: 8px;
    max-width: 78ch;
  }
  .detail li { color: var(--muted); font-size: 13px; line-height: 1.55; }
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
    .table { border-radius: 14px; }
    summary { padding: 11px 12px; }
    .body { padding: 0 12px 12px; }
    .detail li { font-size: 12px; }
    .blurb { font-size: 12px; }
    /* Narrower columns rather than a sideways scroll: on a phone a cell that
       wraps is easier to read than a row that runs off the edge. */
    table { font-size: 13px; }
    thead th, tbody th, tbody td { padding-right: 8px; }
  }
</style>
