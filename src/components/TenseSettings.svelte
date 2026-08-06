<script lang="ts">
  import type { TenseId } from '../lib/grammar/tenses.js'
  import type { TenseDef } from '../lib/grammar/types.js'

  let {
    tenses, selected, onchange,
  }: {
    /** This language's tenses, in registry order. */
    tenses: readonly TenseDef<TenseId>[]
    selected: TenseId[]
    onchange: (tenses: TenseId[]) => void
  } = $props()

  function toggle(id: TenseId, on: boolean) {
    // Rebuilt from the registry each time, so the stored order is always the
    // registry's and never the order things were clicked.
    onchange(tenses.filter(t => (t.id === id ? on : selected.includes(t.id))).map(t => t.id))
  }
</script>

<p class="lead">
  The tenses you are working on. Cards in a tense you switch off are left out of
  the deck, and the <span class="glyph">?</span> beside a verb offers only what is
  ticked here.
  <br />
  Vocabulary is never affected — nouns, adjectives and infinitives always show.
</p>

<ul>
  {#each tenses as tense (tense.id)}
    <li>
      <label>
        <input
          type="checkbox"
          value={tense.id}
          checked={selected.includes(tense.id)}
          onchange={(e) => toggle(tense.id, e.currentTarget.checked)}
        />
        <span class="text">
          <span class="name">{tense.label}</span>
          <span class="example">{tense.example}</span>
          <span class="hint">{tense.hint}</span>
        </span>
      </label>
    </li>
  {/each}
</ul>

<style>
  .lead { margin: 0 0 10px; font-size: 12px; color: var(--muted); line-height: 1.5; }
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

  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  label {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: start;
    gap: 10px;
    cursor: pointer;
    text-align: left;
    font-size: 13px;
  }
  input { accent-color: var(--accent); width: 16px; height: 16px; margin-top: 2px; }
  .name { font-weight: 600; }
  .example { font-style: italic; color: var(--muted); margin-left: 8px; }
  /* Its own line: the hint is an aside, not a third column competing for width. */
  .hint { display: block; font-size: 11px; color: var(--muted); opacity: 0.85; margin-top: 1px; }

  @media (max-width: 760px) {
    .hint { display: none; }
  }
</style>
