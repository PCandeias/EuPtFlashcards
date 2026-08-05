# Foundation Port Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the single-file flashcards app to Vite + Svelte + TypeScript, shipped as an installable PWA on GitHub Pages, with no behaviour change.

**Architecture:** Pure logic modules (`lib/`) with no DOM or storage knowledge, Svelte components for rendering, per-deck JSON data validated at build time. Existing localStorage progress migrates from two prior id schemes.

**Tech Stack:** Svelte 5.56 (runes), Vite 8.2, TypeScript 7.0, Vitest 4.1, Playwright 1.62, vite-plugin-pwa 1.3

**Spec:** `docs/superpowers/specs/2026-08-05-foundation-port-design.md`

---

## Chunk 1: Scaffold and data

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `svelte.config.js`, `index.html`, `.gitignore`

- [ ] **Step 1:** Create `package.json` with scripts: `dev`, `build`, `preview`, `test`, `test:e2e`, `check`
- [ ] **Step 2:** Install deps
  Run: `npm install`
  Expected: no peer errors
- [ ] **Step 3:** `vite.config.ts` with `base: '/EuPtFlashcards/'`, svelte plugin, vitest config
- [ ] **Step 4:** Verify the toolchain runs
  Run: `npm run build`
  Expected: build succeeds, emits `dist/`
- [ ] **Step 5:** Commit

### Task 2: Extract card data into per-deck files

**Files:**
- Create: `scripts/extract-decks.mjs`, `data/decks/*.json` (27 files)
- Test: `tests/data.test.ts`

- [ ] **Step 1:** Write `tests/data.test.ts` asserting: 1853 cards total, every tag in vocabulary, `ptTags ⊆ tags`, no id collisions, no metadata word in any `en`
- [ ] **Step 2:** Run it
  Run: `npx vitest run tests/data.test.ts`
  Expected: FAIL — data modules do not exist
- [ ] **Step 3:** Write `scripts/extract-decks.mjs` to read the legacy HTML blob and emit one JSON file per deck, slug-named
- [ ] **Step 4:** Run extraction, then the test
  Run: `node scripts/extract-decks.mjs && npx vitest run tests/data.test.ts`
  Expected: PASS
- [ ] **Step 5:** Commit

### Task 3: Card schema and loader

**Files:**
- Create: `src/lib/cards/schema.ts`, `src/lib/cards/index.ts`
- Test: `tests/schema.test.ts`

Key interface:

```ts
export const TAGS = ['masc','masc-mixed','fem','plural',
                     'informal','formal','object','contraction'] as const
export type Tag = typeof TAGS[number]

export interface Card {
  deck: string; en: string; pt: string
  tags?: Tag[]; ptTags?: Tag[]; sense?: string
}

export function parseCard(value: unknown, where: string): Card  // throws on invalid
export function cardId(card: Card): string                      // `${deck}::${en}::${pt}`
```

- [ ] **Step 1:** Write `tests/schema.test.ts` — valid card parses; unknown tag rejected; `ptTags` not a subset rejected; missing field rejected
- [ ] **Step 2:** Run, expect FAIL
- [ ] **Step 3:** Implement `schema.ts` then `index.ts` (imports all deck JSON, validates, exports `CARDS`)
- [ ] **Step 4:** Run `npx vitest run`, expect PASS
- [ ] **Step 5:** Commit

## Chunk 2: Logic modules

### Task 4: Tag rendering rules

**Files:**
- Create: `src/lib/render/tags.ts`
- Test: `tests/tags.test.ts`

```ts
export interface BadgeSpec { tag: Tag; pill: string; cls: string; full: string }
export function badgesFor(card: Card, side: 'en' | 'pt'): BadgeSpec[]
export function hintFor(card: Card, side: 'en' | 'pt'): string | undefined
```

- [ ] **Step 1:** Write tests — English face gets `tags`; Portuguese face gets only `ptTags`; badges sort in canonical order; hint only on English
- [ ] **Step 2:** Run, expect FAIL
- [ ] **Step 3:** Implement
- [ ] **Step 4:** Run, expect PASS
- [ ] **Step 5:** Commit

### Task 5: Scheduler and ordering

**Files:**
- Create: `src/lib/study/scheduler.ts`, `src/lib/study/order.ts`
- Test: `tests/scheduler.test.ts`

Ported verbatim from the legacy file — `known` sets `nextDue = now + delayDays`, `again` clears it. Behaviour must not change in this stage.

- [ ] **Step 1:** Write tests — due filtering, known/again transitions, deterministic shuffle given a seeded RNG
- [ ] **Step 2:** Run, expect FAIL
- [ ] **Step 3:** Implement (inject `now()` and `random()` so tests are deterministic)
- [ ] **Step 4:** Run, expect PASS
- [ ] **Step 5:** Commit

### Task 6: Storage, migration, backup

**Files:**
- Create: `src/lib/storage/progress.ts`, `src/lib/storage/migrate.ts`, `src/lib/storage/backup.ts`
- Test: `tests/storage.test.ts`

The highest-risk unit. Migration accepts v1 (pre-badge ids) and v2 (current ids).

- [ ] **Step 1:** Write tests:
  - v1 key `Class::you plural come::vocês vêm` → `Class::you come::vocês vêm`
  - v2 key passes through untouched
  - key matching no card → dropped, counted
  - ambiguous `deck::pt` → skipped, not guessed
  - corrupt JSON → empty progress returned AND original value left intact
  - migration idempotent across repeat runs
  - backup export → import round-trips
- [ ] **Step 2:** Run, expect FAIL
- [ ] **Step 3:** Implement
- [ ] **Step 4:** Run, expect PASS
- [ ] **Step 5:** Commit

## Chunk 3: UI and shipping

### Task 7: Components

**Files:**
- Create: `src/App.svelte`, `src/components/{Badge,Card,Controls,TopBar,Stats}.svelte`, `src/styles/tokens.css`, `src/main.ts`

Port the existing markup, CSS custom properties, breakpoints, flip animation, swipe, and keyboard handling unchanged.

- [ ] **Step 1:** Port `tokens.css` and the card/badge/hint CSS verbatim
- [ ] **Step 2:** Build `Badge.svelte`, then `Card.svelte` consuming `badgesFor`/`hintFor`
- [ ] **Step 3:** Build `TopBar`, `Controls`, `Stats`, wire in `App.svelte`
- [ ] **Step 4:** Verify
  Run: `npm run build && npm run check`
  Expected: build clean, zero svelte-check errors
- [ ] **Step 5:** Commit

### Task 8: PWA and iOS install

**Files:**
- Modify: `vite.config.ts`, `index.html`
- Create: `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`

- [ ] **Step 1:** Add `vite-plugin-pwa` with manifest (standalone, theme colour, icons)
- [ ] **Step 2:** Add iOS meta tags and `env(safe-area-inset-*)` padding
- [ ] **Step 3:** Add update-available prompt (never auto-refresh)
- [ ] **Step 4:** Verify manifest and SW in the built output
  Run: `npm run build && ls dist/`
  Expected: `manifest.webmanifest`, `sw.js` present
- [ ] **Step 5:** Commit

### Task 9: End-to-end and parity

**Files:**
- Create: `tests/e2e/app.spec.ts`, `tests/e2e/parity.spec.ts`, `playwright.config.ts`

- [ ] **Step 1:** E2E: badges render in both directions, flip works, keyboard nav works, no console errors
- [ ] **Step 2:** Parity: sample cards render identical word + badge text to the legacy file
- [ ] **Step 3:** Run against the built output
  Run: `npm run build && npx playwright test`
  Expected: all pass
- [ ] **Step 4:** Commit

### Task 10: Deploy and clean up

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`
- Delete: `european_portugese_flashcards.html`

- [ ] **Step 1:** GitHub Actions workflow — install, test, build, deploy to Pages on push to `main`
- [ ] **Step 2:** README covering dev, test, deploy, and the data format
- [ ] **Step 3:** Delete the legacy file once parity passes
- [ ] **Step 4:** Final full verification
  Run: `npm run check && npm test && npm run build && npx playwright test`
- [ ] **Step 5:** Commit
