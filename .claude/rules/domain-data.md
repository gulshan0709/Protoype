---
paths:
  - "src/domain/**"
  - "scripts/import-contracts.cjs"
  - "scripts/data-fingerprint.cjs"
---

# Contracts, demo data and setup models

## The page contract

Types are in `src/domain/contracts/types.ts`. An `Industry` has `core` (`roles`, a `Persona` per role with `home`, `scopes`, `products` and `organization`; `productFamilies`; `productTabs`) and `pages[role][type][name][tab]`, where `type` is `"org"` or `"product"`.

A `PageContract` holds `id`, `heading`, `description`, `detailType`, `metrics`, `columns`, `filters`, `records`, `sidePanels`, `sources`, `states`, and optionally `primaryAction`, `banner`, `window` and `variants` (Retail's `store`/`warehouse`). A `DataRecord` holds `id`, `type`, `cells` keyed by column id, `state` (`label` + `tone`), `action`, `scope` (a list of scope names) and `detail` (`title`, `eyebrow`, `summary`, `facts`, `sections`, `timeline`, `permittedActions`). Setup records also carry `setup` and `setupKind`.

Page ids repeat across industries and roles. Key anything per page with industry and role too, as `setupStoreKey(workspace, pageId)` does.

## How an industry is built (`registry.ts`)

`industries` is an object of lazy getters. Reading `industries.education` runs `educationIndustry()` once. The order inside that function matters:

1. `corpora.education()` loads the imported JSON.
2. The extensions add pages: `customerAdminLearners`, `gateAttendance`, `wardenProduct`, `sourcesAndSetup`, `surveillanceUsers`.
3. `populateDemoData` fills the cross-linked setup data (camera connections, shifts, wardens and hostels, rosters, recognitions), and `populateMediaDemo` attaches profile images, captures and recordings. Then `moveSurveillanceToShield` and `mediaExplorer` run.
4. `realisticContacts` replaces placeholder emails, phones, IPs and copied wording.
5. The learner pages are filled up front, because People & Access reads them directly.
6. `vizentaAdminClasses` runs last, so Vizenta Admin copies the Customer Admin pages after they are filled.

Corporate applies its authored rows (`corporateDemo.ts`, `corporate/rows-*.json`) and derives Healthcare. Manufacturing derives Construction. Each derived industry is built in the same call as its source.

`getPage(workspace, location)` picks the variant for the scope and calls `withDemoVolume` on first open. `getBranch` hides products the role may not see.

## Adding a page, tab or product

- Don't edit `data/*.json`. `npm run contracts:import` regenerates it from the reference package, and it must stay minified.
- Write a `<thing>Extension.ts` that exports a function taking the `Industry` (or `industry.pages`) and changing it in place. Use `pageBuilders.ts`: `insertTab` to put a tab in order, `syncProductTabs` so the navigation lists it, `textColumns`, `pageStates` for the empty and error texts, `placeholderMetrics` for counted header metrics, and `EDUCATION_TENANT_SCOPE` / `acrossCampuses` for scopes.
- Make it idempotent (return early if the page already exists), like `customerAdminLearners`.
- Call it from the industry builder in `registry.ts`, at the point in the order above where its inputs exist.
- If the setup tests need it, add it to `educationWithExtensions()` in `tests/helpers.cjs` too. That helper is a subset of the registry, so the expected counts in the tests stay fixed.

## Scope

- `scopedRecords(page, scope)` keeps records whose `scope` includes the current scope. A record with no scope is denied, never treated as global.
- `AGGREGATE_SCOPES` are "Across campuses" and "All customers". A new record created in an aggregate view needs a concrete place, and `useSetupScope().recordScope()` adds the aggregate scope too, so the record is listed in both.
- An unknown scope must return nothing. Every new generator or store (the media bucket, capture history, setup stores) follows the same rule, and its test covers the denial.

## Demo volume (`demoVolume.ts`)

The reference pages ship 3 to 9 rows. `withDemoVolume` derives 24 to 30 rows from the authored ones, with consistent renames (people keep their gender and naming style; Education uses Indian names), IDs, room, lane and dock numbers, counts, times (scheduled windows move in 30-minute steps), percentages, and scopes spread across the persona's places. Healthy templates are weighted up, so exceptions stay the minority.

- To change a row count, edit `targetRows(tab, authored)`. Structural lists (the `structural` regex: campuses, plants, hostels…) stay as authored, and catalog tabs (the `catalog` regex: reports, policies, rules…) gain at most 2 rows.
- To leave a page as authored, add its id to the `linked` set. The set covers Education's cross-linked setup pages: wardens and hostels, camera setup, surveillance users, shifts.
- Corporate is skipped; its rows are authored in full in `corporate/rows-*.json`. Edit those files directly, because the generators that wrote them no longer exist.
- A page copied from an already-filled page must be marked with `keepDemoVolume(page)`, as `classExtension.ts` does, or it gets filled a second time.
- Filterable codes (policy versions, scopes) never change, and KPIs are never recalculated.
- After changing generated names, run `npm run portraits:assign`.

## Determinism

- Seed everything from the record or person: `seededRandom(key)`, `unitHash(key)`, `fnv1a(key)` from `common/hash.ts`. Pass `fmix32` over hashes of keys that differ only at the end.
- Build dates from `DEMO_SNAPSHOT` (Tue 15 Sep 2026 09:45) with `addDays`, `hhmm` and `minutesOf`. A capture time after 09:45 belongs to the day before.
- The generators pick names from the pools in `common/names.ts` by index. Any change to a pool, including adding a name, can rename generated people across the app. Afterwards run `npm run portraits:assign` and check the tests that pin names.

## Setup models (`src/domain/<area>/setup.ts`)

Each setup flow has the same shape. Learners (`learners/setup.ts`) is the model to follow:

- `emptyX()` returns the form's initial value, and the `LABELS`, `REQUIRED` and column constants describe the form.
- `validateX(form)` returns `{ field: message }` for the form and the CSV upload, using the rules in `common/validation.ts`.
- `checkXUpload(table, existing)` wraps `readUploadTable` and marks each row `Valid`, `Invalid`, `Duplicate` or `Existing`.
- `xRecord(page, form, scope, actor, source, previous?)` builds the `DataRecord`: `sessionId()` for new rows, `cellsFor(page, …)` for cells in column order, and `editSourceRecord` when editing a source row. That last one keeps the status, measurements and timeline, and adds a `sessionEvent`.
- `xFromRecord(record)` turns a record back into the form.
- `xSetupEnabled(workspace, pageId)` names the exact industry, role and page ids where setup is allowed.

Keep these modules free of React and React Native imports. `src/domain/lock/policy.ts` does the same for app-lock rules.

## Refactoring safely

Run `npm run data:fingerprint` before and after any refactor. It hashes every industry after import, and again after `getPage` has opened every tab for every role and scope. Both hashes must be unchanged. For a change that is meant to alter data, say which pages changed and why, and update the tests that pin counts.
