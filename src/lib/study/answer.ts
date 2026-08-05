/**
 * Checking a typed answer.
 *
 * Accents are not decoration in Portuguese — `avô` is a grandfather and `avó` is a
 * grandmother. So an accent-blind match would teach the wrong word and is never
 * simply "correct".
 *
 * But typing accents on a phone keyboard is genuinely awkward, and refusing an
 * otherwise perfect answer teaches nothing either. The middle verdict, `almost`,
 * exists for that: accepted, with the correct spelling shown.
 */

export type Verdict = 'correct' | 'almost' | 'wrong'

export type Reason =
  /** Right word, missing or wrong accents. */
  | 'accents'
  /** Right noun, missing the article that carries its gender. */
  | 'article'

export interface AnswerCheck {
  verdict: Verdict
  reason?: Reason
  /** The accepted form closest to what was typed, for showing back. */
  expected: string
}

/** Portuguese articles, which cards carry because they encode gender. */
const ARTICLES = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas'])

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[¿¡]/g, '')
    .replace(/[?!.,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function stripArticle(value: string): string {
  const [first, ...rest] = value.split(' ')
  if (rest.length && first && ARTICLES.has(first)) return rest.join(' ')
  return value
}

/**
 * Cards may offer alternatives separated by `/` — `obrigado / obrigada`. Any of
 * them is a correct answer.
 */
export function alternatives(expected: string): string[] {
  return expected.split('/').map(part => part.trim()).filter(Boolean)
}

export function checkAnswer(input: string, expected: string): AnswerCheck {
  const options = alternatives(expected)
  const typed = normalise(input)
  const fallback = options[0] ?? expected

  if (!typed) return { verdict: 'wrong', expected: fallback }

  // Exact, once case and trailing punctuation are set aside.
  for (const option of options) {
    if (normalise(option) === typed) return { verdict: 'correct', expected: option }
  }

  // Right word, wrong accents. Accepted, but the correct spelling is shown —
  // silently accepting it would let `avô` and `avó` blur together.
  for (const option of options) {
    if (stripAccents(normalise(option)) === stripAccents(typed)) {
      return { verdict: 'almost', reason: 'accents', expected: option }
    }
  }

  // Right noun, missing article. The article is what carries the gender.
  for (const option of options) {
    const bare = stripArticle(normalise(option))
    if (bare !== normalise(option) && bare === typed) {
      return { verdict: 'almost', reason: 'article', expected: option }
    }
    if (stripAccents(bare) === stripAccents(typed) && bare !== normalise(option)) {
      return { verdict: 'almost', reason: 'article', expected: option }
    }
  }

  return { verdict: 'wrong', expected: fallback }
}

/** What a typed answer suggests, before the user overrides it. */
export function suggestedRating(verdict: Verdict): 'again' | 'hard' | 'good' {
  if (verdict === 'correct') return 'good'
  if (verdict === 'almost') return 'hard'
  return 'again'
}

export function explain(check: AnswerCheck): string {
  if (check.verdict === 'correct') return 'Correct'
  if (check.reason === 'accents') return `Almost — watch the accents: ${check.expected}`
  if (check.reason === 'article') return `Almost — include the article: ${check.expected}`
  return `Not quite — ${check.expected}`
}
