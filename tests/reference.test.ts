import { describe, it, expect } from 'vitest'
import { referenceTables, search, fold, slug } from '../src/lib/reference/build.js'
import { LANGUAGES, languageById } from '../src/lib/languages/index.js'
import { parseCard } from '../src/lib/cards/schema.js'
import { routeFrom, hashFor, VIEWS } from '../src/lib/router.js'

const portuguese = languageById('pt')!
const turkish = languageById('tr')!

describe('the reference tables', () => {
  for (const language of LANGUAGES) {
    describe(language.shortName, () => {
      const tables = referenceTables(language)

      it('has a section for tenses, levels and decks at least', () => {
        const titles = tables.map(t => t.title)
        expect(titles).toContain('Tenses')
        expect(titles).toContain('Levels')
        expect(titles).toContain('Decks')
      })

      it('gives every table a title, columns and rows', () => {
        for (const table of tables) {
          expect(table.title).toBeTruthy()
          expect(table.columns.length).toBeGreaterThan(1)
          expect(table.rows.length).toBeGreaterThan(0)
        }
      })

      it('gives every row exactly as many cells as there are columns', () => {
        for (const table of tables) {
          for (const row of table.rows) {
            expect(row, `${table.title}: ${row.join(' | ')}`).toHaveLength(table.columns.length)
          }
        }
      })

      it('leaves no cell empty', () => {
        for (const table of tables) {
          for (const row of table.rows) {
            for (const cell of row) expect(cell, table.title).not.toBe('')
          }
        }
      })

      it('titles each section only once, so the jump links are unique', () => {
        const titles = tables.map(t => t.title)
        expect(new Set(titles).size).toBe(titles.length)
      })

      it('gives every section an anchor safe to write into an href', () => {
        const slugs = tables.map(t => slug(t.title))
        for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
        expect(new Set(slugs).size).toBe(slugs.length)
      })

      it('lists every tense the language has', () => {
        const tenses = tables.find(t => t.title === 'Tenses')!
        expect(tenses.rows.map(r => r[0])).toEqual(language.tenses.map(t => t.label))
      })

      it('counts the decks the way the corpus does', () => {
        const decks = tables.find(t => t.title === 'Decks')!
        const total = decks.rows.reduce((sum, row) => sum + Number(row[1]), 0)
        expect(total).toBe(language.cards.length)
        expect(decks.rows).toHaveLength(new Set(language.cards.map(c => c.deck)).size)
      })

      it('conjugates its model verb across the tenses it teaches', () => {
        const table = tables.find(t => t.title === 'A verb in full')
        expect(table, 'every language should show one verb in full').toBeTruthy()
        // A column per tense, plus the person column on the left.
        expect(table!.columns.length).toBe(language.tenses.length + 1)
        expect(table!.rows).toHaveLength(language.persons.length)
      })

      it('has more to say behind the second fold on all but one section', () => {
        const withDetail = tables.filter(t => t.details?.length)
        // Decks is a list of names and speaks for itself; everything else earns
        // a paragraph or three.
        expect(withDetail.length).toBeGreaterThanOrEqual(tables.length - 1)
        for (const table of withDetail) {
          for (const point of table.details!) {
            expect(point.length, `${table.title}: "${point}"`).toBeGreaterThan(40)
            expect(point.trim()).toBe(point)
          }
        }
      })

      it('explains only the badges its own cards actually carry', () => {
        const badges = tables.find(t => t.title === 'Badges')
        if (!badges) return
        expect(badges.rows.length).toBeLessThanOrEqual(
          new Set(language.cards.flatMap(c => c.tags ?? [])).size,
        )
      })
    })
  }

  it('puts what a language says for itself before the generic sections', () => {
    const tables = referenceTables(turkish)
    const ownTitles = (turkish.reference ?? []).map(t => t.title)
    expect(tables.slice(0, ownTitles.length).map(t => t.title)).toEqual(ownTitles)
  })

  it('teaches Turkish its endings and Portuguese its contractions', () => {
    expect(referenceTables(turkish).map(t => t.title)).toContain('Noun endings')
    expect(referenceTables(portuguese).map(t => t.title)).toContain('Contractions')
  })

  it('drops the model verb when a language has none rather than showing a gap', () => {
    const tables = referenceTables({ ...turkish, modelVerb: undefined })
    expect(tables.map(t => t.title)).not.toContain('A verb in full')
  })
})

describe('folding', () => {
  it('ignores case and accents', () => {
    expect(fold('Café')).toBe('cafe')
    expect(fold('AVIÃO')).toBe('aviao')
  })

  it('folds the Turkish letters that survive decomposition', () => {
    expect(fold('öğrenci')).toBe('ogrenci')
    expect(fold('Işık')).toBe('isik')
    expect(fold('çay')).toBe('cay')
    expect(fold('şey')).toBe('sey')
  })
})

describe('searching the deck', () => {
  const cards = [
    { target: 'ev', en: 'house' },
    { target: 'evet', en: 'yes' },
    { target: 'kahve', en: 'coffee' },
    { target: 'sevmek', en: 'to love' },
    { target: 'o çay', en: 'the tea', sense: 'black tea' },
  ].map((c, i) => parseCard({ ...c, deck: 'Test' }, 'Test', `card ${i}`))

  const targets = (query: string) => search(cards, query).map(h => h.card.target)

  it('finds nothing for an empty query', () => {
    expect(search(cards, '   ')).toEqual([])
  })

  it('puts an exact match first, then the word that starts with it', () => {
    // Exact, then word-initial, then merely containing it.
    expect(targets('ev')).toEqual(['ev', 'evet', 'sevmek'])
  })

  it('searches the English side too', () => {
    expect(targets('coffee')).toEqual(['kahve'])
  })

  it('prefers the card whose target matched over one whose gloss did', () => {
    const hits = search(cards, 'ev')
    expect(hits[0]!.matched).toBe('target')
  })

  it('matches through accents and case', () => {
    expect(targets('CAY')).toEqual(['o çay'])
  })

  it('matches the sense when neither side does', () => {
    const hits = search(cards, 'black')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.matched).toBe('sense')
  })

  it('honours the limit', () => {
    expect(search(turkish.cards, 'a', 5)).toHaveLength(5)
  })

  it('finds a real card in each deck it is given', () => {
    expect(search(portuguese.cards, 'obrigado').length).toBeGreaterThan(0)
    expect(search(turkish.cards, 'tesekkur').length).toBeGreaterThan(0)
  })
})

describe('the route', () => {
  it('reads a language on its own as the study screen', () => {
    expect(routeFrom('#/pt')).toEqual({ language: 'pt', view: 'study' })
  })

  it('reads the reference page', () => {
    expect(routeFrom('#/tr/reference')).toEqual({ language: 'tr', view: 'reference' })
  })

  it('sends an unknown section to the language front page', () => {
    expect(routeFrom('#/pt/nonsense')).toEqual({ language: 'pt', view: 'study' })
  })

  it('has no route for the picker or for a language that does not exist', () => {
    expect(routeFrom('')).toBeNull()
    expect(routeFrom('#/')).toBeNull()
    expect(routeFrom('#/klingon')).toBeNull()
  })

  it('round-trips every view', () => {
    for (const view of VIEWS) {
      expect(routeFrom(hashFor('pt', view))).toEqual({ language: 'pt', view })
    }
  })

  it('writes the study screen as the bare language, as it always has', () => {
    expect(hashFor('pt')).toBe('#/pt')
    expect(hashFor('tr', 'reference')).toBe('#/tr/reference')
  })
})
