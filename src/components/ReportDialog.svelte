<script lang="ts">
  import type { Card } from '../lib/cards/schema.js'

  let {
    open, card, onconfirm, onclose,
  }: {
    open: boolean
    card: Card | undefined
    onconfirm: () => void
    onclose: () => void
  } = $props()

  let dialog = $state<HTMLDialogElement | undefined>()

  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  })
</script>

<dialog
  bind:this={dialog}
  id="reportDialog"
  aria-label="Report this card"
  onclose={onclose}
  onclick={(e) => { if (e.target === dialog) onclose() }}
>
  <div class="sheet">
    <h2>Report this card?</h2>
    {#if card}
      <p class="preview">
        <span class="en">{card.en}</span>
        <span class="sep">=</span>
        <span class="target">{card.target}</span>
      </p>
    {/if}
    <p class="note">
      It will stop appearing straight away. You can see everything you have
      reported under Settings, put a card back, or export the list to fix later.
    </p>
    <div class="buttons">
      <button id="reportConfirmBtn" class="bad" onclick={onconfirm}>Report and hide</button>
      <button id="reportCancelBtn" onclick={onclose}>Cancel</button>
    </div>
  </div>
</dialog>

<style>
  dialog { padding: 0; border: none; background: transparent; max-width: none; color: var(--text); }
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

  h2 { margin: 0 0 10px; font-size: 17px; }
  .preview {
    margin: 0 0 10px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 12px;
    font-size: 14px;
  }
  .en { font-weight: 600; }
  .sep { color: var(--muted); margin: 0 6px; }
  .target { font-weight: 800; }
  .note { margin: 0 0 14px; font-size: 13px; line-height: 1.5; color: var(--muted); }
  .buttons { display: flex; gap: 8px; flex-wrap: wrap; }
  .buttons button { font-size: 13px; }
</style>
