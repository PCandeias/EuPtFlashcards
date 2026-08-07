<script lang="ts">
  import type { SuffixPayload } from '../../lib/annotations/suffixes.js'

  let {
    payload, onclose,
  }: {
    payload: SuffixPayload
    onclose: () => void
  } = $props()

  let word = $derived(payload.word)
  let rows = $derived(payload.rows)

  $effect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onclose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
</script>

<!--
  The same shape as the conjugation panel, for the same reason: it is a reference
  you open beside a word, not a place you go. Drawn over the card and capped so it
  cannot reach the word it is about.
-->
<div class="panel" id="suffixPanel" role="dialog" aria-label="Suffixes on {word}">
  <div class="head">
    <span class="word">{word}</span>
    <span class="what">with endings</span>
    <button class="close" onclick={onclose} aria-label="Close suffixes">×</button>
  </div>

  <p class="hint">{payload.harmony}</p>

  <table>
    <tbody>
      {#each rows as row (row.id)}
        <tr>
          <th scope="row">
            <span class="shape">{row.shape}</span>
            <span class="gloss">{row.gloss}</span>
          </th>
          <td>{row.form}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .panel {
    position: absolute;
    left: 50%;
    bottom: 8px;
    transform: translateX(-50%);
    z-index: 20;
    width: min(92%, 440px);
    max-height: min(42%, 240px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 12px 14px;
    text-align: left;
    border: 1px solid var(--accent-line);
    border-radius: 16px;
    background: var(--surface-strong);
    box-shadow: var(--face-shadow);
    animation: pop var(--t-base) var(--ease);
  }
  @keyframes pop {
    from { opacity: 0; transform: translate(-50%, 6px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .panel { animation: none; }
  }

  .head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .word { font-weight: 650; color: var(--accent); font-size: 15px; }
  .what { color: var(--muted); font-size: 12px; }
  .close {
    margin-left: auto;
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--muted);
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
  }
  .hint { margin: 0 0 8px; color: var(--muted); font-size: 11px; line-height: 1.35; }

  /* The form on the right must never be pushed out of the box, so the gloss on
     the left is what wraps. */
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  tr + tr th, tr + tr td { border-top: 1px solid var(--line-soft, rgba(148, 163, 184, 0.12)); }
  th {
    text-align: left;
    font-weight: 400;
    padding: 3px 10px 3px 0;
    vertical-align: baseline;
    white-space: normal;
  }
  .shape { color: var(--accent); font-size: 12px; white-space: nowrap; }
  .gloss { color: var(--muted); font-size: 11px; margin-left: 6px; }
  td {
    padding: 3px 0;
    font-weight: 650;
    text-align: right;
    white-space: nowrap;
    width: 40%;
  }

  @media (max-width: 760px) {
    .panel { padding: 10px 12px; }
    .shape { font-size: 11px; }
    .gloss { font-size: 10px; }
    td { font-size: 13px; }
  }
</style>
