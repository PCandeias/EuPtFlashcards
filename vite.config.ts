import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Served from https://pcandeias.github.io/EuPtFlashcards/ — the base must match the
// repo name or every asset URL 404s and the page renders blank.
export default defineConfig({
  base: '/EuPtFlashcards/',
  plugins: [svelte()],
  build: { target: 'es2022' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
