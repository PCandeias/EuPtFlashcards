<script lang="ts">
  import type { ExamplesPayload } from '../../lib/annotations/examples.js'
  import { tenseById } from '../../lib/verbs/tenses.js'

  let {
    payload, onclose,
  }: {
    payload: ExamplesPayload
    onclose: () => void
  } = $props()

  $effect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onclose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
</script>

<div class="panel" id="examplesPanel" role="dialog" aria-label="Examples with {payload.subject}">
  <div class="head">
    <span class="infinitive">{payload.subject}</span>
    <span class="what">in use</span>
    <button class="close" onclick={onclose} aria-label="Close examples">×</button>
  </div>

  <ul>
    {#each payload.examples as example (example.pt)}
      <li>
        <p class="pt">{example.pt}</p>
        <p class="en">{example.en}</p>
        <!-- Named, so it is clear which tense you are looking at. -->
        <p class="tense">{tenseById(example.tense)?.label ?? example.tense}</p>
      </li>
    {/each}
  </ul>

  {#if payload.hidden}
    <p class="hidden">
      {payload.hidden} more in tenses you are not studying.
    </p>
  {/if}
</div>

<style>
  .panel {
    position: absolute;
    left: 50%;
    bottom: 8px;
    transform: translateX(-50%);
    z-index: 20;
    width: max-content;
    max-width: min(90%, 380px);
    padding: 12px 14px;
    text-align: left;
    border: 1px solid var(--warn-line);
    border-radius: 16px;
    background: var(--surface-strong);
    box-shadow: var(--face-shadow);
    animation: pop var(--t-base) var(--ease);
  }
  @keyframes pop {
    from { opacity: 0; transform: translate(-50%, 6px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  .head { display: flex; align-items: baseline; gap: 8px; }
  .infinitive { font-size: 15px; font-weight: 800; color: var(--warn); }
  .what { flex: 1; font-size: 11px; color: var(--muted); }
  .close {
    min-height: 28px;
    width: 28px;
    padding: 0;
    font-size: 16px;
    line-height: 1;
    color: var(--muted);
    align-self: center;
  }

  ul { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 10px; }
  li { display: grid; gap: 1px; }
  .pt { margin: 0; font-size: 14px; font-weight: 700; }
  .en { margin: 0; font-size: 12px; color: var(--muted); }
  .tense { margin: 1px 0 0; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--warn); opacity: 0.85; }
  .hidden { margin: 10px 0 0; font-size: 11px; color: var(--muted); }

  @media (max-width: 760px) {
    .panel { padding: 10px 12px; max-width: 92%; }
    .pt { font-size: 13px; }
    .en { font-size: 11px; }
  }
</style>
