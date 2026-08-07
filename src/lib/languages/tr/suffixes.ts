/**
 * Turkish noun suffixes.
 *
 * Where Portuguese puts a preposition in front of a noun, Turkish puts an ending
 * on it — and the ending changes shape to match the word. `ev` (house) gives
 * `evde` (in the house), `eve` (to the house), `evi` (the house, as an object).
 * `okul` (school) gives `okulda`, `okula`, `okulu`. Same suffixes, different
 * vowels, because of harmony.
 *
 * Three things happen when a suffix goes on:
 *
 *   harmony      the suffix vowel copies the last vowel of the word
 *   hardening    d becomes t after a voiceless consonant: evde, but kitapta
 *   softening    a final p, ç, t or k voices before a vowel: kitap -> kitabı
 *
 * The first two are rules. **The third is not.** `kitap` softens but `sepet`
 * does not; `çocuk` softens but `Türk` does not. Which words soften is a fact
 * about each word, not something derivable from its shape, so this module keeps
 * an explicit list and refuses to answer for a word it has not been told about.
 * A missing table costs one card its suffix panel; a guessed one teaches a word
 * that does not exist.
 */
import {
  capitalise, endsVoiceless, fourWay, isVowel, lastVowel, twoWay,
} from './harmony.js'

export const TR_SUFFIX_IDS = [
  'plural',
  'accusative',
  'dative',
  'locative',
  'ablative',
  'genitive',
  'possessive1',
  'possessive3',
  'with',
  'having',
  'without',
  'pluralLocative',
] as const

export type TrSuffixId = (typeof TR_SUFFIX_IDS)[number]

/**
 * What an ending is for.
 *
 * Turkish endings are not one thing. Marking a plural, marking a case and saying
 * whose something is are three different jobs, and a table that runs them
 * together reads as a list of noises.
 */
export type SuffixGroup = 'number' | 'case' | 'possessive' | 'derivation' | 'stacking'

export interface SuffixDef {
  id: TrSuffixId
  /** What a Turkish grammar calls it. */
  label: string
  /** The shape, written the way courses write it: capital letters vary. */
  shape: string
  /**
   * Every spelling the shape actually takes.
   *
   * `-lAr` is a convention, not a word: what you write is `-ler` or `-lar`, and
   * a learner who has only ever seen the convention has been told half of it.
   */
  spellings: string
  /** What it does, in English. */
  gloss: string
  group: SuffixGroup
}

export const TR_SUFFIXES: readonly SuffixDef[] = [
  {
    id: 'plural', label: 'çoğul', shape: '-lAr', spellings: '-ler / -lar',
    gloss: 'more than one', group: 'number',
  },
  {
    id: 'accusative', label: 'belirtme hâli', shape: '-(y)I',
    spellings: '-i / -ı / -u / -ü, with y after a vowel',
    gloss: 'the — a definite object', group: 'case',
  },
  {
    id: 'dative', label: 'yönelme hâli', shape: '-(y)A',
    spellings: '-e / -a, with y after a vowel',
    gloss: 'to, towards', group: 'case',
  },
  {
    id: 'locative', label: 'bulunma hâli', shape: '-DA',
    spellings: '-de / -da / -te / -ta',
    gloss: 'in, at, on', group: 'case',
  },
  {
    id: 'ablative', label: 'ayrılma hâli', shape: '-DAn',
    spellings: '-den / -dan / -ten / -tan',
    gloss: 'from, out of', group: 'case',
  },
  {
    id: 'genitive', label: 'tamlayan hâli', shape: '-(n)In',
    spellings: '-in / -ın / -un / -ün, with n after a vowel',
    gloss: 'of, belonging to', group: 'case',
  },
  {
    id: 'possessive1', label: 'iyelik, 1. tekil', shape: '-(I)m',
    spellings: '-im / -ım / -um / -üm, just -m after a vowel',
    gloss: 'my', group: 'possessive',
  },
  {
    id: 'possessive3', label: 'iyelik, 3. tekil', shape: '-(s)I',
    spellings: '-i / -ı / -u / -ü, with s after a vowel',
    gloss: 'his, her, its', group: 'possessive',
  },
  {
    id: 'with', label: 'vasıta hâli', shape: '-(y)lA',
    spellings: '-le / -la, with y after a vowel',
    gloss: 'with, by', group: 'derivation',
  },
  {
    id: 'having', label: 'varlık', shape: '-lI',
    spellings: '-li / -lı / -lu / -lü',
    gloss: 'having, with — sütlü, with milk', group: 'derivation',
  },
  {
    id: 'without', label: 'yokluk', shape: '-sIz',
    spellings: '-siz / -sız / -suz / -süz',
    gloss: 'without — sütsüz, without milk', group: 'derivation',
  },
  {
    id: 'pluralLocative', label: 'çoğul + bulunma', shape: '-lAr + -DA',
    spellings: '-lerde / -larda',
    gloss: 'in the — endings stack, in this order', group: 'stacking',
  },
]

/**
 * Words whose final consonant voices before a vowel: kitap -> kitabı.
 *
 * Listed rather than derived. There is a tendency — words of more than one
 * syllable usually soften, and native words more often than borrowed ones — but
 * it is only a tendency: `sepet`, `market` and `saat` all keep their t while
 * `kanat`, `kağıt` and `kilit` give it up.
 */
const SOFTENS = new Set([
  // -p becomes b
  'kitap', 'hesap', 'dolap', 'kebap', 'cevap', 'cep', 'kalp', 'çorap', 'kasap',
  'sahip',
  // -ç becomes c
  'ağaç', 'ilaç', 'havuç', 'pirinç', 'genç', 'güç', 'kılıç', 'sütlaç',
  // -t becomes d. Native words, mostly; the borrowed ones are in KEEPS.
  'kağıt', 'kilit', 'cilt', 'dört', 'damat', 'armut', 'nohut', 'yoğurt',
  'kanat', 'umut', 'yurt', 'tat', 'simit',
  // -k becomes ğ, which is the common case once there is more than one syllable
  'ayak', 'açık', 'aydınlık', 'atıştırmalık', 'bacak', 'balık', 'bardak',
  'bebek', 'bilek', 'bozuk', 'böcek', 'börek', 'büyük', 'bıçak', 'çiçek',
  'çilek', 'çocuk', 'çocukluk', 'dudak', 'durak', 'ekmek', 'etek', 'eşek',
  'göbek', 'gömlek', 'gözlük', 'içecek', 'karanlık', 'kaşık', 'kavşak',
  'kazak', 'kimlik', 'koltuk', 'kulak', 'kulaklık', 'köpek', 'küçük',
  'mercimek', 'musluk', 'mutfak', 'parmak', 'salatalık', 'sarımsak',
  'sivrisinek', 'soğuk', 'sokak', 'sucuk', 'sıcak', 'tabak', 'tavuk',
  'terlik', 'uzak', 'yastık', 'yatak', 'yağmurluk', 'yemek', 'yüzük',
  'ıspanak', 'ışık', 'öksürük', 'örümcek',
  'uçak', 'ocak', 'klinik', 'ılık', 'ıslak', 'ilginç', 'utangaç', 'fındık',
  'inek', 'kabak', 'fıstık', 'tırnak', 'kirpik', 'topuk', 'kemik', 'böbrek',
  'yumuşak', 'kalabalık', 'toprak', 'matematik', 'lastik', 'yaprak', 'kuyruk',
  'piknik', 'kurt', 'yengeç', 'utanç', 'kıskanç', 'satranç',
  'gerçek', 'kelebek', 'sinek', 'ördek', 'çiftlik', 'mutluluk', 'müzik',
  'elektrik', 'çeyrek', 'şimşek', 'sıcaklık', 'parlak', 'yuvarlak', 'kırık',
  'sağlık', 'hastalık', 'pamuk', 'kıvırcık', 'cacık', 'kitaplık', 'meslek',
  'örnek', 'sözlük', 'birçok', 'konsolosluk', 'elçilik', 'yolculuk',
  'bayrak', 'gümrük', 'çekiç', 'tarak', 'yiyecek', 'benzinlik',
  // -p becomes b here too: garip is garibi.
  'garip',
  // nk becomes ng rather than nğ
  'renk',
])

/**
 * Words that keep their final consonant.
 *
 * Borrowed words in -t are the bulk of it — `bilet`, `market`, `saat` — and
 * monosyllables, which as a rule hold on to theirs.
 */
const KEEPS = new Set([
  // Borrowed -t
  'ameliyat', 'baharat', 'bayat', 'bilet', 'bot', 'bulut', 'ceket', 'cömert',
  'dürüst', 'ehliyet', 'fiyat', 'internet', 'kart', 'kıyafet', 'lacivert',
  'market', 'mont', 'motosiklet', 'mülakat', 'nakit', 'paket', 'pasaport',
  'poşet', 'saat', 'sandalet', 'sepet', 'sırt', 'süt', 'tablet', 'teslimat',
  'tişört', 'tuvalet', 'ücret', 'şirket', 'şort',
  // Monosyllables
  'hap', 'top', 'ip', 'saç', 'hiç', 'geç', 'kaç', 'tok', 'yok', 'çok', 'ok',
  'kırk', 'park', 'grip', 'süt',
  // Borrowed -k
  'bisiklet', 'komik', 'nazik', 'otopark', 'süpermarket', 'trafik',
  // Monosyllables again: et is eti, üç is üçü.
  'et', 'aç', 'üç', 'süt', 'tost',
  'at', 'ahtapot', 'aşk', 'nefret', 'rahat', 'turp', 'greyfurt', 'kek', 'kamp',
  'maç', 'sert', 'çift', 'tek', 'taksit', 'müsait', 'berbat', 'diyet', 'kravat',
  'avukat', 'pilot', 'ek', 'kök', 'ilk', 'birkaç', 'işaret', 'kat', 'halat',
  'turist', 'davet',
])

/**
 * Words that harmonise to the front despite a back vowel.
 *
 * Mostly Arabic and French borrowings whose final consonant is palatal in the
 * original: `saat` takes `saati`, not `saatı`, and `saatte`, not `saatta`. There
 * is nothing in the spelling to tell you — `kalp` does it and `kart` does not —
 * so, like softening, it is a list.
 */
const FRONT_HARMONY = new Set([
  'saat', 'kalp', 'rol', 'gol', 'alkol', 'hal', 'usul', 'petrol', 'kontrol',
  'harf', 'misal', 'sual',
])

/** The last vowel, moved to the front, for the words that ask for it. */
const FRONTED: Record<string, string> = { a: 'e', 'ı': 'i', o: 'ö', u: 'ü' }

function harmonySource(word: string): string {
  if (!FRONT_HARMONY.has(word)) return word
  const v = lastVowel(word)
  const front = v ? FRONTED[v] : undefined
  if (!front) return word
  const at = word.lastIndexOf(v!)
  return word.slice(0, at) + front + word.slice(at + 1)
}

/**
 * The two words that take a y where everything else takes n or s.
 *
 * `su` is the one a beginner meets on day one, and it is irregular in exactly
 * the places a rule would get wrong: `suyun`, not `sunun`; `suyum`, not `sum`;
 * `suyu`, not `susu`.
 */
const Y_BUFFER = new Set(['su', 'ne'])

type Mutation = 'softens' | 'keeps' | 'none'

/** What this word does to its own last letter before a vowel. */
export function mutationOf(word: string): Mutation | null {
  const last = word[word.length - 1]!
  if (!'pçtk'.includes(last)) return 'none'
  if (SOFTENS.has(word)) return 'softens'
  if (KEEPS.has(word)) return 'keeps'
  return null
}

const VOICED: Record<string, string> = { p: 'b', 'ç': 'c', t: 'd', k: 'ğ' }

/** The word as it appears before a suffix that starts with a vowel. */
function beforeVowel(word: string): string | null {
  const mutation = mutationOf(word)
  if (mutation === null) return null
  if (mutation !== 'softens') return word
  // nk becomes ng rather than nğ: renk -> rengi.
  const last = word[word.length - 1]!
  const voiced = last === 'k' && word.endsWith('nk') ? 'g' : VOICED[last]!
  return word.slice(0, -1) + voiced
}

/**
 * A word this module will answer for.
 *
 * Proper nouns are refused: Turkish separates their suffixes with an apostrophe
 * — `İstanbul'da` — and that is a different rule from this one. So are phrases,
 * words with alternatives in them, and anything whose softening is unknown.
 */
export function canSuffix(word: string): boolean {
  const w = word.trim()
  if (!w || w.includes(' ') || w.includes('/') || w.includes('-')) return false
  if (w !== w.toLocaleLowerCase('tr')) return false
  if (!lastVowel(w)) return false
  return mutationOf(w) !== null
}

/** One suffix on one word, or null if this module will not answer for it. */
export function attach(word: string, id: TrSuffixId): string | null {
  if (!canSuffix(word)) return null
  const w = word.trim()
  const softened = beforeVowel(w)!
  const endsInVowel = isVowel(w[w.length - 1]!)
  // Harmony is read off this rather than off the word itself, so the palatal
  // borrowings come out as `saati` rather than `saatı`.
  const h = harmonySource(w)
  const a = twoWay(h)
  const i = fourWay(h)
  const d = endsVoiceless(w) ? 't' : 'd'

  switch (id) {
    case 'plural':
      return `${w}l${a}r`
    case 'accusative':
      return endsInVowel ? `${w}y${i}` : `${softened}${i}`
    case 'dative':
      return endsInVowel ? `${w}y${a}` : `${softened}${a}`
    case 'locative':
      return `${w}${d}${a}`
    case 'ablative':
      return `${w}${d}${a}n`
    case 'genitive':
      if (Y_BUFFER.has(w)) return `${w}y${i}n`
      return endsInVowel ? `${w}n${i}n` : `${softened}${i}n`
    case 'possessive1':
      if (Y_BUFFER.has(w)) return `${w}y${i}m`
      return endsInVowel ? `${w}m` : `${softened}${i}m`
    case 'possessive3':
      if (Y_BUFFER.has(w)) return `${w}y${i}`
      return endsInVowel ? `${w}s${i}` : `${softened}${i}`
    case 'with':
      return endsInVowel ? `${w}yl${a}` : `${w}l${a}`
    case 'having':
      return `${w}l${i}`
    case 'without':
      return `${w}s${i}z`
    case 'pluralLocative': {
      // Suffixes stack, and the second one harmonises with the first.
      const plural = `${w}l${a}r`
      return `${plural}${endsVoiceless(plural) ? 't' : 'd'}${twoWay(plural)}`
    }
  }
}

export interface SuffixForm extends SuffixDef {
  form: string
}

/** Every suffix on one word, for the reference panel. Null if it cannot answer. */
export function suffixTable(word: string): SuffixForm[] | null {
  if (!canSuffix(word)) return null
  const out: SuffixForm[] = []
  for (const def of TR_SUFFIXES) {
    const form = attach(word, def.id)
    if (form) out.push({ ...def, form })
  }
  return out.length ? out : null
}

export { capitalise }
