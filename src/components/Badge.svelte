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
    background: rgba(15, 23, 42, 0.55);
  }
  /* Grouped by family so the card is scannable without reading. */
  .gender   { color: #2dd4bf; }
  .gender-f { color: #fb7185; }
  .number   { color: #38bdf8; }
  .informal { color: #fbbf24; }
  .formal   { color: #a78bfa; }
  .role     { color: #94a3b8; }

  @media (max-width: 760px) {
    .badge { font-size: 10px; padding: 2px 5px; letter-spacing: 0.04em; }
  }
</style>
