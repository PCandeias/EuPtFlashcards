import { describe, it, expect } from 'vitest'
import { checkAnswer, alternatives, suggestedRating, explain } from '../src/lib/study/answer.js'

describe('exact answers', () => {
  it('accepts the word as written', () => {
    expect(checkAnswer('olá', 'olá').verdict).toBe('correct')
  })

  it('ignores case', () => {
    expect(checkAnswer('OLÁ', 'olá').verdict).toBe('correct')
  })

  it('ignores surrounding whitespace and doubled spaces', () => {
    expect(checkAnswer('  bom   dia  ', 'bom dia').verdict).toBe('correct')
  })

  /**
   * A phone turns a typed apostrophe into a curly one as you go, and the Turkish
   * deck writes İstanbul'a with the straight one. Losing a card to smart
   * punctuation would be the app's fault, not the learner's.
   */
  it('treats every apostrophe as the same apostrophe', () => {
    expect(checkAnswer('İstanbul’a', "İstanbul'a").verdict).toBe('correct')
    expect(checkAnswer("İstanbul'a", 'İstanbul’a').verdict).toBe('correct')
    expect(checkAnswer('Allah’a ısmarladık', "Allah'a ısmarladık").verdict).toBe('correct')
  })

  it('ignores trailing punctuation', () => {
    expect(checkAnswer('como estás', 'como estás?').verdict).toBe('correct')
    expect(checkAnswer('como estás?', 'como estás?').verdict).toBe('correct')
  })

  it('rejects an empty answer', () => {
    expect(checkAnswer('', 'olá').verdict).toBe('wrong')
    expect(checkAnswer('   ', 'olá').verdict).toBe('wrong')
  })
})

describe('alternatives', () => {
  it('splits a card offering more than one form', () => {
    expect(alternatives('obrigado / obrigada')).toEqual(['obrigado', 'obrigada'])
  })

  it('accepts either form', () => {
    expect(checkAnswer('obrigado', 'obrigado / obrigada').verdict).toBe('correct')
    expect(checkAnswer('obrigada', 'obrigado / obrigada').verdict).toBe('correct')
  })

  it('reports back the alternative that was matched', () => {
    expect(checkAnswer('obrigada', 'obrigado / obrigada').expected).toBe('obrigada')
  })

  it('still rejects a form that is not offered', () => {
    expect(checkAnswer('obrigade', 'obrigado / obrigada').verdict).toBe('wrong')
  })

  // The card shows "um / uma"; typing that back is reproducing what is on it.
  it('accepts the card typed back verbatim, alternatives and all', () => {
    expect(checkAnswer('um / uma', 'um / uma').verdict).toBe('correct')
    expect(checkAnswer('UM / UMA', 'um / uma').verdict).toBe('correct')
  })
})

describe('accents', () => {
  // Typing accents on a phone is awkward, so this is accepted — but never as
  // plain "correct", because the accent is what distinguishes the words.
  it('accepts a missing accent as almost, not correct', () => {
    const check = checkAnswer('ola', 'olá')
    expect(check.verdict).toBe('almost')
    expect(check.reason).toBe('accents')
    expect(check.expected).toBe('olá')
  })

  it('shows the correctly accented form back', () => {
    expect(explain(checkAnswer('avo', 'avô'))).toContain('avô')
  })

  // The case that makes accent-blindness unacceptable: these are different people.
  it('does not silently conflate avô with avó', () => {
    expect(checkAnswer('avo', 'avô').verdict).not.toBe('correct')
    expect(checkAnswer('avó', 'avô').verdict).not.toBe('correct')
  })

  it('handles the wrong accent, not just a missing one', () => {
    expect(checkAnswer('avó', 'avô').reason).toBe('accents')
  })

  it('accepts cedilla and tilde the same way', () => {
    expect(checkAnswer('coracao', 'coração').reason).toBe('accents')
    expect(checkAnswer('nao', 'não').reason).toBe('accents')
  })
})

describe('articles', () => {
  // Cards carry the article because it is what tells you the noun's gender.
  it('accepts a bare noun as almost, and asks for the article', () => {
    const check = checkAnswer('amigo', 'o amigo')
    expect(check.verdict).toBe('almost')
    expect(check.reason).toBe('article')
    expect(check.expected).toBe('o amigo')
  })

  it('accepts the full form outright', () => {
    expect(checkAnswer('o amigo', 'o amigo').verdict).toBe('correct')
  })

  it('handles a missing article and missing accents together', () => {
    expect(checkAnswer('agua', 'a água').verdict).toBe('almost')
  })

  it('does not treat a leading word that is not an article as one', () => {
    // "com" is not an article, so dropping it is a wrong answer.
    expect(checkAnswer('licença', 'com licença').verdict).toBe('wrong')
  })

  it('does not strip a one-word answer that happens to be an article', () => {
    expect(checkAnswer('o', 'o').verdict).toBe('correct')
    expect(checkAnswer('', 'a').verdict).toBe('wrong')
  })
})

describe('wrong answers', () => {
  it('rejects a different word', () => {
    expect(checkAnswer('adeus', 'olá').verdict).toBe('wrong')
  })

  it('reports the expected answer so it can be shown', () => {
    expect(checkAnswer('adeus', 'olá').expected).toBe('olá')
  })

  it('rejects a partial answer', () => {
    expect(checkAnswer('bom', 'bom dia').verdict).toBe('wrong')
  })
})

describe('suggestedRating', () => {
  it('maps each verdict to a sensible default', () => {
    expect(suggestedRating('correct')).toBe('good')
    expect(suggestedRating('almost')).toBe('hard')
    expect(suggestedRating('wrong')).toBe('again')
  })
})

describe('explain', () => {
  it('is plain about each outcome', () => {
    expect(explain(checkAnswer('olá', 'olá'))).toBe('Correct')
    expect(explain(checkAnswer('ola', 'olá'))).toMatch(/accents/i)
    expect(explain(checkAnswer('amigo', 'o amigo'))).toMatch(/article/i)
    expect(explain(checkAnswer('xxx', 'olá'))).toMatch(/not quite/i)
  })
})
