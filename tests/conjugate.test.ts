import { describe, it, expect } from 'vitest'
import { conjugate, canConjugate, parseVerb, conjugatePhrase } from '../src/lib/languages/pt/conjugate.js'
import { verbOf } from '../src/lib/languages/pt/detect.js'
import { PT_TENSES as TENSES, PT_PERSONS as PERSONS } from '../src/lib/languages/pt/tenses.js'
import { portuguese } from '../src/lib/languages/pt/index.js'

const CARDS = portuguese.cards

const form = (infinitive: string, tense: string, person: string) =>
  (conjugate(infinitive) as Record<string, Record<string, string>> | null)?.[tense]?.[person]

describe('regular verbs', () => {
  it('conjugates an -ar verb', () => {
    expect(form('falar', 'presente', 'eu')).toBe('falo')
    expect(form('falar', 'presente', 'tu')).toBe('falas')
    expect(form('falar', 'presente', 'nos')).toBe('falamos')
    expect(form('falar', 'presente', 'eles')).toBe('falam')
  })

  it('conjugates an -er verb', () => {
    expect(form('comer', 'presente', 'eu')).toBe('como')
    expect(form('comer', 'presente', 'tu')).toBe('comes')
    expect(form('comer', 'presente', 'eles')).toBe('comem')
  })

  it('conjugates an -ir verb', () => {
    expect(form('partir', 'presente', 'eu')).toBe('parto')
    expect(form('partir', 'presente', 'nos')).toBe('partimos')
  })

  // European Portuguese writes this with an acute; Brazilian does not.
  it('uses the European first person plural preterite', () => {
    expect(form('falar', 'perfeito', 'nos')).toBe('falámos')
  })

  it('conjugates the imperfect', () => {
    expect(form('falar', 'imperfeito', 'eu')).toBe('falava')
    expect(form('comer', 'imperfeito', 'nos')).toBe('comíamos')
  })

  it('builds the simple future on the whole infinitive', () => {
    expect(form('falar', 'futuro', 'eu')).toBe('falarei')
    expect(form('comer', 'futuro', 'eles')).toBe('comerão')
  })

  // European Portuguese uses estar a + infinitive; Brazilian uses a gerund.
  it('builds the continuous with estar a plus the infinitive', () => {
    expect(form('falar', 'presenteContinuo', 'eu')).toBe('estou a falar')
    expect(form('comer', 'presenteContinuo', 'tu')).toBe('estás a comer')
    expect(form('ler', 'presenteContinuo', 'nos')).toBe('estamos a ler')
    expect(form('ir', 'presenteContinuo', 'eles')).toBe('estão a ir')
  })

  it('builds the everyday future from ir plus the infinitive', () => {
    expect(form('falar', 'futuroProximo', 'eu')).toBe('vou falar')
    expect(form('comer', 'futuroProximo', 'eles')).toBe('vão comer')
  })
})

describe('spelling adjustments', () => {
  // The sound stays regular; only the spelling has to work for it.
  it('turns c into ç before o in -cer verbs', () => {
    expect(form('conhecer', 'presente', 'eu')).toBe('conheço')
    expect(form('conhecer', 'presente', 'tu')).toBe('conheces')
    expect(form('esquecer', 'presente', 'eu')).toBe('esqueço')
    expect(form('descer', 'presente', 'eu')).toBe('desço')
  })

  it('turns g into j before o in -gir verbs', () => {
    expect(form('fingir', 'presente', 'eu')).toBe('finjo')
    expect(form('fingir', 'presente', 'tu')).toBe('finges')
  })

  // The rule keys off the infinitive's ending, not the root's last letter:
  // pagar and fingir both leave a root ending in g, and only one takes a j.
  it('does not soften a -gar or -car verb in the present', () => {
    expect(form('pagar', 'presente', 'eu')).toBe('pago')
    expect(form('ligar', 'presente', 'eu')).toBe('ligo')
    expect(form('chegar', 'presente', 'eu')).toBe('chego')
    expect(form('apagar', 'presente', 'eu')).toBe('apago')
    expect(form('ficar', 'presente', 'eu')).toBe('fico')
  })

  it('does not harden a -cer or -gir verb in the preterite', () => {
    expect(form('conhecer', 'perfeito', 'eu')).toBe('conheci')
    expect(form('esquecer', 'perfeito', 'eu')).toBe('esqueci')
    expect(form('fingir', 'perfeito', 'eu')).toBe('fingi')
  })

  it('keeps the hard sound in -car, -gar and -çar preterites', () => {
    expect(form('ficar', 'perfeito', 'eu')).toBe('fiquei')
    expect(form('chegar', 'perfeito', 'eu')).toBe('cheguei')
    expect(form('pagar', 'perfeito', 'eu')).toBe('paguei')
    expect(form('começar', 'perfeito', 'eu')).toBe('comecei')
  })

  // Surfaced by the deck's own "penteias-te" — a plain rule would give "penteas".
  it('inserts the -ei- of -ear verbs where the stress falls on the stem', () => {
    expect(form('passear', 'presente', 'eu')).toBe('passeio')
    expect(form('passear', 'presente', 'tu')).toBe('passeias')
    expect(form('passear', 'presente', 'eles')).toBe('passeiam')
    // Unstressed, so no -ei-.
    expect(form('passear', 'presente', 'nos')).toBe('passeamos')
  })
})

describe('irregular verbs', () => {
  it('knows the ser/estar pair', () => {
    expect(form('ser', 'presente', 'eu')).toBe('sou')
    expect(form('ser', 'imperfeito', 'nos')).toBe('éramos')
    expect(form('estar', 'presente', 'eu')).toBe('estou')
    expect(form('estar', 'perfeito', 'eu')).toBe('estive')
  })

  it('knows the traps a regular rule would fail', () => {
    expect(form('poder', 'presente', 'eu')).toBe('posso')
    expect(form('saber', 'presente', 'eu')).toBe('sei')
    expect(form('fazer', 'presente', 'eu')).toBe('faço')
    expect(form('dizer', 'presente', 'eu')).toBe('digo')
    expect(form('trazer', 'presente', 'eu')).toBe('trago')
    expect(form('pôr', 'presente', 'eu')).toBe('ponho')
  })

  it('drops the ending in the third person of a -uzir verb', () => {
    expect(form('conduzir', 'presente', 'ele')).toBe('conduz')
    expect(form('conduzir', 'presente', 'eu')).toBe('conduzo')
    expect(form('conduzir', 'presente', 'eles')).toBe('conduzem')
    // Regular everywhere else.
    expect(form('conduzir', 'perfeito', 'eu')).toBe('conduzi')
  })

  it('knows the stem-changing -ir verbs', () => {
    expect(form('dormir', 'presente', 'eu')).toBe('durmo')
    expect(form('pedir', 'presente', 'eu')).toBe('peço')
    expect(form('sentir', 'presente', 'eu')).toBe('sinto')
    expect(form('preferir', 'presente', 'eu')).toBe('prefiro')
    expect(form('subir', 'presente', 'tu')).toBe('sobes')
  })

  // Only the present breaks, so the rest must still come from the rules.
  it('inherits the regular tenses a verb does not override', () => {
    expect(form('dormir', 'perfeito', 'eu')).toBe('dormi')
    expect(form('dormir', 'imperfeito', 'eu')).toBe('dormia')
    expect(form('dormir', 'futuro', 'eu')).toBe('dormirei')
  })

  it('gives every verb the everyday future, however irregular', () => {
    expect(form('ser', 'futuroProximo', 'eu')).toBe('vou ser')
    expect(form('pôr', 'futuroProximo', 'tu')).toBe('vais pôr')
  })

  it('gives every verb the continuous too', () => {
    expect(form('pôr', 'presenteContinuo', 'eu')).toBe('estou a pôr')
    expect(form('dormir', 'presenteContinuo', 'nos')).toBe('estamos a dormir')
  })
})

describe('reflexive verbs', () => {
  it('attaches the pronoun after the verb, European style', () => {
    expect(form('sentar-se', 'presente', 'eu')).toBe('sento-me')
    expect(form('sentar-se', 'presente', 'tu')).toBe('sentas-te')
    expect(form('sentar-se', 'presente', 'eles')).toBe('sentam-se')
  })

  // sentamos + nos -> sentamo-nos. The deck confirms this form.
  it('drops the -s of the first person plural before -nos', () => {
    expect(form('sentar-se', 'presente', 'nos')).toBe('sentamo-nos')
    expect(form('levantar-se', 'presente', 'nos')).toBe('levantamo-nos')
  })

  it('puts the pronoun on the auxiliary in the everyday future', () => {
    expect(form('sentar-se', 'futuroProximo', 'eu')).toBe('vou sentar-me')
    expect(form('sentar-se', 'presenteContinuo', 'eu')).toBe('estou a sentar-me')
  })

  it('handles a reflexive that is also stem-changing', () => {
    expect(form('vestir-se', 'presente', 'eu')).toBe('visto-me')
    expect(form('vestir-se', 'presente', 'nos')).toBe('vestimo-nos')
  })
})

describe('refusing to guess', () => {
  // Showing a learner "eu podo" is worse than showing nothing at all.
  it('returns nothing for a verb known to be irregular but not tabulated', () => {
    expect(conjugate('precaver')).toBeNull()
  })

  it('returns nothing for something that is not a verb', () => {
    expect(conjugate('mesa')).toBeNull()
    expect(conjugate('')).toBeNull()
    expect(conjugate('o amigo')).toBeNull()
  })

  it('reports honestly whether help is available', () => {
    expect(canConjugate('falar')).toBe(true)
    expect(canConjugate('dormir')).toBe(true)
    expect(canConjugate('mesa')).toBe(false)
  })
})

describe('parseVerb', () => {
  it('separates a reflexive pronoun from the infinitive', () => {
    expect(parseVerb('levantar-se')).toEqual({
      infinitive: 'levantar-se', stem: 'levantar', reflexive: true,
    })
  })
  it('leaves a plain infinitive alone', () => {
    expect(parseVerb('falar')).toEqual({ infinitive: 'falar', stem: 'falar', reflexive: false })
  })
})

describe('shape', () => {
  it('only ever returns known tenses and persons', () => {
    const result = conjugate('falar')!
    const tenseIds = new Set(TENSES.map(t => t.id))
    const personIds = new Set(PERSONS.map(p => p.id))
    for (const [tense, forms] of Object.entries(result)) {
      expect(tenseIds.has(tense as never)).toBe(true)
      for (const person of Object.keys(forms)) {
        expect(personIds.has(person as never)).toBe(true)
      }
    }
  })
})

/**
 * The strongest check available: the deck already contains 200-odd cards showing
 * conjugated forms, written independently of this engine. Every one it can speak
 * to must match.
 */
describe('agreement with the cards themselves', () => {
  const PRONOUNS: Record<string, string> = {
    eu: 'eu', tu: 'tu', 'nós': 'nos', 'nos': 'nos',
    'vocês': 'eles', 'voces': 'eles', eles: 'eles', elas: 'eles',
    ele: 'ele', ela: 'ele', 'você': 'ele', 'voce': 'ele',
  }

  // Infinitives for the conjugated forms the deck happens to show.
  const OBSERVED: Array<[string, string]> = [
    ['eu sou', 'ser'], ['tu és', 'ser'], ['nós somos', 'ser'], ['vocês são', 'ser'],
    ['eles são', 'ser'], ['elas são', 'ser'],
    ['eu estou', 'estar'], ['tu estás', 'estar'], ['nós estamos', 'estar'],
    ['vocês estão', 'estar'],
    ['eu vou', 'ir'], ['tu vais', 'ir'], ['nós vamos', 'ir'], ['vocês vão', 'ir'],
    ['tu vens', 'vir'], ['eu venho', 'vir'], ['nós vimos', 'vir'], ['vocês vêm', 'vir'],
    ['eu tenho', 'ter'], ['tu tens', 'ter'], ['nós temos', 'ter'],
    ['eu quero', 'querer'], ['tu queres', 'querer'], ['nós queremos', 'querer'],
    ['eu posso', 'poder'], ['tu podes', 'poder'], ['nós podemos', 'poder'],
    ['vocês podem', 'poder'],
    ['eu conheço', 'conhecer'], ['tu conheces', 'conhecer'], ['nós conhecemos', 'conhecer'],
    ['eu moro', 'morar'], ['tu moras', 'morar'], ['nós moramos', 'morar'],
    ['vocês moram', 'morar'],
    ['eu saio', 'sair'], ['tu sais', 'sair'], ['nós saímos', 'sair'], ['vocês saem', 'sair'],
    ['eu peço', 'pedir'], ['tu pedes', 'pedir'], ['nós pedimos', 'pedir'],
    ['vocês pedem', 'pedir'],
    ['eu penteio-me', 'pentear-se'], ['tu penteias-te', 'pentear-se'],
    ['nós penteamo-nos', 'pentear-se'],
    ['eu visto-me', 'vestir-se'], ['tu vestes-te', 'vestir-se'],
    ['nós vestimo-nos', 'vestir-se'],
    ['eu sento-me', 'sentar-se'], ['tu sentas-te', 'sentar-se'],
    ['nós sentamo-nos', 'sentar-se'], ['vocês sentam-se', 'sentar-se'],
  ]

  const deckForms = new Set(CARDS.map(c => c.target.trim().toLowerCase()))

  it.each(OBSERVED)('matches the card %s', (cardText, infinitive) => {
    // Guard against the fixture drifting from the deck it claims to mirror.
    expect(deckForms.has(cardText), `${cardText} should exist in the deck`).toBe(true)

    const [pronoun, ...rest] = cardText.split(' ')
    const person = PRONOUNS[pronoun!]!
    const expected = rest.join(' ')
    expect(form(infinitive, 'presente', person)).toBe(expected)
  })

  it('covers every irregular the deck actually shows conjugated', () => {
    expect(OBSERVED.length).toBeGreaterThanOrEqual(50)
  })
})

describe('verb phrases', () => {
  const phrase = (p: string, tense: string, person: string) =>
    (conjugatePhrase(p) as Record<string, Record<string, string>> | null)?.[tense]?.[person]

  // Where the learner most needs help: "eu vou para a escola" teaches more than
  // the bare infinitive does.
  it('conjugates the head verb and keeps the rest', () => {
    expect(phrase('ir para a escola', 'presente', 'eu')).toBe('vou para a escola')
    expect(phrase('fazer compras', 'presente', 'eu')).toBe('faço compras')
    expect(phrase('tomar o pequeno-almoço', 'presente', 'tu')).toBe('tomas o pequeno-almoço')
  })

  // The deck contains this exact form, written independently of the engine.
  it('agrees with the deck on "eu gosto de"', () => {
    expect(phrase('gostar de', 'presente', 'eu')).toBe('gosto de')
  })

  it('leaves a bare infinitive to the ordinary path', () => {
    expect(phrase('falar', 'presente', 'eu')).toBe('falo')
  })

  it('refuses a phrase whose head is not a verb', () => {
    expect(conjugatePhrase('para onde?')).toBeNull()
    expect(conjugatePhrase('o pequeno-almoço')).toBeNull()
  })

  /**
   * Conjugating the first of two coordinate verbs and carrying the second along
   * unchanged gives "identifico e descrever rotinas", which is not Portuguese.
   * Two such verbs are two cards, and this one gets no table rather than a wrong
   * one. A verb that merely *governs* an infinitive is the ordinary case and has
   * to keep working.
   */
  it('refuses two verbs joined by a conjunction', () => {
    expect(conjugatePhrase('identificar e descrever rotinas')).toBeNull()
    expect(conjugatePhrase('ler ou escrever')).toBeNull()
  })

  it('still conjugates a verb that governs an infinitive', () => {
    expect(phrase('gostar de aprender', 'presente', 'eu')).toBe('gosto de aprender')
    expect(phrase('começar a trabalhar', 'presente', 'eu')).toBe('começo a trabalhar')
    expect(phrase('deixar entrar', 'presente', 'eu')).toBe('deixo entrar')
    expect(phrase('tomar o pequeno-almoço', 'presente', 'eu')).toBe('tomo o pequeno-almoço')
    expect(phrase('ir para a escola', 'presente', 'eu')).toBe('vou para a escola')
  })

  // The whole string used to be read as one -ar verb, and came back as
  // "gostar de aprenderei".
  it('never reads a whole phrase as a single infinitive', () => {
    expect(parseVerb('gostar de aprender')).toBeNull()
    expect(conjugate('começar a trabalhar')).toBeNull()
  })
})

describe('coverage over the real deck', () => {
  const infinitiveCards = CARDS.filter(c => /^to\s+\S/i.test(c.en.trim()))

  it('offers help on almost every infinitive card', () => {
    const covered = infinitiveCards.filter(c => verbOf(c))
    expect(covered.length / infinitiveCards.length).toBeGreaterThan(0.95)
  })

  // A missing panel costs one card; a panel on a noun teaches nonsense.
  it('never offers help on a card that is not an infinitive', () => {
    const wrong = CARDS.filter(c => !/^to\s/i.test(c.en) && verbOf(c))
    expect(wrong).toEqual([])
  })

  // `doer` is defective and that is the truth about it: nobody says "eu doo",
  // only "dói-me a cabeça". A partial table is the honest answer, not a bug.
  const DEFECTIVE = new Set(['doer'])

  it('produces a full set of persons for every card it accepts', () => {
    for (const card of infinitiveCards) {
      const infinitive = verbOf(card)
      if (!infinitive || DEFECTIVE.has(infinitive)) continue
      const present = conjugatePhrase(infinitive)?.presente
      expect(Object.keys(present ?? {}), `${infinitive} present`).toHaveLength(5)
    }
  })

  it('gives a defective verb only the persons it has', () => {
    expect(conjugatePhrase('doer')?.presente).toEqual({ ele: 'dói', eles: 'doem' })
  })

  // A vowel before the ending makes a hiatus, and the i takes the accent.
  it('accents the i after a vowel-final root', () => {
    expect(conjugatePhrase('sair')?.imperfeito?.eu).toBe('saía')
    expect(conjugatePhrase('cair')?.imperfeito?.eles).toBe('caíam')
    expect(conjugatePhrase('construir')?.perfeito?.eu).toBe('construí')
    expect(conjugatePhrase('construir')?.imperfeito?.eu).toBe('construía')
    // ...except before -iu, where the stress moves to the u.
    expect(conjugatePhrase('cair')?.perfeito?.ele).toBe('caiu')
    // And a consonant-final root is untouched.
    expect(conjugatePhrase('partir')?.imperfeito?.eu).toBe('partia')
    expect(conjugatePhrase('sorrir')?.perfeito?.eu).toBe('sorri')
  })
})
