# Vizenta AI

Claude Code loads this file in every session in this repository. Topic rules in [.claude/rules/](.claude/rules/) load when you work on the files they cover:

- [domain-data.md](.claude/rules/domain-data.md): contracts, registry, extensions, demo data and setup models
- [ui.md](.claude/rules/ui.md): screens, shared UI kit, forms, setup dialogs, theme and render performance
- [testing-qa.md](.claude/rules/testing-qa.md): node tests and Playwright checks
- [people-media.md](.claude/rules/people-media.md): portraits, initials, captures, the person gallery and Media Explorer
- [native-build.md](.claude/rules/native-build.md): Android APK builds on Windows (read it before any native build)

[README.md](README.md) describes every feature and its behaviour. [ARCHITECTURE.md](ARCHITECTURE.md) covers module ownership, scope and data rules, and the production integration seams. When behaviour changes, update README. When structure or a working rule changes, update ARCHITECTURE, this file, or the matching rule file.

## What this is

A frontend-only demo of the Vizenta customer workspace: one universal Expo app (web, Android, iOS) that replaces the `skillatracker-ui-demo` micro-frontend. There is no backend. All data is fictional static JSON bundled with the app. Setup edits (classes, learners, cameras, users, wardens, sources) stay in memory and reset on reload. Preferences, audit and notification read state persist in AsyncStorage.

- **Industries:** Education, Corporate, Retail & Warehouse and Manufacturing come from the reference package. Construction and Healthcare are derived from Manufacturing and Corporate in `src/domain/contracts/derivedIndustries.ts`. The README's opening line still says four.
- **Roles:** 7 or 8 per industry, always including `vizenta_admin` and `customer_admin`. A page is addressed as industry → role → `org` or `product` → name → tab. Retail's location manager also gets Store and Warehouse variants of a page.
- **Stack:** Expo SDK 57, React Native 0.86, React 19.2, Expo Router, Reanimated 4, react-native-web, TypeScript 6 (strict), Playwright, and Prettier with default settings. Node 22.13 or later.
- **Demo sign-in:** every fresh load opens the login screen. **Explore workspace** enters directly. Sign-up and recovery use the code `123456`.

## Commands

| Task | Command |
| --- | --- |
| Dev server (web, port 8081) | `npm run web` |
| Type check (about 6 s) | `npm run typecheck` |
| Node tests (about 7 s, every `tests/*.test.cjs`) | `npm test` |
| One test file | `node --require ./scripts/lib/ts-hooks.cjs --test tests/<name>.test.cjs` |
| Browser check for one feature | `npm run test:<feature>` (the app must be running, see below) |
| Show that a data refactor changes nothing | `npm run data:fingerprint`, before and after |
| Reassign portraits after demo data changes | `npm run portraits:assign` |
| Format | `npm run format` |
| Web export, then serve it on port 8082 | `npm run build:web`, then `npm run preview` |
| GitHub Pages build | `npm run build:pages` |

Browser checks default to `http://localhost:8083`. To test the running app, set `VIZENTA_QA_URL=http://localhost:8081` for the dev server or `http://localhost:8082` for the preview. Screenshots and results go to `qa/`, which is gitignored.

After a change, run the quick checks: `npm run typecheck` and `npm test`. Web exports, APK builds and emulator runs take minutes, so start them only when asked.

## Where things live

```
app/                     thin Expo Router routes; index.tsx freezes hidden screens (react-freeze)
src/application/         AppProvider (persistence, theme, audit), ToastContext + useToast, AppFrame,
                         app lock, session stores (classSetupStore, surveillanceSettings)
src/features/workspace/  WorkspaceScreen (login gate + workspace) and its extracted parts:
                         WorkspaceHeader/Chrome/Dialogs, MetricDetail, SetupActions, PageSections, pageSetup.ts
  components/            Records, RecordDetail, PersonChip, media views, setup dialogs and forms
  components/setup/      shared setup-dialog parts, CsvBulkUpload, the Sources & Setup views
src/features/lock/       app lock screen, PIN pad, lock settings
src/domain/contracts/    types, registry (lazy), *Extension.ts, demoData, demoVolume, corporateDemo,
                         derivedIndustries, priority, logic, lifecycle, sessionRecords, pageBuilders
  data/                  imported corpora JSON (minified; written by contracts:import) + corpora.cjs loader
  corporate/             authored Corporate rows (rows-1..4.json)
src/domain/common/       pure helpers: hash, text, time, validation, csv, upload, names
src/domain/<area>/       setup model for each flow: cameras, classes, learners, surveillance,
                         residence, sources, gate, media, lock
src/shared/ui/           primitives (Txt, Button, IconButton, Card, Field, Pager…), the Form kit,
                         Dialog, Select, SegmentedControl, Chip/ChipSelect, TabBar, Icon
src/shared/theme/        light/dark semantic tokens and three accent styles
src/shared/motion/       MotionProvider, MotionView, useEntrance, motion tokens
src/shared/people/       person-name detection, portrait pool and assignments, avatar gradients
tests/                   node --test files and helpers.cjs
scripts/                 verify-*.cjs (Playwright, built on lib/qa.cjs) and the import, prepare and assign generators
```

## Rules to keep

These are deliberate product decisions. Keep them unless the person you are working with changes them.

- **Scope is strict.** Data is scoped by industry, role and assigned scope. An unknown scope returns no records, and a page the role may not see renders an explicit access state. Never bring back the legacy rule that a missing role means unrestricted.
- **KPIs are authored snapshots.** Never recalculate a reference KPI from the sample rows or from local actions. Setup and gate pages are the exception: `pageMetrics` in `src/features/workspace/pageSetup.ts` counts their rows in scope, including this session's edits.
- **Everything is deterministic.** Generated rows, portraits, captures and media come from seeded hashes (`src/domain/common/hash.ts`), never from `Math.random()` or the current time. That way reloads, deep links and audit keys see the same data. The demo clock is `DEMO_SNAPSHOT` (Tue 15 Sep 2026 09:45). There are two exceptions: `sessionId()` for records added during a session, and Media Explorer, which lists frames up to the current time.
- **Session edits stay in the session.** They survive navigation and reset on reload. Don't persist them.
- **Login on every load.** Remember me does not skip it. Google and Microsoft sign-in were removed on purpose.
- **Button colours.** Filled buttons have white text and icons. Deeper cyan is for primary and selected actions, navy for secondary, teal for export, and purple for the assistant. Text links stay cyan. Use the theme's `action*` tokens instead of hard-coded colours.
- **Breakpoints.** 1024 px (sidebar at or above, bottom navigation below), 768 px (record cards below), 890 px (auth split), 1050 px (side rail above).
- **Domain code stays pure.** Nothing under `src/domain/` imports React or React Native, so node tests can load it.
- **Reference folders are read-only.** `../testing/expo-app` (the visual and technical baseline) and `../skillatracker-ui-demo` (the legacy feature reference) are there to read. Never edit them.

## Reuse before you write

The codebase was deduplicated on 2026-09-29. Before you write a helper or a component, look here first:

| Need | Use |
| --- | --- |
| Hashing, seeded random | `src/domain/common/hash.ts` (`fnv1a`, `fmix32`, `unitHash`, `seededRandom`) |
| Text, names, times, dates | `common/text.ts` (`str`, `fullName`), `common/time.ts` (`DEMO_SNAPSHOT`, `hhmm`, `minutesOf`, `addDays`), `common/names.ts` (the demo name pools) |
| Field validation | `common/validation.ts` (`isEmail`, `isPhone`, `isRealDate`, `isRealDateTime`, `TIME`) |
| CSV reading and writing, bulk upload | `common/csv.ts` (`parseCsv`, `toCsv` with the formula guard), `common/upload.ts` (`readUploadTable`) |
| Records a setup form creates or edits | `contracts/sessionRecords.ts` (`sessionId`, `cellsFor`, `sessionEvent`, `editSourceRecord`) |
| Adding pages or tabs to the contracts | `contracts/pageBuilders.ts` (`insertTab`, `textColumns`, `pageStates`, `placeholderMetrics`, `syncProductTabs`) |
| Form layout and state | `shared/ui/Form.tsx` (`FormGrid`, `FormCell`, `FormLabel`, `ErrorText`, `SelectField`, `FormActions`…) with `useFormState` |
| Toggles, chips, tabs, paging | `SegmentedControl`, `Chip`/`ChipSelect`, `TabBar`, `usePaged` + `Pager` |
| Setup dialogs | `components/setup/useSetupScope` and `SetupDialogParts` (`ScopePicker`, `RecordMenu`, `DeleteConfirm`, `SessionNotice`); `CsvBulkUpload` for CSV |
| A person's name, photo or initials | `PersonChip` / `PersonAvatar` in `components/PersonChip.tsx` |
| Capture and face views | `components/mediaParts.tsx` |
| Session setup state | `application/classSetupStore.ts` (`setupStoreKey`, `storeSetupRecords`, `useSetupState`) |
| Node test loaders | `tests/helpers.cjs` (`contract`, `educationWithExtensions`, `eachPage`) |
| Browser checks | `scripts/lib/qa.cjs` (`main`, `open`, `button`, `rows`, `dialog`, `fillForm`, `noOverflow`…) |

## Performance rules

- **Load lazily.** `registry.ts` builds an industry the first time it is read, and `data/corpora.cjs` evaluates that industry's JSON only then. Start-up therefore parses only the industry on screen (about 0.2 s instead of 3 s). Don't add module-level code that reads every industry.
- **Demo volume changes pages in place.** `withDemoVolume` fills a page the first time `getPage` opens it. A derived industry must be built together with its source, before any source page is filled. The builders in `registry.ts` already do this, so add new derivations there.
- **Hidden screens are frozen.** Every navigation pushes a route, and on web the earlier screens stay mounted. `app/index.tsx` freezes them so only the visible one re-renders. Keep screen state inside the route so Back restores it.
- **Keep fast-changing state local.** The toast has its own context, and the search dialog and Records search own their query text. Don't lift typing, hover or animation state into `AppProvider` or `WorkspaceScreen`, or every keystroke re-renders the whole workspace.
- **Keep memoised props stable.** `Navigation`, `Metrics`, `ContextPanels`, `WorkspaceHeader`, `FrameTile` and `Icon` are `memo` components. Pass them `useMemo`/`useCallback` values, because a new object on every render defeats the memo.
- **Page long lists.** Capture history loads 3 days at a time, and Media Explorer loads 250 frames at a time and mounts only the rows near the viewport. New galleries and long lists must page the same way.
- **Load heavy media on demand.** A video player is created only after Play. Avatars of 96 dp or less use the 256 px thumbnails.
- **Show that data refactors change nothing.** Run `npm run data:fingerprint` before and after any refactor under `src/domain/`. Both hashes must match; if they don't, the refactor changed the data.

## Definition of done for a feature

1. The code follows the rules above and reuses the shared pieces.
2. A node test in `tests/<feature>.test.cjs` covers the domain logic: validation, scoping and determinism.
3. A Playwright check in `scripts/verify-<feature>.cjs`, built on `scripts/lib/qa.cjs`, has a `test:<feature>` entry in package.json. It covers the desktop, phone (390 px) and dark layouts, and saves screenshots to `qa/<feature>/`.
4. README.md has a section on the feature: what it does, where it is, and which tests cover it.
5. `npm run typecheck` and `npm test` pass. Say which browser checks you ran and which you did not.

For an app-wide UI change ("everywhere", "on all pages"), check every product and tab for every industry and role. Take screenshots with a scratch Playwright script against the running app. The shared component misses pages whose data has its own shape, such as Warden's "Warden Rao" names, comma-separated lists of people, or setup records with a single `name` field. Name any page you did not check.

## Git and deploy

- The branch is `main`. There are two remotes: `origin` (github.com/gulshan0709/Protoype, spelled that way) and `realcoderz` (github.com/RealcoderZ/vizenta-ui). Teammates work on branches on `realcoderz` that are merged into `main`.
- **Pushing `main` deploys.** `.github/workflows/pages.yml` runs `npm run typecheck`, `npm test` and `npm run build:pages`, then publishes to https://gulshan0709.github.io/Protoype/. Commit and push only when asked. "Both repos" means pushing `main` to both remotes.
- Before every commit, run `git diff --cached --name-only`. The corpora in `src/domain/contracts/data/*.json` must stay minified on one line. Format-on-save once pretty-printed `corporate.json` into a commit without anyone staging it.
- Pushes of about 25 MB or more (image assets) fail against GitHub over HTTPS with `HTTP 408`. Split them into commits of about 8 MB and push each one: `git push <remote> <sha>:refs/heads/main`.
- A commit subject is one descriptive sentence, such as "Move QA script boilerplate into scripts/lib/qa.cjs and fix stale checks", with detail bullets in the body.

## Gotchas

- Expo Router's Stack keeps earlier screens mounted but hidden, so Playwright lookups need `.filter({ visible: true })`. The `qa.cjs` locators already do this.
- RN Web draws a bundled `<Image>` at its intrinsic size unless its style sets `width` and `height` to `"100%"`. `StyleSheet.absoluteFill` alone is not enough.
- Two files whose names differ only in case (`mediaFrames.ts` next to `MediaFrames.tsx`) break `tsc` on Windows (TS1261).
- Regenerate data rather than hand-editing it. `npm run contracts:import` writes `data/*.json`, so page additions belong in the `*Extension.ts` files. The other generated files (`portraitAssignments.json`, `portraitImages.ts`, `framePool.json`, `mediaFrameSources.ts`) come from their generators in `scripts/`.
- `npm test` fails when the portrait assignments are stale, or when the demo data contains a first name the detector doesn't know. Run `npm run portraits:assign`, or add the name to `src/shared/people/personName.ts`.
- Node prints a `MODULE_TYPELESS_PACKAGE_JSON` warning when it loads the `.ts` sources. It is harmless. Don't add `"type": "module"` to package.json, because `app.config.js` and `plugins/*.js` are CommonJS.
