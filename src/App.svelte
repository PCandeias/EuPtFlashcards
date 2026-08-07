<script lang="ts">
  import TopBar from './components/TopBar.svelte'
  import CardView from './components/Card.svelte'
  import Controls from './components/Controls.svelte'
  import Stats from './components/Stats.svelte'
  import BackupBar from './components/BackupBar.svelte'
  import SettingsPanel from './components/SettingsPanel.svelte'
  import ResetDialog from './components/ResetDialog.svelte'
  import ReportDialog from './components/ReportDialog.svelte'
  import UpdatePrompt from './components/UpdatePrompt.svelte'
  import TypeAnswer from './components/TypeAnswer.svelte'

  import { cardId } from './lib/cards/schema.js'
  import {
    dueCards, gradeCard, stateFor, stats, inSelectedTenses, type Progress,
  } from './lib/study/scheduler.js'
  import { recordReview, streak, retention, type History } from './lib/study/history.js'
  import type { Rating } from './lib/study/sm2.js'
  import { shuffle } from './lib/study/order.js'
  import {
    startSession, currentCard, move as moveSession, completeCurrent,
    type Session,
  } from './lib/study/session.js'
  import {
    loadProgress, saveProgress, loadSettings, saveSettings,
    loadHistory, saveHistory, keysFor, type Settings,
  } from './lib/storage/progress.js'
  import {
    buildBackup, parseBackup, backupFilename, mergeProgress, mergeHistory,
  } from './lib/storage/backup.js'
  import { annotationsFor } from './lib/annotations/index.js'
  import type { LanguageDef } from './lib/languages/types.js'
  import { THEME_KEY } from './lib/router.js'
  import { store } from './lib/storage/safe.js'
  import {
    loadReports, saveReports, reportCard, unreportCard, withoutReported,
    reportsAsText, reportsFilename, type Reports,
  } from './lib/storage/reports.js'

  let { language, onleave, onreference }: {
    language: LanguageDef
    /** Back to the picker. */
    onleave: () => void
    /** Across to this language's reference page. */
    onreference: () => void
  } = $props()

  // Everything below reads the language once. Root remounts this component when
  // the language changes, so there is never a stale value to worry about.
  /* svelte-ignore state_referenced_locally */
  const deck = language
  const Flag = deck.flag
  const CARDS = deck.cards
  const DECKS = deck.decks
  // Every read and write goes through this language's keys, so nothing one
  // language stores can be seen — or destroyed — by the other.
  const keys = keysFor(deck.storagePrefix)

  // Runs before the first read, so a returning user's history is already in place.
  const migration = deck.migrate?.(store) ?? null

  let progress = $state<Progress>(loadProgress(store, keys))
  let history = $state<History>(loadHistory(store, keys))
  let settings = $state<Settings>(loadSettings(store, keys, deck))
  let flipped = $state(false)
  let now = $state(Date.now())
  let typing = $state(false)
  let openAnnotation = $state<string | null>(null)
  let settingsOpen = $state(false)
  let resetOpen = $state(false)
  let reportOpen = $state(false)
  let reports = $state<Reports>(loadReports(store, keys))
  let backupMessage = $state('')

  // Counted after the tense filter, so the menu never promises cards the filter
  // is removing. Every deck stays listed even at zero: dropping it would leave a
  // selected deck pointing at an option that no longer exists, and hide the fact
  // that the filter is what emptied it.
  let visibleTotal = $derived(withoutReported(inSelectedTenses(CARDS, settings.tenses), reports).length)
  let deckOptions = $derived.by<Array<[string, number]>>(() => {
    const visible = withoutReported(inSelectedTenses(CARDS, settings.tenses), reports)
    const counts = new Map<string, number>(DECKS.map(deck => [deck, 0]))
    for (const card of visible) counts.set(card.deck, (counts.get(card.deck) ?? 0) + 1)
    return [
      ['All', visible.length],
      ...[...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    ]
  })

  // Tense-bearing cards outside the selected tenses drop out of the deck; cards
  // with no tense are never affected. Reported cards drop out regardless — the
  // point of reporting one is to stop being taught it.
  let deckCards = $derived(withoutReported(
    inSelectedTenses(
      settings.deck === 'All' ? [...CARDS] : CARDS.filter(c => c.deck === settings.deck),
      settings.tenses,
    ),
    reports,
  ))
  // What the tense filter is currently costing, so an empty deck can explain itself.
  let hiddenByTense = $derived(
    (settings.deck === 'All' ? CARDS.length : CARDS.filter(c => c.deck === settings.deck).length)
    - deckCards.length,
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

  /**
   * Rebuilt when what belongs in the session changes, and only then.
   *
   * That is the deck chosen and the tenses being studied: switching a tense off
   * used to leave its cards in the queue, so the counter said they were gone
   * while the deck went on teaching them. Never on grading — surviving that is
   * the whole reason the session exists — and never on a report, which is
   * handled where it happens so it costs you your place in the deck.
   */
  let deckSignature = $derived(`${settings.deck}\u0000${settings.tenses.join(',')}`)
  let lastSignature: string | null = null
  $effect(() => {
    if (deckSignature !== lastSignature) {
      lastSignature = deckSignature
      newSession()
    }
  })

  let current = $derived(currentCard(session))
  // In typing mode the answer is whatever the hidden face holds.
  let answerText = $derived(current ? (settings.direction === 'a-b' ? current.target : current.en) : '')
  let currentState = $derived(current ? stateFor(progress, current) : undefined)
  // Whatever the registry has to say about this card, in registry order.
  let annotations = $derived(current ? annotationsFor(current, language.annotations, { settings }) : [])
  // Closes itself if the card changes, or its kind stops having anything to say.
  let activeAnnotation = $derived(annotations.find(a => a.kind.id === openAnnotation))

  // Close only when the card genuinely changes. Reading `current` in an effect
  // would also fire on any re-derivation, which could shut a panel the moment it
  // was opened.
  let lastCardId: string | null = null
  $effect(() => {
    const id = current ? cardId(current) : null
    if (id !== lastCardId) {
      lastCardId = id
      openAnnotation = null
    }
  })
  let summary = $derived(stats(progress))
  // The attribute drives every palette variable; the meta tag makes the iOS status
  // bar match, which is the difference between installed and "a website".
  $effect(() => {
    document.documentElement.dataset.theme = settings.theme
    store.setItem(THEME_KEY, settings.theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    const bar = getComputedStyle(document.documentElement).getPropertyValue('--status-bar').trim()
    if (meta && bar) meta.setAttribute('content', bar)
  })

  // The document belongs to whichever language is being studied.
  $effect(() => {
    document.documentElement.lang = language.locale
    document.title = `${language.name} Flashcards`
  })

  let currentStreak = $derived(streak(history, now))
  let recall = $derived(retention(history, 30, now))

  function confirmReport() {
    if (!current) return
    reports = reportCard(reports, current, new Date().toISOString())
    saveReports(store, keys, reports)
    reportOpen = false
    // The card has just left the deck, so move on rather than sit on a gap.
    session = completeCurrent(session, false)
    flipped = false
    if (!session.cards.length) newSession()
  }

  function restoreReport(id: string) {
    reports = unreportCard(reports, id)
    saveReports(store, keys, reports)
    newSession()
  }

  function exportReports() {
    const at = new Date().toISOString()
    const blob = new Blob([reportsAsText(reports, at, language.name)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = reportsFilename(at, language.id)
    link.click()
    URL.revokeObjectURL(url)
  }

  function persist() {
    saveProgress(store, keys, progress)
    saveSettings(store, keys, language, settings)
    saveHistory(store, keys, history)
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
    const file = buildBackup(language, progress, settings, exportedAt, history, reports)
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFilename(exportedAt, language.id)
    link.click()
    URL.revokeObjectURL(url)
    backupMessage = `Exported ${Object.keys(progress).length} cards.`
  }

  async function importBackup(file: File) {
    try {
      const parsed = parseBackup(await file.text(), language)
      // Additive: a restore should never lose ground you have since gained.
      progress = mergeProgress(progress, parsed.progress)
      history = mergeHistory(history, parsed.history)
      // Additive, like the rest of a restore.
      reports = { ...reports, ...parsed.reported }
      saveReports(store, keys, reports)
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
      <h1>
        <button class="switch" onclick={onleave} title="Choose another language">
          <span class="flag"><Flag size={30} /></span>
          <span class="visually-hidden">Choose another language</span>
        </button>
        {language.name} Flashcards
      </h1>
      <p class="sub">
        {visibleTotal} cards across {deckOptions.length - 1} decks, scheduled by
        spaced repetition. Works offline.
      </p>
      <button id="referenceBtn" class="reference" onclick={onreference}>
        Reference &amp; search →
      </button>
    </div>
    <Stats
      total={visibleTotal}
      due={due.length}
      learned={summary.learned}
      mature={summary.mature}
      {history}
      {now}
    />
  </header>

  <TopBar
    {settings}
    {language}
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
        {language}
        direction={settings.direction}
        {flipped}
        {annotations}
        {openAnnotation}
        speech={settings.speech}
        compact={typing}
        onflip={flip}
        onswipe={move}
        onannotate={(id) => { openAnnotation = openAnnotation === id ? null : id }}
        onreport={() => { reportOpen = true }}
      />
      <!--
        Over the card, as a tooltip on it. It is anchored to the bottom and
        capped so it can never reach the word it is explaining or the marker
        beside it — see the panel's own stylesheet.
      -->
      {#if activeAnnotation}
        {@const Panel = activeAnnotation.kind.panel}
        <Panel
          card={current}
          payload={activeAnnotation.payload as never}
          onclose={() => { openAnnotation = null }}
        />
      {/if}
      </div>
    {:else}
      <div class="empty" id="emptyDeck">
        {#if hiddenByTense}
          Every card in this deck is in a tense you have switched off.
          <br />Turn one back on under Settings → Tenses.
        {:else}
          No cards in this deck.
        {/if}
      </div>
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
    {language}
    {reports}
    onrestorereport={restoreReport}
    onexportreports={exportReports}
    onchange={changeSettings}
    onclose={() => { settingsOpen = false }}
    onexport={exportBackup}
    onimport={importBackup}
  />

  <ReportDialog
    open={reportOpen}
    card={current}
    onconfirm={confirmReport}
    onclose={() => { reportOpen = false }}
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
  .reference {
    margin-top: 8px;
    padding: 5px 12px;
    min-height: 0;
    border-radius: 999px;
    font-size: 12px;
    color: var(--muted);
  }
  .reference:hover { color: inherit; }
  /* The flag doubles as the way back to the picker: it is already the thing that
     says which language you are in. */
  .switch {
    padding: 0 8px 0 0;
    border: 0;
    background: none;
    font: inherit;
    line-height: 1;
    cursor: pointer;
    vertical-align: baseline;
  }
  .switch:hover, .switch:focus-visible { filter: brightness(1.15); }
  .flag { display: inline-block; vertical-align: -0.12em; line-height: 0; }
  .visually-hidden {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
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
  /* The annotation panels are positioned against this, not against the card —
     the card's face clips its children and lives in the flip's 3D context. */
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
  /* A phone held sideways is 390px tall and wide enough to miss every rule
     above. The title has to give up its space to the card there. */
  @media (max-height: 520px) {
    h1 { font-size: 18px; }
    .sub { display: none; }
    .study { gap: 6px; }
    .meta { font-size: 11px; }
  }
</style>
