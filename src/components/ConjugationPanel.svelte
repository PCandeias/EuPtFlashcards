<script lang="ts">
  import { conjugatePhrase } from '../lib/verbs/conjugate.js'
  import { TENSES, PERSONS, type TenseId } from '../lib/verbs/tenses.js'

  let {
    infinitive, enabledTenses, onclose,
  }: {
    infinitive: string
    /** From settings. Registry order, not the order they were switched on. */
    enabledTenses: TenseId[]
    onclose: () => void
  } = $props()

  let conjugation = $derived(conjugatePhrase(infinitive))

  // Only tenses both switched on and actually present for this verb. A verb
  // missing a tense simply does not offer it — nothing ever renders blank.
  let available = $derived(TENSES.filter(t => enabledTenses.includes(t.id) && conjugation?.[t.id]))

  let chosen = $state<TenseId | null>(null)
  let active = $derived(available.find(t => t.id === chosen) ?? available[0])
  let forms = $derived(active ? conjugation?.[active.id] : undefined)

  // A new card means a new verb; do not carry a tense choice that may not exist.
  $effect(() => { void infinitive; chosen = null })

  $effect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onclose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
</script>

<!--
  Rendered outside the card on purpose. Inside, it would be clipped by the face's
  overflow and trapped in the flip's 3D context — and it would cover the very word
  being learned.
-->
<div class="panel" id="conjugationPanel" role="dialog" aria-label="Conjugation of {infinitive}">
  <div class="head">
    <span class="infinitive">{infinitive}</span>

    {#if available.length > 1}
      <select
        id="tenseSelect"
        aria-label="Tense"
        value={active?.id}
        onchange={(e) => { chosen = e.currentTarget.value as TenseId }}
      >
        {#each available as t (t.id)}
          <option value={t.id}>{t.label}</option>
        {/each}
      </select>
    {:else if active}
      <span class="only">{active.label}</span>
    {/if}

    <button class="close" onclick={onclose} aria-label="Close conjugation">×</button>
  </div>

  {#if active}
    <p class="hint">{active.hint}</p>
  {/if}

  {#if forms}
    <table>
      <tbody>
        {#each PERSONS as person (person.id)}
          {#if forms[person.id]}
            <tr>
              <th scope="row">{person.label}</th>
              <td>{forms[person.id]}</td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .panel {
    position: absolute;
    left: 50%;
    bottom: 8px;
    transform: translateX(-50%);
    z-index: 20;
    width: max-content;
    max-width: min(90%, 360px);
    padding: 12px 14px;
    text-align: left;
    border: 1px solid var(--accent-line);
    border-radius: 16px;
    background: var(--surface-strong);
    box-shadow: var(--face-shadow);
    animation: pop var(--t-base) var(--ease);
  }
  @keyframes pop {
    from { opacity: 0; transform: translate(-50%, 6px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  .head { display: flex; align-items: center; gap: 8px; }
  .infinitive { font-size: 15px; font-weight: 800; color: var(--accent); flex: 1; }
  select { width: auto; min-height: 32px; padding: 4px 8px; font-size: 12px; }
  .only { font-size: 12px; color: var(--muted); }
  .close {
    min-height: 28px;
    width: 28px;
    padding: 0;
    font-size: 16px;
    line-height: 1;
    color: var(--muted);
  }
  .hint { margin: 6px 0 8px; font-size: 11px; color: var(--muted); }

  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th {
    text-align: left;
    font-weight: 500;
    color: var(--muted);
    padding: 3px 14px 3px 0;
    white-space: nowrap;
  }
  td { font-weight: 700; padding: 3px 0; }

  @media (max-width: 760px) {
    .panel { padding: 10px 12px; max-width: 92%; }
    table { font-size: 13px; }
    th { padding-right: 10px; }
    .infinitive { font-size: 14px; }
  }
</style>
