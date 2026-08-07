import { describe, it, expect } from 'vitest'
import { conjugate, conjugatePhrase, parseVerb } from '../src/lib/languages/tr/conjugate.js'
import { TR_PERSON_IDS, TR_TENSE_IDS } from '../src/lib/languages/tr/tenses.js'

const form = (infinitive: string, tense: string, person: string) =>
  (conjugate(infinitive) as Record<string, Record<string, string>> | null)?.[tense]?.[person]

describe('parseVerb', () => {
  it('takes -mak and -mek infinitives', () => {
    expect(parseVerb('gelmek')?.stem).toBe('gel')
    expect(parseVerb('yapmak')?.stem).toBe('yap')
    expect(parseVerb('okumak')?.stem).toBe('oku')
  })

  it('refuses anything that is not an infinitive', () => {
    expect(parseVerb('kitap')).toBeNull()
    expect(parseVerb('geliyorum')).toBeNull()
    expect(parseVerb('mak')).toBeNull()
    // A stem with no vowel has nothing to harmonise against.
    expect(parseVerb('mmek')).toBeNull()
  })
})

describe('vowel harmony', () => {
  // The same suffix, four different vowels, decided by the stem.
  it('picks the suffix vowel from the stem, four ways', () => {
    expect(form('gelmek', 'simdiki', 'o')).toBe('geliyor')      // e -> i
    expect(form('almak', 'simdiki', 'o')).toBe('alıyor')        // a -> ı
    expect(form('okumak', 'simdiki', 'o')).toBe('okuyor')       // u -> u
    expect(form('görmek', 'simdiki', 'o')).toBe('görüyor')      // ö -> ü
  })

  it('picks two ways where the suffix only has two', () => {
    expect(form('gelmek', 'gelecek', 'o')).toBe('gelecek')
    expect(form('yapmak', 'gelecek', 'o')).toBe('yapacak')
  })
})

describe('şimdiki zaman', () => {
  it('conjugates a stem ending in a consonant', () => {
    expect(conjugate('gelmek')?.simdiki).toEqual({
      ben: 'geliyorum',
      sen: 'geliyorsun',
      o: 'geliyor',
      biz: 'geliyoruz',
      siz: 'geliyorsunuz',
      onlar: 'geliyorlar',
    })
  })

  // The stem's own final vowel is dropped before the suffix vowel.
  it('drops a final vowel rather than doubling it', () => {
    expect(form('anlamak', 'simdiki', 'o')).toBe('anlıyor')
    expect(form('beklemek', 'simdiki', 'o')).toBe('bekliyor')
    expect(form('aramak', 'simdiki', 'ben')).toBe('arıyorum')
    expect(form('yürümek', 'simdiki', 'o')).toBe('yürüyor')
  })

  it('softens the stems that soften', () => {
    expect(form('gitmek', 'simdiki', 'ben')).toBe('gidiyorum')
    expect(form('etmek', 'simdiki', 'o')).toBe('ediyor')
  })

  it('reshapes ye- and de-, which nothing else does', () => {
    expect(form('yemek', 'simdiki', 'ben')).toBe('yiyorum')
    expect(form('demek', 'simdiki', 'o')).toBe('diyor')
  })
})

describe('geniş zaman', () => {
  // A one-syllable stem takes -ar/-er...
  it('gives a monosyllabic stem the two-way ending', () => {
    expect(form('yapmak', 'genis', 'o')).toBe('yapar')
    expect(form('içmek', 'genis', 'o')).toBe('içer')
    expect(form('bakmak', 'genis', 'o')).toBe('bakar')
  })

  // ...except for the thirteen that do not, which have to be learned.
  it('knows the thirteen exceptions', () => {
    expect(form('gelmek', 'genis', 'o')).toBe('gelir')
    expect(form('almak', 'genis', 'o')).toBe('alır')
    expect(form('olmak', 'genis', 'o')).toBe('olur')
    expect(form('görmek', 'genis', 'o')).toBe('görür')
    expect(form('vermek', 'genis', 'o')).toBe('verir')
  })

  it('gives a longer stem the four-way ending', () => {
    expect(form('konuşmak', 'genis', 'o')).toBe('konuşur')
    expect(form('çalışmak', 'genis', 'o')).toBe('çalışır')
    expect(form('oturmak', 'genis', 'o')).toBe('oturur')
  })

  it('adds a bare r after a vowel', () => {
    expect(form('anlamak', 'genis', 'o')).toBe('anlar')
    expect(form('okumak', 'genis', 'o')).toBe('okur')
    expect(form('yemek', 'genis', 'o')).toBe('yer')
    expect(form('beklemek', 'genis', 'o')).toBe('bekler')
  })

  it('carries the personal endings', () => {
    expect(conjugate('gelmek')?.genis).toEqual({
      ben: 'gelirim',
      sen: 'gelirsin',
      o: 'gelir',
      biz: 'geliriz',
      siz: 'gelirsiniz',
      onlar: 'gelirler',
    })
    expect(form('yapmak', 'genis', 'ben')).toBe('yaparım')
    expect(form('okumak', 'genis', 'ben')).toBe('okurum')
    expect(form('görmek', 'genis', 'ben')).toBe('görürüm')
  })
})

describe('görülen geçmiş zaman', () => {
  it('uses d after a voiced sound and t after a voiceless one', () => {
    expect(form('gelmek', 'gecmis', 'o')).toBe('geldi')
    expect(form('yapmak', 'gecmis', 'o')).toBe('yaptı')
    expect(form('içmek', 'gecmis', 'o')).toBe('içti')
    expect(form('gitmek', 'gecmis', 'o')).toBe('gitti')
  })

  it('takes the possessive endings, not the copular ones', () => {
    expect(conjugate('gelmek')?.gecmis).toEqual({
      ben: 'geldim',
      sen: 'geldin',
      o: 'geldi',
      biz: 'geldik',
      siz: 'geldiniz',
      onlar: 'geldiler',
    })
    expect(form('okumak', 'gecmis', 'siz')).toBe('okudunuz')
    expect(form('yapmak', 'gecmis', 'siz')).toBe('yaptınız')
  })
})

describe('öğrenilen geçmiş zaman', () => {
  it('adds -miş and the copular endings', () => {
    expect(form('gelmek', 'ogrenilen', 'o')).toBe('gelmiş')
    expect(form('gelmek', 'ogrenilen', 'ben')).toBe('gelmişim')
    expect(form('yapmak', 'ogrenilen', 'ben')).toBe('yapmışım')
    expect(form('okumak', 'ogrenilen', 'o')).toBe('okumuş')
    expect(form('görmek', 'ogrenilen', 'o')).toBe('görmüş')
  })

  // -mış never voices, unlike -dı.
  it('keeps m after a voiceless consonant', () => {
    expect(form('gitmek', 'ogrenilen', 'o')).toBe('gitmiş')
  })
})

describe('gelecek zaman', () => {
  it('softens the k before a vowel, and only then', () => {
    expect(conjugate('gelmek')?.gelecek).toEqual({
      ben: 'geleceğim',
      sen: 'geleceksin',
      o: 'gelecek',
      biz: 'geleceğiz',
      siz: 'geleceksiniz',
      onlar: 'gelecekler',
    })
    expect(form('yapmak', 'gelecek', 'ben')).toBe('yapacağım')
    expect(form('yapmak', 'gelecek', 'sen')).toBe('yapacaksın')
  })

  it('buffers with y after a vowel', () => {
    expect(form('beklemek', 'gelecek', 'o')).toBe('bekleyecek')
    expect(form('okumak', 'gelecek', 'o')).toBe('okuyacak')
    expect(form('yemek', 'gelecek', 'ben')).toBe('yiyeceğim')
    expect(form('demek', 'gelecek', 'o')).toBe('diyecek')
  })

  it('softens the stems that soften', () => {
    expect(form('gitmek', 'gelecek', 'o')).toBe('gidecek')
  })
})

/**
 * A verb built on `etmek` written as one word — `hissetmek`, `affetmek` — behaves
 * like `etmek` and not like its own spelling: the t softens before a vowel, and
 * the aorist is the two-way one. `yetmek` is not such a compound and must not be
 * caught by the rule.
 */
describe('verbs built on etmek', () => {
  it('softens the t before a vowel', () => {
    expect(conjugate('hissetmek')?.simdiki?.ben).toBe('hissediyorum')
    expect(conjugate('affetmek')?.simdiki?.ben).toBe('affediyorum')
    expect(conjugate('kaybetmek')?.gelecek?.ben).toBe('kaybedeceğim')
    expect(conjugate('seyretmek')?.simdiki?.o).toBe('seyrediyor')
  })

  it('keeps the t before a consonant', () => {
    expect(conjugate('hissetmek')?.gecmis?.ben).toBe('hissettim')
    expect(conjugate('hissetmek')?.ogrenilen?.ben).toBe('hissetmişim')
  })

  it('takes the aorist of etmek rather than its own length', () => {
    expect(conjugate('hissetmek')?.genis?.o).toBe('hisseder')
    expect(conjugate('kaybetmek')?.genis?.ben).toBe('kaybederim')
  })

  it('leaves yetmek alone, which only looks like one', () => {
    expect(conjugate('yetmek')?.simdiki?.ben).toBe('yetiyorum')
    expect(conjugate('yetmek')?.genis?.o).toBe('yeter')
  })

  it('leaves a stem that merely ends in -at alone', () => {
    expect(conjugate('anlatmak')?.simdiki?.ben).toBe('anlatıyorum')
    expect(conjugate('anlatmak')?.genis?.ben).toBe('anlatırım')
  })
})

describe('conjugatePhrase', () => {
  // Turkish puts the verb last, so the rest of the phrase comes along in front.
  it('conjugates the last word and carries the rest', () => {
    expect(conjugatePhrase('yardım etmek')?.simdiki?.ben).toBe('yardım ediyorum')
    expect(conjugatePhrase('spor yapmak')?.genis?.o).toBe('spor yapar')
    expect(conjugatePhrase('kahvaltı yapmak')?.gecmis?.ben).toBe('kahvaltı yaptım')
    expect(conjugatePhrase('işe gitmek')?.gelecek?.ben).toBe('işe gideceğim')
  })

  it('is the same as conjugate for a single word', () => {
    expect(conjugatePhrase('gelmek')).toEqual(conjugate('gelmek'))
  })

  it('refuses a phrase whose last word is not a verb', () => {
    expect(conjugatePhrase('kahvaltı yemeği')).toBeNull()
  })
})

describe('coverage', () => {
  it('fills every tense and every person for a regular verb', () => {
    const c = conjugate('gelmek')!
    for (const tense of TR_TENSE_IDS) {
      const forms = c[tense]!
      expect(forms, tense).toBeTruthy()
      for (const person of TR_PERSON_IDS) expect(forms[person], `${tense}.${person}`).toBeTruthy()
    }
  })

  it('never leaves a suffix vowel unharmonised', () => {
    // A placeholder capital would mean a builder forgot to resolve one.
    const all = Object.values(conjugate('görmek')!).flatMap(f => Object.values(f))
    expect(all.filter(f => /[A-ZİI]/.test(f))).toEqual([])
  })
})
