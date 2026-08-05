# Stage 1 — Foundation port to Svelte + TypeScript

## Context

`european_portugese_flashcards.html` is a single 152KB file: ~370 lines of vanilla
JS in an IIFE, 1853 cards as a one-line JSON blob, no build step, no tests. It is
hosted on GitHub Pages and studied mostly on an iPhone.

The code is not rotting — it is small and it works. What it cannot do is grow.
Spaced repetition, audio, typing practice, and a redesign all want a foundation
that does not exist yet: modules, types, and a test suite.

## Scope

This stage is a **port with no behaviour change**. Same app, new foundation,
shippable at the end.

That constraint is the point. If the port breaks something, the port is the only
thing that changed, so the break is findable. Bundling a redesign or a scheduler
rewrite into this stage would forfeit that.

**Out of scope:** spaced repetition (stage 2), audio / typing / stats (stage 3),
visual redesign (stage 4). The existing dark theme and badge treatment port as-is.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Framework | Svelte | ~10KB compiled vs ~45KB React; transitions built in, which stage 4 needs. Top-4 framework, ~4.8M npm downloads/week. |
| Language | TypeScript | Closed tag vocabulary becomes compiler-enforced across 1853 cards |
| Build | Vite | Standard, fast, first-class Svelte and PWA plugins |
| Distribution | Installable PWA on GitHub Pages | Chosen over single-file; installed iOS web apps also dodge the 7-day storage cap |
| Progress durability | Manual export / import | No backend, works on Pages. Sync deferred until the manual flow proves annoying. |
| Update behaviour | Prompt, never auto-refresh | An auto-reload mid-review loses your place |
| Old single file | Deleted at end of stage 1 | Git history retains it; two implementations would drift |

## Architecture

```
src/
  main.ts                    bootstrap
  App.svelte                 composition root, owns study state
  lib/
    cards/schema.ts          Card type, Tag union, runtime validation
    cards/index.ts           load + validate all decks
    study/scheduler.ts       due / known / again  (ported verbatim)
    study/order.ts           shuffle + stable ordering
    storage/progress.ts      typed load / save
    storage/migrate.ts       legacy schema chain -> current
    storage/backup.ts        export / import JSON
    render/tags.ts           tag -> pill, colour class, full label
  components/
    Card.svelte              flip, two faces, badges, hint
    Badge.svelte             one pill
    Controls.svelte          prev / flip / next / again / known
    TopBar.svelte            deck, direction, delay, shuffle, reset
    Stats.svelte             total / due / known
  styles/tokens.css          the existing custom properties
data/decks/*.json            27 files, one per deck
tests/                       vitest unit
tests/e2e/                   playwright
```

Each unit is independently understandable: the scheduler has no DOM knowledge, the
renderer has no storage knowledge, `render/tags.ts` is a pure lookup. That
separation is what makes them testable — today none of this logic can be reached
without a browser.

## Types

```ts
export const TAGS = ['masc','masc-mixed','fem','plural',
                     'informal','formal','object','contraction'] as const
export type Tag = typeof TAGS[number]

export interface Card {
  deck: string
  en: string
  pt: string
  tags?: Tag[]      // rendered on the English face
  ptTags?: Tag[]    // rendered on the Portuguese face; subset of tags
  sense?: string    // meaning-level hint, English face only
}
```

A misspelled tag is currently a silently missing badge. Here it fails the build.

## Data

The single-line JSON blob splits into 27 per-deck files under `data/decks/`,
validated against the schema at build time so a malformed card fails the build
rather than half-rendering. Data is bundled rather than fetched — one fewer
failure mode offline.

Validation asserts the invariants established in the badge work: every `tag` is in
the vocabulary, `ptTags ⊆ tags`, no card id collides, and no metadata word
(`plural`, `informal`, `masculine`, …) appears in any `en` string.

## Storage and migration

The riskiest part of this stage: real study history exists and must survive.

Three schema generations now exist on the `pcandeias.github.io` origin:

1. **v1** — ids of the form `deck::<en with metadata words>::pt`
2. **v2** — today's ids, after metadata moved into tags
3. **v3** — this stage's namespaced schema

localStorage is scoped per origin, not per path, so the new app at
`/EuPtFlashcards/` can read what the old file wrote. Migration accepts v1 or v2
and is idempotent.

Failure behaviour is specified, not incidental:

- Corrupt or unparseable stored progress → fall back to empty, and **do not
  overwrite the original value**, so it stays recoverable
- A v1/v2 key matching no current card → dropped, counted, and logged
- Migration runs once, guarded by a schema flag

Export/import ships in this stage rather than later because it is also the safety
net for the migration itself.

## Testing

| Layer | Covers |
|---|---|
| vitest | scheduler intervals; per-side badge rules; every migration path (v1→v3, v2→v3, corrupt, idempotency); backup round-trip; schema validation of all 1853 cards |
| playwright | badge rendering in both directions; flip; keyboard nav; manifest and service worker registration |
| parity | a sample of cards must render identical word + badges to the current implementation |

The browser checks written during the badge work become the e2e suite rather than
being discarded.

## Deployment

Vite with `base: '/EuPtFlashcards/'`, GitHub Actions building to Pages,
`vite-plugin-pwa` for manifest and service worker.

iOS is the primary target, so it is part of acceptance rather than an
afterthought: apple-touch-icon, `display: standalone`, `viewport-fit=cover` with
`env(safe-area-inset-*)`, and a verified "Add to Home Screen" install.

## Risks

| Risk | Mitigation |
|---|---|
| Losing real study progress | Export before migrating; migration tested against v1, v2, corrupt, and repeat runs; original value never overwritten on parse failure |
| Wrong Pages base path → blank page | `base` set explicitly; e2e runs against the built output, not just dev |
| iOS storage eviction | Installed PWA is exempt while in use; manual export is the backstop |
| Scope creep into redesign | Stage boundary is explicit; theme ports unchanged |

## Acceptance

- Same behaviour as the current file, confirmed by the parity test
- Installs to an iPhone home screen and runs offline
- Existing study progress survives the upgrade
- `npm test` green; CI builds and deploys from `main`
