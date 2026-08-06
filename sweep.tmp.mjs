import { chromium } from '@playwright/test'
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome'
const base = 'http://localhost:4173/EuPtFlashcards/'
const VIEWPORTS = [
  [320, 568, 'iPhone SE 1'], [360, 640, 'small Android'], [390, 664, 'iPhone 13 in Safari'],
  [390, 844, 'iPhone 13 full'], [414, 896, 'iPhone 11 Pro Max'], [844, 390, 'phone landscape'],
  [768, 1024, 'iPad portrait'], [1024, 768, 'iPad landscape'], [1280, 900, 'laptop'],
  [1920, 1080, 'desktop'],
]

const probe = () => {
  const doc = document.documentElement
  const problems = []
  if (doc.scrollWidth > innerWidth + 1) problems.push(`h-scroll ${doc.scrollWidth}>${innerWidth}`)
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    if (r.right > innerWidth + 1.5 || r.left < -1.5) {
      const id = el.id || String(el.className || '').split(' ')[0] || el.tagName
      problems.push(`offscreen-x ${id}`)
    }
    if (!el.closest('.visually-hidden') && el.children.length === 0 && el.scrollWidth > el.clientWidth + 2
        && getComputedStyle(el).overflowX !== 'visible' && getComputedStyle(el).overflowX !== 'auto') {
      problems.push(`clipped ${el.id || el.tagName}: ${(el.textContent || '').slice(0, 18)}`)
    }
  }
  return [...new Set(problems)].slice(0, 5)
}

const b = await chromium.launch({ executablePath: exe })
for (const [w, h, name] of VIEWPORTS) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  const out = []
  const vertical = async () => p.evaluate(() => document.documentElement.scrollHeight - innerHeight)

  await p.goto(base); await p.waitForTimeout(300)
  out.push(['picker', await p.evaluate(probe), `v+${await vertical()}`])

  await p.goto(base + '#/pt'); await p.waitForTimeout(400)
  out.push(['study', await p.evaluate(probe), `v+${await vertical()}`])
  await p.click('#flipBtn'); await p.waitForTimeout(200)
  out.push(['flipped', await p.evaluate(probe), `v+${await vertical()}`])
  await p.click('#typeBtn').catch(() => {}); await p.waitForTimeout(250)
  out.push(['typing', await p.evaluate(probe), `v+${await vertical()}`])
  await p.click('#typeBtn').catch(() => {}); await p.waitForTimeout(200)

  await p.selectOption('#deckSelect', 'Common Verbs')
  await p.evaluate(async () => {
    for (let i = 0; i < 400; i++) {
      const back = document.querySelector('.face.back .word')
      if (back?.childNodes[0]?.textContent?.trim() === 'dormir') return
      document.getElementById('nextBtn').click()
      await new Promise(r => requestAnimationFrame(r))
    }
  })
  await p.click('#flipBtn'); await p.waitForTimeout(200)
  for (const kind of ['conjugation', 'examples']) {
    let blocked = false
    await p.click(`.face.back [data-annotation="${kind}"]`, { timeout: 4000 }).catch(() => { blocked = true })
    await p.waitForTimeout(300)
    const probs = await p.evaluate(probe)
    if (blocked) probs.unshift('CLICK BLOCKED')
    out.push([kind, probs, `v+${await vertical()}`])
  }
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)

  await p.click('#settingsBtn'); await p.waitForTimeout(350)
  out.push(['settings', await p.evaluate(probe), ''])
  await p.click('#settingsCloseBtn'); await p.waitForTimeout(200)
  await p.click('.face.back .report'); await p.waitForTimeout(300)
  out.push(['report dialog', await p.evaluate(probe), ''])
  await p.click('#reportCancelBtn'); await p.waitForTimeout(200)
  await p.click('#resetBtn').catch(() => {}); await p.waitForTimeout(300)
  out.push(['reset dialog', await p.evaluate(probe), ''])

  console.log(`\n${w}x${h}  ${name}`)
  let clean = true
  for (const [state, probs, v] of out) {
    const over = v ? Number(v.slice(2)) : 0
    if (probs.length || over > 0) {
      clean = false
      console.log(`   ${probs.length ? '✗' : '·'} ${state.padEnd(14)} ${over > 0 ? `scrolls +${over}px` : ''} ${probs.join(' | ')}`)
    }
  }
  if (clean) console.log('    clean')
  await p.close()
}
await b.close()
