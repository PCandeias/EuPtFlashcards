<script lang="ts">
  import { reportList, type Reports } from '../lib/storage/reports.js'

  let {
    reports, onrestore, onexport,
  }: {
    reports: Reports
    onrestore: (id: string) => void
    onexport: () => void
  } = $props()

  let list = $derived(reportList(reports))
</script>

{#if !list.length}
  <p class="note" id="noReports">
    Nothing reported. The <span class="glyph">!</span> in a card's corner hides a
    card you think is wrong and adds it here.
  </p>
{:else}
  <p class="note">
    These are hidden from study. Put one back if you reported it by mistake, or
    export the list to fix the cards later.
  </p>

  <ul id="reportedList">
    {#each list as report (report.id)}
      <li>
        <div class="text">
          <span class="en">{report.en}</span>
          <span class="target">{report.target}</span>
          <span class="deck">{report.deck}</span>
        </div>
        <button
          class="restore"
          onclick={() => onrestore(report.id)}
          aria-label="Put {report.en} back into study"
          title="Put back"
        >Put back</button>
      </li>
    {/each}
  </ul>

  <div class="buttons">
    <button id="exportReportsBtn" onclick={onexport}>
      Export to text ({list.length})
    </button>
  </div>
{/if}

<style>
  .note { margin: 0 0 10px; font-size: 12px; color: var(--muted); line-height: 1.5; }
  .glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.3em;
    height: 1.3em;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-weight: 800;
    color: var(--bad);
  }

  ul {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
    display: grid;
    gap: 6px;
    max-height: 34svh;
    overflow-y: auto;
  }
  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .text { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .en { font-size: 13px; }
  .target { font-size: 13px; font-weight: 700; }
  .deck { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .restore { min-height: 32px; padding: 4px 10px; font-size: 12px; white-space: nowrap; }
  .buttons { display: flex; gap: 8px; flex-wrap: wrap; }
  .buttons button { font-size: 13px; }
</style>
