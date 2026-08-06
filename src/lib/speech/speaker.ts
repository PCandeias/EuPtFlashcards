/**
 * Speaking a card out loud.
 *
 * The Web Speech API is injected so the calling code can be tested without a
 * browser, and so the iOS quirks live in one place:
 *
 *  - `speak()` is dropped silently unless it happens inside a user gesture
 *  - `getVoices()` can be empty on first call and populate later
 *  - speech breaks if the app is backgrounded mid-utterance
 */
import { pickVoice, type VoiceChoice, type VoiceLike } from './voices.js'
import type { VoiceSpec } from '../languages/types.js'

export interface SynthesisLike {
  speak(utterance: SpeechSynthesisUtterance): void
  cancel(): void
  getVoices(): VoiceLike[]
  addEventListener?(type: 'voiceschanged', listener: () => void): void
}

export interface UtteranceFields {
  text: string
  lang: string
  voice: VoiceLike | undefined
  rate: number
}

export interface Speaker {
  speak(text: string): UtteranceFields | null
  choice(): VoiceChoice
  available: boolean
}

/** Slightly under natural pace: this is for learners, not for listening to. */
export const SPEECH_RATE = 0.9

export interface SpeechTarget {
  /** BCP 47 tag handed to the engine — some honour only this and not `voice`. */
  locale: string
  voice: VoiceSpec
}

export function createSpeaker(
  synthesis: SynthesisLike | undefined,
  build: (fields: UtteranceFields) => SpeechSynthesisUtterance,
  target: SpeechTarget,
): Speaker {
  if (!synthesis) {
    return {
      speak: () => null,
      choice: () => ({ voice: undefined, quality: 'none' }),
      available: false,
    }
  }

  // Voices can arrive after first call, so the list is re-read rather than cached.
  const choice = () => pickVoice(synthesis.getVoices(), target.voice)

  return {
    available: true,
    choice,
    speak(text: string) {
      const trimmed = text.trim()
      if (!trimmed) return null

      // Cancel first: on iOS a queued utterance can wedge the synthesiser.
      synthesis.cancel()

      const fields: UtteranceFields = {
        text: trimmed,
        // Set even when a voice was chosen — some engines honour only this.
        lang: target.locale,
        voice: choice().voice,
        rate: SPEECH_RATE,
      }
      synthesis.speak(build(fields))
      return fields
    },
  }
}

/** Builds a real utterance. Kept separate so tests never need the browser class. */
export function buildUtterance(fields: UtteranceFields): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(fields.text)
  utterance.lang = fields.lang
  utterance.rate = fields.rate
  if (fields.voice) utterance.voice = fields.voice as SpeechSynthesisVoice
  return utterance
}
