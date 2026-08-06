import { chromium } from '@playwright/test'
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome'
const b = await chromium.launch({ executablePath: exe })
for (const [w, h, name] of [[320, 568, 'SE'], [390, 664, 'iPhone 13 Safari'], [390, 844, 'iPhone 13'],
  [844, 390, 'landscape'], [768, 1024, 'iPad'], [1280, 900, 'laptop']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto('http://localhost:4173/EuPtFlashcards/#/pt'); await p.waitForTimeout(400)
  await p.selectOption('#deckSelect', 'Common Verbs')
  await p.evaluate(async () => {
    for (let i = 0; i < 500; i++) {
      const back = document.querySelector('.face.back .word')
      if (back?.childNodes[0]?.textContent?.trim() === 'dormir') return
      document.getElementById('nextBtn').click()
      await new Promise(r => requestAnimationFrame(r))
    }
  })
  await p.click('#flipBtn'); await p.waitForTimeout(200)
  const res = []
  for (const kind of ['conjugation', 'examples']) {
    let blocked = false
    await p.click(`.face.back [data-annotation="${kind}"]`, { timeout: 4000 }).catch(() => { blocked = true })
    await p.waitForTimeout(300)
    const g = await p.evaluate(() => {
      const panel = document.querySelector('.cardarea .panel')?.getBoundingClientRect()
      const word = document.querySelector('.face.back .word').getBoundingClientRect()
      const m = document.querySelector('.face.back [data-annotation="examples"]').getBoundingClientRect()
      const hit = document.elementFromPoint(m.left + m.width / 2, m.top + m.height / 2)
      return {
        panel: !!panel, wordClear: panel ? word.bottom <= panel.top + 1 : null,
        markerFree: hit?.closest('[data-annotation]')?.getAttribute('data-annotation') === 'examples',
        over: document.documentElement.scrollHeight - innerHeight,
      }
    })
    res.push(`${kind}: shown=${g.panel} wordClear=${g.wordClear} markerClickable=${g.markerFree}${blocked ? ' CLICK-BLOCKED' : ''} pageOver=${g.over}`)
  }
  console.log(`${w}x${h} ${name}\n   ${res.join('\n   ')}`)
  if (w === 390 && h === 664) await p.screenshot({ path: 'shot-overlay.png' })
  await p.close()
}
await b.close()
