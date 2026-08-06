/**
 * European Portuguese conjugation.
 *
 * Regular rules, plus spelling adjustments, plus an explicit table for the verbs
 * that genuinely break the rules. The contract is deliberately conservative:
 *
 *   if we are not confident, we return nothing.
 *
 * A learner shown `eu podo` is worse off than a learner shown no help at all, so
 * a verb known to be irregular but absent from the table is refused rather than
 * run through the regular rules.
 */
import { PERSON_IDS, TENSE_IDS, type Conjugation, type Forms, type PersonId, type TenseId } from './tenses.js'
import { IRREGULAR, KNOWN_IRREGULAR } from './irregular.js'

export interface Verb {
  /** The infinitive as shown on the card, reflexive ending included. */
  infinitive: string
  /** The infinitive without a reflexive pronoun: `levantar-se` -> `levantar`. */
  stem: string
  reflexive: boolean
}

const REFLEXIVE_PRONOUNS: Record<PersonId, string> = {
  eu: 'me', tu: 'te', ele: 'se', nos: 'nos', eles: 'se',
}

type Group = 'ar' | 'er' | 'ir'

const ENDINGS: Record<Group, Record<TenseId, string[] | null>> = {
  ar: {
    presente: ['o', 'as', 'a', 'amos', 'am'],
    // European Portuguese writes the first person plural with an acute: falámos.
    perfeito: ['ei', 'aste', 'ou', 'ámos', 'aram'],
    imperfeito: ['ava', 'avas', 'ava', 'ávamos', 'avam'],
    futuro: null,
    futuroProximo: null,
    presenteContinuo: null,
  },
  er: {
    presente: ['o', 'es', 'e', 'emos', 'em'],
    perfeito: ['i', 'este', 'eu', 'emos', 'eram'],
    imperfeito: ['ia', 'ias', 'ia', 'íamos', 'iam'],
    futuro: null,
    futuroProximo: null,
    presenteContinuo: null,
  },
  ir: {
    presente: ['o', 'es', 'e', 'imos', 'em'],
    perfeito: ['i', 'iste', 'iu', 'imos', 'iram'],
    imperfeito: ['ia', 'ias', 'ia', 'íamos', 'iam'],
    futuro: null,
    futuroProximo: null,
    presenteContinuo: null,
  },
}

/** The simple future is built on the whole infinitive, whatever the group. */
const FUTURE_ENDINGS = ['ei', 'ás', 'á', 'emos', 'ão']

/** `ir` in the present, for the everyday "going to" future. */
const IR_PRESENT: Record<PersonId, string> = {
  eu: 'vou', tu: 'vais', ele: 'vai', nos: 'vamos', eles: 'vão',
}

/**
 * `estar` in the present, for the continuous.
 *
 * European Portuguese builds it with `estar a` + infinitive — `estou a comer` —
 * where Brazilian uses a gerund, `estou comendo`.
 */
const ESTAR_PRESENT: Record<PersonId, string> = {
  eu: 'estou', tu: 'estás', ele: 'está', nos: 'estamos', eles: 'estão',
}

export function parseVerb(infinitive: string): Verb | null {
  const raw = infinitive.trim().toLowerCase()
  if (!raw) return null

  const reflexive = raw.endsWith('-se')
  const stem = reflexive ? raw.slice(0, -3) : raw
  if (!/(ar|er|ir|ôr|or)$/.test(stem)) return null

  return { infinitive: raw, stem, reflexive }
}

function groupOf(stem: string): Group | null {
  if (stem.endsWith('ar')) return 'ar'
  if (stem.endsWith('er')) return 'er'
  if (stem.endsWith('ir')) return 'ir'
  return null
}

/**
 * Spelling changes that keep a sound constant across endings. These are not
 * irregularities — the verb sounds regular, the orthography just has to work for
 * it — so they are rules rather than table entries.
 */
function adjust(root: string, ending: string, tense: TenseId, person: PersonId): string {
  // -cer / -çar / -ger / -gir only shift before the vowel that would change the sound.
  if (tense === 'presente' && person === 'eu') {
    if (root.endsWith('c')) return root.slice(0, -1) + 'ç' + ending     // conhecer -> conheço
    if (root.endsWith('g')) return root.slice(0, -1) + 'j' + ending     // fingir -> finjo
    if (root.endsWith('gu')) return root.slice(0, -2) + 'g' + ending    // seguir -> sigo
  }
  if (tense === 'perfeito' && person === 'eu') {
    if (root.endsWith('c')) return root.slice(0, -1) + 'qu' + ending    // ficar -> fiquei
    if (root.endsWith('g')) return root.slice(0, -1) + 'gu' + ending    // chegar -> cheguei
    if (root.endsWith('ç')) return root.slice(0, -1) + 'c' + ending     // começar -> comecei
  }
  return root + ending
}

/**
 * Verbs in -ear take an -ei- in the forms where the stress falls on the stem.
 * The deck's own `penteias-te` is what surfaced this.
 */
function isEarVerb(stem: string): boolean {
  return stem.endsWith('ear')
}

const EAR_STRESSED: PersonId[] = ['eu', 'tu', 'ele', 'eles']

/** `ir` plus the infinitive. Works for any verb, however irregular its own forms. */
function nearFuture(stem: string): Forms {
  const out: Forms = {}
  for (const person of PERSON_IDS) out[person] = `${IR_PRESENT[person]} ${stem}`
  return out
}

/** `estar a` plus the infinitive — likewise independent of the verb's own forms. */
function continuous(stem: string): Forms {
  const out: Forms = {}
  for (const person of PERSON_IDS) out[person] = `${ESTAR_PRESENT[person]} a ${stem}`
  return out
}

function regularForms(stem: string, group: Group, tense: TenseId): Forms | null {
  const root = stem.slice(0, -2)

  if (tense === 'futuro') {
    const out: Forms = {}
    PERSON_IDS.forEach((person, i) => { out[person] = stem + FUTURE_ENDINGS[i] })
    return out
  }

  if (tense === 'futuroProximo') return nearFuture(stem)
  if (tense === 'presenteContinuo') return continuous(stem)

  const endings = ENDINGS[group][tense]
  if (!endings) return null

  const out: Forms = {}
  PERSON_IDS.forEach((person, i) => {
    const ending = endings[i]!
    if (tense === 'presente' && isEarVerb(stem) && EAR_STRESSED.includes(person)) {
      // pentear -> penteio, penteias, penteia, penteiam
      out[person] = root.slice(0, -1) + 'ei' + ending
      return
    }
    out[person] = adjust(root, ending, tense, person)
  })
  return out
}

/**
 * Attaches the reflexive pronoun, European style — after the verb, hyphenated.
 *
 * The first person plural drops its final -s before -nos: `sentamos` + `nos`
 * becomes `sentamo-nos`, which the deck confirms.
 */
function attachReflexive(form: string, person: PersonId): string {
  const pronoun = REFLEXIVE_PRONOUNS[person]
  // A periphrastic form takes the pronoun on the auxiliary: vou sentar-me.
  if (form.includes(' ')) return `${form}-${pronoun}`
  if (person === 'nos' && form.endsWith('s')) return `${form.slice(0, -1)}-${pronoun}`
  return `${form}-${pronoun}`
}

/**
 * Conjugates, or returns null when it cannot be done confidently.
 *
 * Null means "offer the learner no help here", which is the honest outcome for a
 * verb whose forms we do not actually know.
 */
export function conjugate(infinitive: string): Conjugation | null {
  const verb = parseVerb(infinitive)
  if (!verb) return null

  const overrides = IRREGULAR[verb.stem]
  const group = groupOf(verb.stem)

  // Irregular and unlisted: refuse rather than produce a plausible wrong answer.
  if (!overrides && (KNOWN_IRREGULAR.has(verb.stem) || !group)) return null

  const result: Conjugation = {}
  for (const tense of TENSE_IDS) {
    const override = overrides?.[tense]
    // The everyday future needs no group: `pôr` belongs to none, but `vou pôr`
    // is still perfectly ordinary.
    // These two are built from an auxiliary plus the infinitive, so they need no
    // group and work even for a verb with no regular pattern of its own.
    const regular = tense === 'futuroProximo' ? nearFuture(verb.stem)
      : tense === 'presenteContinuo' ? continuous(verb.stem)
      : group ? regularForms(verb.stem, group, tense) : null

    // futuroProximo is `ir` plus the infinitive, so it works even for verbs whose
    // own conjugation is irregular.
    const base = override ?? regular
    if (!base || !Object.keys(base).length) continue

    const forms: Forms = {}
    for (const person of PERSON_IDS) {
      const form = base[person]
      if (!form) continue
      forms[person] = verb.reflexive ? attachReflexive(form, person) : form
    }
    if (Object.keys(forms).length) result[tense] = forms
  }

  return Object.keys(result).length ? result : null
}

/** Whether help can be offered for this infinitive at all. */
export function canConjugate(infinitive: string): boolean {
  return conjugate(infinitive) !== null
}

/**
 * Conjugates a verb phrase, keeping whatever follows the verb.
 *
 * The deck is full of these — `ir para a escola`, `fazer compras`, `gostar de` —
 * and they are exactly where a learner wants the help: `eu vou para a escola`
 * teaches more than `ir` alone. The deck's own "eu gosto de" confirms the shape.
 */
export function conjugatePhrase(phrase: string): Conjugation | null {
  const trimmed = phrase.trim()
  if (!trimmed) return null

  const direct = conjugate(trimmed)
  if (direct) return direct

  const words = trimmed.split(/\s+/)
  if (words.length < 2) return null

  const head = conjugate(words[0]!)
  if (!head) return null

  const tail = words.slice(1).join(' ')
  const out: Conjugation = {}
  for (const [tense, forms] of Object.entries(head) as Array<[TenseId, Forms]>) {
    const withTail: Forms = {}
    for (const [person, form] of Object.entries(forms) as Array<[PersonId, string]>) {
      withTail[person] = `${form} ${tail}`
    }
    out[tense] = withTail
  }
  return out
}
