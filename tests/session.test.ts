import { describe, it, expect } from 'vitest'
import {
  startSession, currentCard, move, completeCurrent, sessionMatches, RELEARN_GAP,
} from '../src/lib/study/session.js'
import type { Card } from '../src/lib/cards/schema.js'

const card = (n: number): Card => ({ deck: 'D', en: `en${n}`, target: `pt${n}` })
const deck = (n: number) => Array.from({ length: n }, (_, i) => card(i))
const words = (s: { cards: Card[] }) => s.cards.map(c => c.en)

describe('startSession', () => {
  it('takes the given order and starts at the first card', () => {
    const s = startSession(deck(3))
    expect(words(s)).toEqual(['en0', 'en1', 'en2'])
    expect(currentCard(s)?.en).toBe('en0')
  })

  it('copies the input so the caller cannot mutate the queue', () => {
    const input = deck(2)
    const s = startSession(input)
    input.push(card(9))
    expect(s.cards).toHaveLength(2)
  })
})

describe('move', () => {
  it('wraps in both directions', () => {
    const s = startSession(deck(3))
    expect(currentCard(move(s, 1))?.en).toBe('en1')
    expect(currentCard(move(s, -1))?.en).toBe('en2')
    expect(currentCard(move(s, 3))?.en).toBe('en0')
  })

  it('survives an empty queue', () => {
    expect(currentCard(move(startSession([]), 1))).toBeUndefined()
  })
})

describe('completeCurrent', () => {
  // The bug this module exists to prevent: answering must not reshuffle the deck.
  it('leaves the order of the remaining cards untouched', () => {
    const s = startSession(deck(5))
    expect(words(completeCurrent(s, false))).toEqual(['en1', 'en2', 'en3', 'en4'])
  })

  it('lands on the next card, not back at the start', () => {
    let s = startSession(deck(5))
    s = move(s, 2)                       // on en2
    s = completeCurrent(s, false)
    expect(currentCard(s)?.en).toBe('en3')
  })

  it('wraps to the front when the last card is graded', () => {
    let s = startSession(deck(3))
    s = move(s, 2)                       // on en2, the last
    s = completeCurrent(s, false)
    expect(currentCard(s)?.en).toBe('en0')
  })

  it('empties cleanly', () => {
    let s = startSession(deck(1))
    s = completeCurrent(s, false)
    expect(s.cards).toEqual([])
    expect(currentCard(s)).toBeUndefined()
  })

  describe('when the card is requeued', () => {
    it('brings it back later in the same session', () => {
      const s = completeCurrent(startSession(deck(8)), true)
      expect(words(s)).toEqual(['en1', 'en2', 'en3', 'en4', 'en0', 'en5', 'en6', 'en7'])
      expect(s.cards.indexOf(s.cards.find(c => c.en === 'en0')!)).toBe(RELEARN_GAP)
    })

    it('still advances to the next card', () => {
      const s = completeCurrent(startSession(deck(8)), true)
      expect(currentCard(s)?.en).toBe('en1')
    })

    it('keeps the queue length the same', () => {
      expect(completeCurrent(startSession(deck(8)), true).cards).toHaveLength(8)
    })

    it('puts it at the end when the queue is shorter than the gap', () => {
      const s = completeCurrent(startSession(deck(3)), true)
      expect(words(s)).toEqual(['en1', 'en2', 'en0'])
    })

    it('handles a single card without losing it', () => {
      const s = completeCurrent(startSession(deck(1)), true)
      expect(words(s)).toEqual(['en0'])
      expect(currentCard(s)?.en).toBe('en0')
    })
  })
})

describe('sessionMatches', () => {
  it('is true for the same set of cards', () => {
    expect(sessionMatches(startSession(deck(3)), deck(3))).toBe(true)
  })

  it('is false when the deck changes', () => {
    expect(sessionMatches(startSession(deck(3)), deck(4))).toBe(false)
  })
})
