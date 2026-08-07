import { it } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { portuguese } from '../src/lib/languages/pt/index.js'
import { turkish } from '../src/lib/languages/tr/index.js'
import { conjugatePhrase as ptConjugate } from '../src/lib/languages/pt/conjugate.js'
import { conjugatePhrase as trConjugate } from '../src/lib/languages/tr/conjugate.js'
import type { Card } from '../src/lib/cards/schema.js'

interface Ex { target: string; en: string; tense?: string }

/* ------------------------------------------------------------------ English */

const IRREGULAR: Record<string, [string, string]> = {
  be: ['is', 'was'], have: ['has', 'had'], do: ['does', 'did'], go: ['goes', 'went'],
  say: ['says', 'said'], see: ['sees', 'saw'], eat: ['eats', 'ate'], drink: ['drinks', 'drank'],
  take: ['takes', 'took'], come: ['comes', 'came'], give: ['gives', 'gave'], make: ['makes', 'made'],
  know: ['knows', 'knew'], think: ['thinks', 'thought'], find: ['finds', 'found'],
  leave: ['leaves', 'left'], feel: ['feels', 'felt'], keep: ['keeps', 'kept'], hold: ['holds', 'held'],
  bring: ['brings', 'brought'], buy: ['buys', 'bought'], catch: ['catches', 'caught'],
  choose: ['chooses', 'chose'], forget: ['forgets', 'forgot'], forgive: ['forgives', 'forgave'],
  get: ['gets', 'got'], hear: ['hears', 'heard'], lose: ['loses', 'lost'], meet: ['meets', 'met'],
  pay: ['pays', 'paid'], put: ['puts', 'put'], read: ['reads', 'read'], run: ['runs', 'ran'],
  sell: ['sells', 'sold'], send: ['sends', 'sent'], sing: ['sings', 'sang'], sit: ['sits', 'sat'],
  sleep: ['sleeps', 'slept'], speak: ['speaks', 'spoke'], spend: ['spends', 'spent'],
  stand: ['stands', 'stood'], swim: ['swims', 'swam'], teach: ['teaches', 'taught'],
  tell: ['tells', 'told'], wear: ['wears', 'wore'], win: ['wins', 'won'], write: ['writes', 'wrote'],
  fly: ['flies', 'flew'], bite: ['bites', 'bit'], grow: ['grows', 'grew'], draw: ['draws', 'drew'],
  cut: ['cuts', 'cut'], hit: ['hits', 'hit'], let: ['lets', 'let'], lie: ['lies', 'lay'],
  ring: ['rings', 'rang'], rise: ['rises', 'rose'], shut: ['shuts', 'shut'], throw: ['throws', 'threw'],
  understand: ['understands', 'understood'], wake: ['wakes', 'woke'], become: ['becomes', 'became'],
  die: ['dies', 'died'], lift: ['lifts', 'lifted'],
}

const VOWEL = 'aeiou'

function thirdPerson(base: string): string {
  const head = base.split(' ')[0]!
  const rest = base.slice(head.length)
  const irregular = IRREGULAR[head]?.[0]
  if (irregular) return irregular + rest
  if (/[^aeiou]y$/.test(head)) return `${head.slice(0, -1)}ies${rest}`
  if (/(s|sh|ch|x|z|o)$/.test(head)) return `${head}es${rest}`
  return `${head}s${rest}`
}

/** Doubles the final consonant of a stressed CVC monosyllable: run -> runn. */
function doubled(head: string): string {
  const last = head[head.length - 1] ?? ''
  const before = head[head.length - 2] ?? ''
  const third = head[head.length - 3] ?? ''
  const oneSyllable = [...head].filter(c => VOWEL.includes(c)).length === 1
  const cvc = !VOWEL.includes(last) && VOWEL.includes(before) && !VOWEL.includes(third)
  return oneSyllable && cvc && !'wxy'.includes(last) ? head + last : head
}

function gerund(base: string): string {
  const head = base.split(' ')[0]!
  const rest = base.slice(head.length)
  if (head.endsWith('ie')) return `${head.slice(0, -2)}ying${rest}`
  if (head.endsWith('e') && !head.endsWith('ee') && !head.endsWith('ye') && !head.endsWith('oe')) {
    return `${head.slice(0, -1)}ing${rest}`
  }
  return `${doubled(head)}ing${rest}`
}

function past(base: string): string {
  const head = base.split(' ')[0]!
  const rest = base.slice(head.length)
  const irregular = IRREGULAR[head]?.[1]
  if (irregular) return irregular + rest
  if (head.endsWith('e')) return `${head}d${rest}`
  if (/[^aeiou]y$/.test(head)) return `${head.slice(0, -1)}ied${rest}`
  return `${doubled(head)}ed${rest}`
}

/** The gloss with any leading article taken off, so a frame can put its own on. */
function bareGloss(en: string): string {
  return en.replace(/^(the|a|an|my|your|his|her)\s+/i, '').trim()
}

/* ------------------------------------------------------------- Portuguese */

const ARTICLE = /^(o|a|os|as)\s+/i
const CONTRACT: Record<string, Record<string, string>> = {
  de: { o: 'do', a: 'da', os: 'dos', as: 'das' },
  em: { o: 'no', a: 'na', os: 'nos', as: 'nas' },
}

interface Noun { article: string; word: string; plural: boolean; gloss: string }

function ptNoun(card: Card): Noun | null {
  const target = card.target.split('/')[0]!.trim()
  const m = target.match(ARTICLE)
  if (!m) return null
  const article = m[1]!.toLowerCase()
  const word = target.slice(m[0].length).trim()
  if (!word || /[?!.]/.test(word)) return null
  return { article, word, plural: article === 'os' || article === 'as', gloss: bareGloss(card.en) }
}

/**
 * One frame per tense, built so that it reads sensibly whatever the noun is —
 * a place, a feeling or a piece of grammar all fit "aqui está …".
 */
function ptWordExamples(noun: Noun): Ex[] {
  const { article: art, word, plural, gloss } = noun
  const de = CONTRACT.de[art]!
  const the = plural ? 'the' : 'the'
  return [
    {
      target: `Aqui está ${art} ${word}.`,
      en: `Here ${plural ? 'are' : 'is'} ${the} ${gloss}.`,
      tense: 'presente',
    },
    { target: `Preciso ${de} ${word}.`, en: `I need ${the} ${gloss}.`, tense: 'presente' },
    { target: `Ontem vi ${art} ${word}.`, en: `Yesterday I saw ${the} ${gloss}.`, tense: 'perfeito' },
    {
      target: `Antigamente ${art} ${word} era diferente.`,
      en: `${the[0]!.toUpperCase()}${the.slice(1)} ${gloss} used to be different.`,
      tense: 'imperfeito',
    },
    {
      target: `Amanhã falaremos ${de} ${word}.`,
      en: `Tomorrow we will talk about ${the} ${gloss}.`,
      tense: 'futuro',
    },
    {
      target: `Vou procurar ${art} ${word}.`,
      en: `I am going to look for ${the} ${gloss}.`,
      tense: 'futuroProximo',
    },
    {
      target: `Estou a olhar para ${art} ${word}.`,
      en: `I am looking at ${the} ${gloss}.`,
      tense: 'presenteContinuo',
    },
  ]
}

const PT_TENSE_FRAME: [string, string, string][] = [
  // tense, Portuguese adverb, English adverb
  ['presente', 'Muitas vezes eu', 'often'],
  ['presenteContinuo', 'Agora eu', 'right now'],
  ['perfeito', 'Ontem eu', 'yesterday'],
  ['imperfeito', 'Antigamente eu', 'in those days'],
  ['futuro', 'Amanhã eu', 'tomorrow'],
  ['futuroProximo', 'Depois eu', 'later'],
]

/**
 * The six English shapes of one verb gloss.
 *
 * A gloss like "to be afraid" inflects its `be` and leaves the rest alone, which
 * no amount of suffixing would get right.
 */
function englishForms(base: string): Record<string, string> {
  const copula = base.match(/^be\s+(.+)$/i)
  if (copula) {
    const rest = copula[1]!
    return {
      simple: `am ${rest}`,
      continuous: `am ${rest}`,
      past: `was ${rest}`,
      used: `used to be ${rest}`,
      future: `will be ${rest}`,
      going: `am going to be ${rest}`,
    }
  }
  return {
    simple: base,
    continuous: `am ${gerund(base)}`,
    past: past(base),
    used: `used to ${base}`,
    future: `will ${base}`,
    going: `am going to ${base}`,
  }
}

function ptVerbExamples(infinitive: string, gloss: string): Ex[] {
  const table = ptConjugate(infinitive)
  if (!table) return []
  const base = gloss.replace(/^to\s+/i, '').split('/')[0]!.trim()
  if (!base) return []

  const out: Ex[] = []
  for (const [tense, pt, when] of PT_TENSE_FRAME) {
    const form = (table as Record<string, Record<string, string>>)[tense]?.eu
    if (!form) continue
    const shapes = englishForms(base)
    const en = tense === 'presente' ? `I ${shapes.simple} ${when}.`
      : tense === 'presenteContinuo' ? `I ${shapes.continuous} ${when}.`
      : tense === 'perfeito' ? `I ${shapes.past} ${when}.`
      : tense === 'imperfeito' ? `I ${shapes.used} ${when}.`
      : tense === 'futuro' ? `I ${shapes.future} ${when}.`
      : `I ${shapes.going} ${when}.`
    out.push({ target: `${pt} ${form}.`, en, tense })
  }
  return out
}

/* ---------------------------------------------------------------- Turkish */

/** Frames that leave the noun in its dictionary form, so no ending is guessed at. */
function trWordExamples(word: string, gloss: string): Ex[] {
  return [
    { target: `Bu bir ${word}.`, en: `This is a ${gloss}.` },
    { target: `${word} nerede?`, en: `Where is the ${gloss}?` },
    { target: `Bir ${word} istiyorum.`, en: `I want a ${gloss}.`, tense: 'simdiki' },
    { target: `${word} var mı?`, en: `Is there a ${gloss}?` },
    { target: `Her gün ${word} görürüm.`, en: `I see a ${gloss} every day.`, tense: 'genis' },
    { target: `Dün bir ${word} gördüm.`, en: `I saw a ${gloss} yesterday.`, tense: 'gecmis' },
    { target: `Burada bir ${word} varmış.`, en: `There is a ${gloss} here, apparently.`, tense: 'ogrenilen' },
    { target: `Yarın bir ${word} alacağım.`, en: `I will get a ${gloss} tomorrow.`, tense: 'gelecek' },
  ]
}

const TR_TENSE_FRAME: [string, string, string][] = [
  ['simdiki', 'Şimdi', 'right now'],
  ['genis', 'Her hafta', 'every week'],
  ['gecmis', 'Dün', 'yesterday'],
  ['ogrenilen', 'Galiba', 'apparently'],
  ['gelecek', 'Yarın', 'tomorrow'],
]

function trVerbExamples(infinitive: string, gloss: string): Ex[] {
  const table = trConjugate(infinitive)
  if (!table) return []
  const base = gloss.replace(/^to\s+/i, '').split('/')[0]!.trim()
  if (!base) return []

  const out: Ex[] = []
  for (const [tense, tr, when] of TR_TENSE_FRAME) {
    const form = (table as Record<string, Record<string, string>>)[tense]?.ben
    if (!form) continue
    const shapes = englishForms(base)
    const en = tense === 'simdiki' ? `I ${shapes.continuous} ${when}.`
      : tense === 'genis' ? `I ${shapes.simple} ${when}.`
      : tense === 'gecmis' ? `I ${shapes.past} ${when}.`
      : tense === 'ogrenilen' ? `I ${shapes.past}, ${when}.`
      : `I ${shapes.future} ${when}.`
    out.push({ target: `${tr} ${form}.`, en, tense })
  }
  return out
}

/* ------------------------------------------------------------------- run */

/** A card that is a word rather than a sentence: no punctuation, not too long. */
function isWordCard(card: Card): boolean {
  if (/^to\s/i.test(card.en)) return false
  if (/[?!]/.test(card.target)) return false
  return card.target.split(/\s+/).length <= 4
}

/**
 * The decks whose cards are things, so a frame like "bu bir …" reads as Turkish.
 * A word from Pronouns or Numbers is not a thing, and "bu bir bazen" is not a
 * sentence.
 */
const NOUN_DECKS = new Set([
  'Animals', 'Body & Health', 'Celebrations & Holidays', 'Clothing & Colors',
  'Family & People', 'Feelings & Emotions', 'Food & Drink', 'Hobbies & Free Time',
  'Home & Household Objects', 'Hotel & Travel', 'Jobs & Professions',
  'Learning Turkish', 'Places, City & Buildings', 'Restaurant & Ordering',
  'Shopping & Money', 'Technology & Phone', 'Transport & Directions',
  'Weather, Nature & Animals', 'Work, School & Study',
])

const report: string[] = []

function fill(
  lang: 'pt' | 'tr',
  cards: readonly Card[],
  wordsOf: (card: Card) => Ex[],
  verbsOf: (infinitive: string, gloss: string) => Ex[],
  verbOf: (card: Card) => string | null,
) {
  const wordsPath = `data/${lang}/word-examples.json`
  const verbsPath = `data/${lang}/verb-examples.json`
  const words = JSON.parse(readFileSync(wordsPath, 'utf8')) as Record<string, Ex[]>
  const verbs = JSON.parse(readFileSync(verbsPath, 'utf8')) as Record<string, Ex[]>

  let newWords = 0
  let newVerbs = 0
  for (const card of cards) {
    const infinitive = verbOf(card)
    if (infinitive) {
      if (verbs[infinitive]) continue
      const made = verbsOf(infinitive, card.en)
      if (made.length) { verbs[infinitive] = made; newVerbs++ }
      continue
    }
    if (!isWordCard(card) || words[card.target]) continue
    const made = wordsOf(card)
    if (made.length) { words[card.target] = made; newWords++ }
  }

  writeFileSync(wordsPath, JSON.stringify(words, null, 2) + '\n')
  writeFileSync(verbsPath, JSON.stringify(verbs, null, 2) + '\n')
  report.push(`${lang}: +${newWords} words, +${newVerbs} verbs`)
}

it('gen', () => {
  fill('pt', portuguese.cards,
    card => { const noun = ptNoun(card); return noun ? ptWordExamples(noun) : [] },
    ptVerbExamples,
    card => portuguese.verbOf(card))

  fill('tr', turkish.cards,
    card => (NOUN_DECKS.has(card.deck)
      && /^[a-zçğıöşü]/.test(card.target)
      && card.target.split(/\s+/).length <= 2
      ? trWordExamples(card.target, bareGloss(card.en))
      : []),
    trVerbExamples,
    card => turkish.verbOf(card))

  writeFileSync(process.env.DUMP!, report.join('\n'))
})
