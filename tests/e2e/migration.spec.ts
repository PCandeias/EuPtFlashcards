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
const V4_PROGRESS = 'eupt:v4:progress'
const V4_MIGRATED = 'eupt:v4:migrated'

test('carries progress across from the original single-file app', async ({ page }) => {
  await page.goto('./#/pt')

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

  const migrated = await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}'), V4_PROGRESS)

  // Legacy id, rewritten to the current scheme. Scheduling starts fresh, but the
  // due date is preserved so nothing floods back at once.
  expect(migrated['Class::you come::vocês vêm'])
    .toMatchObject({ reps: 0, interval: 0, ease: 2.5, due: 1, reviews: 3 })
  expect(migrated['Pronouns & Basic Words::friend::o amigo'])
    .toMatchObject({ due: 2, reviews: 6 })
  // Current id, carried through.
  expect(migrated['Greetings & Polite Expressions::hello::olá'])
    .toMatchObject({ due: null, reviews: 9 })
  // Unmatched entries are dropped rather than attached to the wrong card.
  expect(Object.keys(migrated)).toHaveLength(3)

  // Nothing is "learned" yet in SM-2 terms — the old count measured taps, not recall.
  await expect(page.locator('#learnedCount')).toHaveText('0')
  await expect(page.locator('#deckSelect')).toHaveValue('Numbers')
  await expect(page.locator('#directionSelect')).toHaveValue('b-a')

  // The original data is left in place as a backstop.
  const legacyStillThere = await page.evaluate(k => localStorage.getItem(k), LEGACY_PROGRESS)
  expect(legacyStillThere).toContain('you plural come')
})

test('runs only once and does not re-migrate over newer progress', async ({ page }) => {
  await page.goto('./#/pt')
  await page.evaluate(([progressKey]) => {
    localStorage.clear()
    localStorage.setItem(progressKey!, JSON.stringify({
      'Greetings & Polite Expressions::hello::olá': { knownCount: 9, nextDue: null },
    }))
  }, [LEGACY_PROGRESS])

  await page.reload()
  const stamp = await page.evaluate(k => localStorage.getItem(k), V4_MIGRATED)
  expect(stamp).toBeTruthy()
  const first = await page.evaluate(k => localStorage.getItem(k), V4_PROGRESS)
  expect(JSON.parse(first ?? '{}')['Greetings & Polite Expressions::hello::olá'].reviews).toBe(9)

  // Wipe the migrated data and reload: the migration must not resurrect it.
  await page.evaluate(k => localStorage.setItem(k, '{}'), V4_PROGRESS)
  await page.reload()
  const second = await page.evaluate(k => localStorage.getItem(k), V4_PROGRESS)
  expect(JSON.parse(second ?? '{}')).toEqual({})
})

test('upgrades progress written by the previous fixed-delay version', async ({ page }) => {
  await page.goto('./#/pt')
  await page.evaluate(([v3]) => {
    localStorage.clear()
    localStorage.setItem(v3!, JSON.stringify({
      'Greetings & Polite Expressions::hello::olá': { knownCount: 4, nextDue: 999 },
    }))
  }, [V3_PROGRESS])

  await page.reload()
  await expect(page.locator('.card')).toBeVisible()
  const migrated = await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}'), V4_PROGRESS)
  expect(migrated['Greetings & Polite Expressions::hello::olá'])
    .toMatchObject({ reps: 0, ease: 2.5, due: 999, reviews: 4 })
  // The v3 record is left where it is, as a backstop.
  const v3Still = await page.evaluate(k => localStorage.getItem(k), V3_PROGRESS)
  expect(v3Still).toContain('knownCount')
})

test('leaves unreadable legacy data alone rather than destroying it', async ({ page }) => {
  await page.goto('./#/pt')
  await page.evaluate(([progressKey]) => {
    localStorage.clear()
    localStorage.setItem(progressKey!, '{ this was corrupted somehow')
  }, [LEGACY_PROGRESS])

  await page.reload()
  // The app still starts.
  await expect(page.locator('.card')).toBeVisible()
  await expect(page.locator('#learnedCount')).toHaveText('0')
  // And the damaged original is still recoverable by hand.
  const legacy = await page.evaluate(k => localStorage.getItem(k), LEGACY_PROGRESS)
  expect(legacy).toBe('{ this was corrupted somehow')
})

test('exports a backup that can be imported back', async ({ page }) => {
  await page.goto('./#/pt')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await page.selectOption('#deckSelect', 'Numbers')
  await page.click('#goodBtn')
  await page.click('#goodBtn')
  await expect(page.locator('#learnedCount')).toHaveText('2')

  await page.click('#settingsBtn')
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.click('#exportBtn'),
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
  await expect(page.locator('#learnedCount')).toHaveText('0')

  await page.click('#settingsBtn')
  await page.setInputFiles('input[type=file]', {
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  })
  await expect(page.locator('#learnedCount')).toHaveText('2')
})
