/**
 * European Portuguese.
 *
 * The deck is deliberately the Portuguese of Portugal: `autocarro` not `ônibus`,
 * `estar a falar` not `estar falando`. That shows up here twice — in the voice
 * spec, which refuses to call a Brazilian voice good enough, and in the tense
 * list, which includes the `estar a` continuous.
 */
import { loadCorpus, type DeckModules } from '../../cards/load.js'
import { createConjugationKind } from '../../annotations/conjugation.js'
import { createExamplesKind, type Example } from '../../annotations/examples.js'
import { PT_PERSONS, PT_TENSES, PT_TENSE_IDS } from './tenses.js'
import { conjugatePhrase, parseVerb } from './conjugate.js'
import { verbOf } from './detect.js'
import { runMigration, migrateTenseScope } from '../../storage/migrate.js'
import verbData from '../../../../data/pt/verb-examples.json'
import wordData from '../../../../data/pt/word-examples.json'
import Flag from './Flag.svelte'
import type { LanguageDef, VoiceSpec } from '../types.js'
import type { ReferenceTable } from '../../reference/build.js'
import type { AnnotationKind } from '../../annotations/types.js'

const modules = import.meta.glob<{ default: { deck: string; cards: unknown[] } }>(
  '../../../../data/pt/decks/*.json',
  { eager: true },
)

const corpus = loadCorpus(modules as DeckModules, new Set<string>(PT_TENSE_IDS))

const voice: VoiceSpec = {
  // Bare `pt` means European Portuguese by convention; `pt-BR` never does.
  accept: lang => lang.startsWith('pt'),
  prefer: lang => lang === 'pt' || lang === 'pt-pt' || (lang.startsWith('pt-') && !lang.startsWith('pt-br')),
  missing: 'No Portuguese voice installed; your device will read it as best it can',
  wrongVariant: (name, lang) => `${name} (${lang}) — not European Portuguese`,
}

export const examplesKind = createExamplesKind({
  verbs: verbData as Record<string, Example[]>,
  words: wordData as Record<string, Example[]>,
  locale: 'pt-PT',
  languageName: 'Portuguese',
  voice,
  verbOf,
  // "ir para a escola" borrows `ir`'s sentences.
  headOf: infinitive => (parseVerb(infinitive) ? infinitive : infinitive.split(/\s+/)[0]!),
})

/**
 * The articles, which carry the gender the English side cannot show, and the
 * contractions they make with the prepositions in front of them.
 */
const articleReference: ReferenceTable = {
  title: 'Articles and gender',
  blurb: 'Every noun on a card carries its article, because the article is what '
    + 'tells you the gender. Learn them together: it is not casa, it is a casa.',
  columns: ['', 'Masculine', 'Feminine'],
  emphasiseFirst: false,
  rows: [
    ['the', 'o carro', 'a casa'],
    ['the — plural', 'os carros', 'as casas'],
    ['a, an', 'um carro', 'uma casa'],
    ['some', 'uns carros', 'umas casas'],
  ],
  details: [
    'The endings are a good guess and not a rule. -o is usually masculine and -a '
      + 'usually feminine, but o problema, o mapa and o dia are masculine, and a '
      + 'mão and a tribo are feminine. The article is the only thing that never '
      + 'lies, which is why every noun on a card carries one.',
    'Everything that describes the noun agrees with it: o carro branco but a casa '
      + 'branca, os carros brancos but as casas brancas. Learn the article and the '
      + 'adjectives follow.',
    'Portuguese uses the article where English drops it — o João, a minha casa, '
      + 'gosto do café. "I like coffee" is gosto do café, not gosto de café.',
    'A card written without an article is usually not a noun: falar, bonito and '
      + 'depressa need none.',
  ],
}

const contractionReference: ReferenceTable = {
  title: 'Contractions',
  blurb: 'A preposition in front of an article merges with it. This is not '
    + 'optional: de o is never written, only do.',
  columns: ['', 'o', 'a', 'os', 'as'],
  rows: [
    ['de — of, from', 'do', 'da', 'dos', 'das'],
    ['em — in, on', 'no', 'na', 'nos', 'nas'],
    ['a — to', 'ao', 'à', 'aos', 'às'],
    ['por — by, through', 'pelo', 'pela', 'pelos', 'pelas'],
  ],
  details: [
    'They contract with the indefinite article too, though these are optional in '
      + 'writing and usual in speech: de + um is dum, em + uma is numa.',
    'And with the demonstratives, where they are not optional at all: de + isto '
      + 'is disto, de + aquele is daquele, em + este is neste.',
    'The à in a + a carries a grave accent and nothing else in the language does. '
      + 'It marks the two vowels that ran together, and it is the difference '
      + 'between vou a a escola — which is never written — and vou à escola.',
    'The contraction is also how the deck teaches gender: no jardim tells you '
      + 'jardim is masculine before you have met the word.',
  ],
}

/**
 * The two verbs the English side cannot tell apart.
 *
 * Both are glossed `to be`, so the deck alone will never teach the difference.
 * The forms come from the conjugator rather than from a list typed out here, so
 * this table and the panel on a card can never disagree.
 */
const serEstarReference: ReferenceTable = (() => {
  const ser = conjugatePhrase('ser')
  const estar = conjugatePhrase('estar')
  return {
    title: 'Ser and estar',
    blurb: 'Two verbs for one English word. Ser is what something is; estar is '
      + 'how or where it is at the moment.',
    columns: ['', 'ser — what it is', 'estar — how it is'],
    rows: PT_PERSONS.map(person => [
      person.label,
      ser?.presente?.[person.id] ?? '—',
      estar?.presente?.[person.id] ?? '—',
    ]),
    details: [
      'Both are irregular in the past as well, and there they stop looking alike: '
        + 'fui, foste, foi for ser — the same forms as ir — against estive, '
        + 'estiveste, esteve for estar.',
      'Location is estar, with one exception worth knowing: a thing that cannot '
        + 'move takes ser or ficar. Lisboa fica em Portugal, not está.',
      'estar carries the continuous: estou a falar. That is the European form — '
        + 'Brazil says estou falando, and this deck does not teach it.',
      'A third verb, ficar, covers what English says with "get" or "become": fico '
        + 'contente, ficou frio.',
    ],
  }
})()

const whichToBeReference: ReferenceTable = {
  title: 'Which "to be"',
  blurb: 'The same noun takes either one, and the choice is the meaning: a sopa é '
    + 'boa is what the soup is like, a sopa está fria is how it is right now.',
  columns: ['You mean', 'Portuguese', 'Why'],
  emphasiseFirst: false,
  rows: [
    ['I am Portuguese', 'sou português', 'what you are — ser'],
    ['I am a doctor', 'sou médico', 'what you do — ser'],
    ['it is two o’clock', 'são duas horas', 'the time is always ser'],
    ['the soup is good', 'a sopa é boa', 'what it is like — ser'],
    ['I am tired', 'estou cansado', 'how you are today — estar'],
    ['I am in Lisbon', 'estou em Lisboa', 'where you are — estar'],
    ['I am speaking', 'estou a falar', 'what you are doing — estar'],
    ['the soup is cold', 'a sopa está fria', 'how it is right now — estar'],
  ],
  details: [
    'Some adjectives change meaning rather than tense with the choice. Ele é '
      + 'aborrecido means he is a boring man; ele está aborrecido means he is bored '
      + 'today. É bonito is what someone looks like; está bonito is how they look '
      + 'this evening.',
    'Time and dates are always ser, even though nothing is more temporary: são '
      + 'duas horas, é segunda-feira.',
    'Where English uses "to be" for hunger, cold and age, Portuguese uses ter: '
      + 'tenho fome, tenho frio, tenho trinta anos. Estou com fome is also said '
      + 'and means the same.',
  ],
}

/**
 * The distinction the deck is built around, and the one a Brazilian course will
 * not teach you.
 */
const europeanReference: ReferenceTable = {
  title: 'European, not Brazilian',
  blurb: 'This deck teaches the Portuguese of Portugal throughout, including the '
    + 'places where the two are simply different words.',
  columns: ['Portugal', 'Brazil', 'English'],
  rows: [
    ['o autocarro', 'o ônibus', 'the bus'],
    ['o comboio', 'o trem', 'the train'],
    ['o telemóvel', 'o celular', 'the mobile phone'],
    ['a casa de banho', 'o banheiro', 'the bathroom'],
    ['o pequeno-almoço', 'o café da manhã', 'breakfast'],
    ['o frigorífico', 'a geladeira', 'the fridge'],
    ['estou a falar', 'estou falando', 'I am speaking'],
  ],
  details: [
    'The grammar differs as much as the words. Portugal keeps tu for the familiar '
      + 'you and uses você sparingly; Brazil uses você for everyone. The object '
      + 'pronoun goes after the verb in Portugal — vejo-te — and before it in '
      + 'Brazil.',
    'European Portuguese swallows its unstressed vowels, which is why it sounds '
      + 'nothing like the written word at first and nothing like Brazilian at all. '
      + 'The audio here asks for a European voice and says so when it cannot get '
      + 'one.',
    'Both are Portuguese and neither is wrong. The deck picks one and holds to it, '
      + 'because a deck that mixes them teaches you to be understood everywhere '
      + 'and to sound at home nowhere.',
  ],
}

export const portuguese: LanguageDef = {
  id: 'pt',
  name: 'European Portuguese',
  shortName: 'Portuguese',
  nativeName: 'Português',
  flag: Flag,
  description: 'The Portuguese of Portugal — autocarro, not ônibus.',
  locale: 'pt-PT',
  // The keys this app has always written. Changing them would strand every
  // existing user's study history behind a name nothing reads.
  storagePrefix: 'eupt:v4',
  cards: corpus.cards,
  decks: corpus.decks,
  tenses: PT_TENSES,
  persons: PT_PERSONS,
  annotations: [
    createConjugationKind({
      tenses: PT_TENSES,
      persons: PT_PERSONS,
      conjugate: conjugatePhrase,
      verbOf,
    }) as AnnotationKind,
    examplesKind as AnnotationKind,
  ],
  conjugate: conjugatePhrase,
  verbOf,
  voice,
  // The single-file app and both earlier storage schemas were Portuguese, so
  // this is the only language with anything to carry forward.
  migrate(storage) {
    const result = runMigration(storage, corpus.cards, { tenses: PT_TENSES })
    migrateTenseScope(storage, { tenses: PT_TENSES })
    return result
  },
  modelVerb: 'falar',
  reference: [
    articleReference,
    contractionReference,
    serEstarReference,
    whichToBeReference,
    europeanReference,
  ],
  badgeHints: {
    plural: 'plural — vocês / eles',
    informal: 'informal — tu',
    formal: 'formal — você / o senhor',
    contraction: 'contraction — preposition + article',
  },
}
