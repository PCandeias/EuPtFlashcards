import { describe, it, expect, vi } from 'vitest'
import { pickVoice, describeVoice, isMisleading, type VoiceLike } from '../src/lib/speech/voices.js'
import { createSpeaker, SPEECH_LANG, type SynthesisLike, type UtteranceFields } from '../src/lib/speech/speaker.js'

const voice = (name: string, lang: string, localService = false): VoiceLike =>
  ({ name, lang, localService })

const JOANA = voice('Joana', 'pt-PT', true)
const LUCIANA = voice('Luciana', 'pt-BR', true)
const CLOUD_PT = voice('Cloud Portuguese', 'pt-PT')

describe('pickVoice', () => {
  it('picks a European Portuguese voice when one exists', () => {
    const choice = pickVoice([LUCIANA, JOANA])
    expect(choice.voice).toBe(JOANA)
    expect(choice.quality).toBe('european')
  })

  // The deck says `autocarro`, not `ônibus`. A Brazilian voice undoes that work,
  // so it is never preferred and never quietly presented as correct.
  it('never prefers Brazilian over European', () => {
    expect(pickVoice([LUCIANA, CLOUD_PT]).voice).toBe(CLOUD_PT)
  })

  it('prefers an on-device voice, since the app is used offline', () => {
    const choice = pickVoice([CLOUD_PT, JOANA])
    expect(choice.voice).toBe(JOANA)
  })

  it('treats bare "pt" as European', () => {
    expect(pickVoice([voice('Portuguese', 'pt')]).quality).toBe('european')
  })

  it('tolerates the underscore form some engines report', () => {
    expect(pickVoice([voice('Joana', 'pt_PT')]).quality).toBe('european')
  })

  it('is case-insensitive about the tag', () => {
    expect(pickVoice([voice('Joana', 'PT-pt')]).quality).toBe('european')
  })

  it('falls back to Brazilian but flags it as the wrong variant', () => {
    const choice = pickVoice([LUCIANA])
    expect(choice.voice).toBe(LUCIANA)
    expect(choice.quality).toBe('wrong-variant')
  })

  it('reports when there is no Portuguese voice at all', () => {
    const choice = pickVoice([voice('Daniel', 'en-GB')])
    expect(choice.voice).toBeUndefined()
    expect(choice.quality).toBe('none')
  })

  it('handles an empty list, which Safari returns on first call', () => {
    expect(pickVoice([]).quality).toBe('none')
  })
})

describe('describeVoice', () => {
  it('names a correct voice plainly', () => {
    expect(describeVoice(pickVoice([JOANA]))).toBe('European Portuguese — Joana')
  })

  // Being vague here would let the user assume the accent is right when it is not.
  it('says outright when the voice is the wrong variant', () => {
    expect(describeVoice(pickVoice([LUCIANA]))).toContain('not European Portuguese')
  })

  it('explains when nothing Portuguese is installed', () => {
    expect(describeVoice(pickVoice([]))).toMatch(/no portuguese voice/i)
  })
})

describe('isMisleading', () => {
  it('is false only for a genuine European voice', () => {
    expect(isMisleading(pickVoice([JOANA]))).toBe(false)
    expect(isMisleading(pickVoice([LUCIANA]))).toBe(true)
    expect(isMisleading(pickVoice([]))).toBe(true)
  })
})

function fakeSynthesis(voices: VoiceLike[]) {
  const spoken: UtteranceFields[] = []
  const synthesis: SynthesisLike & { spoken: UtteranceFields[]; cancels: number } = {
    spoken,
    cancels: 0,
    getVoices: () => voices,
    cancel() { this.cancels++ },
    speak: vi.fn(),
  }
  return synthesis
}

// The speaker records what it would say; building a real utterance needs a browser.
const record = (sink: UtteranceFields[]) => (fields: UtteranceFields) => {
  sink.push(fields)
  return {} as SpeechSynthesisUtterance
}

describe('createSpeaker', () => {
  it('reports unavailable when the browser has no speech synthesis', () => {
    const speaker = createSpeaker(undefined, record([]))
    expect(speaker.available).toBe(false)
    expect(speaker.speak('olá')).toBeNull()
  })

  it('speaks with the European voice and the pt-PT tag', () => {
    const sink: UtteranceFields[] = []
    const speaker = createSpeaker(fakeSynthesis([LUCIANA, JOANA]), record(sink))
    const fields = speaker.speak('bom dia')

    expect(fields?.text).toBe('bom dia')
    expect(sink[0]!.voice).toBe(JOANA)
    // Set even with a voice chosen, because some engines honour only the tag.
    expect(sink[0]!.lang).toBe(SPEECH_LANG)
  })

  it('cancels before speaking, since a queued utterance can wedge iOS', () => {
    const synthesis = fakeSynthesis([JOANA])
    const speaker = createSpeaker(synthesis, record([]))
    speaker.speak('olá')
    expect(synthesis.cancels).toBe(1)
  })

  it('ignores blank text', () => {
    const sink: UtteranceFields[] = []
    const speaker = createSpeaker(fakeSynthesis([JOANA]), record(sink))
    expect(speaker.speak('   ')).toBeNull()
    expect(sink).toHaveLength(0)
  })

  it('trims what it says', () => {
    const sink: UtteranceFields[] = []
    createSpeaker(fakeSynthesis([JOANA]), record(sink)).speak('  olá  ')
    expect(sink[0]!.text).toBe('olá')
  })

  // Safari populates the voice list asynchronously, so it must not be cached.
  it('re-reads the voice list on every call', () => {
    const voices: VoiceLike[] = []
    const synthesis = fakeSynthesis(voices)
    const speaker = createSpeaker(synthesis, record([]))

    expect(speaker.choice().quality).toBe('none')
    voices.push(JOANA)
    expect(speaker.choice().quality).toBe('european')
  })
})
