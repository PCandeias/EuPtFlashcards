# European Portuguese Flashcards

2093 European Portuguese vocabulary cards across 31 decks, as an installable
offline web app with spaced repetition.

**Live:** https://pcandeias.github.io/EuPtFlashcards/

Add it to your iPhone home screen (Share → Add to Home Screen) and it runs
standalone with no network.

**Fallback:** the original single-file version is kept at
[`/european_portugese_flashcards.html`](https://pcandeias.github.io/EuPtFlashcards/european_portugese_flashcards.html),
carrying the same corrected cards. It stores its progress separately, and it is
excluded from the service worker's navigation fallback — otherwise, once the app
is installed, that URL would quietly serve the new app instead of the backup.

## The card model

Grammatical metadata never appears inside the word. `"you come"` is the word;
`plural` is a badge beside it.

```json
{ "en": "you come", "pt": "vocês vêm", "tags": ["plural"] }
{ "en": "to be",    "pt": "ser",       "sense": "permanent / identity" }
{ "en": "him / it", "pt": "o", "tags": ["masc", "object"], "ptTags": ["object"] }
```

| Field | Meaning |
|---|---|
| `en`, `pt` | The word, and only the word |
| `tags` | Grammar badges on the **English** face. Closed vocabulary: `masc`, `masc-mixed`, `fem`, `plural`, `informal`, `formal`, `object`, `contraction` |
| `ptTags` | Badges on the **Portuguese** face. Subset of `tags` |
| `sense` | Meaning-level disambiguation shown as its own line (`permanent / identity`) |

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

## Audio

**Settings → Audio** turns spoken pronunciation on or off. Off hides every speaker
— on the card and in the example sentences alike. On, each example sentence gets
its own speaker beside it, so you can hear the word in context rather than alone.

The speaker button reads the Portuguese aloud through the Web Speech API.

Voice selection is explicit rather than left to the language tag: this deck is
deliberately European Portuguese, so a Brazilian voice would undo the point. When
only a Brazilian voice — or none — is available, the app says so rather than
letting the accent pass as correct. On iOS this happens more than you would like;
Safari's voice list is unreliable and the system often chooses for you.

## Statistics

Reviews are logged per local calendar day, separately from card scheduling, because
they answer a different question: not *when is this card due* but *am I turning up*.

- **Streak** — consecutive days studied. Not having studied yet today does not break
  it; missing a whole day does.
- **Recall** — share of the last 30 days' reviews you did not fail. Shows `—` rather
  than `0%` when there is nothing to measure.
- A 14-day bar chart of review volume.

## Editing cards

Decks live in [`data/decks/`](data/decks/), one JSON file each. Edit the file and
the change is picked up on the next build. An unknown tag, or a `ptTags` entry not
present in `tags`, fails the build rather than rendering half-right.

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
src/lib/cards/      card model, validation, deck loading
src/lib/study/      SM-2, session queue, typed-answer checking, history
src/lib/speech/     voice selection for pronunciation
src/lib/storage/    persistence, legacy migration, backup
src/lib/render/     tag to badge mapping
src/components/     Svelte components
data/decks/         the cards
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

Progress is kept in `localStorage` under the `eupt:v4:` prefix.

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
