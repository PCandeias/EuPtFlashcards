/**
 * Turkish vowel and consonant harmony.
 *
 * Every suffix in the language bends to the word it attaches to, and it bends
 * according to these few rules. They are shared by the verb engine and the noun
 * suffixes so the two can never disagree about what `kitap` does.
 *
 *   vowel harmony      a suffix vowel copies the front/back and rounded quality
 *                      of the last vowel before it. Two-way suffixes pick a or
 *                      e; four-way pick ı, i, u or ü.
 *   consonant harmony  a suffix starting with d or c hardens to t or ç after a
 *                      voiceless consonant: evde, but kitapta.
 */

// â is a back vowel that marks a palatal consonant before it: dükkânı, bekârım.
export const BACK = 'aıouâ'
export const FRONT = 'eiöü'
export const VOWELS = BACK + FRONT
/** fıstıkçı şahap — the mnemonic every Turkish course teaches. */
export const VOICELESS = 'çfhkpsşt'

export const isVowel = (ch: string): boolean => VOWELS.includes(ch)

export function lastVowel(word: string): string | null {
  for (let i = word.length - 1; i >= 0; i--) {
    if (isVowel(word[i]!)) return word[i]!
  }
  return null
}

/** The a/e choice: back vowels take a, front vowels take e. */
export function twoWay(word: string): 'a' | 'e' {
  const v = lastVowel(word)
  return v && BACK.includes(v) ? 'a' : 'e'
}

/** The ı/i/u/ü choice, which also tracks rounding. */
export function fourWay(word: string): 'ı' | 'i' | 'u' | 'ü' {
  const v = lastVowel(word)
  switch (v) {
    case 'a': case 'â': case 'ı': return 'ı'
    case 'o': case 'u': return 'u'
    case 'ö': case 'ü': return 'ü'
    default: return 'i'
  }
}

/** True when a suffix beginning d or c must harden to t or ç after this word. */
export function endsVoiceless(word: string): boolean {
  return VOICELESS.includes(word[word.length - 1]!)
}

export function syllables(word: string): number {
  let n = 0
  for (const ch of word) if (isVowel(ch)) n++
  return n
}

/** Turkish keeps the dot: i becomes İ, and ı becomes I. */
export function capitalise(word: string): string {
  if (!word) return word
  const first = { i: 'İ', 'ı': 'I' }[word[0]!] ?? word[0]!.toUpperCase()
  return first + word.slice(1)
}
