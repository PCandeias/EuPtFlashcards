import { test, expect } from '@playwright/test'

/**
 * The reference page: the grammar behind the deck, and a way to find a card.
 *
 * It is a page rather than a panel, so most of what is checked here is that it is
 * reachable, that it comes back, and that it belongs to one language at a time.
 */

test('the study screen links to it, and it links back', async ({ page }) => {
  await page.goto('./#/pt')
  await expect(page.locator('.card')).toBeVisible()

  await page.click('#referenceBtn')
  await expect(page.locator('#referenceSearch')).toBeVisible()
  await expect(page.locator('.card')).toHaveCount(0)
  expect(page.url()).toContain('#/pt/reference')

  await page.click('#studyBtn')
  await expect(page.locator('.card')).toBeVisible()
  expect(page.url()).toMatch(/#\/pt$/)
})

test('a link straight to it works, and survives a reload', async ({ page }) => {
  await page.goto('./#/tr/reference')

  await expect(page.locator('h1')).toContainText('Turkish reference')
  await expect(page).toHaveTitle('Turkish reference')
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr-TR')

  await page.reload()
  await expect(page.locator('h1')).toContainText('Turkish reference')
})

test('the back button returns to the deck', async ({ page }) => {
  await page.goto('./#/pt')
  await expect(page.locator('.card')).toBeVisible()
  await page.click('#referenceBtn')
  await expect(page.locator('#referenceSearch')).toBeVisible()

  await page.goBack()
  await expect(page.locator('.card')).toBeVisible()
})

test('shows each language its own grammar and nothing of the other', async ({ page }) => {
  await page.goto('./#/tr/reference')
  await expect(page.locator('h2')).toContainText(['Noun endings'])
  await expect(page.getByRole('heading', { name: 'Vowel harmony' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Contractions' })).toHaveCount(0)

  await page.goto('./#/pt/reference')
  await expect(page.getByRole('heading', { name: 'Contractions' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ser and estar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vowel harmony' })).toHaveCount(0)
})

test('every tense the deck teaches has a row', async ({ page }) => {
  await page.goto('./#/pt/reference')

  const tenses = page.locator('#tenses tbody tr')
  await expect(tenses).toHaveCount(6)
  await expect(tenses.first()).toContainText('Presente')
})

test('a jump link scrolls to its section', async ({ page }) => {
  await page.goto('./#/tr/reference')

  await page.click('.jump a:has-text("Levels")')
  await expect(page.locator('#levels')).toBeInViewport()
})

test('every section folds, and starts open', async ({ page }) => {
  await page.goto('./#/pt/reference')

  const first = page.locator('details.table').first()
  await expect(first).toHaveAttribute('open', '')
  await expect(first.locator('table')).toBeVisible()

  await first.locator('> summary').click()
  await expect(first).not.toHaveAttribute('open')
  await expect(first.locator('table')).toBeHidden()
  // The heading is still there to fold back open.
  await expect(first.locator('> summary h2')).toBeVisible()
})

test('remembers what you folded, per language', async ({ page }) => {
  await page.goto('./#/pt/reference')
  await page.locator('#contractions > summary').click()
  await expect(page.locator('#contractions')).not.toHaveAttribute('open')

  await page.reload()
  await expect(page.locator('#contractions')).not.toHaveAttribute('open')
  // A different section is untouched, and so is the other language.
  await expect(page.locator('#tenses')).toHaveAttribute('open', '')

  await page.goto('./#/tr/reference')
  await expect(page.locator('#tenses')).toHaveAttribute('open', '')
  await expect(page.locator('details.table:not([open])')).toHaveCount(0)
})

test('collapses and expands every section at once', async ({ page }) => {
  await page.goto('./#/tr/reference')
  const sections = page.locator('details.table')
  const total = await sections.count()

  await page.click('#foldAllBtn')
  await expect(page.locator('details.table[open]')).toHaveCount(0)
  await expect(page.locator('#foldAllBtn')).toHaveText('Expand all')

  await page.click('#foldAllBtn')
  await expect(page.locator('details.table[open]')).toHaveCount(total)
})

test('a jump link opens the section it lands on', async ({ page }) => {
  await page.goto('./#/tr/reference')
  await page.click('#foldAllBtn')
  await expect(page.locator('#levels')).not.toHaveAttribute('open')

  await page.click('.jump a:has-text("Levels")')
  await expect(page.locator('#levels')).toHaveAttribute('open', '')
  await expect(page.locator('#levels table')).toBeVisible()
})

test('holds the longer explanation behind a second fold', async ({ page }) => {
  await page.goto('./#/tr/reference')

  const more = page.locator('#noun-endings .detail')
  await expect(more).not.toHaveAttribute('open')
  await expect(more.locator('li').first()).toBeHidden()

  await more.locator('summary').click()
  await expect(more.locator('li').first()).toContainText('placeholders')
})

test('gives both languages more to read on every section', async ({ page }) => {
  for (const id of ['pt', 'tr']) {
    await page.goto(`./#/${id}/reference`)
    const sections = await page.locator('details.table').count()
    // Decks is the one table that speaks for itself; everything else expands.
    expect(await page.locator('details.table .detail').count()).toBeGreaterThanOrEqual(sections - 1)
  }
})

test('searching finds a card by either side', async ({ page }) => {
  await page.goto('./#/tr/reference')
  await page.fill('#referenceSearch', 'ev')

  const hits = page.locator('.hits li')
  await expect(hits.first()).toContainText('ev')
  await expect(hits.first()).toContainText('house')
  // The tables give way to the results rather than sitting under them.
  await expect(page.locator('.jump')).toHaveCount(0)

  await page.fill('#referenceSearch', 'coffee')
  await expect(page.locator('.hits li').first()).toContainText('kahve')
})

test('ignores accents and case', async ({ page }) => {
  await page.goto('./#/pt/reference')
  await page.fill('#referenceSearch', 'AVIAO')

  await expect(page.locator('.hits li').first()).toContainText('avião')
})

test('says so when nothing matches, and clears back to the tables', async ({ page }) => {
  await page.goto('./#/pt/reference')
  await page.fill('#referenceSearch', 'zzzzq')

  await expect(page.locator('.results')).toContainText('Nothing')
  await expect(page.locator('.hits')).toHaveCount(0)

  await page.click('.clear')
  await expect(page.locator('.jump')).toBeVisible()
  await expect(page.locator('#referenceSearch')).toHaveValue('')
})

test('searches only the language you are in', async ({ page }) => {
  await page.goto('./#/pt/reference')
  await page.fill('#referenceSearch', 'teşekkür')
  await expect(page.locator('.results')).toContainText('Nothing')
})

test('the flag goes back to the picker', async ({ page }) => {
  await page.goto('./#/pt/reference')

  await page.click('.switch')
  await expect(page.locator('.choice')).toHaveCount(2)
})

test('keeps the theme it was given, and hands a change back to the deck', async ({ page }) => {
  await page.goto('./#/pt')
  // Whatever the study screen is in, the reference page opens in the same.
  const studyTheme = await page.locator('html').getAttribute('data-theme')
  await page.click('#referenceBtn')
  await expect(page.locator('html')).toHaveAttribute('data-theme', studyTheme!)

  await page.click('#themeBtn')
  const chosen = await page.locator('html').getAttribute('data-theme')
  expect(chosen).not.toBe(studyTheme)

  await page.click('#studyBtn')
  await expect(page.locator('.card')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', chosen!)
})

test('nothing scrolls sideways on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 })
  await page.goto('./#/tr/reference')

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'the page itself must not scroll sideways').toBeLessThanOrEqual(1)

  // A wide table scrolls inside its own box instead.
  const scroller = page.locator('#noun-endings .scroller')
  const scrolls = await scroller.evaluate(el => el.scrollWidth > el.clientWidth)
  const box = await scroller.boundingBox()
  expect(box!.width).toBeLessThanOrEqual(390)
  expect(scrolls || box!.width > 0).toBe(true)
})
