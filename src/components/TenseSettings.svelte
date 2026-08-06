<script lang="ts">
  import { TENSES, type TenseId } from '../lib/verbs/tenses.js'

  let {
    selected, onchange,
  }: {
    selected: TenseId[]
    onchange: (tenses: TenseId[]) => void
  } = $props()

  let open = $state(false)

  function toggle(id: TenseId, on: boolean) {
    // Rebuilt from the registry each time, so the stored order is always the
    // registry's and never the order things were clicked.
    onchange(TENSES.filter(t => (t.id === id ? on : selected.includes(t.id))).map(t => t.id))
  }
</script>

<details class="tenses" bind:open>
  <summary id="tenseSettings">
    Conjugation tenses
    <span class="count">{selected.length}</span>
  </summary>

  <p class="lead">
    Which tenses the <span class="glyph">?</span> beside a verb offers. Turn them all
    off to hide it.
  </p>

  <ul>
    {#each TENSES as tense (tense.id)}
      <li>
        <label>
          <input
            type="checkbox"
            value={tense.id}
            checked={selected.includes(tense.id)}
            onchange={(e) => toggle(tense.id, e.currentTarget.checked)}
          />
          <span class="name">{tense.label}</span>
          <span class="example">{tense.example}</span>
          <span class="hint">{tense.hint}</span>
        </label>
      </li>
    {/each}
  </ul>
</details>

<style>
  .tenses { font-size: 12px; color: var(--muted); }
  summary {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
  }
  .count {
    min-width: 18px;
    padding: 1px 6px;
    border-radius: 999px;
    border: 1px solid var(--border);
    font-weight: 700;
    font-size: 11px;
  }
  .lead { margin: 4px 0 8px; }
  .glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.3em;
    height: 1.3em;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-weight: 800;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
    /* Never let the settings grow enough to squeeze the card off the screen. */
    max-height: 38svh;
    overflow-y: auto;
  }
  label {
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: baseline;
    gap: 8px;
    cursor: pointer;
    text-align: left;
  }
  input { accent-color: var(--accent); }
  .name { color: var(--text); font-weight: 600; }
  .example { font-style: italic; }
  .hint { font-size: 11px; opacity: 0.8; }

  @media (max-width: 760px) {
    .hint { display: none; }
    label { grid-template-columns: auto auto 1fr; }
  }
</style>
