import { describe, it, expect } from 'vitest'
import { parseCard, isTag } from '../src/lib/cards/schema.js'

const where = 'test.json[0]'

describe('parseCard', () => {
  it('accepts a minimal card', () => {
    expect(parseCard({ en: 'hello', pt: 'olá' }, 'Greetings', where))
      .toEqual({ deck: 'Greetings', en: 'hello', pt: 'olá' })
  })

  it('accepts tags, ptTags and sense', () => {
    const card = parseCard(
      { en: 'him / it', pt: 'o', tags: ['masc', 'object'], ptTags: ['object'], sense: 'x' },
      'Class', where,
    )
    expect(card.tags).toEqual(['masc', 'object'])
    expect(card.ptTags).toEqual(['object'])
    expect(card.sense).toBe('x')
  })

  it('rejects an unknown tag', () => {
    expect(() => parseCard({ en: 'a', pt: 'b', tags: ['neuter'] }, 'D', where))
      .toThrow(/unknown tag/)
  })

  // ptTags marks "also show this badge on the Portuguese face", so it can only
  // ever name a tag the card already has.
  it('rejects a ptTag that is not in tags', () => {
    expect(() => parseCard({ en: 'a', pt: 'b', tags: ['masc'], ptTags: ['object'] }, 'D', where))
      .toThrow(/not present in tags/)
  })

  it('rejects missing or empty words', () => {
    expect(() => parseCard({ pt: 'b' }, 'D', where)).toThrow(/`en`/)
    expect(() => parseCard({ en: '  ', pt: 'b' }, 'D', where)).toThrow(/`en`/)
    expect(() => parseCard({ en: 'a' }, 'D', where)).toThrow(/`pt`/)
  })

  it('rejects non-objects', () => {
    expect(() => parseCard(null, 'D', where)).toThrow(/not an object/)
    expect(() => parseCard('card', 'D', where)).toThrow(/not an object/)
  })

  it('names the offending file in the error', () => {
    expect(() => parseCard({ en: 'a' }, 'D', 'decks/class.json[42]'))
      .toThrow(/decks\/class\.json\[42\]/)
  })
})

describe('isTag', () => {
  it('recognises vocabulary members', () => {
    expect(isTag('plural')).toBe(true)
    expect(isTag('masc-mixed')).toBe(true)
  })
  it('rejects everything else', () => {
    expect(isTag('neuter')).toBe(false)
    expect(isTag(7)).toBe(false)
    expect(isTag(undefined)).toBe(false)
  })
})
