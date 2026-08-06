<script lang="ts">
  import type { Card } from '../lib/cards/schema.js'
  import type { AnnotationKind } from '../lib/annotations/index.js'

  let {
    kind, card, active, ontoggle,
  }: {
    kind: AnnotationKind
    card: Card
    active: boolean
    ontoggle: () => void
  } = $props()

  function click(event: MouseEvent) {
    // The card flips on tap; a marker must not double as one.
    event.stopPropagation()
    ontoggle()
  }
</script>

<button
  class="marker {kind.tone}"
  class:active
  data-annotation={kind.id}
  onclick={click}
  aria-expanded={active}
  aria-label={kind.describe(card)}
  title={kind.describe(card)}
>{kind.marker}</button>

<style>
  /* Quiet until looked for, and distinct from the grammar badges so it does not
     read as another tag. One tone per kind, so two markers side by side are
     telling you they offer different things. */
  .marker {
    min-height: 0;
    width: 1.5em;
    height: 1.5em;
    padding: 0;
    margin-left: 0.18em;
    vertical-align: top;
    font-size: clamp(11px, 1.6vw, 14px);
    font-weight: 800;
    line-height: 1;
    border-radius: 999px;
    border: 1px solid currentColor;
    background: transparent;
    color: var(--muted);
  }
  .marker:hover, .marker.active { color: var(--marker-on); }
  .accent { --marker-on: var(--accent); }
  .warm { --marker-on: var(--warn); }
</style>
