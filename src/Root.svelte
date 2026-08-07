<script lang="ts">
  import './styles/tokens.css'
  import App from './App.svelte'
  import Reference from './components/Reference.svelte'
  import LanguagePicker from './components/LanguagePicker.svelte'
  import { LANGUAGES, languageById } from './lib/languages/index.js'
  import { currentRoute, leave, onRouteChange, open, THEME_KEY } from './lib/router.js'
  import { THEMES, type Theme } from './lib/storage/progress.js'
  import type { LanguageDef } from './lib/languages/types.js'
  import { store } from './lib/storage/safe.js'

  let route = $state(currentRoute())
  $effect(() => onRouteChange(next => { route = next }))

  let language = $derived(route ? languageById(route.language) ?? null : null)
  let view = $derived(route?.view ?? 'study')

  /**
   * The picker's theme.
   *
   * Each language stores its own settings, so the picker belongs to neither. It
   * reads the last theme chosen anywhere in the app instead, which is written
   * below and by the study screen — otherwise leaving a deck would flash the
   * default palette on the way out.
   */
  function storedTheme(): Theme {
    const raw = store.getItem(THEME_KEY)
    return THEMES.includes(raw as Theme) ? (raw as Theme) : 'slate'
  }
  let pickerTheme = $state<Theme>(storedTheme())

  /**
   * The reference page has no settings of its own; it follows the language's,
   * which is where the theme and the speech switch already live. Bumped when this
   * screen writes them, since localStorage cannot be watched.
   */
  let settingsVersion = $state(0)
  let langSettings = $derived.by(() => {
    settingsVersion
    return language ? settingsOf(language) : {}
  })
  let langTheme = $derived(
    THEMES.includes(langSettings.theme as Theme) ? langSettings.theme as Theme : pickerTheme,
  )

  function setTheme(next: Theme) {
    pickerTheme = next
    store.setItem(THEME_KEY, next)
  }

  // Re-read on the way back from a deck, which may have changed it.
  $effect(() => {
    if (!language) pickerTheme = storedTheme()
  })

  // The reference page borrows the language's theme and title while it is up.
  $effect(() => {
    if (!language || view !== 'reference') return
    document.documentElement.dataset.theme = langTheme
    document.documentElement.lang = language.locale
    document.title = `${language.name} reference`
    paintStatusBar()
  })

  // The picker owns the document only while it is showing; the study screen sets
  // its own theme and title from the settings of the language being studied.
  // Kept apart from the effect above so neither writes what the other reads.
  $effect(() => {
    if (language) return
    document.documentElement.dataset.theme = pickerTheme
    document.documentElement.lang = 'en'
    document.title = 'Flashcards'
    paintStatusBar()
  })

  /** Keeps the browser chrome the colour of the page behind it. */
  function paintStatusBar() {
    const meta = document.querySelector('meta[name="theme-color"]')
    const bar = getComputedStyle(document.documentElement).getPropertyValue('--status-bar').trim()
    if (meta && bar) meta.setAttribute('content', bar)
  }

  // A route naming a language that does not exist is a typo or a stale
  // bookmark. Falling back to the picker is better than an empty screen.
  $effect(() => {
    if (route && !languageById(route.language)) leave()
  })

  function settingsOf(lang: LanguageDef): { theme?: Theme; speech?: boolean } {
    const raw = store.getItem(`${lang.storagePrefix}:settings`)
    try {
      return raw ? JSON.parse(raw) as { theme?: Theme; speech?: boolean } : {}
    } catch {
      // A corrupt blob is the study screen's problem to repair, not this one's.
      return {}
    }
  }

  /**
   * A theme chosen on the reference page is the same choice as one made while
   * studying, so it is written where the study screen will read it back.
   */
  function setLanguageTheme(lang: LanguageDef, next: Theme) {
    const key = `${lang.storagePrefix}:settings`
    store.setItem(key, JSON.stringify({ ...settingsOf(lang), theme: next }))
    settingsVersion += 1
    setTheme(next)
  }
</script>

{#if language && view === 'reference'}
  {#key language.id}
    <Reference
      {language}
      theme={langTheme}
      speech={langSettings.speech !== false}
      onstudy={() => open(language.id)}
      onleave={leave}
      ontheme={next => setLanguageTheme(language, next)}
    />
  {/key}
{:else if language}
  {#key language.id}
    <App {language} onleave={leave} onreference={() => open(language.id, 'reference')} />
  {/key}
{:else}
  <LanguagePicker
    languages={LANGUAGES}
    theme={pickerTheme}
    onpick={open}
    ontheme={setTheme}
  />
{/if}
