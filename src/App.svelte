<script lang="ts">
  import '../src/styles/tokens.css'
  import TopBar from './components/TopBar.svelte'
  import CardView from './components/Card.svelte'
  import Controls from './components/Controls.svelte'
  import Stats from './components/Stats.svelte'
  import BackupBar from './components/BackupBar.svelte'
  import UpdatePrompt from './components/UpdatePrompt.svelte'

  import { CARDS, deckCounts } from './lib/cards/index.js'
  import { cardId, type Card } from './lib/cards/schema.js'
  import {
    dueCards, markKnown, markAgain, knownCount, type Progress,
  } from './lib/study/scheduler.js'
  import { shuffle, orderKey, wrapIndex } from './lib/study/order.js'
  import {
    loadProgress, saveProgress, loadSettings, saveSettings, type Settings,
  } from './lib/storage/progress.js'
  import { runMigration } from './lib/storage/migrate.js'

  // Runs before the first read, so a returning user's history is already in place.
  const migration = runMigration(localStorage, CARDS)

  let progress = $state<Progress>(loadProgress(localStorage))
  let settings = $state<Settings>(loadSettings(localStorage))
  let index = $state(0)
  let flipped = $state(false)
  let shuffleNonce = $state(0)

  const counts = deckCounts()
  const deckOptions: Array<[string, number]> = [
    ['All', CARDS.length],
    ...[...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  ]

  let now = $state(Date.now())

  let deckCards = $derived(
    settings.deck === 'All' ? [...CARDS] : CARDS.filter(c => c.deck === settings.deck),
  )
  let due = $derived(dueCards(progress, deckCards, now))

  // When nothing is due the whole deck comes back, so the app is never a dead end.
  let pool = $derived(due.length ? due : deckCards)

  // Reshuffles only when the pool identity changes or Shuffle is pressed — paging
  // back and forth must not reorder the deck under you.
  let orderedKey = $derived(`${orderKey(settings.deck, due.length === 0, pool)}::${shuffleNonce}`)
  let ordered = $state<Card[]>([])
  let lastKey = ''

  $effect(() => {
    if (orderedKey !== lastKey) {
      lastKey = orderedKey
      ordered = shuffle(pool)
      index = 0
    }
  })

  let current = $derived(ordered.length ? ordered[wrapIndex(index, ordered.length)] : undefined)

  function persist() {
    saveProgress(localStorage, progress)
    saveSettings(localStorage, settings)
  }

  function move(delta: number) {
    if (!ordered.length) return
    index = wrapIndex(index + delta, ordered.length)
    flipped = false
  }

  function flip() { flipped = !flipped }

  function known() {
    if (!current) return
    progress = markKnown(progress, current, settings.delayDays, Date.now())
    now = Date.now()
    persist()
    move(1)
  }

  function again() {
    if (!current) return
    progress = markAgain(progress, current)
    now = Date.now()
    persist()
    move(1)
  }

  function changeSettings(next: Partial<Settings>) {
    settings = { ...settings, ...next }
    flipped = false
    persist()
  }

  function resetDeck() {
    const ids = new Set(deckCards.map(cardId))
    const next: Progress = {}
    for (const [id, entry] of Object.entries(progress)) if (!ids.has(id)) next[id] = entry
    progress = next
    now = Date.now()
    flipped = false
    shuffleNonce++
    persist()
  }

  function onKeydown(event: KeyboardEvent) {
    const tag = (event.target as HTMLElement | null)?.tagName
    if (tag && ['SELECT', 'INPUT', 'BUTTON'].includes(tag)) return
    const key = event.key.toLowerCase()
    if (event.code === 'Space') { event.preventDefault(); flip() }
    else if (event.key === 'ArrowRight' || key === 'n') move(1)
    else if (event.key === 'ArrowLeft') move(-1)
    else if (key === 'k') known()
    else if (key === 'r') again()
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="app">
  <header class="header">
    <div>
      <h1>European Portuguese Flashcards</h1>
      <p class="sub">
        {CARDS.length} cards across {deckOptions.length - 1} decks, including a Class deck
        from your Portuguese course notes. Works offline.
      </p>
    </div>
    <Stats total={CARDS.length} due={due.length} known={knownCount(progress)} />
  </header>

  <TopBar
    {settings}
    {deckOptions}
    onchange={changeSettings}
    onshuffle={() => { shuffleNonce++; flipped = false }}
    onreset={resetDeck}
  />

  <main class="study">
    <div class="meta">
      <span class="deckname">{current?.deck ?? ''}</span>
      <span id="progressText">
        {ordered.length ? `Card ${wrapIndex(index, ordered.length) + 1} / ${ordered.length}` : ''}
        · {due.length} due
      </span>
    </div>

    {#if current}
      <CardView
        card={current}
        direction={settings.direction}
        {flipped}
        onflip={flip}
        onswipe={move}
      />
    {:else}
      <div class="empty">No cards in this deck.</div>
    {/if}

    <Controls
      onprev={() => move(-1)}
      onflip={flip}
      onnext={() => move(1)}
      onagain={again}
      onknown={known}
    />
  </main>

  <BackupBar
    {progress}
    {settings}
    migrationNote={migration}
    onimport={(next) => { progress = next; now = Date.now(); persist() }}
  />

  <UpdatePrompt />
</div>

<style>
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  h1 { margin: 0 0 4px; font-size: clamp(24px, 4vw, 42px); line-height: 1; letter-spacing: -0.04em; }
  .sub { margin: 0; color: var(--muted); line-height: 1.4; font-size: 14px; }
  .study { min-height: 0; display: grid; grid-template-rows: auto minmax(240px, 1fr) auto; gap: 10px; }
  .meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    color: var(--muted);
    font-size: 13px;
  }
  .meta .deckname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .empty { padding: 40px; text-align: center; color: var(--muted); }

  @media (max-width: 760px) {
    .header { display: block; }
    h1 { font-size: 22px; }
    .sub {
      font-size: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .study { grid-template-rows: auto minmax(190px, 1fr) auto; gap: 6px; }
    .meta { font-size: 11px; line-height: 1.2; }
  }
  @media (max-width: 420px) {
    h1 { font-size: 20px; }
    .sub { display: none; }
  }
</style>
