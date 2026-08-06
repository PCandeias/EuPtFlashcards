/**
 * Verbs the regular rules get wrong.
 *
 * Entries are partial by design: a verb overrides only the tenses it actually
 * breaks. `dormir` is irregular in the present (`durmo`) but perfectly regular in
 * the past, so it lists the present alone and inherits the rest.
 *
 * Showing a learner `eu podo` would be worse than showing nothing, so any verb
 * that is irregular and not listed here must be excluded rather than guessed at —
 * see KNOWN_IRREGULAR below.
 */
import type { Conjugation } from '../../grammar/tenses.js'

/**
 * Verbs known to break the regular rules. A verb in this list without a table
 * entry is refused rather than conjugated wrongly.
 */
export const KNOWN_IRREGULAR = new Set([
  'ser', 'estar', 'ir', 'ter', 'haver', 'vir', 'ver', 'dar', 'dizer', 'fazer',
  'poder', 'querer', 'saber', 'trazer', 'ler', 'ouvir', 'pôr', 'rir', 'perder',
  'sair', 'cair', 'construir', 'doer', 'pedir', 'dormir', 'sentir', 'servir', 'preferir', 'vestir',
  'subir', 'seguir', 'repetir', 'fugir', 'medir', 'valer', 'caber', 'crer',
  // Defective or irregular verbs with no table entry: listed so they are refused
  // rather than run through the regular rules and answered wrongly.
  'precaver', 'reaver', 'polir', 'aderir', 'agredir', 'prevenir',
  // -uzir verbs drop the ending in the third person singular: ele conduz.
  'conduzir', 'produzir', 'traduzir', 'reduzir',
])

export const IRREGULAR: Record<string, Conjugation> = {
  ser: {
    presente: { eu: 'sou', tu: 'és', ele: 'é', nos: 'somos', eles: 'são' },
    perfeito: { eu: 'fui', tu: 'foste', ele: 'foi', nos: 'fomos', eles: 'foram' },
    imperfeito: { eu: 'era', tu: 'eras', ele: 'era', nos: 'éramos', eles: 'eram' },
    futuro: { eu: 'serei', tu: 'serás', ele: 'será', nos: 'seremos', eles: 'serão' },
  },
  estar: {
    presente: { eu: 'estou', tu: 'estás', ele: 'está', nos: 'estamos', eles: 'estão' },
    perfeito: { eu: 'estive', tu: 'estiveste', ele: 'esteve', nos: 'estivemos', eles: 'estiveram' },
    imperfeito: { eu: 'estava', tu: 'estavas', ele: 'estava', nos: 'estávamos', eles: 'estavam' },
  },
  ir: {
    presente: { eu: 'vou', tu: 'vais', ele: 'vai', nos: 'vamos', eles: 'vão' },
    perfeito: { eu: 'fui', tu: 'foste', ele: 'foi', nos: 'fomos', eles: 'foram' },
    imperfeito: { eu: 'ia', tu: 'ias', ele: 'ia', nos: 'íamos', eles: 'iam' },
  },
  ter: {
    presente: { eu: 'tenho', tu: 'tens', ele: 'tem', nos: 'temos', eles: 'têm' },
    perfeito: { eu: 'tive', tu: 'tiveste', ele: 'teve', nos: 'tivemos', eles: 'tiveram' },
    imperfeito: { eu: 'tinha', tu: 'tinhas', ele: 'tinha', nos: 'tínhamos', eles: 'tinham' },
  },
  haver: {
    presente: { eu: 'hei', tu: 'hás', ele: 'há', nos: 'havemos', eles: 'hão' },
    perfeito: { eu: 'houve', tu: 'houveste', ele: 'houve', nos: 'houvemos', eles: 'houveram' },
    imperfeito: { eu: 'havia', tu: 'havias', ele: 'havia', nos: 'havíamos', eles: 'haviam' },
  },
  vir: {
    presente: { eu: 'venho', tu: 'vens', ele: 'vem', nos: 'vimos', eles: 'vêm' },
    perfeito: { eu: 'vim', tu: 'vieste', ele: 'veio', nos: 'viemos', eles: 'vieram' },
    imperfeito: { eu: 'vinha', tu: 'vinhas', ele: 'vinha', nos: 'vínhamos', eles: 'vinham' },
  },
  ver: {
    presente: { eu: 'vejo', tu: 'vês', ele: 'vê', nos: 'vemos', eles: 'veem' },
    perfeito: { eu: 'vi', tu: 'viste', ele: 'viu', nos: 'vimos', eles: 'viram' },
    imperfeito: { eu: 'via', tu: 'vias', ele: 'via', nos: 'víamos', eles: 'viam' },
  },
  dar: {
    presente: { eu: 'dou', tu: 'dás', ele: 'dá', nos: 'damos', eles: 'dão' },
    perfeito: { eu: 'dei', tu: 'deste', ele: 'deu', nos: 'demos', eles: 'deram' },
    imperfeito: { eu: 'dava', tu: 'davas', ele: 'dava', nos: 'dávamos', eles: 'davam' },
  },
  dizer: {
    presente: { eu: 'digo', tu: 'dizes', ele: 'diz', nos: 'dizemos', eles: 'dizem' },
    perfeito: { eu: 'disse', tu: 'disseste', ele: 'disse', nos: 'dissemos', eles: 'disseram' },
    futuro: { eu: 'direi', tu: 'dirás', ele: 'dirá', nos: 'diremos', eles: 'dirão' },
  },
  fazer: {
    presente: { eu: 'faço', tu: 'fazes', ele: 'faz', nos: 'fazemos', eles: 'fazem' },
    perfeito: { eu: 'fiz', tu: 'fizeste', ele: 'fez', nos: 'fizemos', eles: 'fizeram' },
    futuro: { eu: 'farei', tu: 'farás', ele: 'fará', nos: 'faremos', eles: 'farão' },
  },
  poder: {
    presente: { eu: 'posso', tu: 'podes', ele: 'pode', nos: 'podemos', eles: 'podem' },
    perfeito: { eu: 'pude', tu: 'pudeste', ele: 'pôde', nos: 'pudemos', eles: 'puderam' },
  },
  querer: {
    presente: { eu: 'quero', tu: 'queres', ele: 'quer', nos: 'queremos', eles: 'querem' },
    perfeito: { eu: 'quis', tu: 'quiseste', ele: 'quis', nos: 'quisemos', eles: 'quiseram' },
  },
  saber: {
    presente: { eu: 'sei', tu: 'sabes', ele: 'sabe', nos: 'sabemos', eles: 'sabem' },
    perfeito: { eu: 'soube', tu: 'soubeste', ele: 'soube', nos: 'soubemos', eles: 'souberam' },
  },
  trazer: {
    presente: { eu: 'trago', tu: 'trazes', ele: 'traz', nos: 'trazemos', eles: 'trazem' },
    perfeito: { eu: 'trouxe', tu: 'trouxeste', ele: 'trouxe', nos: 'trouxemos', eles: 'trouxeram' },
    futuro: { eu: 'trarei', tu: 'trarás', ele: 'trará', nos: 'traremos', eles: 'trarão' },
  },
  ler: {
    presente: { eu: 'leio', tu: 'lês', ele: 'lê', nos: 'lemos', eles: 'leem' },
    perfeito: { eu: 'li', tu: 'leste', ele: 'leu', nos: 'lemos', eles: 'leram' },
  },
  ouvir: {
    presente: { eu: 'ouço', tu: 'ouves', ele: 'ouve', nos: 'ouvimos', eles: 'ouvem' },
  },
  'pôr': {
    presente: { eu: 'ponho', tu: 'pões', ele: 'põe', nos: 'pomos', eles: 'põem' },
    perfeito: { eu: 'pus', tu: 'puseste', ele: 'pôs', nos: 'pusemos', eles: 'puseram' },
    imperfeito: { eu: 'punha', tu: 'punhas', ele: 'punha', nos: 'púnhamos', eles: 'punham' },
    futuro: { eu: 'porei', tu: 'porás', ele: 'porá', nos: 'poremos', eles: 'porão' },
  },
  rir: {
    presente: { eu: 'rio', tu: 'ris', ele: 'ri', nos: 'rimos', eles: 'riem' },
  },
  perder: {
    presente: { eu: 'perco', tu: 'perdes', ele: 'perde', nos: 'perdemos', eles: 'perdem' },
  },
  sair: {
    presente: { eu: 'saio', tu: 'sais', ele: 'sai', nos: 'saímos', eles: 'saem' },
    perfeito: { eu: 'saí', tu: 'saíste', ele: 'saiu', nos: 'saímos', eles: 'saíram' },
  },
  cair: {
    presente: { eu: 'caio', tu: 'cais', ele: 'cai', nos: 'caímos', eles: 'caem' },
    perfeito: { eu: 'caí', tu: 'caíste', ele: 'caiu', nos: 'caímos', eles: 'caíram' },
  },
  // The -uir verbs take ó in the second and third person of the present.
  construir: {
    presente: { eu: 'construo', tu: 'constróis', ele: 'constrói', nos: 'construímos', eles: 'constroem' },
  },
  // Defective: only the third person is used. Nobody says "eu doo".
  doer: {
    presente: { ele: 'dói', eles: 'doem' },
    perfeito: { ele: 'doeu', eles: 'doeram' },
    imperfeito: { ele: 'doía', eles: 'doíam' },
    futuro: { ele: 'doerá', eles: 'doerão' },
  },
  valer: { presente: { eu: 'valho', tu: 'vales', ele: 'vale', nos: 'valemos', eles: 'valem' } },
  caber: { presente: { eu: 'caibo', tu: 'cabes', ele: 'cabe', nos: 'cabemos', eles: 'cabem' } },
  crer: { presente: { eu: 'creio', tu: 'crês', ele: 'crê', nos: 'cremos', eles: 'creem' } },

  // -uzir verbs: third person singular has no ending — `conduz`, not `conduze`.
  conduzir: {
    presente: { eu: 'conduzo', tu: 'conduzes', ele: 'conduz', nos: 'conduzimos', eles: 'conduzem' },
  },
  traduzir: {
    presente: { eu: 'traduzo', tu: 'traduzes', ele: 'traduz', nos: 'traduzimos', eles: 'traduzem' },
  },
  produzir: {
    presente: { eu: 'produzo', tu: 'produzes', ele: 'produz', nos: 'produzimos', eles: 'produzem' },
  },
  reduzir: {
    presente: { eu: 'reduzo', tu: 'reduzes', ele: 'reduz', nos: 'reduzimos', eles: 'reduzem' },
  },

  // Stem-changing -ir verbs: irregular in the present only, regular elsewhere.
  pedir: { presente: { eu: 'peço', tu: 'pedes', ele: 'pede', nos: 'pedimos', eles: 'pedem' } },
  medir: { presente: { eu: 'meço', tu: 'medes', ele: 'mede', nos: 'medimos', eles: 'medem' } },
  dormir: { presente: { eu: 'durmo', tu: 'dormes', ele: 'dorme', nos: 'dormimos', eles: 'dormem' } },
  sentir: { presente: { eu: 'sinto', tu: 'sentes', ele: 'sente', nos: 'sentimos', eles: 'sentem' } },
  servir: { presente: { eu: 'sirvo', tu: 'serves', ele: 'serve', nos: 'servimos', eles: 'servem' } },
  vestir: { presente: { eu: 'visto', tu: 'vestes', ele: 'veste', nos: 'vestimos', eles: 'vestem' } },
  preferir: {
    presente: { eu: 'prefiro', tu: 'preferes', ele: 'prefere', nos: 'preferimos', eles: 'preferem' },
  },
  repetir: {
    presente: { eu: 'repito', tu: 'repetes', ele: 'repete', nos: 'repetimos', eles: 'repetem' },
  },
  seguir: { presente: { eu: 'sigo', tu: 'segues', ele: 'segue', nos: 'seguimos', eles: 'seguem' } },
  fugir: { presente: { eu: 'fujo', tu: 'foges', ele: 'foge', nos: 'fugimos', eles: 'fogem' } },
  // o/u alternation across the singular and third plural.
  subir: { presente: { eu: 'subo', tu: 'sobes', ele: 'sobe', nos: 'subimos', eles: 'sobem' } },
}
