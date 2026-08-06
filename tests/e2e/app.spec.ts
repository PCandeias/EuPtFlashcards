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

/** Theme, direction, tenses, backup and reset now live behind the settings button. */
async function openSettings(page: Page) {
  await page.click('#settingsBtn')
  await expect(page.locator('#settingsDialog')).toBeVisible()
}

async function closeSettings(page: Page) {
  await page.click('#settingsCloseBtn')
  await expect(page.locator('#settingsDialog')).toBeHidden()
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
  await expect(page.locator('#totalCount')).toHaveText('1852')
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
  // Wiping study history asks first.
  await page.click('#resetConfirmBtn')
  // Only the Class card is cleared; the Numbers one survives.
  await expect(page.locator('#learnedCount')).toHaveText('1')
})

test('settings survive a reload', async ({ page }) => {
  await page.goto('./')
  await page.selectOption('#directionSelect', 'b-a')
  await page.selectOption('#deckSelect', 'Numbers')

  await page.reload()
  await expect(page.locator('#deckSelect')).toHaveValue('Numbers')
  await expect(page.locator('#directionSelect')).toHaveValue('b-a')
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

    // The word's own text node: textContent would also pick up any badge pill.
    const answer = await page.evaluate(() =>
      document.querySelector('.face.back .word')?.childNodes[0]?.textContent?.trim() ?? '')
    expect(answer).not.toBe('')

    await page.fill('#answerInput', answer)
    await page.click('#checkBtn')

    await expect(page.locator('#answerVerdict')).toHaveText('Correct')
    // Answering is what reveals the card in this mode.
    await expect(page.locator('.card')).toHaveClass(/flipped/)
  })

  test('accepts a missing accent but shows the correct spelling', async ({ page }) => {
    await page.goto('./')
    await page.click('#typeBtn')

    // Find a card whose answer actually carries an accent. Read the word's own
    // text node: textContent would also pick up badge pills and the conjugation
    // marker, which are inside .word but are not part of the answer.
    const plain = await page.evaluate(async () => {
      for (let i = 0; i < 300; i++) {
        const back = document.querySelector('.face.back .word')
          ?.childNodes[0]?.textContent?.trim() ?? ''
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

    await openSettings(page)
    const download = await Promise.all([
      page.waitForEvent('download'),
      page.click('#exportBtn'),
    ]).then(([d]) => d)
    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const backup = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    expect(Object.keys(backup.history)).toHaveLength(1)

    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('#streakCount')).toHaveText('0')

    await openSettings(page)
    await page.setInputFiles('input[type=file]', {
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    })
    await expect(page.locator('#streakCount')).toHaveText('1')
  })
})

test.describe('themes', () => {
  test('defaults to Slate and applies it to the document', async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'slate')
  })

  test('switching repaints the whole app, badges included', async ({ page }) => {
    await page.goto('./')
    const read = () => page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return {
        bg: style.getPropertyValue('--bg').trim(),
        badge: style.getPropertyValue('--badge-number').trim(),
        theme: document.documentElement.dataset.theme,
      }
    })

    const slate = await read()
    await page.click('#themeBtn')
    const azulejo = await read()

    expect(azulejo.theme).toBe('azulejo')
    expect(azulejo.bg).not.toBe(slate.bg)
    // Badge colours are per theme: a highlight on near-black vanishes on cream.
    expect(azulejo.badge).not.toBe(slate.badge)
  })

  test('keeps the iOS status bar in step with the theme', async ({ page }) => {
    await page.goto('./')
    await page.click('#themeBtn')
    const light = await page.getAttribute('meta[name="theme-color"]', 'content')
    await page.click('#themeBtn')
    const dark = await page.getAttribute('meta[name="theme-color"]', 'content')
    expect(light).not.toBe(dark)
  })

  test('survives a reload', async ({ page }) => {
    await page.goto('./')
    await page.click('#themeBtn')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'azulejo')
    await expect(page.locator('#themeBtn')).toHaveAttribute('aria-label', /dark/i)
  })

  test('falls back to Slate rather than writing junk into the document', async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => {
      localStorage.setItem('eupt:v4:settings',
        JSON.stringify({ deck: 'All', direction: 'a-b', theme: 'neon' }))
    })
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'slate')
  })
})

/**
 * The settled height, not whatever frame we happen to catch.
 *
 * Opening typing mode changes the card's cap and runs a short animation, so an
 * immediate read can catch a transient value — which showed up as an occasional
 * failure only under parallel load.
 */
async function settledScrollHeight(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(async () => {
    const read = () => document.documentElement.scrollHeight
    let previous = read()
    for (let i = 0; i < 30; i++) {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const current = read()
      if (current === previous) return current
      previous = current
    }
    return previous
  })
}

test.describe('layout', () => {
  // The card used to be sized by calc(100svh - 300px); adding a single row broke
  // it twice. The grid now guarantees the fit, so this is the regression guard.
  for (const [width, height] of [[1280, 900], [768, 1024], [390, 844], [360, 740], [320, 568]]) {
    test(`fits ${width}x${height} in both study modes`, async ({ page }) => {
      await page.setViewportSize({ width: width!, height: height! })
      await page.goto('./')
      await expect(page.locator('.card')).toBeVisible()

      const flip = await settledScrollHeight(page)
      expect(flip, 'flip mode should not overflow').toBeLessThanOrEqual(height!)

      await page.click('#typeBtn')
      await expect(page.locator('#answerInput')).toBeVisible()
      const typing = await settledScrollHeight(page)
      expect(typing, 'typing mode should not overflow').toBeLessThanOrEqual(height!)
    })
  }

  // Every control must be reachable on the smallest phone, not merely present in
  // the DOM: the toolbar has six controls and used to stack them off the screen.
  for (const [width, height] of [[320, 568], [375, 667], [390, 844]]) {
    test(`keeps every control on screen at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width: width!, height: height! })
      await page.goto('./')
      await expect(page.locator('.card')).toBeVisible()

      const ids = [
        'deckSelect', 'directionSelect', 'typeBtn', 'shuffleBtn', 'themeBtn', 'resetBtn',
        'settingsBtn', 'prevBtn', 'flipBtn', 'nextBtn',
        'againBtn', 'hardBtn', 'goodBtn', 'easyBtn',
      ]
      const offscreen = await page.evaluate((ids) => ids.filter((id) => {
        const el = document.getElementById(id)
        if (!el) return true
        const r = el.getBoundingClientRect()
        return r.width === 0 || r.height === 0 || r.bottom > innerHeight || r.right > innerWidth
      }), ids)
      expect(offscreen, 'controls pushed off screen').toEqual([])
    })
  }

  test('the settings sheet stays on screen on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('./')
    await page.click('#settingsBtn')
    // The sheet animates in, so measure once it has settled rather than mid-rise.
    const onScreen = await page.evaluate(async () => {
      const rect = () => document.querySelector('.sheet')!.getBoundingClientRect()
      let previous = -1
      for (let i = 0; i < 30; i++) {
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
        const bottom = Math.round(rect().bottom)
        if (bottom === previous) break
        previous = bottom
      }
      const r = rect()
      return r.top >= -1 && r.bottom <= innerHeight + 1
    })
    expect(onScreen).toBe(true)
  })
})

test.describe('verb conjugation', () => {
  /** Walks to a specific card in a deck. */
  async function goToCard(page: import('@playwright/test').Page, deck: string, pt: string) {
    await page.selectOption('#deckSelect', deck)
    const found = await page.evaluate(async (want) => {
      for (let i = 0; i < 600; i++) {
        const back = document.querySelector('.face.back .word')
        if (back?.childNodes[0]?.textContent?.trim() === want) return true
        ;(document.getElementById('nextBtn') as HTMLButtonElement).click()
        await new Promise(r => requestAnimationFrame(r))
      }
      return false
    }, pt)
    expect(found, `should reach ${pt}`).toBe(true)
    // Controls on a face are only reachable once that face is showing — the
    // hidden side does not take clicks.
    await page.click('#flipBtn')
    await expect(page.locator('.card')).toHaveClass(/flipped/)
  }

  async function enableAllTenses(page: import('@playwright/test').Page) {
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('eupt:v4:settings') ?? '{}')
      s.tenses = ['presente', 'perfeito', 'imperfeito', 'futuro', 'futuroProximo']
      localStorage.setItem('eupt:v4:settings', JSON.stringify(s))
    })
    await page.reload()
    await expect(page.locator('.card')).toBeVisible()
  }

  test('marks a verb and shows its conjugation', async ({ page }) => {
    await page.goto('./')
    await enableAllTenses(page)
    await goToCard(page, 'Common Verbs', 'dormir')

    await page.click('.face.back .marker')
    const panel = page.locator('#conjugationPanel')
    await expect(panel).toBeVisible()

    // The whole point: a regular rule would give "eu dormo", which is wrong.
    await expect(panel).toContainText('durmo')
    await expect(panel).toContainText('dormes')
    await expect(panel).toContainText('dormimos')
  })

  test('does not mark a card that is not a verb', async ({ page }) => {
    await page.goto('./')
    await enableAllTenses(page)
    await goToCard(page, 'Numbers', 'zero')
    await expect(page.locator('.marker')).toHaveCount(0)
  })

  test('switches tense from the dropdown', async ({ page }) => {
    await page.goto('./')
    await enableAllTenses(page)
    await goToCard(page, 'Common Verbs', 'dormir')
    await page.click('.face.back .marker')

    await page.selectOption('#tenseSelect', 'perfeito')
    await expect(page.locator('#conjugationPanel')).toContainText('dormi')
    await page.selectOption('#tenseSelect', 'futuroProximo')
    await expect(page.locator('#conjugationPanel')).toContainText('vou dormir')
  })

  test('opening the conjugation does not flip the card', async ({ page }) => {
    await page.goto('./')
    await enableAllTenses(page)
    await goToCard(page, 'Common Verbs', 'dormir')
    await page.click('.face.back .marker')
    // Tapping the card flips it, so the marker must swallow the gesture.
    await expect(page.locator('.card')).toHaveClass(/flipped/)
  })

  test('closes on Escape, on the close button, and when the card changes', async ({ page }) => {
    await page.goto('./')
    await enableAllTenses(page)
    await goToCard(page, 'Common Verbs', 'dormir')

    await page.click('.face.back .marker')
    await expect(page.locator('#conjugationPanel')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('#conjugationPanel')).toHaveCount(0)

    await page.click('.face.back .marker')
    await page.click('#conjugationPanel .close')
    await expect(page.locator('#conjugationPanel')).toHaveCount(0)

    await page.click('.face.back .marker')
    await expect(page.locator('#conjugationPanel')).toBeVisible()
    await page.click('#nextBtn')
    await expect(page.locator('#conjugationPanel')).toHaveCount(0)
  })

  test('offers only the tenses selected in settings', async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('eupt:v4:settings') ?? '{}')
      s.tenses = ['presente']
      localStorage.setItem('eupt:v4:settings', JSON.stringify(s))
    })
    await page.reload()
    await goToCard(page, 'Common Verbs', 'dormir')
    await page.click('.face.back .marker')

    // A single tense needs no dropdown.
    await expect(page.locator('#tenseSelect')).toHaveCount(0)
    await expect(page.locator('#conjugationPanel')).toContainText('Presente')
    await expect(page.locator('#conjugationPanel')).not.toContainText('Futuro')
  })

  test('turning every tense off removes the marker entirely', async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('eupt:v4:settings') ?? '{}')
      s.tenses = []
      localStorage.setItem('eupt:v4:settings', JSON.stringify(s))
    })
    await page.reload()
    await goToCard(page, 'Common Verbs', 'dormir')
    await expect(page.locator('.marker')).toHaveCount(0)
  })

  test('the settings checkboxes drive it, and persist', async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await openSettings(page)
    await page.check('input[value="imperfeito"]')
    await closeSettings(page)
    await page.reload()

    await openSettings(page)
    await expect(page.locator('input[value="imperfeito"]')).toBeChecked()
    await closeSettings(page)

    await goToCard(page, 'Common Verbs', 'dormir')
    await page.click('.face.back .marker')
    await page.selectOption('#tenseSelect', 'imperfeito')
    await expect(page.locator('#conjugationPanel')).toContainText('dormia')
  })

  test('conjugates a phrase, keeping what follows the verb', async ({ page }) => {
    await page.goto('./')
    await enableAllTenses(page)
    await goToCard(page, 'Daily Routine', 'tomar o pequeno-almoço')
    await page.click('.face.back .marker')
    await expect(page.locator('#conjugationPanel')).toContainText('tomo o pequeno-almoço')
  })
})

test.describe('settings panel', () => {
  test('opens from the toolbar and closes every way it should', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('#settingsDialog')).toBeHidden()

    await page.click('#settingsBtn')
    await expect(page.locator('#settingsDialog')).toBeVisible()

    // A native dialog gives Escape for free; check it actually works.
    await page.keyboard.press('Escape')
    await expect(page.locator('#settingsDialog')).toBeHidden()

    await page.click('#settingsBtn')
    await page.click('#settingsCloseBtn')
    await expect(page.locator('#settingsDialog')).toBeHidden()
  })

  test('holds appearance, conjugation and backup', async ({ page }) => {
    await page.goto('./')
    await page.click('#settingsBtn')
    for (const id of ['#exportBtn', '#importBtn']) {
      await expect(page.locator(id), `${id} should be in settings`).toBeVisible()
    }
    await expect(page.locator('input[value="presente"]')).toBeVisible()
  })

  test('leaves the study controls in the toolbar', async ({ page }) => {
    await page.goto('./')
    for (const id of ['#deckSelect', '#directionSelect', '#typeBtn', '#shuffleBtn', '#resetBtn']) {
      await expect(page.locator(`.topbar ${id}`), `${id} belongs in the toolbar`).toBeVisible()
    }
    await expect(page.locator('.topbar #themeBtn')).toBeVisible()
  })

  // Reset is one tap away in the toolbar, so a misclick must not wipe history.
  test('asks before resetting, and cancelling changes nothing', async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.selectOption('#deckSelect', 'Numbers')
    await page.click('#goodBtn')
    await expect(page.locator('#learnedCount')).toHaveText('1')

    await page.click('#resetBtn')
    await expect(page.locator('#resetDialog')).toBeVisible()
    await page.click('#resetCancelBtn')
    await expect(page.locator('#resetDialog')).toBeHidden()
    await expect(page.locator('#learnedCount')).toHaveText('1')

    await page.click('#resetBtn')
    await page.click('#resetConfirmBtn')
    await expect(page.locator('#learnedCount')).toHaveText('0')
  })

  test('names the deck it would reset', async ({ page }) => {
    await page.goto('./')
    await page.selectOption('#deckSelect', 'Numbers')
    await page.click('#resetBtn')
    await expect(page.locator('#resetDialog')).toContainText('Numbers')
  })

  test('reports the outcome of an export', async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.selectOption('#deckSelect', 'Numbers')
    await page.click('#goodBtn')

    await page.click('#settingsBtn')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#exportBtn'),
    ])
    expect(download.suggestedFilename()).toMatch(/^eu-pt-flashcards-\d{4}-\d{2}-\d{2}\.json$/)
    await expect(page.locator('#backupMessage')).toContainText('Exported 1 cards')
  })
})
