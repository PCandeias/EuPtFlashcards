<script lang="ts">
  let { total, due, known }: { total: number; due: number; known: number } = $props()
</script>

<div class="stats">
  <div class="stat"><b id="totalCount">{total}</b><span>Total</span></div>
  <div class="stat"><b id="dueCount">{due}</b><span>Due</span></div>
  <div class="stat"><b id="knownCount">{known}</b><span>Known</span></div>
</div>

<style>
  .stats { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .stat {
    min-width: 86px;
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
