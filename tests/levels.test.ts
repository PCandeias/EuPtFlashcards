import { describe, it, expect } from 'vitest'
import {
  LEVEL_IDS, LEVELS, levelById, isLevelId, levelRank, compareLevels, hardestLevel,
  type LevelId,
} from '../src/lib/cards/levels.js'
import { parseCard, type Card } from '../src/lib/cards/schema.js'
import { inSelectedLevels } from '../src/lib/study/scheduler.js'

describe('the level registry', () => {
  it('defines every id exactly once, in order of difficulty', () => {
    expect(LEVELS.map(l => l.id)).toEqual([...LEVEL_IDS])
    expect(new Set(LEVEL_IDS).size).toBe(LEVEL_IDS.length)
  })

  it('gives every level a label and a hint', () => {
    for (const level of LEVELS) {
      expect(level.label).toBeTruthy()
      expect(level.hint).toBeTruthy()
    }
  })

  it('looks a level up by id', () => {
    expect(levelById('a2')?.label).toBe('A2')
    expect(levelById('z9')).toBeUndefined()
  })

  it('recognises only registered ids', () => {
    expect(isLevelId('b1')).toBe(true)
    expect(isLevelId('B1')).toBe(false)
    expect(isLevelId('a3')).toBe(false)
    expect(isLevelId(undefined)).toBe(false)
  })

  it('ranks and sorts easiest first', () => {
    expect(levelRank('a1')).toBeLessThan(levelRank('c2'))
    const shuffled: LevelId[] = ['b1', 'a1', 'a2']
    expect(shuffled.sort(compareLevels)).toEqual(['a1', 'a2', 'b1'])
  })
})

describe('hardestLevel', () => {
  // A card is as hard as its hardest part: a common verb in the synthetic
  // future is a future card, not a common-verb card.
  it('takes the hardest of what it is given', () => {
    expect(hardestLevel('a1', 'b1', 'a2')).toBe('b1')
    expect(hardestLevel('a1', 'a1')).toBe('a1')
  })

  it('falls back to the easiest level when given nothing', () => {
    expect(hardestLevel()).toBe('a1')
  })
})

describe('parseCard', () => {
  it('accepts a known level', () => {
    expect(parseCard({ en: 'invoice', target: 'a fatura', level: 'b1' }, 'D', 'x').level).toBe('b1')
  })

  it('leaves an unlabelled card alone', () => {
    expect(parseCard({ en: 'a', target: 'b' }, 'D', 'x').level).toBeUndefined()
  })

  it('rejects a level outside the registry', () => {
    expect(() => parseCard({ en: 'a', target: 'b', level: 'a3' }, 'D', 'x')).toThrow(/unknown level/)
    expect(() => parseCard({ en: 'a', target: 'b', level: 'A1' }, 'D', 'x')).toThrow(/unknown level/)
  })
})

describe('inSelectedLevels', () => {
  const cards = [
    { deck: 'D', en: 'water', target: 'a água', level: 'a1' },
    { deck: 'D', en: 'invoice', target: 'a fatura', level: 'b1' },
    { deck: 'D', en: 'unlabelled', target: 'sem nível' },
  ] as Card[]

  it('keeps only the levels asked for', () => {
    expect(inSelectedLevels(cards, ['a1']).map(c => c.en)).toEqual(['water', 'unlabelled'])
  })

  // The same bargain as the tense filter: a card that slipped through the
  // labelling stays in the deck rather than vanishing from it.
  it('never filters out an unlabelled card', () => {
    expect(inSelectedLevels(cards, []).map(c => c.en)).toEqual(['unlabelled'])
  })

  it('keeps everything when every level is selected', () => {
    expect(inSelectedLevels(cards, [...LEVEL_IDS])).toHaveLength(3)
  })
})
