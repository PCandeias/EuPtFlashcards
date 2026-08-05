/**
 * Choosing a European Portuguese voice.
 *
 * This deck is deliberately European Portuguese — `autocarro`, not `ônibus`. Having
 * the browser read it in a Brazilian accent would undo that, so voice selection is
 * explicit rather than left to `lang` alone.
 *
 * It cannot always be honoured. Safari's `getVoices()` is unreliable and iOS
 * largely picks for you, so `pickVoice` reports what it actually found and the UI
 * tells the truth about it rather than pretending.
 */

/** The parts of SpeechSynthesisVoice this module needs, so tests need no browser. */
export interface VoiceLike {
  name: string
  lang: string
  localService?: boolean
  default?: boolean
}

export type VoiceQuality =
  /** A European Portuguese voice. */
  | 'european'
  /** Portuguese, but not European — most likely Brazilian. */
  | 'wrong-variant'
  /** No Portuguese voice at all; the system default will read it. */
  | 'none'

export interface VoiceChoice {
  voice: VoiceLike | undefined
  quality: VoiceQuality
}

const normalise = (lang: string) => lang.toLowerCase().replace('_', '-')

function isPortuguese(voice: VoiceLike): boolean {
  return normalise(voice.lang).startsWith('pt')
}

function isEuropean(voice: VoiceLike): boolean {
  const lang = normalise(voice.lang)
  // Bare `pt` means European Portuguese by convention; `pt-BR` never does.
  return lang === 'pt' || lang === 'pt-pt' || (lang.startsWith('pt-') && !lang.startsWith('pt-br'))
}

/**
 * Picks the best available voice.
 *
 * Prefers an on-device European voice, since those do not need the network and
 * this app is used offline.
 */
export function pickVoice(voices: readonly VoiceLike[]): VoiceChoice {
  const portuguese = voices.filter(isPortuguese)
  const european = portuguese.filter(isEuropean)

  if (european.length) {
    const local = european.find(v => v.localService)
    return { voice: local ?? european[0], quality: 'european' }
  }
  if (portuguese.length) {
    return { voice: portuguese[0], quality: 'wrong-variant' }
  }
  return { voice: undefined, quality: 'none' }
}

/** A short, honest description of what the user will actually hear. */
export function describeVoice(choice: VoiceChoice): string {
  switch (choice.quality) {
    case 'european':
      return `European Portuguese — ${choice.voice!.name}`
    case 'wrong-variant':
      return `${choice.voice!.name} (${choice.voice!.lang}) — not European Portuguese`
    case 'none':
      return 'No Portuguese voice installed; your device will read it as best it can'
  }
}

/** True when the chosen voice will mispronounce this deck's variant. */
export function isMisleading(choice: VoiceChoice): boolean {
  return choice.quality !== 'european'
}
