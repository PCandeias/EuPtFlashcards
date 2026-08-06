import { test, expect } from '@playwright/test'

/**
 * The original single-file app is kept alongside the new one as a fallback, at the
 * URL it has always had.
 *
 * It needs a test because the way it breaks is silent: the service worker sends
 * every navigation to index.html, so once the app is installed the backup would
 * quietly serve the new app instead of itself — for exactly the people most likely
 * to need it.
 */
const BACKUP = 'european_portugese_flashcards.html'

test('is served at its original URL', async ({ page }) => {
  const response = await page.goto(`./${BACKUP}`)
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/backup/i)
  // Its own markup, not the new app's.
  await expect(page.locator('#cards-data')).toHaveCount(1)
  await expect(page.locator('#flashcard')).toHaveCount(1)
})

test('carries the same corrected cards as the app', async ({ page }) => {
  await page.goto(`./${BACKUP}`)
  const cards = await page.evaluate(() =>
    JSON.parse(document.getElementById('cards-data')!.textContent!))

  expect(cards).toHaveLength(2093)
  // The accuracy review's corrections must be in the fallback too, or it would
  // sit there teaching the errors we removed.
  // The fallback is the original single-file app, frozen: its cards still use
  // the `pt` field this app has since renamed to `target`.
  const gloss = (pt: string) =>
    cards.find((c: { pt: string; en: string }) => c.pt === pt)?.en
  expect(gloss('dele')).toBe('of him / his')
  expect(cards.some((c: { pt: string }) => c.pt === 'canadense')).toBe(false)
  expect(cards.some((c: { pt: string }) => c.pt === 'eu respondo-os')).toBe(false)
})

test('survives the service worker taking control', async ({ page, context }) => {
  await page.goto('./#/pt')
  await expect(page.locator('.card')).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)

  // With registerType 'prompt' the worker claims control on a later load.
  for (let i = 0; i < 6; i++) {
    await page.reload()
    await expect(page.locator('.card')).toBeVisible()
    if (await page.evaluate(() => !!navigator.serviceWorker.controller)) break
  }
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller),
    'the worker should be controlling by now').toBe(true)

  await page.goto(`./${BACKUP}`)
  await expect(page.locator('#cards-data')).toHaveCount(1)

  // And with no network, which is when a fallback actually matters.
  await context.setOffline(true)
  await page.goto(`./${BACKUP}`)
  await expect(page.locator('#cards-data')).toHaveCount(1)
  await context.setOffline(false)
})
