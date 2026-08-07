import { test, expect } from '@playwright/test'

/**
 * The two languages, and the line between them.
 *
 * The promise the picker makes is that each language keeps its own progress, so
 * most of what is checked here is that studying one leaves no mark on the other.
 */

test('opens on the picker, not on a language', async ({ page }) => {
  await page.goto('./')

  await expect(page.locator('.choice')).toHaveCount(2)
  await expect(page.locator('#pick-pt')).toContainText('Português')
  await expect(page.locator('#pick-tr')).toContainText('Türkçe')
  // No card is showing: nothing has been chosen yet.
  await expect(page.locator('.card')).toHaveCount(0)
  await expect(page).toHaveTitle('Flashcards')
})

// A drawn flag rather than an emoji, because Windows renders 🇵🇹 as two letters
// in boxes and the picker is the one screen that has to be recognised at a glance.
test('draws the flags rather than typing them', async ({ page }) => {
  await page.goto('./')

  for (const id of ['pt', 'tr']) {
    const flag = page.locator(`#pick-${id} svg`)
    await expect(flag).toHaveCount(1)
    const box = await flag.boundingBox()
    expect(box!.width, `${id} flag should be drawn at a visible size`).toBeGreaterThan(20)
  }
})

test('a choice routes, and the route survives a reload', async ({ page }) => {
  await page.goto('./')
  await page.click('#pick-tr')

  await expect(page.locator('.card')).toBeVisible()
  expect(page.url()).toContain('#/tr')
  await expect(page).toHaveTitle('Turkish Flashcards')
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr-TR')

  await page.reload()
  await expect(page.locator('.card')).toBeVisible()
  await expect(page.locator('h1')).toContainText('Turkish')
})

test('the flag in the corner goes back to the picker', async ({ page }) => {
  await page.goto('./#/pt')
  await expect(page.locator('.card')).toBeVisible()

  await page.click('.switch')
  await expect(page.locator('.choice')).toHaveCount(2)
  await expect(page.locator('.card')).toHaveCount(0)
})

// A stale bookmark or a typo should land somewhere sensible.
test('an unknown language falls back to the picker', async ({ page }) => {
  await page.goto('./#/xx')
  await expect(page.locator('.choice')).toHaveCount(2)
})

test('each language shows its own deck and its own tenses', async ({ page }) => {
  await page.goto('./#/pt')
  await expect(page.locator('#directionSelect')).toContainText('English → Portuguese')
  await page.click('#settingsBtn')
  const ptTenses = await page.locator('#settingsDialog .name').allTextContents()
  expect(ptTenses).toContain('Presente')
  expect(ptTenses.join(' ')).not.toContain('zaman')
  await page.click('#settingsCloseBtn')

  await page.goto('./#/tr')
  await expect(page.locator('#directionSelect')).toContainText('English → Turkish')
  await page.click('#settingsBtn')
  const trTenses = await page.locator('#settingsDialog .name').allTextContents()
  expect(trTenses).toContain('Şimdiki zaman')
  expect(trTenses.join(' ')).not.toContain('Presente')
})

test('keeps progress, settings and reports apart', async ({ page }) => {
  await page.goto('./#/tr')
  await expect(page.locator('.card')).toBeVisible()

  // Grade a Turkish card, change a Turkish setting, report a Turkish card.
  await page.click('#goodBtn')
  await page.selectOption('#deckSelect', 'Numbers')
  await page.click('.report')
  await page.click('#reportConfirmBtn')
  await expect(page.locator('#reportDialog')).not.toBeVisible()

  const keys = await page.evaluate(() => Object.keys(localStorage).sort())
  expect(keys.some(k => k.startsWith('eutr:'))).toBe(true)
  expect(keys.filter(k => k.startsWith('eupt:v4:progress'))).toEqual([])

  await page.goto('./#/pt')
  await expect(page.locator('.card')).toBeVisible()

  // None of it followed us across.
  expect(await page.locator('#deckSelect').inputValue()).toBe('All')
  await page.click('#settingsBtn')
  await expect(page.locator('#reportedList li')).toHaveCount(0)
  await page.click('#settingsCloseBtn')
  // The Portuguese deck is whole; the Turkish report took a Turkish card.
  await expect(page.locator('#deckSelect option').first()).toContainText('All (2512)')

  await page.goto('./#/tr')
  await page.click('#settingsBtn')
  await expect(page.locator('#reportedList li')).toHaveCount(1)
})

// A backup carries one language's study record; restoring it into the other
// would attach it to cards that do not exist.
test('refuses a backup from the other language', async ({ page }) => {
  await page.goto('./#/tr')
  await expect(page.locator('.card')).toBeVisible()
  await page.click('#settingsBtn')

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.click('#exportBtn'),
  ]).then(([d]) => d)
  const path = await download.path()
  expect(download.suggestedFilename()).toMatch(/^flashcards-tr-\d{4}-\d{2}-\d{2}\.json$/)
  await page.click('#settingsCloseBtn')

  await page.goto('./#/pt')
  await page.click('#settingsBtn')
  await page.setInputFiles('#settingsDialog input[type=file]', path!)

  await expect(page.locator('#backupMessage')).toContainText(/different language/i)
})

test('speech follows the language of the deck', async ({ page }) => {
  await page.goto('./#/tr')
  const speaker = page.locator('.card .speak').first()
  await expect(speaker).toHaveAttribute('aria-label', /Turkish/)

  await page.goto('./#/pt')
  await expect(page.locator('.card .speak').first())
    .toHaveAttribute('aria-label', /Portuguese/)
})

/**
 * The suffix reference. Turkish grammar is its endings, and the same ending is
 * spelled four ways depending on the word — which is why the panel exists and
 * why this checks two words rather than one.
 */
test('shows the endings a Turkish noun takes', async ({ page }) => {
  await page.goto('./#/tr')
  await page.bringToFront()
  await page.selectOption('#deckSelect', 'Home & Household Objects')

  const reach = (want: string) => page.evaluate(async (target) => {
    for (let i = 0; i < 500; i++) {
      const back = document.querySelector('.face.back .word')
      if (back?.childNodes[0]?.textContent?.trim() === target) return true
      ;(document.getElementById('nextBtn') as HTMLButtonElement).click()
      await new Promise(r => requestAnimationFrame(r))
    }
    return false
  }, want)

  // The dictionary form is where the reference lives.
  expect(await reach('ev'), 'should reach ev').toBe(true)
  await page.click('#flipBtn')
  await page.click('.face.back [data-annotation="suffixes"]')
  await expect(page.locator('#suffixPanel')).toBeVisible()
  // A front-vowel word takes the front-vowel endings.
  await expect(page.locator('#suffixPanel')).toContainText('evler')
  await expect(page.locator('#suffixPanel')).toContainText('evden')
  await expect(page.locator('#suffixPanel')).toContainText('front vowel')
})

test('spells the same ending differently on a back-vowel word', async ({ page }) => {
  await page.goto('./#/tr')
  await page.bringToFront()
  await page.selectOption('#deckSelect', 'Places, City & Buildings')

  const found = await page.evaluate(async () => {
    for (let i = 0; i < 500; i++) {
      const back = document.querySelector('.face.back .word')
      if (back?.childNodes[0]?.textContent?.trim() === 'okul') return true
      ;(document.getElementById('nextBtn') as HTMLButtonElement).click()
      await new Promise(r => requestAnimationFrame(r))
    }
    return false
  })
  expect(found, 'should reach okul').toBe(true)

  await page.click('#flipBtn')
  await page.click('.face.back [data-annotation="suffixes"]')
  await expect(page.locator('#suffixPanel')).toContainText('okullar')
  await expect(page.locator('#suffixPanel')).toContainText('okuldan')
  await expect(page.locator('#suffixPanel')).toContainText('back vowel')
})

// Portuguese has no such table, so it never offers the marker.
test('offers no suffix panel in Portuguese', async ({ page }) => {
  await page.goto('./#/pt')
  await expect(page.locator('.card')).toBeVisible()
  await expect(page.locator('[data-annotation="suffixes"]')).toHaveCount(0)
})

test('conjugates a Turkish verb, with vowel harmony', async ({ page }) => {
  await page.goto('./#/tr')
  await page.bringToFront()
  await page.selectOption('#deckSelect', 'Common Verbs')

  const found = await page.evaluate(async () => {
    for (let i = 0; i < 400; i++) {
      const back = document.querySelector('.face.back .word')
      if (back?.childNodes[0]?.textContent?.trim() === 'gelmek') return true
      ;(document.getElementById('nextBtn') as HTMLButtonElement).click()
      await new Promise(r => requestAnimationFrame(r))
    }
    return false
  })
  expect(found, 'should reach gelmek').toBe(true)

  await page.click('#flipBtn')
  await page.click('[data-annotation="conjugation"]')
  await expect(page.locator('#conjugationPanel')).toBeVisible()
  await expect(page.locator('#conjugationPanel')).toContainText('geliyorum')
  await expect(page.locator('#conjugationPanel')).toContainText('geliyorsunuz')

  await page.selectOption('#tenseSelect', { label: 'Gelecek zaman' })
  // The k softens to ğ before a vowel: gelecek, but geleceğim.
  await expect(page.locator('#conjugationPanel')).toContainText('geleceğim')
  await expect(page.locator('#conjugationPanel')).toContainText('geleceksiniz')
})
