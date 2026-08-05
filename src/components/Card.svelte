<script lang="ts">
  import Badge from './Badge.svelte'
  import SpeakButton from './SpeakButton.svelte'
  import { badgesFor, hintFor } from '../lib/render/tags.js'
  import type { Card } from '../lib/cards/schema.js'
  import type { Direction } from '../lib/storage/progress.js'

  let {
    card, direction, flipped, onflip, onswipe,
  }: {
    card: Card
    direction: Direction
    flipped: boolean
    onflip: () => void
    onswipe: (delta: number) => void
  } = $props()

  const LANG_LABEL = 'Portuguese · Portugal'
  const OTHER_LABEL = 'English'

  let frontSide = $derived(direction === 'a-b' ? ('en' as const) : ('pt' as const))
  let backSide = $derived(direction === 'a-b' ? ('pt' as const) : ('en' as const))
  let frontLabel = $derived(direction === 'a-b' ? OTHER_LABEL : LANG_LABEL)
  let backLabel = $derived(direction === 'a-b' ? LANG_LABEL : OTHER_LABEL)

  // Swipe: horizontal intent only, so vertical scrolling still works.
  let startX = 0
  let startY = 0
  let tracking = false

  /**
   * Controls sitting on a face must not double as a tap-to-flip. The flip fires on
   * pointerup, so stopPropagation on the button's click would come too late.
   */
  function fromControl(event: Event): boolean {
    const target = event.target as HTMLElement | null
    return !!target?.closest('button, a, input, select, textarea')
  }

  function onPointerDown(event: PointerEvent) {
    if (fromControl(event)) { tracking = false; return }
    startX = event.clientX
    startY = event.clientY
    tracking = true
  }

  function onPointerUp(event: PointerEvent) {
    if (!tracking || fromControl(event)) return
    tracking = false
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      onswipe(dx < 0 ? 1 : -1)
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      onflip()
    }
  }
</script>

<div class="cardwrap">
  <div
    class="card"
    class:flipped
    role="button"
    tabindex="0"
    aria-label="Flashcard, activate to flip"
    onpointerdown={onPointerDown}
    onpointerup={onPointerUp}
    onkeydown={(e) => { if (e.key === 'Enter') onflip() }}
  >
    {#each [{ side: frontSide, label: frontLabel, face: 'front', note: 'Tap to flip · swipe left/right to move' }, { side: backSide, label: backLabel, face: 'back', note: 'Mark as known to delay this card' }] as f (f.face)}
      <section class="face {f.face}">
        <div class="label">{f.label}</div>
        <div class="word">
          {card[f.side]}
          {#if badgesFor(card, f.side).length}
            <span class="badges">
              {#each badgesFor(card, f.side) as spec (spec.tag)}
                <Badge {spec} />
              {/each}
            </span>
          {/if}
        </div>
        {#if hintFor(card, f.side)}
          <div class="hint">{hintFor(card, f.side)}</div>
        {/if}
        <!-- Only the Portuguese: hearing the English back teaches nothing. -->
        {#if f.side === 'pt'}
          <SpeakButton text={card.pt} />
        {/if}
        <div class="note">{f.note}</div>
      </section>
    {/each}
  </div>
</div>

<style>
  .cardwrap { perspective: 1400px; min-height: 0; }
  .card {
    height: 100%;
    min-height: 300px;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.32s ease;
    touch-action: pan-y;
    cursor: pointer;
  }
  .card.flipped { transform: rotateY(180deg); }
  .face {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 28px;
    border: 1px solid var(--border);
    border-radius: 26px;
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98));
    backface-visibility: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }
  .back { transform: rotateY(180deg); }
  .label {
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 12px;
    font-weight: 800;
    margin-bottom: 16px;
  }
  .word {
    font-size: clamp(32px, 7vw, 72px);
    line-height: 1.08;
    text-align: center;
    font-weight: 800;
    letter-spacing: -0.04em;
    overflow-wrap: anywhere;
  }
  /* Badges ride at the top-right of the word, never inside it. */
  .badges {
    display: inline-flex;
    gap: 4px;
    vertical-align: top;
    margin-left: 0.14em;
    white-space: nowrap;
  }
  .hint {
    color: var(--muted);
    font-size: clamp(12px, 2.2vw, 15px);
    font-weight: 600;
    margin-top: 12px;
    text-align: center;
    letter-spacing: 0;
  }
  .note { color: var(--muted); font-size: 13px; margin-top: 16px; text-align: center; }

  /* The offsets subtract the surrounding chrome from the viewport. The backup row
     is new in this version, so it is subtracted too — otherwise the card grows by
     its height and pushes Known/Again further off screen. */
  @media (max-width: 760px) {
    .card { min-height: 0; height: calc(100svh - 328px); max-height: 48svh; }
    .face { padding: 16px; border-radius: 20px; }
    .label { font-size: 10px; margin-bottom: 10px; }
    .word { font-size: clamp(26px, 10vw, 48px); letter-spacing: -0.025em; }
    .badges { gap: 3px; margin-left: 0.14em; }
    .hint { font-size: 12px; margin-top: 8px; }
    .note { font-size: 11px; margin-top: 10px; }
  }
  @media (max-width: 420px) {
    .card { height: calc(100svh - 300px); max-height: 49svh; }
  }
  /* Short screens drop the static instruction but never the hint, which the
     card cannot be answered without. */
  @media (max-height: 700px) and (max-width: 760px) {
    .card { height: calc(100svh - 256px); max-height: 54svh; }
    .note { display: none; }
  }
</style>
