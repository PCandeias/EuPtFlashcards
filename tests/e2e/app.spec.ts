import { test, expect, type Page } from '@playwright/test'

/**
 * Steps through a deck until the requested card is showing.
 *
 * The order is shuffled, so the card has to be searched for. Each step yields to
 * the browser: Svelte flushes state on a microtask, so a synchronous click loop
 * would spin 4000 times against a DOM that never updates.
 */
async function findCard(
  page: Page,
  { deck, front, back }: { deck: string; front: string; back: string },
) {
  await page.selectOption('#deckSelect', deck)
  const found = await page.evaluate(
    async ({ front, back }) => {
      const total = document.querySelectorAll('#nextBtn').length ? 5000 : 0
      for (let i = 0; i < total; i++) {
        const f = document.querySelector('.face.front .word')?.textContent?.trim()
        const b = document.querySelector('.face.back .word')?.textContent?.trim()
        if (f?.startsWith(front) && b?.startsWith(back)) return true
        ;(document.getElementById('nextBtn') as HTMLButtonElement).click()
        await new Promise(resolve => requestAnimationFrame(resolve))
      }
      return false
    },
    { front, back },
  )
  expect(found, `should reach "${front}" / "${back}" in ${deck}`).toBe(true)
}

type TrackedPage = Page & { __errors: string[] }

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  ;(page as TrackedPage).__errors = errors
})

test.afterEach(async ({ page }) => {
  expect((page as TrackedPage).__errors).toEqual([])
})

test('loads the full corpus', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.card')).toBeVisible()
  await expect(page.locator('h1')).toContainText('European Portuguese')
  await expect(page.locator('#totalCount')).toHaveText('1853')
})

test('renders a plural badge on the English face and none on the Portuguese', async ({ page }) => {
  await page.goto('./')
  await findCard(page, { deck: 'Class', front: 'you come', back: 'vocês vêm' })

  // "you come" alone cannot distinguish `tu vens` from `vocês vêm` — the badge is
  // what makes the prompt answerable at all.
  await expect(page.locator('.face.front .badge')).toHaveText(['PL'])
  await expect(page.locator('.face.front .badge')).toHaveAttribute('title', /plural/)
  // `vocês` already IS the plural, so a badge there would be noise.
  await expect(page.locator('.face.back .badge')).toHaveCount(0)
})

test('renders badges on both faces for an ambiguous bare Portuguese word', async ({ page }) => {
  await page.goto('./')
  await findCard(page, { deck: 'Class', front: 'him / it', back: 'o' })
  await expect(page.locator('.face.front .badge')).toHaveText(['M', 'OBJ'])
  // Bare `o` is ambiguous with the article, so it earns a badge of its own.
  await expect(page.locator('.face.back .badge')).toHaveText(['OBJ'])
})

test('renders a sense hint as its own line, not inside the word', async ({ page }) => {
  await page.goto('./')
  await findCard(page, { deck: 'Common Verbs', front: 'to be', back: 'ser' })
  await expect(page.locator('.face.front .word')).toHaveText('to be')
  await expect(page.locator('.face.front .hint')).toHaveText('permanent / identity')
})

test('shows badges on the English face when Portuguese leads', async ({ page }) => {
  await page.goto('./')
  await page.selectOption('#directionSelect', 'b-a')
  await findCard(page, { deck: 'Class', front: 'vocês vêm', back: 'you come' })
  await expect(page.locator('.face.front .badge')).toHaveCount(0)
  await expect(page.locator('.face.back .badge')).toHaveText(['PL'])
})

test('flips and moves', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.card')).not.toHaveClass(/flipped/)
  await page.click('#flipBtn')
  await expect(page.locator('.card')).toHaveClass(/flipped/)

  const before = await page.locator('.face.front .word').textContent()
  await page.click('#nextBtn')
  await expect(page.locator('.card')).not.toHaveClass(/flipped/)
  await expect(page.locator('#progressText')).toContainText('Card 2 /')
  await page.click('#prevBtn')
  await expect(page.locator('.face.front .word')).toHaveText(before!.trim())
})

test('keyboard shortcuts drive the deck', async ({ page }) => {
  await page.goto('./')
  // No click first: tapping the card is itself a flip, which would cancel out.
  await page.keyboard.press('Space')
  await expect(page.locator('.card')).toHaveClass(/flipped/)
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#progressText')).toContainText('Card 2 /')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('#progressText')).toContainText('Card 1 /')
})

test('tapping the card flips it', async ({ page }) => {
  await page.goto('./')
  await page.locator('.card').click({ position: { x: 40, y: 40 } })
  await expect(page.locator('.card')).toHaveClass(/flipped/)
})

test('marking known defers the card and persists across a reload', async ({ page }) => {
  await page.goto('./')
  await page.selectOption('#deckSelect', 'Numbers')
  const dueBefore = Number(await page.locator('#dueCount').textContent())

  await page.click('#knownBtn')
  await expect(page.locator('#dueCount')).toHaveText(String(dueBefore - 1))
  await expect(page.locator('#knownCount')).toHaveText('1')

  await page.reload()
  await expect(page.locator('#knownCount')).toHaveText('1')
  await expect(page.locator('#dueCount')).toHaveText(String(dueBefore - 1))
})

test('reset clears progress for the selected deck only', async ({ page }) => {
  await page.goto('./')
  await page.selectOption('#deckSelect', 'Numbers')
  await page.click('#knownBtn')
  await expect(page.locator('#knownCount')).toHaveText('1')

  await page.selectOption('#deckSelect', 'Class')
  await page.click('#knownBtn')
  await expect(page.locator('#knownCount')).toHaveText('2')

  await page.click('#resetBtn')
  // Only the Class card is cleared; the Numbers one survives.
  await expect(page.locator('#knownCount')).toHaveText('1')
})

test('settings survive a reload', async ({ page }) => {
  await page.goto('./')
  await page.selectOption('#directionSelect', 'b-a')
  await page.selectOption('#delaySelect', '14')
  await page.selectOption('#deckSelect', 'Numbers')
  await page.reload()
  await expect(page.locator('#directionSelect')).toHaveValue('b-a')
  await expect(page.locator('#delaySelect')).toHaveValue('14')
  await expect(page.locator('#deckSelect')).toHaveValue('Numbers')
})

test('registers a service worker and serves a manifest', async ({ page, request }) => {
  await page.goto('./')
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.getRegistrations().then(r => r.length)))
    .toBeGreaterThan(0)

  const manifest = await request.get('./manifest.webmanifest')
  expect(manifest.ok()).toBe(true)
  const body = await manifest.json()
  expect(body.display).toBe('standalone')
  expect(body.icons.length).toBeGreaterThan(0)
})
