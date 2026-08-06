import { describe, it, expect, vi } from 'vitest'
import { pickVoice, describeVoice, isMisleading, type VoiceLike } from '../src/lib/speech/voices.js'
import { createSpeaker, type SynthesisLike, type UtteranceFields } from '../src/lib/speech/speaker.js'
import { portuguese } from '../src/lib/languages/pt/index.js'
import { turkish } from '../src/lib/languages/tr/index.js'

const voice = (name: string, lang: string, localService = false): VoiceLike =>
  ({ name, lang, localService })

const JOANA = voice('Joana', 'pt-PT', true)
const LUCIANA = voice('Luciana', 'pt-BR', true)
const CLOUD_PT = voice('Cloud Portuguese', 'pt-PT')
const YELDA = voice('Yelda', 'tr-TR', true)
const CLOUD_TR = voice('Cloud Turkish', 'tr-TR')
const DANIEL = voice('Daniel', 'en-GB')

const pt = portuguese.voice
const tr = turkish.voice

describe('pickVoice', () => {
  it('picks a European Portuguese voice when one exists', () => {
    const choice = pickVoice([LUCIANA, JOANA], pt)
    expect(choice.voice).toBe(JOANA)
    expect(choice.quality).toBe('good')
  })

  // The deck says `autocarro`, not `ônibus`. A Brazilian voice undoes that work,
  // so it is never preferred and never quietly presented as correct.
  it('never prefers Brazilian over European', () => {
    expect(pickVoice([LUCIANA, CLOUD_PT], pt).voice).toBe(CLOUD_PT)
  })

  it('prefers an on-device voice, since the app is used offline', () => {
    expect(pickVoice([CLOUD_PT, JOANA], pt).voice).toBe(JOANA)
    expect(pickVoice([CLOUD_TR, YELDA], tr).voice).toBe(YELDA)
  })

  it('treats bare "pt" as European', () => {
    expect(pickVoice([voice('Portuguese', 'pt')], pt).quality).toBe('good')
  })

  it('tolerates the underscore form some engines report', () => {
    expect(pickVoice([voice('Joana', 'pt_PT')], pt).quality).toBe('good')
  })

  it('is case-insensitive about the tag', () => {
    expect(pickVoice([voice('Joana', 'PT-pt')], pt).quality).toBe('good')
    expect(pickVoice([voice('Yelda', 'TR-tr')], tr).quality).toBe('good')
  })

  it('falls back to Brazilian but flags it as the wrong variant', () => {
    const choice = pickVoice([LUCIANA], pt)
    expect(choice.voice).toBe(LUCIANA)
    expect(choice.quality).toBe('wrong-variant')
  })

  it('reports when there is no voice for the language at all', () => {
    expect(pickVoice([DANIEL], pt).quality).toBe('none')
    expect(pickVoice([DANIEL, JOANA], tr).quality).toBe('none')
  })

  it('handles an empty list, which Safari returns on first call', () => {
    expect(pickVoice([], pt).quality).toBe('none')
  })
})

// Turkish has no variety to protect, so any Turkish voice is simply right. The
// spec says so by having no `prefer`, and nothing else in the app has to know.
describe('a language with no wrong variant', () => {
  it('accepts any Turkish voice as good', () => {
    expect(pickVoice([CLOUD_TR], tr).quality).toBe('good')
    expect(pickVoice([voice('Ahmet', 'tr')], tr).quality).toBe('good')
  })

  it('never confuses the two languages', () => {
    expect(pickVoice([JOANA], tr).quality).toBe('none')
    expect(pickVoice([YELDA], pt).quality).toBe('none')
  })
})

describe('describeVoice', () => {
  it('names a correct voice plainly', () => {
    expect(describeVoice(pickVoice([JOANA], pt), pt)).toBe('Joana')
    expect(describeVoice(pickVoice([YELDA], tr), tr)).toBe('Yelda')
  })

  // Being vague here would let the user assume the accent is right when it is not.
  it('says outright when the voice is the wrong variant', () => {
    expect(describeVoice(pickVoice([LUCIANA], pt), pt)).toContain('not European Portuguese')
  })

  it('explains when nothing for the language is installed', () => {
    expect(describeVoice(pickVoice([], pt), pt)).toMatch(/no portuguese voice/i)
    expect(describeVoice(pickVoice([], tr), tr)).toMatch(/no turkish voice/i)
  })
})

describe('isMisleading', () => {
  it('is false only for a voice the deck is happy with', () => {
    expect(isMisleading(pickVoice([JOANA], pt))).toBe(false)
    expect(isMisleading(pickVoice([LUCIANA], pt))).toBe(true)
    expect(isMisleading(pickVoice([], pt))).toBe(true)
    expect(isMisleading(pickVoice([YELDA], tr))).toBe(false)
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

const target = (language: typeof portuguese) => ({
  locale: language.locale,
  voice: language.voice,
})

describe('createSpeaker', () => {
  it('reports unavailable when the browser has no speech synthesis', () => {
    const speaker = createSpeaker(undefined, record([]), target(portuguese))
    expect(speaker.available).toBe(false)
    expect(speaker.speak('olá')).toBeNull()
  })

  it('speaks with the European voice and the pt-PT tag', () => {
    const sink: UtteranceFields[] = []
    const speaker = createSpeaker(fakeSynthesis([LUCIANA, JOANA]), record(sink), target(portuguese))
    const fields = speaker.speak('bom dia')

    expect(fields?.text).toBe('bom dia')
    expect(sink[0]!.voice).toBe(JOANA)
    // Set even with a voice chosen, because some engines honour only the tag.
    expect(sink[0]!.lang).toBe('pt-PT')
  })

  it('speaks Turkish with the tr-TR tag and a Turkish voice', () => {
    const sink: UtteranceFields[] = []
    const speaker = createSpeaker(fakeSynthesis([JOANA, YELDA]), record(sink), target(turkish))
    speaker.speak('günaydın')

    expect(sink[0]!.voice).toBe(YELDA)
    expect(sink[0]!.lang).toBe('tr-TR')
  })

  it('cancels before speaking, since a queued utterance can wedge iOS', () => {
    const synthesis = fakeSynthesis([JOANA])
    const speaker = createSpeaker(synthesis, record([]), target(portuguese))
    speaker.speak('olá')
    expect(synthesis.cancels).toBe(1)
  })

  it('trims what it says', () => {
    const sink: UtteranceFields[] = []
    const speaker = createSpeaker(fakeSynthesis([JOANA]), record(sink), target(portuguese))
    expect(speaker.speak('  olá  ')?.text).toBe('olá')
    expect(speaker.speak('   ')).toBeNull()
  })

  // Voices often arrive only after the first call, so the list cannot be cached.
  it('re-reads the voice list on every call', () => {
    let voices: VoiceLike[] = []
    const synthesis: SynthesisLike = {
      getVoices: () => voices,
      cancel: () => {},
      speak: vi.fn(),
    }
    const speaker = createSpeaker(synthesis, record([]), target(portuguese))
    expect(speaker.choice().quality).toBe('none')
    voices = [JOANA]
    expect(speaker.choice().voice).toBe(JOANA)
  })
})
