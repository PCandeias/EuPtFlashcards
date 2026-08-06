/**
 * Choosing a voice to read a card aloud.
 *
 * Which voices will do is a property of the language, not of this module. The
 * Portuguese deck is deliberately European — `autocarro`, not `ônibus` — so a
 * Brazilian voice reading it would undo the point, and its spec says so. Turkish
 * has no such split: any Turkish voice is the right one.
 *
 * It cannot always be honoured. Safari's `getVoices()` is unreliable and iOS
 * largely picks for you, so `pickVoice` reports what it actually found and the UI
 * tells the truth about it rather than pretending.
 */
import type { VoiceSpec } from '../languages/types.js'

/** The parts of SpeechSynthesisVoice this module needs, so tests need no browser. */
export interface VoiceLike {
  name: string
  lang: string
  localService?: boolean
  default?: boolean
}

export type VoiceQuality =
  /** A voice this deck is happy with. */
  | 'good'
  /** The right language, the wrong variety of it. */
  | 'wrong-variant'
  /** No voice for this language at all; the system default will read it. */
  | 'none'

export interface VoiceChoice {
  voice: VoiceLike | undefined
  quality: VoiceQuality
}

const normalise = (lang: string) => lang.toLowerCase().replace('_', '-')

/**
 * Picks the best available voice.
 *
 * Prefers an on-device voice, since those do not need the network and this app is
 * used offline.
 */
export function pickVoice(voices: readonly VoiceLike[], spec: VoiceSpec): VoiceChoice {
  const matching = voices.filter(v => spec.accept(normalise(v.lang)))
  if (!matching.length) return { voice: undefined, quality: 'none' }

  const preferred = spec.prefer ? matching.filter(v => spec.prefer!(normalise(v.lang))) : matching
  if (preferred.length) {
    const local = preferred.find(v => v.localService)
    return { voice: local ?? preferred[0], quality: 'good' }
  }
  return { voice: matching[0], quality: 'wrong-variant' }
}

/** A short, honest description of what the user will actually hear. */
export function describeVoice(choice: VoiceChoice, spec: VoiceSpec): string {
  switch (choice.quality) {
    case 'good':
      return choice.voice!.name
    case 'wrong-variant':
      return spec.wrongVariant
        ? spec.wrongVariant(choice.voice!.name, choice.voice!.lang)
        : `${choice.voice!.name} (${choice.voice!.lang})`
    case 'none':
      return spec.missing
  }
}

/** True when the chosen voice will mispronounce this deck. */
export function isMisleading(choice: VoiceChoice): boolean {
  return choice.quality !== 'good'
}
