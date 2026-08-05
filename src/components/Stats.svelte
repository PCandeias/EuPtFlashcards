<script lang="ts">
  let {
    total, due, learned, mature,
  }: { total: number; due: number; learned: number; mature: number } = $props()
</script>

<div class="stats">
  <div class="stat"><b id="totalCount">{total}</b><span>Total</span></div>
  <div class="stat"><b id="dueCount">{due}</b><span>Due</span></div>
  <div class="stat"><b id="learnedCount">{learned}</b><span>Learned</span></div>
  <div class="stat" title="Cards with an interval of three weeks or more">
    <b id="matureCount">{mature}</b><span>Mature</span>
  </div>
</div>

<style>
  .stats { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .stat {
    min-width: 78px;
    padding: 10px 12px;
    background: rgba(17, 24, 39, 0.72);
    border: 1px solid var(--border);
    border-radius: 14px;
  }
  .stat b { display: block; font-size: 18px; }
  .stat span { color: var(--muted); font-size: 11px; }
  @media (max-width: 760px) {
    .stats { display: none; }
  }
</style>
