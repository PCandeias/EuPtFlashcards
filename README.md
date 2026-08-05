# European Portuguese Flashcards

1853 European Portuguese vocabulary cards across 27 decks, as an installable
offline web app.

**Live:** https://pcandeias.github.io/EuPtFlashcards/

Add it to your iPhone home screen (Share → Add to Home Screen) and it runs
standalone with no network.

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
src/lib/study/      scheduling and ordering — no DOM knowledge
src/lib/storage/    persistence, legacy migration, backup
src/lib/render/     tag to badge mapping
src/components/     Svelte components
data/decks/         the cards
tests/              unit tests; tests/e2e for browser tests
```

The `lib` modules are pure and injected with their dependencies (`now()`,
`random()`, storage), so they are tested directly rather than through the UI.

## Study progress

Progress is kept in `localStorage` under the `eupt:v3:` prefix.

**Back it up.** iOS clears script-writable storage after 7 days without
interaction. An installed home-screen app is exempt while you keep using it, but a
Safari tab is not, and deleting the installed app takes its data with it. The
**Export backup** button writes a JSON file; **Import backup** merges it back,
keeping the better record of each card so a restore never loses ground.

Progress from the original single-file version migrates automatically on first
load. Where a card could not be matched unambiguously it is skipped rather than
guessed at, and the old data is never deleted.

## Testing notes

`tests/fixtures/` holds a frozen snapshot of the original single-file app — its
full corpus and what it rendered for cards covering every branch of the badge
logic. `tests/e2e/parity.spec.ts` asserts the current app still matches. Regenerate
those fixtures deliberately, never to turn a red test green.

Local e2e runs use Chromium at desktop and phone widths. CI additionally runs
WebKit, which is the closest available engine to iOS Safari.
