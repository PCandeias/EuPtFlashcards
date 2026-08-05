import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// Served from https://pcandeias.github.io/EuPtFlashcards/ — the base must match the
// repo name or every asset URL 404s and the page renders blank.
export default defineConfig({
  base: '/EuPtFlashcards/',
  plugins: [
    svelte(),
    VitePWA({
      // Never auto-refresh: a reload mid-review loses your place in the deck.
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'European Portuguese Flashcards',
        short_name: 'PT Flashcards',
        description: 'European Portuguese vocabulary flashcards, offline.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The whole app, cards included, is precached — it must work with no network.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
  build: { target: 'es2022' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
