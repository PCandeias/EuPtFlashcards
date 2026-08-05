<script lang="ts">
  import { streak, retention, recentDays, totalReviews, type History } from '../lib/study/history.js'

  let {
    total, due, learned, mature, history, now,
  }: {
    total: number
    due: number
    learned: number
    mature: number
    history: History
    now: number
  } = $props()

  const WINDOW_DAYS = 14

  let days = $derived(recentDays(history, WINDOW_DAYS, now))
  let peak = $derived(Math.max(1, ...days.map(d => d.total)))
  let currentStreak = $derived(streak(history, now))
  let recall = $derived(retention(history, 30, now))
  let reviews = $derived(totalReviews(history))
</script>

<div class="stats">
  <div class="stat"><b id="dueCount">{due}</b><span>Due</span></div>
  <div class="stat"><b id="learnedCount">{learned}</b><span>Learned</span></div>
  <div class="stat" title="Cards with an interval of three weeks or more">
    <b id="matureCount">{mature}</b><span>Mature</span>
  </div>
  <div class="stat" title="Consecutive days studied">
    <b id="streakCount">{currentStreak}</b><span>Streak</span>
  </div>
  <div class="stat" title="Share of the last 30 days' reviews you recalled">
    <!-- Dash rather than 0%: nothing measured is not the same as total failure. -->
    <b id="retentionCount">{recall === null ? '—' : `${Math.round(recall * 100)}%`}</b>
    <span>Recall</span>
  </div>
  <div class="stat total" title="{total} cards in the collection">
    <b id="totalCount">{total}</b><span>Cards</span>
  </div>
</div>

<div class="sparkline" title="Reviews over the last {WINDOW_DAYS} days ({reviews} all time)">
  {#each days as day (day.key)}
    <span
      class="bar"
      class:empty={day.total === 0}
      style="height: {Math.max(2, (day.total / peak) * 100)}%"
      title="{day.key}: {day.total} review{day.total === 1 ? '' : 's'}"
    ></span>
  {/each}
</div>

<style>
  .stats { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .stat {
    min-width: 68px;
    padding: 8px 10px;
    background: rgba(17, 24, 39, 0.72);
    border: 1px solid var(--border);
    border-radius: 14px;
  }
  .stat b { display: block; font-size: 17px; font-variant-numeric: tabular-nums; }
  .stat span { color: var(--muted); font-size: 11px; }

  .sparkline {
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    gap: 3px;
    height: 26px;
    margin-top: 6px;
  }
  .bar {
    width: 8px;
    border-radius: 2px;
    background: var(--accent);
    opacity: 0.85;
  }
  .bar.empty { background: var(--border); opacity: 1; }

  @media (max-width: 760px) {
    .stats, .sparkline { display: none; }
  }
</style>
