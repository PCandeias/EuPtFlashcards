import { test, expect } from '@playwright/test'

/**
 * The upgrade path, exercised in a real browser rather than against a fake
 * storage object. This is the one failure mode that would cost the user
 * something irreplaceable: months of study history.
 *
 * localStorage is scoped per origin, not per path, so the app at
 * /EuPtFlashcards/ reads what the loose HTML file wrote at the same origin.
 */

const LEGACY_PROGRESS = 'pt_standalone_progress'
const LEGACY_DECK = 'pt_standalone_deck'
const LEGACY_DIRECTION = 'pt_standalone_direction'
const LEGACY_DELAY = 'pt_standalone_delay'
const V3_PROGRESS = 'eupt:v3:progress'
const V3_MIGRATED = 'eupt:v3:migrated'

test('carries progress across from the original single-file app', async ({ page }) => {
  await page.goto('./')

  // Seed what a returning user's browser actually holds: a mix of pre-badge (v1)
  // ids, current (v2) ids, and one entry for a card that no longer exists.
  await page.evaluate(([progressKey, deckKey, dirKey, delayKey]) => {
    localStorage.clear()
    localStorage.setItem(progressKey!, JSON.stringify({
      'Class::you plural come::vocês vêm': { knownCount: 3, nextDue: 1 },
      'Pronouns & Basic Words::friend masculine::o amigo': { knownCount: 6, nextDue: 2 },
      'Greetings & Polite Expressions::hello::olá': { knownCount: 9, nextDue: null },
      'Class::a card that no longer exists::xxx': { knownCount: 4, nextDue: 3 },
    }))
    localStorage.setItem(deckKey!, 'Numbers')
    localStorage.setItem(dirKey!, 'b-a')
    localStorage.setItem(delayKey!, '7')
  }, [LEGACY_PROGRESS, LEGACY_DECK, LEGACY_DIRECTION, LEGACY_DELAY])

  await page.reload()
  await expect(page.locator('.card')).toBeVisible()

  const migrated = await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}'), V3_PROGRESS)

  // v1 id, rewritten to the current scheme.
  expect(migrated['Class::you come::vocês vêm']).toEqual({ knownCount: 3, nextDue: 1 })
  expect(migrated['Pronouns & Basic Words::friend::o amigo']).toEqual({ knownCount: 6, nextDue: 2 })
  // v2 id, carried through untouched.
  expect(migrated['Greetings & Polite Expressions::hello::olá'])
    .toEqual({ knownCount: 9, nextDue: null })
  // Unmatched entries are dropped rather than attached to the wrong card.
  expect(Object.keys(migrated)).toHaveLength(3)

  await expect(page.locator('#knownCount')).toHaveText('3')
  await expect(page.locator('#deckSelect')).toHaveValue('Numbers')
  await expect(page.locator('#directionSelect')).toHaveValue('b-a')
  await expect(page.locator('#delaySelect')).toHaveValue('7')

  // The original data is left in place as a backstop.
  const legacyStillThere = await page.evaluate(k => localStorage.getItem(k), LEGACY_PROGRESS)
  expect(legacyStillThere).toContain('you plural come')
})

test('runs only once and does not re-migrate over newer progress', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(([progressKey]) => {
    localStorage.clear()
    localStorage.setItem(progressKey!, JSON.stringify({
      'Greetings & Polite Expressions::hello::olá': { knownCount: 9, nextDue: null },
    }))
  }, [LEGACY_PROGRESS])

  await page.reload()
  await expect(page.locator('#knownCount')).toHaveText('1')
  const stamp = await page.evaluate(k => localStorage.getItem(k), V3_MIGRATED)
  expect(stamp).toBeTruthy()

  // Reset everything, reload, and the migration must not resurrect the old data.
  await page.click('#resetBtn')
  await page.evaluate(k => localStorage.setItem(k, '{}'), V3_PROGRESS)
  await page.reload()
  await expect(page.locator('#knownCount')).toHaveText('0')
})

test('leaves unreadable legacy data alone rather than destroying it', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(([progressKey]) => {
    localStorage.clear()
    localStorage.setItem(progressKey!, '{ this was corrupted somehow')
  }, [LEGACY_PROGRESS])

  await page.reload()
  // The app still starts.
  await expect(page.locator('.card')).toBeVisible()
  await expect(page.locator('#knownCount')).toHaveText('0')
  // And the damaged original is still recoverable by hand.
  const legacy = await page.evaluate(k => localStorage.getItem(k), LEGACY_PROGRESS)
  expect(legacy).toBe('{ this was corrupted somehow')
})

test('exports a backup that can be imported back', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await page.selectOption('#deckSelect', 'Numbers')
  await page.click('#knownBtn')
  await page.click('#knownBtn')
  await expect(page.locator('#knownCount')).toHaveText('2')

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ]).then(([d]) => d)

  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  const backup = JSON.parse(Buffer.concat(chunks).toString('utf8'))

  expect(backup.app).toBe('eu-pt-flashcards')
  expect(Object.keys(backup.progress)).toHaveLength(2)

  // Wipe, then restore from the file.
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.locator('#knownCount')).toHaveText('0')

  await page.setInputFiles('input[type=file]', {
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  })
  await expect(page.locator('#knownCount')).toHaveText('2')
})
