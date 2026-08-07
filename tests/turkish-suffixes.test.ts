import { describe, it, expect } from 'vitest'
import { attach, canSuffix, mutationOf, suffixTable, TR_SUFFIXES } from '../src/lib/languages/tr/suffixes.js'

const of = (word: string, id: Parameters<typeof attach>[1]) => attach(word, id)

describe('vowel harmony in the suffixes', () => {
  // The same suffix, four vowels, decided by the word it goes on.
  it('picks the locative vowel from the word', () => {
    expect(of('ev', 'locative')).toBe('evde')       // e -> e
    expect(of('okul', 'locative')).toBe('okulda')   // u -> a
    expect(of('göz', 'locative')).toBe('gözde')     // ö -> e
    expect(of('kız', 'locative')).toBe('kızda')     // ı -> a
  })

  it('picks the accusative vowel four ways', () => {
    expect(of('ev', 'accusative')).toBe('evi')
    expect(of('okul', 'accusative')).toBe('okulu')
    expect(of('kız', 'accusative')).toBe('kızı')
    expect(of('göz', 'accusative')).toBe('gözü')
  })
})

describe('consonant hardening', () => {
  // d becomes t after a voiceless consonant, and only there.
  it('hardens the locative and ablative after a voiceless sound', () => {
    expect(of('kitap', 'locative')).toBe('kitapta')
    expect(of('kitap', 'ablative')).toBe('kitaptan')
    expect(of('ev', 'locative')).toBe('evde')
    expect(of('ev', 'ablative')).toBe('evden')
    expect(of('ağaç', 'locative')).toBe('ağaçta')
    expect(of('süt', 'locative')).toBe('sütte')
  })
})

describe('consonant softening', () => {
  // Before a vowel, and only for the words that actually do it.
  it('softens the words that soften', () => {
    expect(of('kitap', 'accusative')).toBe('kitabı')
    expect(of('ekmek', 'accusative')).toBe('ekmeği')
    expect(of('çocuk', 'dative')).toBe('çocuğa')
    expect(of('ağaç', 'accusative')).toBe('ağacı')
    expect(of('kağıt', 'accusative')).toBe('kağıdı')
    expect(of('cep', 'possessive1')).toBe('cebim')
  })

  it('leaves alone the words that do not', () => {
    expect(of('sepet', 'accusative')).toBe('sepeti')
    expect(of('market', 'dative')).toBe('markete')
    expect(of('saat', 'accusative')).toBe('saati')
    expect(of('top', 'accusative')).toBe('topu')
    expect(of('saç', 'accusative')).toBe('saçı')
  })

  /**
   * Some borrowings harmonise to the front although their vowel is a back one.
   * `saat` gives `saati`, never `saatı`, and this is not derivable from the
   * spelling either — `kart`, which looks the same, gives `kartı`.
   */
  it('fronts the harmony for the borrowings that ask for it', () => {
    expect(of('saat', 'accusative')).toBe('saati')
    expect(of('saat', 'locative')).toBe('saatte')
    expect(of('saat', 'plural')).toBe('saatler')
    expect(of('kalp', 'accusative')).toBe('kalbi')
    expect(of('kalp', 'dative')).toBe('kalbe')
    expect(of('rol', 'accusative')).toBe('rolü')
    // And the word that merely looks like them does not.
    expect(of('kart', 'accusative')).toBe('kartı')
  })

  // nk is the one cluster that goes to ng rather than nğ.
  it('turns renk into rengi, not renği', () => {
    expect(of('renk', 'accusative')).toBe('rengi')
    expect(of('renk', 'possessive3')).toBe('rengi')
    expect(of('renk', 'locative')).toBe('renkte')
  })

  /**
   * The point of the whole module. Which words soften is lexical — `kitap` does
   * and `sepet` does not — so a word the list has not been told about gets no
   * answer at all rather than a guessed one.
   */
  it('refuses a word whose softening it has not been told', () => {
    expect(mutationOf('zıpzıp')).toBeNull()
    expect(canSuffix('zıpzıp')).toBe(false)
    expect(attach('zıpzıp', 'accusative')).toBeNull()
    expect(suffixTable('zıpzıp')).toBeNull()
  })

  it('answers freely for a word with nothing to soften', () => {
    expect(mutationOf('ev')).toBe('none')
    expect(canSuffix('ev')).toBe(true)
  })
})

describe('the buffer letters', () => {
  // A suffix that starts with a vowel needs a consonant between it and a word
  // that ends with one.
  it('puts y between two vowels', () => {
    expect(of('araba', 'accusative')).toBe('arabayı')
    expect(of('araba', 'dative')).toBe('arabaya')
    expect(of('kapı', 'accusative')).toBe('kapıyı')
  })

  it('uses n for the genitive and s for the third person', () => {
    expect(of('araba', 'genitive')).toBe('arabanın')
    expect(of('araba', 'possessive3')).toBe('arabası')
    expect(of('ev', 'genitive')).toBe('evin')
    expect(of('ev', 'possessive3')).toBe('evi')
  })

  it('drops the vowel of a suffix that already meets one', () => {
    expect(of('araba', 'possessive1')).toBe('arabam')
    expect(of('ev', 'possessive1')).toBe('evim')
    expect(of('araba', 'with')).toBe('arabayla')
    expect(of('ev', 'with')).toBe('evle')
  })
})

/**
 * `su` is the first noun anyone learns and one of the two that break the buffer
 * rules. A rule would give `sunun`, `sum` and `susu`, none of which are words.
 */
describe('su, which is irregular where it matters', () => {
  it('takes y where the rules would take n or s', () => {
    expect(of('su', 'genitive')).toBe('suyun')
    expect(of('su', 'possessive1')).toBe('suyum')
    expect(of('su', 'possessive3')).toBe('suyu')
  })

  it('is regular everywhere else', () => {
    expect(of('su', 'accusative')).toBe('suyu')
    expect(of('su', 'dative')).toBe('suya')
    expect(of('su', 'locative')).toBe('suda')
    expect(of('su', 'ablative')).toBe('sudan')
    expect(of('su', 'plural')).toBe('sular')
  })
})

describe('the rest of the set', () => {
  it('makes plurals two ways', () => {
    expect(of('ev', 'plural')).toBe('evler')
    expect(of('okul', 'plural')).toBe('okullar')
    expect(of('kitap', 'plural')).toBe('kitaplar')
  })

  it('makes the without form', () => {
    expect(of('ev', 'without')).toBe('evsiz')
    expect(of('su', 'without')).toBe('susuz')
    expect(of('okul', 'without')).toBe('okulsuz')
  })

  // Suffixes stack, and each harmonises with the one before it.
  it('stacks plural and locative in that order', () => {
    expect(of('ev', 'pluralLocative')).toBe('evlerde')
    expect(of('okul', 'pluralLocative')).toBe('okullarda')
    expect(of('kitap', 'pluralLocative')).toBe('kitaplarda')
  })
})

describe('what it will not answer for', () => {
  // İstanbul'da takes an apostrophe, which is a different rule.
  it('refuses proper nouns', () => {
    expect(canSuffix('İstanbul')).toBe(false)
    expect(canSuffix('Türkiye')).toBe(false)
    expect(suffixTable('Merhaba')).toBeNull()
  })

  it('refuses phrases and words with alternatives', () => {
    expect(canSuffix('kan tahlili')).toBe(false)
    expect(canSuffix('bir şey')).toBe(false)
    expect(canSuffix('altın rengi')).toBe(false)
  })
})

describe('suffixTable', () => {
  it('gives every suffix a form, with its name and gloss', () => {
    const table = suffixTable('ev')!
    expect(table).toHaveLength(TR_SUFFIXES.length)
    expect(table.map(r => r.form)).toEqual([
      'evler', 'evi', 'eve', 'evde', 'evden', 'evin', 'evim', 'evi', 'evle',
      'evsiz', 'evlerde',
    ])
    expect(table[3]!.label).toBe('bulunma hâli')
    expect(table[3]!.gloss).toContain('in')
  })

  it('works the same on a word that softens', () => {
    expect(suffixTable('kitap')!.map(r => r.form)).toEqual([
      'kitaplar', 'kitabı', 'kitaba', 'kitapta', 'kitaptan', 'kitabın',
      'kitabım', 'kitabı', 'kitapla', 'kitapsız', 'kitaplarda',
    ])
  })
})
