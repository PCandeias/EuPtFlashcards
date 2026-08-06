<script lang="ts">
  import './styles/tokens.css'
  import TopBar from './components/TopBar.svelte'
  import CardView from './components/Card.svelte'
  import Controls from './components/Controls.svelte'
  import Stats from './components/Stats.svelte'
  import BackupBar from './components/BackupBar.svelte'
  import SettingsPanel from './components/SettingsPanel.svelte'
  import ResetDialog from './components/ResetDialog.svelte'
  import UpdatePrompt from './components/UpdatePrompt.svelte'
  import TypeAnswer from './components/TypeAnswer.svelte'

  import { CARDS, deckCounts } from './lib/cards/index.js'
  import { cardId } from './lib/cards/schema.js'
  import { dueCards, gradeCard, stateFor, stats, type Progress } from './lib/study/scheduler.js'
  import { recordReview, streak, retention, type History } from './lib/study/history.js'
  import type { Rating } from './lib/study/sm2.js'
  import { shuffle } from './lib/study/order.js'
  import {
    startSession, currentCard, move as moveSession, completeCurrent,
    type Session,
  } from './lib/study/session.js'
  import {
    loadProgress, saveProgress, loadSettings, saveSettings,
    loadHistory, saveHistory, type Settings,
  } from './lib/storage/progress.js'
  import { runMigration } from './lib/storage/migrate.js'
  import {
    buildBackup, parseBackup, backupFilename, mergeProgress, mergeHistory,
  } from './lib/storage/backup.js'
  import { verbOf } from './lib/verbs/detect.js'
  import ConjugationPanel from './components/ConjugationPanel.svelte'

  // Runs before the first read, so a returning user's history is already in place.
  const migration = runMigration(localStorage, CARDS)

  let progress = $state<Progress>(loadProgress(localStorage))
  let history = $state<History>(loadHistory(localStorage))
  let settings = $state<Settings>(loadSettings(localStorage))
  let flipped = $state(false)
  let now = $state(Date.now())
  let typing = $state(false)
  let conjugating = $state(false)
  let settingsOpen = $state(false)
  let resetOpen = $state(false)
  let backupMessage = $state('')

  const counts = deckCounts()
  const deckOptions: Array<[string, number]> = [
    ['All', CARDS.length],
    ...[...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  ]

  let deckCards = $derived(
    settings.deck === 'All' ? [...CARDS] : CARDS.filter(c => c.deck === settings.deck),
  )
  let due = $derived(dueCards(progress, deckCards, now))

  // The queue is built once per sitting and then mutated deliberately. Deriving it
  // from `due` would reshuffle the deck on every answer, since answering is what
  // changes what is due.
  let session = $state<Session>({ cards: [], index: 0 })

  function newSession() {
    // When nothing is due the whole deck comes back, so the app is never a dead end.
    const pool = dueCards(progress, deckCards, Date.now())
    session = startSession(shuffle(pool.length ? pool : deckCards))
    flipped = false
  }

  // Rebuild only when the deck selection changes, never in response to grading.
  let selectedDeck = $derived(settings.deck)
  let lastDeck: string | null = null
  $effect(() => {
    if (selectedDeck !== lastDeck) {
      lastDeck = selectedDeck
      newSession()
    }
  })

  let current = $derived(currentCard(session))
  // In typing mode the answer is whatever the hidden face holds.
  let answerText = $derived(current ? (settings.direction === 'a-b' ? current.pt : current.en) : '')
  let currentState = $derived(current ? stateFor(progress, current) : undefined)
  let currentVerb = $derived(current ? verbOf(current) : null)
  // Closes itself when the card changes or the verb becomes unavailable.
  let showConjugation = $derived(conjugating && !!currentVerb && settings.tenses.length > 0)

  $effect(() => { void current; conjugating = false })
  let summary = $derived(stats(progress))
  // The attribute drives every palette variable; the meta tag makes the iOS status
  // bar match, which is the difference between installed and "a website".
  $effect(() => {
    document.documentElement.dataset.theme = settings.theme
    const meta = document.querySelector('meta[name="theme-color"]')
    const bar = getComputedStyle(document.documentElement).getPropertyValue('--status-bar').trim()
    if (meta && bar) meta.setAttribute('content', bar)
  })

  let currentStreak = $derived(streak(history, now))
  let recall = $derived(retention(history, 30, now))

  function persist() {
    saveProgress(localStorage, progress)
    saveSettings(localStorage, settings)
    saveHistory(localStorage, history)
  }

  function move(delta: number) {
    session = moveSession(session, delta)
    flipped = false
  }

  function flip() { flipped = !flipped }

  function rate(rating: Rating) {
    if (!current) return
    const at = Date.now()
    progress = gradeCard(progress, current, rating, at)
    history = recordReview(history, rating, at)
    now = at
    persist()
    // A failed card returns later this sitting rather than tomorrow.
    session = completeCurrent(session, rating === 'again')
    flipped = false
    if (!session.cards.length) newSession()
  }

  function toggleTyping() {
    typing = !typing
    flipped = false
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
    persist()
    newSession()
  }

  // iOS clears stored data after a week unused, and deleting the installed app
  // takes its data with it. This is the only way back.
  function exportBackup() {
    const exportedAt = new Date().toISOString()
    const file = buildBackup(progress, settings, exportedAt, history)
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFilename(exportedAt)
    link.click()
    URL.revokeObjectURL(url)
    backupMessage = `Exported ${Object.keys(progress).length} cards.`
  }

  async function importBackup(file: File) {
    try {
      const parsed = parseBackup(await file.text())
      // Additive: a restore should never lose ground you have since gained.
      progress = mergeProgress(progress, parsed.progress)
      history = mergeHistory(history, parsed.history)
      now = Date.now()
      persist()
      backupMessage = `Restored ${Object.keys(parsed.progress).length} cards.`
      settingsOpen = false
    } catch (error) {
      backupMessage = error instanceof Error ? error.message : 'That backup could not be read.'
    }
  }

  const RATING_KEYS: Record<string, Rating> = {
    '1': 'again', '2': 'hard', '3': 'good', '4': 'easy',
  }

  function onKeydown(event: KeyboardEvent) {
    const tag = (event.target as HTMLElement | null)?.tagName
    if (tag && ['SELECT', 'INPUT', 'BUTTON'].includes(tag)) return

    const rating = RATING_KEYS[event.key]
    if (rating) { rate(rating); return }

    if (event.code === 'Space') { event.preventDefault(); flip() }
    else if (event.key.toLowerCase() === 't') { toggleTyping() }
    else if (event.key === 'ArrowRight') move(1)
    else if (event.key === 'ArrowLeft') move(-1)
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="app">
  <header class="header">
    <div>
      <h1>European Portuguese Flashcards</h1>
      <p class="sub">
        {CARDS.length} cards across {deckOptions.length - 1} decks, scheduled by spaced
        repetition. Works offline.
      </p>
    </div>
    <Stats
      total={CARDS.length}
      due={due.length}
      learned={summary.learned}
      mature={summary.mature}
      {history}
      {now}
    />
  </header>

  <TopBar
    {settings}
    {deckOptions}
    {typing}
    onchange={changeSettings}
    onshuffle={newSession}
    ontoggletyping={toggleTyping}
    onreset={() => { resetOpen = true }}
    onsettings={() => { settingsOpen = true }}
  />

  <main class="study">
    <div class="meta">
      <span class="deckname">{current?.deck ?? ''}</span>
      <span id="progressText">
        {session.cards.length ? `Card ${session.index + 1} / ${session.cards.length}` : ''}
        · {due.length} due
        {#if currentStreak}· <span id="streakInline">{currentStreak}d streak</span>{/if}
        {#if recall !== null}· <span id="recallInline">{Math.round(recall * 100)}% recall</span>{/if}
      </span>
    </div>

    {#if current}
      <div class="cardarea">
      <CardView
        card={current}
        direction={settings.direction}
        {flipped}
        verb={settings.tenses.length ? currentVerb : null}
        {conjugating}
        compact={typing}
        onflip={flip}
        onswipe={move}
        onconjugate={() => { conjugating = !conjugating }}
      />
      {#if showConjugation && currentVerb}
        <ConjugationPanel
          infinitive={currentVerb}
          enabledTenses={settings.tenses}
          onclose={() => { conjugating = false }}
        />
      {/if}
      </div>
    {:else}
      <div class="empty">No cards in this deck.</div>
    {/if}

    {#if typing && current}
      <TypeAnswer
        expected={answerText}
        onchecked={() => { flipped = true }}
      />
    {/if}

    {#if currentState}
      <Controls
        state={currentState}
        onprev={() => move(-1)}
        onflip={flip}
        onnext={() => move(1)}
        onrate={rate}
      />
    {/if}
  </main>

  <BackupBar migrationNote={migration} message={backupMessage} />

  <SettingsPanel
    open={settingsOpen}
    {settings}
    onchange={changeSettings}
    onclose={() => { settingsOpen = false }}
    onexport={exportBackup}
    onimport={importBackup}
  />

  <ResetDialog
    open={resetOpen}
    deckLabel={settings.deck}
    onconfirm={() => { resetDeck(); resetOpen = false }}
    onclose={() => { resetOpen = false }}
  />

  <UpdatePrompt />
</div>

<style>
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  h1 { margin: 0 0 4px; font-size: clamp(24px, 4vw, 42px); line-height: 1; letter-spacing: -0.04em; }
  .sub { margin: 0; color: var(--muted); line-height: 1.4; font-size: 14px; }
  /* The card row is the only flexible one; min-height:0 lets it actually shrink
     rather than pushing the controls off the bottom of the page. */
  .study {
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto auto;
    gap: 10px;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    color: var(--muted);
    font-size: 13px;
  }
  .meta .deckname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* The conjugation panel is positioned against this, not against the card — the
     card's face clips its children and lives in the flip's 3D context. */
  .cardarea { position: relative; min-height: 0; display: grid; }
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
    .study { gap: 6px; }
    .meta { font-size: 11px; line-height: 1.2; }
  }
  @media (max-width: 420px) {
    h1 { font-size: 20px; }
    .sub { display: none; }
  }
</style>
