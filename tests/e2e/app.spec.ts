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

test('number keys grade the card', async ({ page }) => {
  await page.goto('./')
  await page.selectOption('#deckSelect', 'Numbers')
  await page.keyboard.press('3')            // good
  await expect(page.locator('#learnedCount')).toHaveText('1')
  await page.keyboard.press('1')            // again
  await expect(page.locator('#learnedCount')).toHaveText('1')
})

test('tapping the card flips it', async ({ page }) => {
  await page.goto('./')
  await page.locator('.card').click({ position: { x: 40, y: 40 } })
  await expect(page.locator('.card')).toHaveClass(/flipped/)
})

test('rating a card defers it and persists across a reload', async ({ page }) => {
  await page.goto('./')
  await page.selectOption('#deckSelect', 'Numbers')
  const dueBefore = Number(await page.locator('#dueCount').textContent())

  await page.click('#goodBtn')
  await expect(page.locator('#dueCount')).toHaveText(String(dueBefore - 1))
  await expect(page.locator('#learnedCount')).toHaveText('1')

  await page.reload()
  await expect(page.locator('#learnedCount')).toHaveText('1')
  await expect(page.locator('#dueCount')).toHaveText(String(dueBefore - 1))
})

test('the rating buttons show what each answer will cost', async ({ page }) => {
  await page.goto('./')
  await page.selectOption('#deckSelect', 'Numbers')

  // A brand new card: again returns it immediately, easy skips the learning steps.
  await expect(page.locator('#againBtn .interval')).toHaveText('<1m')
  await expect(page.locator('#goodBtn .interval')).toHaveText('1d')
  await expect(page.locator('#easyBtn .interval')).toHaveText('4d')
})

test('the preview reflects the card, not a fixed schedule', async ({ page }) => {
  await page.goto('./')
  // Seed one card as already graduated, so its preview must differ from a new one.
  await page.evaluate(() => {
    localStorage.setItem('eupt:v4:progress', JSON.stringify({
      'Numbers::zero::zero': {
        ease: 2.5, interval: 6, reps: 2, lapses: 0, due: 0, reviews: 2,
      },
    }))
  })
  await page.reload()
  await page.selectOption('#deckSelect', 'Numbers')

  const found = await page.evaluate(async () => {
    for (let i = 0; i < 200; i++) {
      if (document.querySelector('.face.front .word')?.textContent?.trim().startsWith('zero')) {
        return true
      }
      ;(document.getElementById('nextBtn') as HTMLButtonElement).click()
      await new Promise(r => requestAnimationFrame(r))
    }
    return false
  })
  expect(found).toBe(true)
  // 6 days x ease 2.5 = 15, versus 1d for an unseen card.
  await expect(page.locator('#goodBtn .interval')).toHaveText('15d')
})

test('again requeues the card into the same session', async ({ page }) => {
  await page.goto('./')
  await page.selectOption('#deckSelect', 'Numbers')
  const queueBefore = await page.locator('#progressText').textContent()
  const size = Number(queueBefore!.match(/\/\s*(\d+)/)![1])

  const word = (await page.locator('.face.front .word').textContent())!.trim()
  await page.click('#againBtn')

  // The queue keeps its length: a failed card comes back this sitting.
  await expect(page.locator('#progressText')).toContainText(`/ ${size}`)
  await expect(page.locator('#learnedCount')).toHaveText('0')

  // And it really is still in there, a few cards further on.
  const returns = await page.evaluate(async (w) => {
    for (let i = 0; i < 20; i++) {
      if (document.querySelector('.face.front .word')?.textContent?.trim() === w) return i
      ;(document.getElementById('nextBtn') as HTMLButtonElement).click()
      await new Promise(r => requestAnimationFrame(r))
    }
    return -1
  }, word)
  expect(returns).toBeGreaterThan(0)
})

test('grading does not reshuffle the deck under you', async ({ page }) => {
  await page.goto('./')
  await page.selectOption('#deckSelect', 'Numbers')

  // Note the card after this one, grade the current card, and it should be next.
  await page.click('#nextBtn')
  const second = (await page.locator('.face.front .word').textContent())!.trim()
  await page.click('#prevBtn')
  await page.click('#goodBtn')
  await expect(page.locator('.face.front .word')).toHaveText(second)
})

test('reset clears progress for the selected deck only', async ({ page }) => {
  await page.goto('./')
  await page.selectOption('#deckSelect', 'Numbers')
  await page.click('#goodBtn')
  await expect(page.locator('#learnedCount')).toHaveText('1')

  await page.selectOption('#deckSelect', 'Class')
  await page.click('#goodBtn')
  await expect(page.locator('#learnedCount')).toHaveText('2')

  await page.click('#resetBtn')
  // Only the Class card is cleared; the Numbers one survives.
  await expect(page.locator('#learnedCount')).toHaveText('1')
})

test('settings survive a reload', async ({ page }) => {
  await page.goto('./')
  await page.selectOption('#directionSelect', 'b-a')
  await page.selectOption('#deckSelect', 'Numbers')
  await page.reload()
  await expect(page.locator('#directionSelect')).toHaveValue('b-a')
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

test('the speak button does not also flip the card', async ({ page }) => {
  await page.goto('./')
  await page.click('#flipBtn')                       // reveal the Portuguese face
  await expect(page.locator('.card')).toHaveClass(/flipped/)

  await page.locator('.face.back .speak').click()
  // Tapping the card flips it, so the speaker must swallow the gesture or the
  // card turns away the moment you ask to hear it.
  await expect(page.locator('.card')).toHaveClass(/flipped/)
})

test('offers audio on the Portuguese face only', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.face.back .speak')).toHaveCount(1)
  await expect(page.locator('.face.front .speak')).toHaveCount(0)
})

test.describe('typing mode', () => {
  test('checks a typed answer and reveals the card', async ({ page }) => {
    await page.goto('./')
    await page.selectOption('#deckSelect', 'Numbers')
    await page.click('#typeBtn')

    const answer = (await page.locator('.face.back .word').textContent())!.trim()
    await page.fill('#answerInput', answer)
    await page.click('#checkBtn')

    await expect(page.locator('#answerVerdict')).toHaveText('Correct')
    // Answering is what reveals the card in this mode.
    await expect(page.locator('.card')).toHaveClass(/flipped/)
  })

  test('accepts a missing accent but shows the correct spelling', async ({ page }) => {
    await page.goto('./')
    await page.click('#typeBtn')

    // Find a card whose answer actually carries an accent.
    const plain = await page.evaluate(async () => {
      for (let i = 0; i < 300; i++) {
        const back = document.querySelector('.face.back .word')?.textContent?.trim() ?? ''
        const stripped = back.normalize('NFD').replace(/\p{Diacritic}/gu, '')
        if (stripped !== back && !back.includes('/')) return { back, stripped }
        ;(document.getElementById('nextBtn') as HTMLButtonElement).click()
        await new Promise(r => requestAnimationFrame(r))
      }
      return null
    })
    expect(plain).not.toBeNull()

    await page.fill('#answerInput', plain!.stripped)
    await page.click('#checkBtn')
    const verdict = page.locator('#answerVerdict')
    await expect(verdict).toContainText('Almost')
    await expect(verdict).toContainText(plain!.back)
  })

  test('rejects a wrong answer and names the right one', async ({ page }) => {
    await page.goto('./')
    await page.selectOption('#deckSelect', 'Numbers')
    await page.click('#typeBtn')

    // Read the word itself: textContent would also pick up any badge text, and a
    // card offering alternatives ("um / uma") is named by the first of them.
    const answer = await page.evaluate(() => {
      const word = document.querySelector('.face.back .word')
      const text = word?.childNodes[0]?.textContent?.trim() ?? ''
      return text.split('/')[0]!.trim()
    })
    expect(answer).not.toBe('')

    await page.fill('#answerInput', 'definitely not the answer')
    await page.click('#checkBtn')

    await expect(page.locator('#answerVerdict')).toContainText('Not quite')
    await expect(page.locator('#answerVerdict')).toContainText(answer)
  })

  test('clears the box when the card changes', async ({ page }) => {
    await page.goto('./')
    await page.selectOption('#deckSelect', 'Numbers')
    await page.click('#typeBtn')
    await page.fill('#answerInput', 'something')
    await page.click('#nextBtn')
    await expect(page.locator('#answerInput')).toHaveValue('')
  })

  test('toggles off again, restoring tap to flip', async ({ page }) => {
    await page.goto('./')
    await page.click('#typeBtn')
    await expect(page.locator('#answerInput')).toBeVisible()
    await page.click('#typeBtn')
    await expect(page.locator('#answerInput')).toHaveCount(0)
  })
})

test.describe('review history', () => {
  test('records a streak and a recall rate as you grade', async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.selectOption('#deckSelect', 'Numbers')

    // Nothing measured yet reads as a dash, not as 0%.
    await expect(page.locator('#retentionCount')).toHaveText('—')
    await expect(page.locator('#streakCount')).toHaveText('0')

    await page.click('#goodBtn')
    await expect(page.locator('#streakCount')).toHaveText('1')
    await expect(page.locator('#retentionCount')).toHaveText('100%')

    // One failure in four reviews is 75% recall.
    await page.click('#goodBtn')
    await page.click('#easyBtn')
    await page.click('#againBtn')
    await expect(page.locator('#retentionCount')).toHaveText('75%')
  })

  test('survives a reload', async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.selectOption('#deckSelect', 'Numbers')
    await page.click('#goodBtn')
    await page.reload()
    await expect(page.locator('#streakCount')).toHaveText('1')
    await expect(page.locator('#retentionCount')).toHaveText('100%')
  })

  test('shows the streak on the phone layout, where the panel is hidden', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.selectOption('#deckSelect', 'Numbers')
    await page.click('#goodBtn')
    await expect(page.locator('.stats')).toBeHidden()
    await expect(page.locator('#streakInline')).toBeVisible()
    await expect(page.locator('#recallInline')).toContainText('100% recall')
  })

  test('a backup carries the history, so a restore keeps the streak', async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.selectOption('#deckSelect', 'Numbers')
    await page.click('#goodBtn')
    await expect(page.locator('#streakCount')).toHaveText('1')

    const download = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export backup' }).click(),
    ]).then(([d]) => d)
    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const backup = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    expect(Object.keys(backup.history)).toHaveLength(1)

    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('#streakCount')).toHaveText('0')

    await page.setInputFiles('input[type=file]', {
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    })
    await expect(page.locator('#streakCount')).toHaveText('1')
  })
})
