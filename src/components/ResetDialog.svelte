<script lang="ts">
  let {
    open, deckLabel, onconfirm, onclose,
  }: {
    open: boolean
    /** Named, so the button cannot be misread as clearing everything. */
    deckLabel: string
    onconfirm: () => void
    onclose: () => void
  } = $props()

  let dialog = $state<HTMLDialogElement | undefined>()

  // Reset lives in the toolbar where it is one tap away, so it asks first.
  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  })
</script>

<dialog
  bind:this={dialog}
  id="resetDialog"
  aria-label="Reset progress"
  onclose={onclose}
  onclick={(e) => { if (e.target === dialog) onclose() }}
>
  <div class="sheet">
    <h2>Reset {deckLabel}?</h2>
    <p>
      This clears the scheduling and review history for <b>{deckLabel}</b> and cannot
      be undone. Export a backup from Settings first if you are unsure.
    </p>
    <div class="buttons">
      <button id="resetConfirmBtn" class="bad" onclick={onconfirm}>Reset {deckLabel}</button>
      <button id="resetCancelBtn" onclick={onclose}>Cancel</button>
    </div>
  </div>
</dialog>

<style>
  dialog {
    padding: 0;
    border: none;
    background: transparent;
    max-width: none;
    color: var(--text);
  }
  dialog::backdrop { background: rgba(0, 0, 0, 0.55); }

  .sheet {
    width: min(400px, 92vw);
    padding: 18px 20px 20px;
    border: 1px solid var(--bad-line);
    border-radius: 18px;
    background: var(--surface-strong);
    box-shadow: var(--face-shadow);
    animation: rise var(--t-base) var(--ease);
  }
  @keyframes rise {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }

  h2 { margin: 0 0 8px; font-size: 17px; }
  p { margin: 0 0 14px; font-size: 13px; line-height: 1.5; color: var(--muted); }
  .buttons { display: flex; gap: 8px; flex-wrap: wrap; }
  .buttons button { font-size: 13px; }
</style>
