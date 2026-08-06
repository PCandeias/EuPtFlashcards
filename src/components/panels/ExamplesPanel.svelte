<script lang="ts">
  import type { ExamplesPayload } from '../../lib/annotations/examples.js'
  import { tenseById } from '../../lib/grammar/tenses.js'
  import SpeakButton from '../SpeakButton.svelte'

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
    {#each payload.examples as example (example.target)}
      <li>
        <div class="line">
          <p class="target">{example.target}</p>
          {#if payload.speech}
            <SpeakButton
              text={example.target}
              language={{ locale: payload.locale, shortName: payload.languageName, voice: payload.voice }}
              compact
            />
          {/if}
        </div>
        <p class="en">{example.en}</p>
        <!-- Named, so it is clear which tense you are looking at. A sentence
             with no finite verb has none to name. -->
        {#if example.tense}
          <p class="tense">{tenseById(example.tense)?.label ?? example.tense}</p>
        {/if}
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
    /*
     * Capped at 45% of the card area, so the top 55% — the word being explained
     * and the markers beside it — is never covered. Without the cap, a tall
     * panel on a short screen reached the middle of the card and swallowed both,
     * and the other marker could not be tapped at all. Long content scrolls
     * inside the panel rather than growing over the word.
     */
    max-height: min(45%, 240px);
    overflow-y: auto;
    overscroll-behavior: contain;
    max-width: min(92%, 440px);
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
  .line { display: flex; align-items: center; gap: 8px; }
  .line .target { flex: 1; }
  .target { margin: 0; font-size: 14px; font-weight: 700; }
  .en { margin: 0; font-size: 12px; color: var(--muted); }
  .tense { margin: 1px 0 0; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--warn); opacity: 0.85; }
  .hidden { margin: 10px 0 0; font-size: 11px; color: var(--muted); }

  @media (max-width: 760px) {
    .panel { padding: 10px 12px; }
    .target { font-size: 13px; }
    .en { font-size: 11px; }
  }
</style>
