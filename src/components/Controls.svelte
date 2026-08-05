<script lang="ts">
  import { formatInterval, type Rating, type ReviewState } from '../lib/study/sm2.js'
  import { nextIntervals } from '../lib/study/sm2.js'

  let {
    state, onprev, onflip, onnext, onrate,
  }: {
    state: ReviewState
    onprev: () => void
    onflip: () => void
    onnext: () => void
    onrate: (rating: Rating) => void
  } = $props()

  // Showing what each answer will cost turns grading from a guess into a choice.
  let intervals = $derived(nextIntervals(state))

  const BUTTONS: Array<{ rating: Rating; label: string; cls: string; key: string }> = [
    { rating: 'again', label: 'Again', cls: 'again', key: '1' },
    { rating: 'hard', label: 'Hard', cls: 'hard', key: '2' },
    { rating: 'good', label: 'Good', cls: 'good', key: '3' },
    { rating: 'easy', label: 'Easy', cls: 'easy', key: '4' },
  ]
</script>

<div class="controls">
  <div class="nav">
    <button id="prevBtn" onclick={onprev}>← Prev</button>
    <button id="flipBtn" class="primary" onclick={onflip}>Flip</button>
    <button id="nextBtn" onclick={onnext}>Next →</button>
  </div>

  <div class="ratings">
    {#each BUTTONS as b (b.rating)}
      <button
        id="{b.rating}Btn"
        class="rating {b.cls}"
        title="{b.label} — next review in {formatInterval(intervals[b.rating])} (key {b.key})"
        onclick={() => onrate(b.rating)}
      >
        <span class="label">{b.label}</span>
        <span class="interval">{formatInterval(intervals[b.rating])}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .controls { display: grid; gap: 8px; }
  .nav { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .ratings { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }

  .rating {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 4px;
  }
  .rating .label { font-weight: 700; }
  .rating .interval { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }

  /* Red through green, so the cost of each answer reads at a glance. */
  .again { border-color: rgba(251, 113, 133, 0.55); background: rgba(251, 113, 133, 0.14); }
  .hard  { border-color: rgba(251, 191, 36, 0.5);  background: rgba(251, 191, 36, 0.12); }
  .good  { border-color: rgba(56, 189, 248, 0.5);  background: rgba(56, 189, 248, 0.14); }
  .easy  { border-color: rgba(34, 197, 94, 0.55);  background: rgba(34, 197, 94, 0.15); }

  @media (max-width: 760px) {
    .controls { gap: 6px; }
    .nav, .ratings { gap: 6px; }
    .nav button { min-height: 38px; padding: 6px 8px; font-size: 13px; }
    .rating { min-height: 46px; padding: 4px 2px; }
    .rating .label { font-size: 13px; }
    .rating .interval { font-size: 10px; }
  }
  @media (max-height: 700px) and (max-width: 760px) {
    .nav button { min-height: 34px; }
    .rating { min-height: 42px; }
  }
</style>
