<script lang="ts">
  import { createSpeaker, buildUtterance } from '../lib/speech/speaker.js'
  import { describeVoice, isMisleading } from '../lib/speech/voices.js'

  let { text }: { text: string } = $props()

  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  const speaker = createSpeaker(synthesis, buildUtterance)

  let warning = $state<string | null>(null)

  function speak(event: MouseEvent) {
    // iOS drops utterances not started from a user gesture, so this must stay in
    // the click handler — no awaits before speak().
    event.stopPropagation()
    speaker.speak(text)

    // Voices often populate only after the first call, so the check happens here
    // rather than on mount.
    const choice = speaker.choice()
    warning = isMisleading(choice) ? describeVoice(choice) : null
  }
</script>

{#if speaker.available}
  <button class="speak" onclick={speak} aria-label="Hear this in Portuguese" title="Hear it">
    <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
      <path
        d="M4 9v6h4l5 4V5L8 9H4z M16.5 8.5a5 5 0 0 1 0 7 M19 6a8 8 0 0 1 0 12"
        fill="none" stroke="currentColor" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round"
      />
    </svg>
  </button>
  {#if warning}
    <!-- Said plainly: a Brazilian voice would undo the point of a European deck. -->
    <p class="warning">{warning}</p>
  {/if}
{/if}

<style>
  .speak {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    width: 44px;
    padding: 0;
    margin-top: 12px;
    color: var(--accent);
    border-color: var(--accent-line);
    background: var(--accent-soft);
  }
  .warning {
    margin: 8px 0 0;
    color: var(--warn);
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    max-width: 28ch;
  }
  @media (max-width: 760px) {
    .speak { min-height: 34px; width: 38px; margin-top: 8px; }
    .warning { font-size: 10px; }
  }
</style>
