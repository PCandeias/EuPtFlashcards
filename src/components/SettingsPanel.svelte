<script lang="ts">
  import TenseSettings from './TenseSettings.svelte'
  import type { Settings } from '../lib/storage/progress.js'
  import type { TenseId } from '../lib/verbs/tenses.js'

  let {
    open, settings, onchange, onclose, onexport, onimport,
  }: {
    open: boolean
    settings: Settings
    onchange: (next: Partial<Settings>) => void
    onclose: () => void
    onexport: () => void
    onimport: (file: File) => void
  } = $props()

  let dialog = $state<HTMLDialogElement | undefined>()
  let fileInput = $state<HTMLInputElement | undefined>()

  // A native dialog gives focus trapping and Escape without reimplementing them.
  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  })

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
      <h3>Audio</h3>
      <label class="toggle">
        <input
          id="speechToggle"
          type="checkbox"
          checked={settings.speech}
          onchange={(e) => onchange({ speech: e.currentTarget.checked })}
        />
        <span>Offer spoken pronunciation</span>
      </label>
      <p class="note">
        Adds a speaker to the Portuguese side of a card and to each example
        sentence. Off hides them entirely. On iOS the voice is largely the
        system's choice, and the app says so when it is not European Portuguese.
      </p>
    </section>

    <section>
      <h3>Tenses</h3>
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

  .note { margin: 8px 0 0; font-size: 12px; color: var(--muted); line-height: 1.5; }
  .toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; }
  .toggle input { accent-color: var(--accent); width: 16px; height: 16px; }
  .buttons { display: flex; flex-wrap: wrap; gap: 8px; }
  .buttons button { font-size: 13px; }

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
  }
</style>
