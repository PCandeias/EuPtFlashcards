# Flashcards

Two languages, as one installable offline web app with spaced repetition:

| | | |
|---|---|---|
| **Português** | 3368 cards · 37 decks | European Portuguese — `autocarro`, not `ônibus` |
| **Türkçe** | 2446 cards · 38 decks | Beginner Turkish — vowel harmony, suffixes, no gender |

**Live:** https://pcandeias.github.io/EuPtFlashcards/

The app opens on a picker; choosing one routes to `#/pt` or `#/tr`. Neither is the
default, and each keeps its own progress, settings and reported cards — studying
one never disturbs the other. Each also has a [reference
page](#the-reference-page) at `#/pt/reference` and `#/tr/reference`: the grammar
behind its deck, and a search across every card in it.

Add it to your iPhone home screen (Share → Add to Home Screen) and it runs
standalone with no network.

**Fallback:** the original single-file version is kept at
[`/european_portugese_flashcards.html`](https://pcandeias.github.io/EuPtFlashcards/european_portugese_flashcards.html),
carrying the same corrected cards. It stores its progress separately, and it is
excluded from the service worker's navigation fallback — otherwise, once the app
is installed, that URL would quietly serve the new app instead of the backup.

## Adding a language

A language is a folder under [`src/lib/languages/`](src/lib/languages/) and one
line in its `index.ts`. Nothing else in the app holds a list of languages.

```ts
export const turkish: LanguageDef = {
  id: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: Flag,
  locale: 'tr-TR',
  storagePrefix: 'eutr:v1',   // its own corner of localStorage
  cards, decks, tenses, persons,
  annotations: [conjugation],  // the markers offered beside a word
  conjugate, verbOf, voice,
}
```

The study loop, the scheduler, the card, the settings and the backup format are
written against that interface and know nothing about either language.

The flags are **drawn as SVG, not typed as emoji**: Windows ships no flag glyphs
and renders 🇵🇹 as the letters PT in two boxes — on the one screen whose whole job
is to be recognised at a glance.

## The card model

Grammatical metadata never appears inside the word. `"you come"` is the word;
`plural` is a badge beside it.

```json
{ "en": "you come", "target": "vocês vêm", "tags": ["plural"] }
{ "en": "you",      "target": "siz",       "tags": ["formal", "plural"] }
{ "en": "to be",    "target": "ser",       "sense": "permanent / identity" }
{ "en": "him / it", "target": "o", "tags": ["masc", "object"], "targetTags": ["object"] }
```

| Field | Meaning |
|---|---|
| `en`, `target` | The word, and only the word |
| `tags` | Grammar badges on the **English** face. Closed vocabulary across languages: `masc`, `masc-mixed`, `fem`, `plural`, `informal`, `formal`, `object`, `contraction` |
| `targetTags` | Badges on the **target-language** face. Subset of `tags` |
| `tense` | Which tense the card is in, if any. Untensed cards are never filtered out |
| `level` | CEFR band, internal for now |
| `sense` | Meaning-level disambiguation shown as its own line (`permanent / identity`) |

No language uses the whole tag vocabulary — Turkish has no grammatical gender, so
`masc` and `fem` never appear on a Turkish card, and its data test asserts it. The
wording adapts: `PL` expands to *vocês / eles* in one language and *siz / onlar* in
the other.

**Why badges appear on one side only.** English is the underspecified side —
*"you come"* cannot tell you `tu vens` from `vocês vêm`, so the badge is what makes
the prompt answerable. The Portuguese already spells the distinction out: `vocês`
*is* the plural, `o amigo` *is* the masculine. The exception is bare function words
that are ambiguous alone (`o`, `a`, `os`, `as`, `te`, `vos`, `no`, `na`), which opt
in via `ptTags`.

## Scheduling

Cards are scheduled by **SM-2**, the algorithm behind SuperMemo and Anki. Each card
carries an *ease* factor that rises when you find it easy and falls when you
struggle; the interval multiplies by that ease each time you get it right.

| Rating | Effect |
|---|---|
| **Again** | Back within the minute, and later in the same session. Ease −0.20 |
| **Hard** | Interval × 1.2, ease −0.15 |
| **Good** | 1 day → 6 days → × ease from then on |
| **Easy** | Interval × ease × 1.3, ease +0.15 |

Each button shows the interval it will produce, so grading is a choice rather than
a guess. Keys `1`–`4` grade, `Space` flips, `←`/`→` move, `T` toggles typing.

Ease has a floor of 1.3: without it, a card you keep failing would return forever
at ever-shorter intervals. Intervals over a few days get ±5% jitter so a batch
studied together does not come back in lockstep.

**The study queue is built once per sitting.** Grading a card removes it from the
queue rather than rebuilding the queue from what is currently due — otherwise every
answer would reshuffle the deck and reset your position. A card you rate *Again* is
pushed back a few places so it returns before you finish.

## Settings

The toolbar holds the study controls — deck, direction, typing mode, shuffle, the
theme toggle and reset. **Settings** holds the rest: conjugation tenses and backup.

The sun/moon button switches straight between the two themes; its icon shows what a
click will give you rather than what you already have.

On a phone the two selects take a row each and the four actions share one, so the
toolbar is three rows rather than six. Every control stays on screen down to
320×568, with tests asserting it.

It is a native `<dialog>`, so focus trapping and Escape come from the platform
rather than being reimplemented. On a phone it opens as a bottom sheet, which is
easier to reach one-handed than a centred box.

**Reset asks first**, and names the deck it would clear. It sits one tap away in
the toolbar and wipes real scheduling and review history.

## Themes

Two complete palettes, switched with the sun/moon button in the toolbar and
remembered:

- **Slate** — the original cool dark.
- **Azulejo** — deep tile blue on cream, with terracotta. Light, so it is also the
  readable one outdoors.

They are separate looks rather than a light/dark pair of one design, which is why
the choice is explicit rather than taken from the system setting. Every colour a
component uses is a variable in [`src/styles/tokens.css`](src/styles/tokens.css),
including per-theme badge colours — a hue that highlights on near-black disappears
on cream. Adding a third palette means adding a block there, not editing
components.

The installed app's status bar follows the theme too.

## Layout

Checked at every size a current phone reports, at both its full height and the
height a browser leaves once its own chrome is on screen — Galaxy S22 and S23,
iPhone 13 through 15 Pro Max — and at tablet and desktop widths. Nothing scrolls
sideways and nothing lands off screen at any of them.

The annotation panels are tooltips: they are drawn over the card and take none of
its space. Their height is capped at 42% of the card so they can never reach the
word being explained or the markers beside it, and longer content scrolls inside
the panel.

The card is sized by the CSS grid, not by arithmetic. It used to be
`calc(100svh - 300px)` with viewport-height caps — guesses at the surrounding
chrome that broke twice when a row was added. The study row is now the only
flexible one and is allowed to shrink, so the page fits by construction. There are
tests asserting no overflow from 320×568 up to 1280×900, in both study modes.

Motion is kept under 200ms and honours `prefers-reduced-motion`.

## Study modes

**Flip** reveals the answer. **Typing** asks you to write it, which tests recall
rather than recognition.

Typed answers are graded strictly on meaning but kindly on input. A missing accent
is never simply *correct* — `avô` is a grandfather and `avó` is a grandmother, so
blurring them would teach the wrong word — but it is accepted as *almost*, with the
correct spelling shown, because typing accents on a phone is awkward enough that
outright rejection teaches nothing either. Same for a missing article, which is
what carries a noun's gender. Cards offering alternatives (`obrigado / obrigada`)
accept any of them.

## The suffix reference

Turkish grammar *is* its endings. Where Portuguese puts a preposition in front of
a noun, Turkish puts an ending on it — and the ending changes shape to match the
word it lands on. So beside the `?` that conjugates a verb there is a `+` that
shows a noun with every ending on it:

```
ev    →  evler   evi    eve    evde    evden   evin   evim   evle   evsiz   evlerde
okul  →  okullar okulu  okula  okulda  okuldan okulun okulum okulla okulsuz okullarda
```

Same suffixes, different vowels. Seeing the two side by side teaches vowel
harmony faster than the rule does, which is why the panel names which way the
vowels went for the word you are looking at.

Three things happen when an ending goes on, and only two of them are rules:

- **Harmony** — the suffix vowel copies the last vowel of the word.
- **Hardening** — a suffix starting with `d` becomes `t` after a voiceless
  consonant: `evde`, but `kitapta`.
- **Softening** — a final `p ç t k` voices before a vowel: `kitap` → `kitabı`.
  **This one is not a rule.** `kitap` softens and `sepet` does not; `çocuk`
  softens and `Türk` does not. It is a fact about each word, so the module keeps
  an explicit list and *refuses to answer* for a word it has not been told about.
  A missing panel costs one card its reference; a guessed one teaches a word that
  does not exist.

The same policy covers the other irregularities: `saat` takes front-vowel endings
despite its back vowel (`saati`, never `saatı`), and `su` takes a `y` where the
rules want an `n` or an `s` (`suyun`, not `sunun`). Both are listed, both are
tested.

The **Suffixes & Vowel Harmony** deck teaches the endings as cards — `evde`,
`okula`, `kitabım` — and a test asserts every one of them is a form the engine
also produces, so the deck and the reference cannot drift apart. The reference
itself is offered only on dictionary forms: putting it on `evde` would suggest
`evdeler`, which is not a word.

## Example sentences

The `"` beside a word shows it in whole sentences, filtered by the same tense
selection as the deck: **18,843 sentences** across the two languages, reaching
52% of the Portuguese cards and 66% of the Turkish ones.

They come from three places, and where they overlap the more careful source wins:

1. **Hand-written**, for the words that deserve it — every Portuguese verb the
   original deck taught, and the thirty Turkish verbs a beginner meets first.
   `Her sabah kahve içerim`, not just `içerim`.
2. **Built from the conjugation engine**, for every other verb. The forms are the
   ones the `?` panel shows, so an example cannot disagree with the table beside
   it.
3. **Built from frames**, for nouns, adjectives and the rest. A frame is a
   sentence with one hole in it, grouped by what kind of word goes in the hole —
   food, clothing, a place, a person, weather, a colour, a country.

   The frames added in the last pass talk *about* the noun rather than doing
   anything to it — `Ontem falei da dor de cabeça`, `Dün öfke hakkında konuştuk`
   — because a frame cannot know what its noun is. `Vou procurar a dor de cabeça`
   is grammatical and nobody would say it.

The frames are where the language-specific work is:

- **Portuguese agreement is read off the article the card already carries.** `o`
  and `a` say masculine and feminine, `os` and `as` say plural too, so `bom`
  comes out as `boa` before a feminine noun and `de` + `o` is built into `do`
  rather than left as two words. A word written without an article is usually not
  a noun at all, and is skipped rather than forced into a noun frame.
- **Turkish keeps the noun in the nominative.** Marking an object or a place
  means a suffix that harmonises with the word — `kitabı`, `evde` — so the frames
  are built so no suffix is ever needed: `Bu bir kitap`, `Kitap nerede?`,
  `Kitap okuyorum`. That last one is worth knowing anyway: an indefinite object
  takes no ending at all. Where Turkish would want a possessive it uses `için`
  instead, because `göz` alone is not how anyone says "my eye".

A Turkish sentence with no verb in it — `Bu bir kitap` — has no tense, and says
so rather than claiming one. Those are shown whatever the tense selection is,
which is also what keeps a word from losing all its examples when you narrow it.

**Not everything gets a sentence, on purpose.** Greetings, function words and the
cards that are already whole sentences are left alone: there is no useful example
built around `olá` or `porque` that is not just the word again, and a wrong
example is worse than none.

The whole corpus is checked by tests: every sentence must contain the word it
illustrates, fill every slot, name only a tense its own language has, and never
produce `de o` where `do` belongs.

## Audio

**Settings → Audio** turns spoken pronunciation on or off. Off hides every speaker
— on the card and in the example sentences alike. On, each example sentence gets
its own speaker beside it, so you can hear the word in context rather than alone.

The speaker button reads the target language aloud through the Web Speech API.

Which voices will do is a property of the language. The Portuguese deck is
deliberately European, so a Brazilian voice would undo the point and is flagged as
the wrong variant rather than passed off as correct. Turkish has no such split:
any Turkish voice is the right one. When nothing suitable is installed the app
says so. On iOS this happens more than you would like; Safari's voice list is
unreliable and the system often chooses for you.

## Statistics

Reviews are logged per local calendar day, separately from card scheduling, because
they answer a different question: not *when is this card due* but *am I turning up*.

- **Streak** — consecutive days studied. Not having studied yet today does not break
  it; missing a whole day does.
- **Recall** — share of the last 30 days' reviews you did not fail. Shows `—` rather
  than `0%` when there is nothing to measure.
- A 14-day bar chart of review volume.

## Grammar

Each language brings its own tenses and its own verb engine, both driven by
registries rather than hardcoded lists. The `?` beside a verb conjugates it, and
offers only the tenses ticked in Settings — the same selection that decides which
cards appear at all.

**Portuguese** covers the present, the `estar a` continuous, the preterite, the
imperfect, and both futures, with a table of irregulars behind them.

**Turkish** needs almost no such table. The language is agglutinative and nearly
regular: a stem takes suffixes, and the suffixes change their vowels to match the
stem. Two rules carry it —

- **vowel harmony** — a suffix vowel copies the front/back and rounded/unrounded
  quality of the last vowel before it: `geliyor`, `alıyor`, `okuyor`, `görüyor`
- **consonant harmony** — a `d` becomes `t` after a voiceless consonant:
  `geldi`, but `yaptı`

What is left is a short, named list: five stems that soften before a vowel
(`git-` → `gid-`), two that change shape before `-yor` (`ye-` → `yi-`), and the
thirteen monosyllables that take the four-way aorist (`gelir`, not `geler`).
Nothing else is guessed at — with one rule added since, for the verbs built on
`etmek`. `hissetmek` softens the same t that `etmek` does (`hissediyorum`, not
`hissetiyorum`) and takes `etmek`'s two-way aorist (`hisseder`, not `hissedir`).
That started as a rule held to compounds by syllable count, and the rule was
wrong: `öğretmek` and `işletmek` also end in -et and keep their t, because they
are causatives rather than compounds, and nothing in the spelling tells the two
apart. It is a list now, like everything else here that cannot be derived.

**Both languages have a deck per tense**, and the conjugation cards in them are
not written by hand: they are generated from the engine, so a card can never
teach a form the `?` panel would contradict. Portuguese has five — the present,
both pasts and both futures — and Turkish five: `şimdiki`, `geniş`, `görülen
geçmiş`, `öğrenilen geçmiş` and `gelecek`. Each deck's cards are checked back
against the engine by a test, which is what caught `ben gelerim` when it was
tried as a deliberate mistake.

Both engines are checked against the deck itself: every conjugated card must be a
form the engine also produces, **and so must every example sentence that claims a
tense**. That second check was added later and found, in one run: a whole phrase
read as a single verb (`gostar de aprender` conjugated to `gostar de aprenderei`),
`Eu começar a trabalho todos os dias`, three sentences that ended on a bare
preposition (`eu gosto de todos os dias`), and a Turkish rule that had been
generalised too far — `öğretmek` is a causative, not a compound of `etmek`, and
keeps its t.

Between them the checks have caught, so far: two arithmetic bugs
in the Portuguese engine, a missing accent rule (`saía`, not `saia` — the second
is a skirt), a hand-written sentence that had the same error, `construir` and the
defective `doer` being run through rules that do not fit them, and four Turkish
verbs the deck used in sentences but never taught.

## The reference page

Every language has a second page at `#/pt/reference` and `#/tr/reference`,
reached from **Reference & search** under the title. It is the grammar behind the
deck in one place, plus a search across every card in it.

Almost nothing on it is written by hand. The sections are **built from the same
registries the study screen uses** — the tense list, the verb engine, the tag
vocabulary, the level registry, the corpus itself — so the reference cannot drift
away from what the app teaches:

| Section | Where it comes from |
|---|---|
| Tenses | `language.tenses`, the same list Settings filters on |
| A verb in full | `language.conjugate(language.modelVerb)` — `falar`, `gelmek` |
| Ser and estar | `conjugate('ser')` and `conjugate('estar')`, not a typed-out table |
| Noun endings | the suffix engine, worked on `ev` and `okul` at once |
| Badges | the tags the language's own cards actually carry |
| Levels, Decks | counted from the corpus |

Each section is a card you can fold away, with its own rule down the left edge so
one explanation is visibly not the next. Folded, the headings read as an index;
**Collapse all** turns the whole page into one, and what you folded is remembered
per language. Every section also carries a **More detail** fold — the exception,
the reason, the thing the table implies but cannot show — kept shut because it is
not needed to read the table:

> The capital letters in the shapes are placeholders, not spellings. A stands for
> a or e, I for ı, i, u or ü, and D for d or t.
>
> Softening is not a rule and cannot be made into one. `kitap` softens and `sepet`
> does not; `çocuk` softens and `Türk` does not.
>
> Where English uses "to be" for hunger, cold and age, Portuguese uses `ter`:
> `tenho fome`, `tenho frio`, `tenho trinta anos`.

A language adds whatever else is worth saying as `reference` tables of its own:
Portuguese explains articles, contractions, `ser` against `estar` and the
European-against-Brazilian words; Turkish explains the endings, vowel harmony,
the consonants that change, the person endings that stand in for *to be*
(`öğrenciyim`), and the `mi` that turns a sentence into a question.

**Search** folds accents and case, so `cafe` finds `café` and `ogrenci` finds
`öğrenci`, and it ranks an exact match above a word that merely starts with the
query. It searches both sides of the card and the sense note, and it says which
deck, tense and level each hit came from.

Two small things the hash routing forces: the section links scroll rather than
navigate, because `#levels` reaching the router would read as *no language* and
bounce you back to the picker; and section anchors are slugged down to letters
and digits, because a title like `Which "to be"` has to survive being written
into an `href`.

## Editing cards

Decks live in [`data/pt/decks/`](data/pt/decks/) and
[`data/tr/decks/`](data/tr/decks/), one JSON file each. The **Class** deck is not
maintained here in the usual sense: it records what a real class covered, so it
changes only when the class hands over more of its word list — the last of those
brought 240 cards. Its cards get example sentences and levels like any other. Edit the file and the
change is picked up on the next build. An unknown tag, a `targetTags` entry not
present in `tags`, or a tense belonging to the other language, fails the build
rather than rendering half-right.

## Development

```bash
npm install
npm run dev        # dev server with hot reload
npm test           # unit tests
npm run test:e2e   # browser tests, against a production build
npm run check      # TypeScript + Svelte type-check
npm run build      # production build to dist/
```

## Layout

```
src/lib/languages/  one folder per language, plus the registry
src/lib/grammar/    the shapes a language describes its grammar in
src/lib/cards/      card model, validation, CEFR levels, deck loading
src/lib/study/      SM-2, session queue, typed-answer checking, history
src/lib/speech/     voice selection for pronunciation
src/lib/storage/    persistence, legacy migration, backup
src/lib/annotations/  the markers beside a word, and the panels behind them
src/lib/render/     tag to badge mapping
src/lib/router.ts   which language is showing
src/components/     Svelte components
data/pt/, data/tr/  the cards
tests/              unit tests; tests/e2e for browser tests
```

The `lib` modules are pure and injected with their dependencies (`now()`,
`random()`, storage), so they are tested directly rather than through the UI.

## Reporting a wrong card

The red **!** in a card's corner reports it. Confirming hides the card from study
straight away — the point of reporting one is to stop being taught it — and adds it
to a list under **Settings → Reported cards**, where a card can be put back if it
was reported by mistake.

**Export to text** downloads the list as a readable file naming each card, its deck
and when it was reported, so the cards can be corrected later.

A report stores the card's text, not just its id, so an export still says what was
wrong even if the card is later edited or removed. Reports travel with a backup.

## Study progress

Progress is kept in `localStorage`, namespaced per language: `eupt:v4:` for
Portuguese — the keys it has always written, so existing history survived the
change untouched — and `eutr:v1:` for Turkish. A backup records which language it
came from, and restoring one into the other is refused rather than merged into a
deck it has nothing to do with.

Storage that refuses to work — Safari with cookies blocked, a device out of
space — degrades instead of taking the app down: reads come back empty, writes
are kept for the session, and the deck still works until the tab closes.

**Back it up.** iOS clears script-writable storage after 7 days without
interaction. An installed home-screen app is exempt while you keep using it, but a
Safari tab is not, and deleting the installed app takes its data with it. The
**Export backup** button writes a JSON file; **Import backup** merges it back,
keeping the better record of each card so a restore never loses ground.

Progress from earlier versions migrates automatically on first load. Where a card
could not be matched unambiguously it is skipped rather than guessed at, and older
data is never deleted.

Scheduling starts fresh for everyone on the move to SM-2: the old counter recorded
how many times you had pressed a button, not how well you retain a card, so it
could not honestly be turned into an interval. Your existing due dates are kept, so
nothing floods back at once, and the review counts are kept for statistics.

## Testing notes

`tests/fixtures/` holds a frozen snapshot of the original single-file app — its
full corpus and what it rendered for cards covering every branch of the badge
logic. `tests/e2e/parity.spec.ts` asserts the current app still matches. Regenerate
those fixtures deliberately, never to turn a red test green.

Local e2e runs use Chromium at desktop and phone widths. CI additionally runs
WebKit, which is the closest available engine to iOS Safari.
