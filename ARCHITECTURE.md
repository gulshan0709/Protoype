# Vizenta AI application architecture

## Single universal application

The technical baseline is `../testing/expo-app`: Expo SDK 57, React Native 0.86, React 19, Expo Router, native safe areas, local Inter fonts, shared semantic themes, feature modules and a responsive application shell. Vizenta is a new application; it does not depend on the sports application's source or runtime.

The old `skillatracker-ui-demo` exposes Webpack Module Federation routes, a Redux slice and reducers. Vizenta has one package, one router, one application provider and one build per platform. There is no `remoteEntry.js`, federated shared state or remote module resolution.

“Monolithic” here describes the frontend application. No backend services were supplied or consolidated in this UI task.

## Ownership

| Path | Owns |
| --- | --- |
| `app/` | Thin Expo Router adapters; one workspace route with URL parameters for destination, tab, record and KPI |
| `src/application/AppProvider.tsx` | Device persistence, workspace identity, preferences, audit history, notifications, export adapter and theme wiring |
| `src/features/workspace/` | Workspace composition, role navigation, list/detail/KPI flows, assistant, login, settings and action dialogs |
| `src/domain/contracts/` | Typed functional contracts, industry registries, scope rules, filtering, CSV formatting and local lifecycle reducers |
| `src/domain/common/` | Pure helpers the domain modules share: hashing, text, time, validation, CSV and bulk-upload reading |
| `src/domain/{cameras,classes,learners,surveillance,residence,sources,gate,media}/` | Setup models, validation and record builders for each setup flow (no React Native imports, so node tests load them) |
| `src/features/workspace/components/setup/` | What the setup dialogs share (scope picker, record menu, delete confirmation, CSV bulk upload, camera connection fields) and the Sources & Setup views |
| `src/shared/theme/` | Light/dark semantic color roles and bundled typography references |
| `src/shared/ui/` | Reusable controls (buttons, icon buttons, fields, the form kit in `Form.tsx`, selects, segmented controls, chips, tab bars, pagers), vector icon system, accessible dialog stack, badges, cards and empty states |
| `scripts/import-contracts.cjs` | Reproducible migration from the local functional specification |
| `tests/` and `scripts/verify-*.cjs` | Contract invariants, scope/lifecycle tests and browser validation |

Dependencies flow from application/features to domain/shared. Shared controls do not depend on business features. The industry corpora retain their different schemas and decisions while sharing presentation patterns.

## Reference mapping

| Legacy capability | New placement |
| --- | --- |
| Surveillance movement and gate attendance | Presence → Gate |
| Class structure, class and lab attendance, faculty/coordinator views | Education → Class & Lab Attendance plus persona-specific Academic Structure |
| Hostels, wardens, resident movement and leave | Education → Hostel, Gate and residence Organization pages |
| User administration and source/camera setup | Entitled Organization → People & Access / Sources & Setup or industry equivalent |
| Camera Media Explorer (`/media_explorer`) | Education → Vizenta Admin → Organization → Media Explorer |
| Incident evidence and exception follow-up | Safety → Shield, with source context retained in the originating product |
| Patrol, post coverage and handover | Safety → Guard |
| Visitor lifecycle | Safety → Visitor |
| Operational analytics and permitted questions | Insights → AI Analytics and the scoped Ask Vizenta surface |
| Corporate / warehouse / manufacturing periodic and continuous presence | Presence → Zones |
| Governed workforce outcomes | Workforce Attendance and its HRMS/payroll contracts |

Production access must resolve tenant, role, entitlement, scope and permitted field/action policy before loading data. The legacy hook's “missing role means unrestricted” behavior is not copied. Unknown scopes return no records; unauthorized destinations render an explicit access state. A platform admin receives metadata and deployment surfaces, not customer product access by default.

## Data contracts

The import script evaluates the supplied local data registries in isolated Node VM contexts, then serializes each industry independently. It never evaluates the original app renderer in the client. Reimporting produces the same records and stable IDs.

The page response model includes heading, purpose, metrics, filters, keyed columns, scoped typed records, side panels, source health, states and declared actions. Scope-specific metric values are honored where supplied. Otherwise a KPI is an authored page-wide reference measure, not a sum of sample rows. Store/Warehouse variants switch on the location manager's assigned scope.

The frontend retains aggregate context panels as authored. They are not treated as separate source records for mutation or export. Export uses exactly the currently filtered records and escapes CSV quoting and spreadsheet-formula prefixes.

### Loading and shared domain modules

`src/domain/contracts/registry.ts` builds each industry the first time it is read. `data/corpora.cjs` evaluates a corpus only when it is first loaded, so a session that stays in one industry never parses the others. Construction is derived from Manufacturing, and Healthcare from Corporate after its authored rows. A derived industry is built together with its source, before any page of the source is expanded, so the result matches building all six at start. `derivedIndustries.ts` rewrites only the role pages it keeps and remembers each distinct string's replacement.

Helpers shared across modules live in `src/domain/common/`: `hash.ts` (the deterministic FNV-1a hashing every demo generator uses), `text.ts`, `time.ts` (the Sep 15 2026 09:45 demo snapshot and calendar helpers), `validation.ts`, `csv.ts` (reading and formula-guarded writing) and `upload.ts` (the bulk-upload reader behind the learner, surveillance-user and class uploads). `contracts/sessionRecords.ts` builds the records the setup forms create or edit, and `contracts/pageBuilders.ts` holds what the product extensions share. These modules are plain TypeScript without React Native imports, so the node tests load them through `scripts/lib/ts-hooks.cjs`.

A refactor of these modules must leave the data unchanged. `npm run data:fingerprint` hashes every industry after import, and again after every tab has been opened for every role and scope. Both hashes must be the same before and after the change.

## Local state and workflow semantics

AsyncStorage stores a versioned demo session, workspace, theme, display name, local audit and read notification IDs. Hydration finishes before rendering workspace data. Writes are kept local; storage failures report that a change is session-only.

Audit entries are bounded and keyed by industry, role, scope, page and record. Local lifecycle projection uses only those matching keys. An action must exist in the record's permitted action list and the record must be inside the current scope. Resolve completes the demo workflow and hides further lifecycle controls. Source-unavailable records never become resolved or safe through a local transition. Original source status is retained and disclosed on changed details.

For a production API adapter, replace local projection with version-checked responses and server-enforced actions, retaining `recordVersion`, idempotency keys, policy version, evidence permissions and audit lineage. Do not accept the demo role picker or localStorage as authority.

## Responsive behavior and accessibility

- At 1024 px and above: 232 px collapsible navy sidebar, shared page header, responsive content area.
- Below 1024 px: bottom navigation and an Explore dialog containing all entitled destinations.
- Below 768 px: record cards, compact header and bottom-sheet dialogs.
- Above 1050 px: a 310 px supporting rail; below that it stacks after the main content.
- Native safe areas are handled by SafeAreaProvider. There is no simulated device chrome.
- Shared dialogs handle Android Back, backdrop dismissal, web Escape, initial focus, Tab containment and focus return. Nested selects dismiss only the top dialog.
- Every icon-only action has an accessible label. Tabs expose selection state. Buttons and fields use native accessibility roles and labels.

## Integration work remaining

1. Supply authenticated identity/tenant bootstrap and access policy responses; remove demo-role selection in production.
2. Replace the static corpus with cached, scoped, paginated API queries and source-health events.
3. Implement each operational mutation in its owning service with revision checks and authoritative audit.
4. Integrate camera/evidence delivery using permissioned references and expiring links.
5. Connect source-backed AI answers with source timestamps, allowed fields, citations and unavailable-input disclosure.
6. Connect HRMS/payroll and outbound notifications, and add native file export if CSV attachments are required.
7. Configure real package identifiers, signing, environments and CI store builds; execute device-level Android/iOS QA.
