<script lang="ts">
  import type { BadgeSpec } from '../lib/render/tags.js'

  let { spec }: { spec: BadgeSpec } = $props()
</script>

<!-- title for pointers, aria-label for screen readers: the abbreviation is never a guess. -->
<span class="badge {spec.cls}" title={spec.full} aria-label={spec.full}>{spec.pill}</span>

<style>
  .badge {
    font-size: clamp(10px, 1.5vw, 13px);
    font-weight: 800;
    letter-spacing: 0.06em;
    line-height: 1;
    padding: 3px 6px;
    border-radius: 999px;
    border: 1px solid currentColor;
    background: var(--badge-bg);
  }
  /* Grouped by family so the card is scannable without reading. Per theme,
     because a colour that highlights on near-black vanishes on cream. */
  .gender   { color: var(--badge-gender); }
  .gender-f { color: var(--badge-gender-f); }
  .number   { color: var(--badge-number); }
  .informal { color: var(--badge-informal); }
  .formal   { color: var(--badge-formal); }
  .role     { color: var(--badge-role); }

  @media (max-width: 760px) {
    .badge { font-size: 10px; padding: 2px 5px; letter-spacing: 0.04em; }
  }
</style>
