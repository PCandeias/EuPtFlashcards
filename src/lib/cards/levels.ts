/**
 * The difficulty registry.
 *
 * A level says roughly how far into the language a card sits. The scale here is
 * CEFR, because that is what course books, exams and the rest of the world use —
 * but nothing downstream knows that. Everything is driven by this list: the
 * order below is the order of difficulty, and adding a band means adding an
 * entry here and nowhere else.
 *
 * A level with no cards is not a problem — the deck is an A1 deck and the upper
 * bands are mostly empty. Anything that offers levels to the user should read
 * them off the corpus rather than off this list, so an empty band never shows up
 * as a box that filters nothing.
 */

export const LEVEL_IDS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as const

export type LevelId = (typeof LEVEL_IDS)[number]

export interface LevelDef {
  id: LevelId
  label: string
  /** What a learner at this band can do, in plain English. */
  hint: string
}

export const LEVELS: readonly LevelDef[] = [
  { id: 'a1', label: 'A1', hint: 'survival — greetings, family, food, numbers, the present' },
  { id: 'a2', label: 'A2', hint: 'everyday — work, travel, health, the past' },
  { id: 'b1', label: 'B1', hint: 'independent — paperwork, opinions, the wider world' },
  { id: 'b2', label: 'B2', hint: 'fluent — abstract and detailed subjects' },
  { id: 'c1', label: 'C1', hint: 'advanced — implicit meaning and nuance' },
  { id: 'c2', label: 'C2', hint: 'mastery — anything read or heard' },
]

const LEVEL_BY_ID = new Map(LEVELS.map(l => [l.id, l]))

export function levelById(id: string): LevelDef | undefined {
  return LEVEL_BY_ID.get(id as LevelId)
}

export function isLevelId(value: unknown): value is LevelId {
  return typeof value === 'string' && LEVEL_BY_ID.has(value as LevelId)
}

/** Position on the scale. Lower is easier. */
export function levelRank(id: LevelId): number {
  return LEVEL_IDS.indexOf(id)
}

/** Sort comparator, easiest first. */
export function compareLevels(a: LevelId, b: LevelId): number {
  return levelRank(a) - levelRank(b)
}

/** The harder of two levels — how a card made of several parts gets its own. */
export function hardestLevel(...levels: LevelId[]): LevelId {
  return levels.reduce((worst, l) => (levelRank(l) > levelRank(worst) ? l : worst), 'a1')
}
