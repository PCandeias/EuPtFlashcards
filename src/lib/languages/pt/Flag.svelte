<script lang="ts">
  /**
   * The Portuguese flag, drawn rather than typed — see the Turkish one for why.
   *
   * The armillary sphere and the shield are simplified to what survives at 44
   * pixels: a yellow ring with its meridians, and the white shield with the five
   * blue quinas on it.
   */
  let { size = 44 }: { size?: number } = $props()
</script>

<svg
  viewBox="0 0 30 20"
  width={size}
  height={size * (20 / 30)}
  role="img"
  aria-label="Portugal"
>
  <rect width="30" height="20" rx="2.5" fill="#da291c" />
  <path d="M2.5 0h9.5v20H2.5A2.5 2.5 0 0 1 0 17.5v-15A2.5 2.5 0 0 1 2.5 0z" fill="#046a38" />

  <!-- Armillary sphere: a ring, an equator and a meridian. -->
  <g stroke="#ffe000" fill="none" stroke-width="0.7">
    <circle cx="12" cy="10" r="4.6" />
    <ellipse cx="12" cy="10" rx="4.6" ry="1.8" />
    <ellipse cx="12" cy="10" rx="1.8" ry="4.6" />
  </g>

  <!-- Shield: red border, white field, the five blue quinas. -->
  <path
    d="M9.6 6.6h4.8v3.6c0 1.8-1.3 2.9-2.4 3.4-1.1-.5-2.4-1.6-2.4-3.4V6.6z"
    fill="#da291c"
  />
  <path
    d="M10.4 7.4h3.2v2.8c0 1.35-.95 2.2-1.6 2.55-.65-.35-1.6-1.2-1.6-2.55V7.4z"
    fill="#fff"
  />
  <g fill="#002b7f">
    <rect x="11.75" y="8.1" width="0.5" height="0.5" />
    <rect x="11.75" y="10.6" width="0.5" height="0.5" />
    <rect x="10.9" y="9.35" width="0.5" height="0.5" />
    <rect x="12.6" y="9.35" width="0.5" height="0.5" />
    <rect x="11.75" y="9.35" width="0.5" height="0.5" />
  </g>
</svg>

<style>
  svg { display: block; border-radius: 2.5px; }
</style>
