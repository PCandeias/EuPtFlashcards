import { describe, it, expect } from 'vitest'
import { parseCard, isTag } from '../src/lib/cards/schema.js'

const where = 'test.json[0]'

describe('parseCard', () => {
  it('accepts a minimal card', () => {
    expect(parseCard({ en: 'hello', target: 'olá' }, 'Greetings', where))
      .toEqual({ deck: 'Greetings', en: 'hello', target: 'olá' })
  })

  it('accepts tags, targetTags and sense', () => {
    const card = parseCard(
      { en: 'him / it', target: 'o', tags: ['masc', 'object'], targetTags: ['object'], sense: 'x' },
      'Class', where,
    )
    expect(card.tags).toEqual(['masc', 'object'])
    expect(card.targetTags).toEqual(['object'])
    expect(card.sense).toBe('x')
  })

  it('accepts an explicit dictionary form for an inflected verb card', () => {
    const card = parseCard(
      { en: 'I drink', target: 'içerim', verb: 'içmek' },
      'Class', where,
    )
    expect(card.verb).toBe('içmek')
  })

  it('rejects an empty explicit dictionary form', () => {
    expect(() => parseCard({ en: 'I drink', target: 'içerim', verb: ' ' }, 'Class', where))
      .toThrow(/`verb`/)
  })

  it('rejects an unknown tag', () => {
    expect(() => parseCard({ en: 'a', target: 'b', tags: ['neuter'] }, 'D', where))
      .toThrow(/unknown tag/)
  })

  // targetTags marks "also show this badge on the Portuguese face", so it can only
  // ever name a tag the card already has.
  it('rejects a ptTag that is not in tags', () => {
    expect(() => parseCard({ en: 'a', target: 'b', tags: ['masc'], targetTags: ['object'] }, 'D', where))
      .toThrow(/not present in tags/)
  })

  it('rejects missing or empty words', () => {
    expect(() => parseCard({ target: 'b' }, 'D', where)).toThrow(/`en`/)
    expect(() => parseCard({ en: '  ', target: 'b' }, 'D', where)).toThrow(/`en`/)
    expect(() => parseCard({ en: 'a' }, 'D', where)).toThrow(/`target`/)
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
