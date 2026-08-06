import { describe, it, expect } from 'vitest'
import { badgesFor, hintFor, BADGES } from '../src/lib/render/tags.js'
import type { Card } from '../src/lib/cards/schema.js'

const plural: Card = { deck: 'Class', en: 'you come', target: 'vocês vêm', tags: ['plural'] }
const object: Card = {
  deck: 'Class', en: 'him / it', target: 'o', tags: ['masc', 'object'], targetTags: ['object'],
}
const sense: Card = { deck: 'Class', en: 'to be', target: 'ser', sense: 'permanent / identity' }
const noun: Card = { deck: 'Class', en: 'friend', target: 'o amigo', tags: ['masc'] }

describe('badgesFor', () => {
  // The English is the underspecified side: "you come" cannot distinguish
  // `tu vens` from `vocês vêm`, so that is where the badge has to be.
  it('renders tags on the English face', () => {
    expect(badgesFor(plural, 'en').map(b => b.pill)).toEqual(['PL'])
  })

  // The Portuguese already spells the distinction out — `vocês` IS the plural.
  it('renders nothing on the Portuguese face by default', () => {
    expect(badgesFor(plural, 'target')).toEqual([])
    expect(badgesFor(noun, 'target')).toEqual([])
  })

  // Except bare function words, which are ambiguous alone.
  it('renders targetTags on the Portuguese face', () => {
    expect(badgesFor(object, 'target').map(b => b.pill)).toEqual(['OBJ'])
  })

  it('still renders the full tag set on the English face of a targetTags card', () => {
    expect(badgesFor(object, 'en').map(b => b.pill)).toEqual(['M', 'OBJ'])
  })

  it('sorts badges into canonical order regardless of source order', () => {
    const scrambled: Card = {
      deck: 'D', en: 'x', target: 'y', tags: ['formal', 'plural', 'fem'],
    }
    expect(badgesFor(scrambled, 'en').map(b => b.pill)).toEqual(['F', 'PL', 'FML'])
  })

  it('returns an empty list for an untagged card', () => {
    expect(badgesFor(sense, 'en')).toEqual([])
  })

  it('gives every badge a colour class and an expanded label', () => {
    for (const spec of Object.values(BADGES)) {
      expect(spec.pill).toBeTruthy()
      expect(spec.cls).toBeTruthy()
      expect(spec.full.length).toBeGreaterThan(spec.pill.length)
    }
  })
})

describe('hintFor', () => {
  it('shows the sense on the English face', () => {
    expect(hintFor(sense, 'en')).toBe('permanent / identity')
  })

  it('does not repeat it on the Portuguese face', () => {
    expect(hintFor(sense, 'target')).toBeUndefined()
  })

  it('is undefined when the card has no sense', () => {
    expect(hintFor(plural, 'en')).toBeUndefined()
  })
})
