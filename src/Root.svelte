<script lang="ts">
  import './styles/tokens.css'
  import App from './App.svelte'
  import LanguagePicker from './components/LanguagePicker.svelte'
  import { LANGUAGES, languageById } from './lib/languages/index.js'
  import { currentRoute, leave, onRouteChange, open, THEME_KEY } from './lib/router.js'
  import { THEMES, type Theme } from './lib/storage/progress.js'

  let route = $state(currentRoute())
  $effect(() => onRouteChange(next => { route = next }))

  let language = $derived(route ? languageById(route) ?? null : null)

  /**
   * The picker's theme.
   *
   * Each language stores its own settings, so the picker belongs to neither. It
   * reads the last theme chosen anywhere in the app instead, which is written
   * below and by the study screen — otherwise leaving a deck would flash the
   * default palette on the way out.
   */
  function storedTheme(): Theme {
    const raw = localStorage.getItem(THEME_KEY)
    return THEMES.includes(raw as Theme) ? (raw as Theme) : 'slate'
  }
  let pickerTheme = $state<Theme>(storedTheme())

  function setTheme(next: Theme) {
    pickerTheme = next
    localStorage.setItem(THEME_KEY, next)
  }

  // The picker owns the document only while it is showing; the study screen sets
  // its own theme and title from the settings of the language being studied.
  $effect(() => {
    if (language) return
    pickerTheme = storedTheme()
    document.documentElement.dataset.theme = pickerTheme
    document.documentElement.lang = 'en'
    document.title = 'Flashcards'
  })

  // A route naming a language that does not exist is a typo or a stale
  // bookmark. Falling back to the picker is better than an empty screen.
  $effect(() => {
    if (route && !languageById(route)) leave()
  })
</script>

{#if language}
  {#key language.id}
    <App {language} onleave={leave} />
  {/key}
{:else}
  <LanguagePicker
    languages={LANGUAGES}
    theme={pickerTheme}
    onpick={open}
    ontheme={setTheme}
  />
{/if}
