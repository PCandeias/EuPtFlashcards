<script lang="ts">
  let {
    onprev, onflip, onnext, onagain, onknown,
  }: {
    onprev: () => void
    onflip: () => void
    onnext: () => void
    onagain: () => void
    onknown: () => void
  } = $props()
</script>

<div class="controls">
  <button id="prevBtn" onclick={onprev}>← Prev</button>
  <button id="flipBtn" class="primary" onclick={onflip}>Flip</button>
  <button id="nextBtn" onclick={onnext}>Next →</button>
  <button id="againBtn" class="bad" onclick={onagain}>Again</button>
  <button id="knownBtn" class="good" onclick={onknown}>Known</button>
</div>

<style>
  .controls { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  @media (max-width: 760px) {
    .controls { grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
    .controls button { min-height: 40px; padding: 7px 8px; font-size: 13px; }
    #knownBtn { grid-column: span 2; font-weight: 800; }
  }
  @media (max-width: 420px) {
    .controls { grid-template-columns: 1fr 1fr; }
    #flipBtn { grid-column: 1 / -1; order: -1; }
    #knownBtn { grid-column: auto; }
  }
  @media (max-height: 700px) and (max-width: 760px) {
    .controls button { min-height: 36px; }
  }
</style>
