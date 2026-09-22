# Vizenta AI

A standalone, universal customer UI for **Education, Corporate, Retail & Warehouse, and Manufacturing**. One Expo / React Native application replaces the micro-frontend composition. The original three reference folders remain unchanged.

## Open the app

The built preview is served at **http://localhost:8082** while the preview process is running.

```powershell
git clone https://github.com/RealcoderZ/vizenta-ui.git
cd vizenta-ui
npm ci
npm run web
```

For the production web bundle:

```powershell
npm run build:web
npm run preview
```

Use Node 22.13+ (Node 24 was used for verification). Web hosting must serve `dist/index.html` as the SPA fallback for navigation URLs.

## Login and sign-up

Across the app, filled buttons use white text and icons: deeper cyan for primary and selected actions, navy for secondary actions, teal for exports, and purple for assistant actions. Shared action tokens cover hover, pressed, and disabled states in both light and dark themes; text links retain their cyan treatment.

Login and sign-up preserve the fields and flows from `vizenta-ai-ui-main` in a compact navy-and-white layout. Primary actions use the workspace theme's cyan; Google and Microsoft sign-in are removed. All registration fields remain visible in the initial form, with paired password fields on wider screens and scrolling on small displays. Open `/login`, `/register`, or `/forgot-password` directly to review them. Sign-up and recovery use the explicit demo verification code `123456`; they do not send messages, create real accounts, or store passwords. Every fresh launch or reload opens the login screen, including when an older saved session had Remember me enabled. Workspace preferences and activity remain saved; the active session is kept in memory only. Run `npm run test:auth` against the preview to check these flows.

The auth layout takes its visual structure from `testing/expo-app`: a full-height surveillance photograph with illustrative overlays beside a centered, branded form. The split begins at 890px; phone layouts show the photograph above the visible credentials, fading into the form. Vizenta's navy/cyan palette, white button labels, and existing fields remain in place. The login uses a fixed viewport with no scrolling in either pane; image height, spacing and landscape fields adapt to available height. Registration and recovery retain scrolling for longer forms. Run `node scripts/verify-login-fit.cjs` to check eleven viewport sizes, including the split breakpoint and validation errors.

The login slideshow has four bundled industry images: Corporate, Education (seated students with all eight visible students marked), Retail, and Warehouse & Manufacturing. The logo appears on the photograph. Desktop has clickable selectors and pause/resume; selecting a slide holds it. Mobile below 890px has no slideshow buttons and rotates automatically. Images crossfade every four seconds after loading; rotation pauses in the background and respects reduced motion. Desktop also pauses on hover or keyboard focus. Changing slides preserves the form. Run `npm run test:showcase` to verify this behavior. Final image paths and built-in image-generation prompts are recorded in [assets/auth/use-case-artwork.md](assets/auth/use-case-artwork.md).

## Motion

The app follows the testing reference's motion approach: a branded startup reveal, short page and auth-step entrances, and animated dialog panels. System reduced-motion preferences disable the movement. Navigation does not wait for animations, and form state is preserved. See [shared motion](src/shared/motion/README.md); run `npm run test:motion` for launch, navigation, dialog, and accessibility checks.

## Native

```powershell
npm start
npm run android
```

Connect a compatible Expo Go / development client, or launch an Android emulator. On a Mac with Xcode, use `npm run ios`. This project uses Expo SDK 57 and React Native 0.86, matching `testing/expo-app`; see the [versioned Expo reference](https://docs.expo.dev/versions/v57.0.0/).

```powershell
npm run build:native
```

This command exports the iOS and Android JavaScript/Hermes bundles. It does **not** create signed APK/IPA packages or establish native device runtime coverage. Store credentials and signing are not configured. The new placeholder application identifier is `ai.vizenta.workspace`.

## What is implemented

- Four industry workspaces; all 29 supplied roles; 752 base role/page contracts with Store/Warehouse variants. The supplied 894 review configurations can be traversed through the same application shell.
- Persona-specific Organization navigation and entitled Presence, Safety and Insights products. Store location managers do not receive Guard navigation.
- Desktop sidebar, collapsible navigation, tablet/phone bottom navigation, phone record cards, responsive tables and full record detail pages.
- Industry and demo-role switching, assigned-scope selection, native/web history navigation and direct links to tabs, records and KPI details.
- Search across entitled, scoped pages; in-page search, status and contract filters, table sorting and pagination.
- Record facts, source-impact panels, source history, permitted actions, required notes, owner entry for assignment and local audit history.
- Local sample lifecycle transitions for acknowledge, assign, escalate, resolve and visitor checkout. Completed workflows hide further transition controls. Unavailable source states stay unavailable.
- CSV export on web. Native export opens the platform share sheet with CSV text.
- Scoped, deterministic assistant summaries and source answers; notification review; read state; settings; light/dark/system appearance; demo login/sign-out.
- Explicit populated, empty/filter-empty, degraded, unavailable, not-configured, unauthorized and insufficient-history review states under Settings → Review tools.
- Preferences, workspace, review notes, lifecycle history and notification read state persist on the current device using AsyncStorage.

## Try an end-to-end flow

1. Open the Education customer workspace and select **North Campus** in the readiness table.
2. Review its facts and source context. Choose **Open record**, enter a review note, and save it.
3. Reload: the local activity trail is retained. Return to records and export the filtered view.
4. Open the organization selector and try a security role to explore Shield lifecycle actions, or a Faculty role to see academic-only access.
5. Switch industries to inspect the distinct Corporate, Retail/Warehouse and Manufacturing schemas. For Retail's Location Manager, switch between Store 018 and Warehouse DC-2.
6. Resize the browser to a phone width, or launch the native bundle. Use Explore to navigate all entitled products.

## Architecture and references

See [ARCHITECTURE.md](ARCHITECTURE.md) for module boundaries, integration seams, and the migration mapping.

`npm run contracts:import` reimports the provided development package into static JSON. It evaluates only the local reference data modules at build time. The shipped app uses React Native components and does not embed the HTML prototypes, use iframes/WebViews, or load federation remotes.

The reference datasets remain separate by industry. Their stable record IDs, role-specific columns, scope tags, details, sources, action declarations and calculation context are preserved.

## Checks

```powershell
npm run typecheck
npm test
npm run build:web
npm run build:native
# With npm run preview running in another terminal:
npm run test:ui
npm run test:coverage
```

Browser checks use installed Google Chrome through Playwright. Outputs and screenshots are in [qa/](qa/). `VIZENTA_QA_URL` can point the checks at a different preview origin.

## Service integration boundary

This is an interactive frontend with fictional reference data and device-local persistence. No production authentication, backend, real camera feed, payroll connector, external notification delivery, or generative AI service is connected. Demo roles are deliberately selectable; a production identity service must supply access and enforce authorization server-side.

Only the implemented local lifecycle actions change sample workflow state. Configuration, policy, operational and other actions collect auditable review requests; they do not claim to change a live service. Authored aggregate KPIs remain source snapshots and are not recalculated from three-row samples or local actions. The assistant explicitly identifies its sample-data scope.

The build currently bundles the complete review fixture corpus to make every reference flow available offline. Replace it with scoped, paginated API responses before production deployment; the complete fixture bundle is not a production data-loading strategy.
