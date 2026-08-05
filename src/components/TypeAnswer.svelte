<script lang="ts">
  import { checkAnswer, explain, suggestedRating, type AnswerCheck } from '../lib/study/answer.js'
  import type { Rating } from '../lib/study/sm2.js'

  let {
    expected, onchecked,
  }: {
    expected: string
    /** Fired once the answer is submitted, with the rating it suggests. */
    onchecked: (check: AnswerCheck, suggested: Rating) => void
  } = $props()

  let typed = $state('')
  let check = $state<AnswerCheck | null>(null)
  let input = $state<HTMLInputElement | undefined>()

  // A new card clears the box and takes focus back, so you can keep typing.
  $effect(() => {
    void expected
    typed = ''
    check = null
    input?.focus()
  })

  function submit(event: Event) {
    event.preventDefault()
    if (check) return
    const result = checkAnswer(typed, expected)
    check = result
    onchecked(result, suggestedRating(result.verdict))
  }
</script>

<form class="type" onsubmit={submit}>
  <input
    bind:this={input}
    bind:value={typed}
    id="answerInput"
    type="text"
    autocomplete="off"
    autocapitalize="off"
    autocorrect="off"
    spellcheck="false"
    placeholder="Type the Portuguese…"
    disabled={!!check}
    aria-label="Type the Portuguese"
  />
  {#if !check}
    <button type="submit" id="checkBtn" class="primary">Check</button>
  {/if}
</form>

{#if check}
  <p class="verdict {check.verdict}" id="answerVerdict">{explain(check)}</p>
{/if}

<style>
  .type { display: flex; gap: 8px; }
  input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 8px 12px;
    font: inherit;
    font-size: 16px; /* under 16px iOS zooms the page on focus */
    color: var(--text);
    background: rgba(15, 23, 42, 0.92);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  input:disabled { opacity: 0.7; }
  .verdict {
    margin: 6px 0 0;
    font-size: 13px;
    font-weight: 600;
    text-align: center;
  }
  .correct { color: var(--good); }
  .almost { color: #fbbf24; }
  .wrong { color: var(--bad); }

  @media (max-width: 760px) {
    input { min-height: 40px; }
    .verdict { font-size: 12px; }
  }
</style>
