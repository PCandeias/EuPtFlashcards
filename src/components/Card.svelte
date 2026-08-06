<script lang="ts">
  import Badge from './Badge.svelte'
  import SpeakButton from './SpeakButton.svelte'
  import AnnotationMarker from './AnnotationMarker.svelte'
  import { badgesFor, hintFor } from '../lib/render/tags.js'
  import { cardId, type Card } from '../lib/cards/schema.js'
  import type { Direction } from '../lib/storage/progress.js'
  import type { ResolvedAnnotation } from '../lib/annotations/index.js'
  import type { LanguageDef } from '../lib/languages/types.js'

  let {
    card, language, direction, flipped, annotations = [], openAnnotation = null,
    compact = false, speech = true, onflip, onswipe, onannotate, onreport,
  }: {
    card: Card
    language: LanguageDef
    direction: Direction
    flipped: boolean
    /** Whatever the registry found to say about this card. */
    annotations?: ResolvedAnnotation[]
    /** The id of the annotation whose panel is open, if any. */
    openAnnotation?: string | null
    /** Whether spoken pronunciation is offered at all. */
    speech?: boolean
    /** Typing mode adds an input row, so the card yields that space to it. */
    compact?: boolean
    onflip: () => void
    onswipe: (delta: number) => void
    onannotate?: (id: string) => void
    onreport?: () => void
  } = $props()

  const OTHER_LABEL = 'English'

  let frontSide = $derived(direction === 'a-b' ? ('en' as const) : ('target' as const))
  let backSide = $derived(direction === 'a-b' ? ('target' as const) : ('en' as const))
  let frontLabel = $derived(direction === 'a-b' ? OTHER_LABEL : language.name)
  let backLabel = $derived(direction === 'a-b' ? language.name : OTHER_LABEL)

  let faces = $derived([
    {
      side: frontSide, label: frontLabel, face: 'front',
      note: 'Tap to flip · swipe left/right to move',
    },
    {
      side: backSide, label: backLabel, face: 'back',
      note: 'Grade it to schedule the next review',
    },
  ])

  // Re-keying on the card fades the new one in; without it the text swaps
  // instantly and reads as a glitch rather than a change.
  let key = $derived(cardId(card))

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

<div class="cardwrap" class:compact>
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
    {#each faces as f (f.face)}
      <section class="face {f.face}">
        {#if onreport}
          <button
            class="report"
            onclick={(e) => { e.stopPropagation(); onreport() }}
            aria-label="Report this card as incorrect"
            title="Report this card as incorrect"
          >!</button>
        {/if}
        {#key key}
          <div class="content">
            <div class="label">{f.label}</div>
            <div class="word">
              {card[f.side]}
              {#if badgesFor(card, f.side, language.badgeHints).length}
                <span class="badges">
                  {#each badgesFor(card, f.side, language.badgeHints) as spec (spec.tag)}
                    <Badge {spec} />
                  {/each}
                </span>
              {/if}
              <!-- Annotations describe the Portuguese, so the markers sit with
                   it; the panels themselves are rendered outside the card. -->
              {#if f.side === 'target' && onannotate}
                {#each annotations as annotation (annotation.kind.id)}
                  <AnnotationMarker
                    kind={annotation.kind}
                    {card}
                    active={openAnnotation === annotation.kind.id}
                    ontoggle={() => onannotate(annotation.kind.id)}
                  />
                {/each}
              {/if}
            </div>
            {#if hintFor(card, f.side)}
              <div class="hint">{hintFor(card, f.side)}</div>
            {/if}
            <!-- Only the target language: hearing the English back teaches nothing. -->
            {#if speech && f.side === 'target'}
              <SpeakButton text={card.target} {language} />
            {/if}
            <div class="note">{f.note}</div>
          </div>
        {/key}
      </section>
    {/each}
  </div>
</div>

<style>
  /*
   * The card fills whatever the grid gives it. It used to be sized by
   * calc(100svh - 300px) with svh caps — guesses at the surrounding chrome that
   * broke every time a row was added, and did twice.
   */
  .cardwrap {
    perspective: 1400px;
    min-height: 0;
    height: 100%;
  }
  /* Purely proportion: on a large screen a full-height card leaves the word
     stranded in an empty field. Safe to cap, because the grid — not this — is
     what guarantees the page fits. */
  @media (min-width: 761px) {
    .cardwrap { max-height: 480px; align-self: center; }
  }
  .card {
    height: 100%;
    min-height: 120px;
    position: relative;
    transform-style: preserve-3d;
    transition: transform var(--t-flip) var(--ease);
    touch-action: pan-y;
    cursor: pointer;
  }
  .card.flipped { transform: rotateY(180deg); }

  .face {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 28px;
    border: 1px solid var(--border);
    border-radius: 26px;
    background: var(--face-bg);
    backface-visibility: hidden;
    box-shadow: var(--face-shadow);
    overflow: hidden;
  }
  .back { transform: rotateY(180deg); }

  /* In the corner rather than beside the word: this is about the card, not about
     what the card teaches, and it should be hard to hit by accident. */
  .report {
    position: absolute;
    top: 10px;
    right: 12px;
    z-index: 2;
    min-height: 0;
    width: 1.6em;
    height: 1.6em;
    padding: 0;
    font-size: 13px;
    font-weight: 800;
    line-height: 1;
    border-radius: 999px;
    border: 1px solid currentColor;
    background: transparent;
    /* Red, so its meaning is legible at a glance, but held back so it does not
       compete with the word. */
    color: var(--bad);
    opacity: 0.5;
  }
  .report:hover { opacity: 1; background: var(--bad-soft); }

  /* Hit-testing should match what is visible: the hidden face must not catch
     clicks aimed at the one facing you, or intercept clicks meant for the card. */
  .card:not(.flipped) .back,
  .card.flipped .front { pointer-events: none; }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    animation: rise var(--t-base) var(--ease);
  }
  @keyframes rise {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: none; }
  }

  .label {
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 11px;
    font-weight: 800;
    margin-bottom: 18px;
  }
  .word {
    font-size: clamp(30px, 6.5vw, 68px);
    line-height: 1.06;
    text-align: center;
    font-weight: 800;
    letter-spacing: -0.035em;
    overflow-wrap: anywhere;
    text-wrap: balance;
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
    margin-top: 14px;
    text-align: center;
    letter-spacing: 0;
  }
  .note { color: var(--muted); font-size: 12px; margin-top: 18px; text-align: center; }

  @media (max-width: 760px) {
    .face { padding: 16px; border-radius: 20px; }
    .label { font-size: 10px; margin-bottom: 10px; letter-spacing: 0.14em; }
    .word { font-size: clamp(24px, 9vw, 46px); letter-spacing: -0.02em; }
    .badges { gap: 3px; }
    .hint { font-size: 12px; margin-top: 8px; }
    .note { font-size: 11px; margin-top: 10px; }
  }
  /* On a short screen the static instruction goes, but never the hint — the card
     cannot be answered without it. */
  @media (max-height: 700px) and (max-width: 760px) {
    .note { display: none; }
    .card { min-height: 96px; }
  }
</style>
