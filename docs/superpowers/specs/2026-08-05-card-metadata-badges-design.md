# Card metadata as badges, not words

## Problem

Grammatical metadata is baked into the flashcard text itself. `"you plural come"`
is not English — the learner reads a sentence that no one would ever say, and the
metadata competes with the word for attention.

`formatDisplayText()` already attempts a fix, but only partially:

- it returns on the **first** matching rule, so `"your informal masculine"` renders
  as *your informal* + `masc.`
- its patterns are **suffix-anchored**, so `"you plural come"` and
  `"you plural can"` are untouched — the qualifier sits mid-string
- qualifiers embedded mid-sentence (`"you are, informal, permanent / identity"`)
  fall through entirely

179 of 1853 cards carry inline metadata.

## Goal

The word field shows only the word. Every piece of metadata is expressed through a
separate visual channel, and the same rule holds everywhere in the app.

## Data model

Metadata becomes structured data rather than text to be re-parsed on every render.

```json
{"deck":"Class", "en":"you come", "pt":"vocês vêm", "tags":["plural"]}
{"deck":"Class", "en":"friend",   "pt":"o amigo",   "tags":["masc"]}
{"deck":"Class", "en":"to be",    "pt":"ser",       "sense":"permanent / identity"}
{"deck":"Class", "en":"him / it", "pt":"o", "tags":["masc","object"], "ptTags":["object"]}
```

- **`tags`** — closed vocabulary of eight grammar tags:
  `informal`, `formal`, `plural`, `masc`, `fem`, `masc-mixed`, `object`, `contraction`.
  Rendered as badges.
- **`sense`** — free prose disambiguating *meaning* rather than grammar
  (`permanent / identity`, `said by a man`, `not heavy`). Cannot compress to a
  letter, so it gets its own line.
- **`ptTags`** — opt-in subset rendered on the Portuguese face. See below.

All three fields are omitted when empty, so 1674 untouched cards keep their
current shape.

## Which side a badge appears on

Metadata belongs to the card, but its *informational value* differs per side.

| | Rule |
|---|---|
| English face | Renders `tags` and `sense`, in both study directions |
| Portuguese face | Renders `ptTags` only |

The English is the underspecified side: *"you come"* cannot tell you `tu vens`
from `vocês vêm`. The Portuguese already spells the distinction out — `vocês` **is**
the plural, `o amigo` **is** the masculine — so a badge there is noise.

The exception is bare function words that are ambiguous in isolation. Eight cards
opt in via `ptTags`: object pronouns `o` `a` `os` `as` `te` `vos`, and the
contractions `no` `na`.

## Badge vocabulary

| Tag | Pill | Colour | Meaning |
|---|---|---|---|
| `plural` | `PL` | sky | vocês / eles form |
| `informal` | `INF` | amber | tu |
| `formal` | `FML` | violet | você / o senhor |
| `masc` | `M` | teal | masculine |
| `fem` | `F` | rose | feminine |
| `masc-mixed` | `M+` | teal | masculine or mixed group |
| `object` | `OBJ` | slate | object pronoun |
| `contraction` | `CTR` | slate | preposition + article |

Colour groups by family (gender / number / register / role) so the card is
scannable without reading. Each pill carries `title` and `aria-label` with the
expanded term, so an abbreviation is never a guess.

Badges render as superscript pills anchored to the top-right of the word, sized
independently of the word's `clamp()` so they stay legible at 320px.

Display order is canonical, not source order:
`masc`, `masc-mixed`, `fem`, `plural`, `informal`, `formal`, `object`, `contraction`.

## Rendering

`formatDisplayText()` and its regex table are deleted. `renderFace(card, lang)`
builds word, badges, and hint from the structured fields. Both faces go through it,
which is what makes the treatment consistent across the app.

CSS: `.qualifier` is replaced by `.badges`, `.badge`, and `.hint`, with mobile
sizing in the existing breakpoints.

## Progress migration

`cardId` is `deck::en::pt`. Rewriting `en` would silently orphan every entry in the
user's saved progress.

On load, if the stored schema flag is absent, each saved key is remapped by
`deck::pt` — stable across this change — and rewritten under its new id. 12 cards
share a `deck::pt` pair (the Class deck repeats entries from earlier decks); those
are skipped rather than guessed at. The flag is then set so migration runs once.

## Out of scope

- **Duplicate cards.** ~13 cards in the Class deck repeat earlier decks
  (`eles`, `esse`, `tu vens`). Pre-existing; not touched.
- **Synonym lists.** `"you ask for / order"`, `"little / not much"` are genuine
  English alternatives, not metadata.
- **Proximity glosses.** `"that near you"` (esse) vs `"that over there"` (aquele)
  encode meaning English has no single word for. Stripping them to `"that"` would
  both lose information and collide two Class-deck cards on the same id.

## Verification

- 1853 cards preserved, zero card-id collisions
- zero residual metadata words in any `en` string
- app opens and renders correctly in both directions, at desktop and 320px widths
