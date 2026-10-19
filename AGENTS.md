# Agent instructions

## Commit and push every change

After you finish a change, commit it and push it to `main` in the same turn. Don't wait to
be asked. The site deploys to GitHub Pages only from a push to `main`, so a change left in
the working tree never goes live.

- Run the checks first: `npm test`, `npm run check`, and the relevant
  `npx playwright test --project=desktop` specs when the UI or the decks change.
- Commit only when they pass. If they fail, fix them, or stop and report the failure. Never
  push a red build.
- Keep one commit per logical change, with a message that says what changed and why.
- After pushing, check the "CI" and "Build and deploy" runs with `gh run list`.
