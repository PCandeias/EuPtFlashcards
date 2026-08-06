<script lang="ts">
  import TenseSettings from './TenseSettings.svelte'
  import {
    THEMES, THEME_LABELS, type Direction, type Settings, type Theme,
  } from '../lib/storage/progress.js'
  import type { TenseId } from '../lib/verbs/tenses.js'

  let {
    open, settings, deckLabel, onchange, onclose, onexport, onimport, onreset,
  }: {
    open: boolean
    settings: Settings
    /** The deck a reset would clear, named so the button cannot be misread. */
    deckLabel: string
    onchange: (next: Partial<Settings>) => void
    onclose: () => void
    onexport: () => void
    onimport: (file: File) => void
    onreset: () => void
  } = $props()

  let dialog = $state<HTMLDialogElement | undefined>()
  let fileInput = $state<HTMLInputElement | undefined>()
  // Reset wipes real study history, so it asks first.
  let confirmingReset = $state(false)

  // A native dialog gives focus trapping and Escape without reimplementing them.
  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  })

  $effect(() => { if (!open) confirmingReset = false })

  function onDialogClick(event: MouseEvent) {
    // A click that lands on the dialog itself is a click on the backdrop.
    if (event.target === dialog) onclose()
  }

  async function pickFile(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (file) onimport(file)
  }
</script>

<dialog
  bind:this={dialog}
  id="settingsDialog"
  aria-label="Settings"
  onclose={onclose}
  onclick={onDialogClick}
>
  <div class="sheet">
    <header>
      <h2>Settings</h2>
      <button id="settingsCloseBtn" class="close" onclick={onclose} aria-label="Close settings">
        ×
      </button>
    </header>

    <section>
      <h3>Appearance</h3>
      <label class="row">
        <span>Theme</span>
        <select
          id="themeSelect"
          value={settings.theme}
          onchange={(e) => onchange({ theme: e.currentTarget.value as Theme })}
        >
          {#each THEMES as theme (theme)}
            <option value={theme}>{THEME_LABELS[theme]}</option>
          {/each}
        </select>
      </label>
      <p class="note">Azulejo is light, which reads better outdoors.</p>
    </section>

    <section>
      <h3>Studying</h3>
      <label class="row">
        <span>Direction</span>
        <select
          id="directionSelect"
          value={settings.direction}
          onchange={(e) => onchange({ direction: e.currentTarget.value as Direction })}
        >
          <option value="a-b">English → Portuguese · Portugal</option>
          <option value="b-a">Portuguese · Portugal → English</option>
        </select>
      </label>
    </section>

    <section>
      <h3>Conjugation</h3>
      <TenseSettings
        selected={settings.tenses}
        onchange={(tenses: TenseId[]) => onchange({ tenses })}
      />
    </section>

    <section>
      <h3>Progress</h3>
      <p class="note">
        iOS clears stored data after a week without use, and deleting the installed
        app takes its data with it. A backup is the only way back.
      </p>
      <div class="buttons">
        <button id="exportBtn" onclick={onexport}>Export backup</button>
        <button id="importBtn" onclick={() => fileInput?.click()}>Import backup</button>
        <input
          bind:this={fileInput}
          type="file"
          accept="application/json,.json"
          onchange={pickFile}
          hidden
        />
      </div>
    </section>

    <section class="danger">
      <h3>Reset</h3>
      {#if confirmingReset}
        <p class="note">
          This clears your scheduling and review counts for <b>{deckLabel}</b>. It
          cannot be undone — export a backup first if you are unsure.
        </p>
        <div class="buttons">
          <button id="resetConfirmBtn" class="bad" onclick={() => { onreset(); confirmingReset = false }}>
            Yes, reset {deckLabel}
          </button>
          <button onclick={() => { confirmingReset = false }}>Cancel</button>
        </div>
      {:else}
        <div class="buttons">
          <button id="resetBtn" onclick={() => { confirmingReset = true }}>
            Reset progress for {deckLabel}
          </button>
        </div>
      {/if}
    </section>
  </div>
</dialog>

<style>
  dialog {
    padding: 0;
    border: none;
    background: transparent;
    max-width: none;
    max-height: none;
    color: var(--text);
  }
  dialog::backdrop { background: rgba(0, 0, 0, 0.55); }

  .sheet {
    width: min(520px, 92vw);
    max-height: 86svh;
    overflow-y: auto;
    padding: 18px 20px 22px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--surface-strong);
    box-shadow: var(--face-shadow);
    animation: rise var(--t-base) var(--ease);
  }
  @keyframes rise {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }

  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  h2 { margin: 0; font-size: 20px; letter-spacing: -0.02em; }
  .close { min-height: 34px; width: 34px; padding: 0; font-size: 20px; line-height: 1; }

  section { margin-top: 20px; }
  section + section { border-top: 1px solid var(--border); padding-top: 16px; }
  h3 {
    margin: 0 0 10px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--accent);
  }

  .row { display: grid; grid-template-columns: minmax(90px, auto) 1fr; gap: 12px; align-items: center; }
  .row span { font-size: 14px; }
  .note { margin: 8px 0 0; font-size: 12px; color: var(--muted); line-height: 1.5; }
  .buttons { display: flex; flex-wrap: wrap; gap: 8px; }
  .buttons button { font-size: 13px; }

  .danger h3 { color: var(--bad); }

  @media (max-width: 760px) {
    /* Full-height sheet on a phone: a centred box in the middle of the screen is
       harder to reach than one anchored to the bottom. */
    .sheet {
      width: 100vw;
      max-height: 92svh;
      border-radius: 20px 20px 0 0;
      padding-bottom: calc(22px + env(safe-area-inset-bottom));
    }
    dialog {
      margin: auto auto 0;
    }
    .row { grid-template-columns: 1fr; gap: 6px; }
  }
</style>
