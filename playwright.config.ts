import { defineConfig, devices } from '@playwright/test'

// Tests run against the built output, not the dev server: the base path and the
// service worker only behave like production after a real build.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/EuPtFlashcards/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      // The primary target is a phone, so the responsive layout is exercised at
      // phone width. This is Chromium, not Safari — it checks layout and
      // behaviour, not WebKit-specific rendering.
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 390, height: 844 },
      },
    },
    // Real WebKit needs system libraries that are not present on every machine.
    // CI installs them, so the closest thing to iOS Safari runs there.
    ...(process.env.WEBKIT === '1'
      ? [{ name: 'ios-safari', use: { ...devices['iPhone 13'] } }]
      : []),
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173/EuPtFlashcards/',
    // Never reuse: a leftover server from an earlier build silently serves stale
    // code, and the suite then passes or fails for reasons unrelated to the diff.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
