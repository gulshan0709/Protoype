---
paths:
  - "tests/**"
  - "scripts/**"
---

# Node tests and browser checks

## Node tests (`tests/*.test.cjs`)

- `npm test` runs every `tests/*.test.cjs` with `node --test` and `scripts/lib/ts-hooks.cjs` preloaded. The hooks resolve extensionless imports to `.ts`/`.tsx` and load JSON as a default export, the way Metro does. It takes about 7 s. To run one file: `node --require ./scripts/lib/ts-hooks.cjs --test tests/<name>.test.cjs`.
- Tests are CommonJS: `const { test } = require("node:test")`, `const assert = require("node:assert/strict")`, and `require("../src/domain/...ts")` with the extension.
- Tests load domain modules only. Anything that imports React Native can't be loaded here, which is one reason domain code stays pure.
- `tests/helpers.cjs` (requiring it also loads the hooks):
  - `contract(id)` is the authored JSON of an industry. It is shared, so `structuredClone` it before changing anything.
  - `educationWithExtensions()` returns a fresh Education with the learner, gate, warden, sources and surveillance extensions and the demo data. It is a subset of `registry.ts`, so pinned counts stay stable.
  - `eachPage(data, { variants: "with" | "instead" | "none" })` walks every page with `{ role, type, name, tab, page, variant }`.
  - `INDUSTRY_IDS` lists the four reference industries.
- For the full built data (demo volume, derived industries), load `src/domain/contracts/registry.ts` and use `industries` and `getPage`.
- What a feature test covers: validation (good and bad input, CSV header and duplicate cases), scope (an unknown scope sees nothing), determinism (the same input gives the same rows), and that edits keep source identity and status. `tests/learner-setup.test.cjs` and `tests/media-explorer.test.cjs` are good models.
- `tests/portraits.test.cjs` fails when `portraitAssignments.json` is stale or a name isn't recognised. That is a signal to run `npm run portraits:assign`, not a test to loosen.

## Browser checks (`scripts/verify-*.cjs`)

They need a running app. Start `npm run web` (port 8081), or `npm run build:web` and then `npm run preview` (port 8082), and set `VIZENTA_QA_URL` to match. The default is `http://localhost:8083`. `verify-pages` and `verify-refresh` serve a built `dist-pages`/`dist` themselves through `scripts/lib/static-server.cjs`. Playwright drives the installed Google Chrome (`channel: "chrome"`).

Every check is built on `scripts/lib/qa.cjs`:

```js
// Checks <feature>: what it covers, in one or two lines.
//
//   npm run test:<feature>
const assert = require("node:assert/strict");
const { PHONE, main, open, rows, noOverflow, qaDir, route } = require("./lib/qa.cjs");

main(async (browser) => {
  const out = qaDir("<feature>");
  const { page, button, errors } = await open(browser, {
    url: route({ type: "product", name: "Gate", tab: "In/Out" }),
  });
  await rows(page).first().click(); // opens the record detail
  await button("Back to records").waitFor();
  await page.screenshot({ path: `${out}/desktop.png` });
  await page.setViewportSize(PHONE);
  assert.ok(await noOverflow(page));
  assert.deepEqual(errors, []);
  console.log("<feature>: … passed.");
});
```

- `open(browser, options)` creates a context and page and gets past the login screen. Options: `url`, `viewport` (`DESKTOP` 1512×982 by default, or `PHONE` 390×844), `reducedMotion` (`"reduce"` by default; the login code step needs it), `state` (seed localStorage with `demoState({ industry, role, scope, theme })`), `login` (`"explore"` by default, `"password"`, or `false` to stay on the login screen), `fillRetries` (the dev server can reset the login form right after it mounts), and `timeout`/`loadTimeout`. It returns `{ context, page, errors, button }`; this `button(name)` finds visible buttons only.
- Locators: `button(scope, name, { visible })`, `tab`, `field` (by label), `records(page)` (the visible `records-table`), `rows(page)` (its "Open …" buttons), `dialog(page)` (the top-most open dialog).
- Actions: `fillForm(scope, fields)`, `rowAction(page, title, action)`, `uploadCsv(page, name, csv)`, `downloadText(page, trigger)`, `seed(page, state)` (applies on the next load), `enter(page, …)`, `waitForLogin(page)`.
- Checks and output: `noOverflow(page, { vertical })`, `imagesPainted(...)`, `watch(page, errors, { consoleErrors, responses })`, `qaDir(name)` (creates `qa/<name>/`), `shooter`, `writeResults(file, checks, runtimeErrors)`, `slug`, `scopeOf(industry, role)`.
- Expo Router keeps earlier screens mounted but hidden. Any lookup of your own needs `.filter({ visible: true })`, or it matches text on a hidden screen.
- Cover the desktop, phone and dark layouts, check `errors` is empty, and exit non-zero on failure (`main` does that for thrown errors). Add a `test:<feature>` entry to package.json.
- Output goes to `qa/<feature>/`, which is gitignored. Never commit screenshots.

## Scratch checks

For a one-off sweep, such as screenshots of every page after an app-wide change, write the script in your scratchpad rather than in `scripts/`, and still require `qa.cjs` by its absolute path. Walk the roles and tabs from the data (`industries[id].core.roles`, `industry.pages[role]`) instead of hard-coding the list.

## Generators

- `node scripts/import-contracts.cjs` (`npm run contracts:import`) regenerates `src/domain/contracts/data/*.json` from the reference development package.
- `npm run portraits:assign` (`scripts/assign-demo-portraits.cjs`; `--check` only reports) writes `portraitAssignments.json` and `src/shared/ui/portraitImages.ts`. Its output is deterministic.
- `node scripts/prepare-demo-portraits.cjs [--download]` rebuilds the portrait pool and credits from `scripts/portraits/*.json`.
- `prepare-demo-captures.cjs`, `prepare-demo-video.cjs` and `prepare-media-frames.cjs` take the ffmpeg executable as their first argument and run it through `scripts/lib/ffmpeg.cjs`. ffmpeg is usually not on PATH. The Python `imageio_ffmpeg` package ships a full build under `site-packages/imageio_ffmpeg/binaries/`.
- `npm run data:fingerprint` hashes the built data. Run it before and after any domain refactor; the hashes must match.
