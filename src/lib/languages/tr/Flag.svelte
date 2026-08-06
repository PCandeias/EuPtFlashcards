<script lang="ts">
  /**
   * The Turkish flag, drawn rather than typed.
   *
   * A flag emoji would be shorter, but Windows ships no flag glyphs at all and
   * renders 🇹🇷 as the letters TR in two boxes — on the one screen whose whole job
   * is to be recognised at a glance. Drawing it works everywhere.
   */
  let { size = 44 }: { size?: number } = $props()
</script>

<svg
  viewBox="0 0 30 20"
  width={size}
  height={size * (20 / 30)}
  role="img"
  aria-label="Turkey"
>
  <rect width="30" height="20" rx="2.5" fill="#e30a17" />
  <!-- The crescent is one white disc with a red one biting into it. -->
  <circle cx="11" cy="10" r="5" fill="#fff" />
  <circle cx="12.6" cy="10" r="4" fill="#e30a17" />
  <polygon
    points="15.90,10.00 17.43,9.44 17.49,7.81 18.49,9.10 20.06,8.65 19.15,10.00 20.06,11.35 18.49,10.90 17.49,12.19 17.43,10.56"
    fill="#fff"
  />
</svg>

<style>
  svg { display: block; border-radius: 2.5px; }
</style>
