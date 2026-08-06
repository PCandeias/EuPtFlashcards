import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Guards the card corpus against drifting by accident.
 *
 * The reference began as a frozen snapshot of the single-file app and has been
 * updated once since, deliberately: the 2026-08 accuracy review corrected twelve
 * cards (see the commit for each one and why). The renders snapshot alongside it
 * still records what the original app drew for cards covering every branch of the
 * badge logic.
 *
 * Regenerate deliberately, never to make a red test green: a diff here means
 * either a real regression or an intended change to how cards read.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(root, 'tests/fixtures', name), 'utf8'))

interface LegacyCard {
  deck: string
  en: string
  pt: string
  tags?: string[]
  ptTags?: string[]
  sense?: string
}

interface LegacyRender {
  deck: string
  en: string
  pt: string
  frontWord: string
  frontBadges: string[]
  frontBadgeTitles: string[]
  backWord: string
  backBadges: string[]
  hint: string | null
}

const key = (c: LegacyCard) => `${c.deck}::${c.en}::${c.pt}`
const shape = (c: LegacyCard) => JSON.stringify({
  en: c.en, pt: c.pt,
  tags: c.tags ?? [], ptTags: c.ptTags ?? [], sense: c.sense ?? null,
})

function loadPorted(): LegacyCard[] {
  const index = JSON.parse(readFileSync(join(root, 'data/decks/index.json'), 'utf8')) as
    Array<{ deck: string; file: string }>
  return index.flatMap(({ file }) => {
    const deckFile = JSON.parse(
      readFileSync(join(root, 'data/decks', `${file}.json`), 'utf8'),
    ) as { deck: string; cards: Omit<LegacyCard, 'deck'>[] }
    return deckFile.cards.map(c => ({ ...c, deck: deckFile.deck }))
  })
}

test('every card survives the port unchanged', async () => {
  const legacy = fixture('legacy-cards.json') as LegacyCard[]
  const ported = loadPorted()

  expect(ported.length).toBe(legacy.length)

  const portedByKey = new Map(ported.map(c => [key(c), c]))
  const differences: string[] = []
  for (const card of legacy) {
    const match = portedByKey.get(key(card))
    if (!match) { differences.push(`missing: ${key(card)}`); continue }
    if (shape(match) !== shape(card)) {
      differences.push(`changed: ${key(card)}\n  was ${shape(card)}\n  now ${shape(match)}`)
    }
  }
  expect(differences).toEqual([])
})

// Searching a shuffled 469-card deck for a specific card is slow by nature.
test.describe(() => {
  test.describe.configure({ timeout: 180_000 })

  test('renders each card exactly as the original did', async ({ page }) => {
    const expected = fixture('legacy-renders.json') as LegacyRender[]
    await page.goto('./')

    for (const want of expected) {
      await page.selectOption('#deckSelect', want.deck)

      const actual = await page.evaluate(async (s) => {
        for (let i = 0; i < 5000; i++) {
          const front = document.querySelector('.face.front .word')
          const back = document.querySelector('.face.back .word')
          if (
            front?.textContent?.trim().startsWith(s.en) &&
            back?.textContent?.trim().startsWith(s.pt)
          ) {
            return {
              frontWord: front.childNodes[0]?.textContent?.trim() ?? '',
              frontBadges: [...front.querySelectorAll('.badge')].map(b => b.textContent!.trim()),
              frontBadgeTitles: [...front.querySelectorAll('.badge')]
                .map(b => b.getAttribute('title')),
              backWord: back.childNodes[0]?.textContent?.trim() ?? '',
              backBadges: [...back.querySelectorAll('.badge')].map(b => b.textContent!.trim()),
              hint: document.querySelector('.face.front .hint')?.textContent?.trim() ?? null,
            }
          }
          ;(document.getElementById('nextBtn') as HTMLButtonElement).click()
          await new Promise(r => requestAnimationFrame(r))
        }
        return null
      }, { en: want.en, pt: want.pt })

      expect(actual, `should render ${want.en} / ${want.pt}`).not.toBeNull()
      expect(actual!.frontWord, `front word for ${want.en}`).toBe(want.frontWord)
      expect(actual!.frontBadges, `front badges for ${want.en}`).toEqual(want.frontBadges)
      expect(actual!.frontBadgeTitles, `badge titles for ${want.en}`).toEqual(want.frontBadgeTitles)
      expect(actual!.backWord, `back word for ${want.en}`).toBe(want.backWord)
      expect(actual!.backBadges, `back badges for ${want.en}`).toEqual(want.backBadges)
      expect(actual!.hint, `hint for ${want.en}`).toBe(want.hint)
    }
  })
})
