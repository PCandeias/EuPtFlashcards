<script lang="ts">
  let {
    infinitive, active, ontoggle,
  }: {
    infinitive: string
    active: boolean
    ontoggle: () => void
  } = $props()

  function click(event: MouseEvent) {
    // The card flips on tap; this must not double as one.
    event.stopPropagation()
    ontoggle()
  }
</script>

<button
  class="marker"
  class:active
  onclick={click}
  aria-expanded={active}
  aria-label="Show the conjugation of {infinitive}"
  title="Conjugate {infinitive}"
>?</button>

<style>
  /* Quiet until looked for, and distinct from the grammar badges so it does not
     read as another tag. */
  .marker {
    min-height: 0;
    width: 1.5em;
    height: 1.5em;
    padding: 0;
    margin-left: 0.2em;
    vertical-align: top;
    font-size: clamp(11px, 1.6vw, 14px);
    font-weight: 800;
    line-height: 1;
    border-radius: 999px;
    border: 1px solid currentColor;
    background: transparent;
    color: var(--muted);
  }
  .marker:hover, .marker.active { color: var(--accent); }
</style>
