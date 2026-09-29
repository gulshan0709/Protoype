---
paths:
  - "src/shared/people/**"
  - "src/shared/ui/demoPortrait.ts"
  - "src/shared/ui/portraitImages.ts"
  - "src/features/workspace/components/Person*.tsx"
  - "src/features/workspace/components/UserIdentity.tsx"
  - "src/features/workspace/components/RecordMedia.tsx"
  - "src/features/workspace/components/Media*.tsx"
  - "src/features/workspace/components/mediaParts.tsx"
  - "src/features/workspace/components/mediaFrameSources.ts"
  - "src/features/workspace/components/demoCaptures.ts"
  - "src/domain/gate/**"
  - "src/domain/media/**"
  - "src/domain/contracts/{mediaDemo,mediaExtension,detectionDemo,userIdentity}.ts"
  - "assets/profiles/**"
  - "assets/media/**"
  - "scripts/*portrait*.cjs"
  - "scripts/prepare-*.cjs"
  - "scripts/lib/{demo-people,portrait-coloring,ffmpeg}.cjs"
---

# People, portraits and media

The demo should look like a real deployment: every person has one face everywhere, and no page shows the same face twice.

## Who counts as a person

`parsePersonName(text)` in `src/shared/people/personName.ts` treats a text as a person when it has one of these shapes:

- a known first name plus a surname
- an initial plus a surname ("K. Nair"; gender by hash)
- an unlisted first name followed by a known South Asian surname ("Gulshan Kumar"; no gender, so it gets initials)

Organisations, roles, places and shifts stay plain text. `parseTitledPerson` also accepts a role plus a known surname ("Warden Rao"), shown with the surname's initial. `parsePersonName` still rejects those for the portrait scan. Warden rows (`type: "warden"`) are always people.

If demo data gains a first name the detector doesn't know, `tests/portraits.test.cjs` fails. Add the name to the lists in `personName.ts`, or to `src/domain/common/names.ts` when it is a generator pool name.

## Portraits

- **Pool:** 144 Unsplash headshots in `assets/profiles/people/<id>.jpg` (1080×1080), with 256×256 copies in `thumbs/` for avatars of 96 dp or less (`PORTRAIT_THUMB_MAX`). The groups are `sa-w`/`sa-m` 01–48 (South Asian) and `in-w`/`in-m` 01–24 (international). Names from the Indian pools get South Asian portraits. Credits are in `src/shared/people/portraitPool.json` and `assets/profiles/README.md`, and the crops in `scripts/portraits/*.json`.
- **Assignment:** `npm run portraits:assign` scans every page, class session and sample set in all industries. It colours the co-occurrence graph (DSatur, `scripts/lib/portrait-coloring.cjs`), so each name keeps one portrait and no page repeats a face. It writes `src/shared/people/portraitAssignments.json` and `src/shared/ui/portraitImages.ts`. Rerun it after any change to demo data or name pools; the test fails while the file is stale.
- **Lookup:** `portraitSource(name, { image, size })` in `demoPortrait.ts`. An uploaded photo always wins. Only names in `portraitAssignments.json` get a pool portrait. There is no hash-into-pool fallback, and the old `demo-man.png`/`demo-woman.png` must not come back (a test forbids them).

## Initials avatars

Anyone without a photo gets `InitialsAvatar` in `PersonChip.tsx`: people added during the session without an upload, the signed-in user, any other name, and photos that fail to load. It shows white initials (`nameInitials`: "Gulshan Kumar" → GK) on a per-name gradient from `avatarColors.ts`. There are 10 pairs, each contrast-tested for white text in both themes. An empty name shows a silhouette. The login derives the display name from the email (`nameFromEmail`: "gulshan.kumar@…" → "Gulshan Kumar").

The same avatar appears in the header profile button, the Settings preview, the lock screen, the learner, surveillance-user and warden form previews, the hostel form's "Select wardens" chips and the user's own audit-trail entries. A new place that shows a person uses `PersonChip`/`PersonAvatar` too.

## Captures and recordings

- Each person's capture is one of 15 HD stills, picked from their UID (else their name) and matched to the first name's gender. That way a person shows the same still in the table, the preview and the detail. The whole frame is shown with the detection box and label in the classification colour (`detectionDemo.ts`), and table thumbnails crop around the box.
- Recordings are bundled H.264 clips (`assets/media/`). On native, a player is created only after Play. No streaming service is contacted.

## Person gallery (Gate → In/Out)

- Opening a capture on Gate → In/Out opens `PersonGalleryDialog` (`PersonGallery.tsx`): the opened capture large, and the person's other captures grouped by day, with All/In/Out filters and ← → keys on web.
- History comes from the UID (`src/domain/gate/captureHistory.ts`). `captureHistory(record, { before })` returns `{ days, hasMore, next }` a page (`PAGE_DAYS` = 3 calendar days) at a time, back to `RETENTION_DAYS` = 30. It ends with the row's own capture, and a time after the 09:45 snapshot belongs to the day before. Each capture has its own face framing and a low-light tint in the dark hours.
- To enable the gallery on another page, add its `detailType` to `PERSON_GALLERY_TYPES`. Rows that aren't In/Out rows may need their own direction, gate and time parsing in `latestCapture`. Keep new capture views paged the same way.
- Tests: `tests/capture-history.test.cjs`, and `npm run test:person-gallery` in the browser.

## Media Explorer (Education → Vizenta Admin → Organization)

- A port of the legacy Camera Media Explorer (`skillatracker-ui-demo`, route `/media_explorer`). `src/domain/media/explorer.ts` is a deterministic demo bucket: a registry of 11 cameras (Northbridge `org_1042`, Eastgate `org_1088`), the legacy folder layout `processed_img/<org>/<IP+port+channel>/<YYYYMMDD>/<HHMMSS>/`, an activity model per 30-minute slot, frame bursts, and paging (`FRAME_PAGE_SIZE` = 250). Dates cover the last 7 days (`RETENTION_DAYS` = 7), and slots stop at the current time.
- Scope: All customers sees both customers, a customer scope sees only its own folders, and an unknown scope sees nothing. Keep that rule.
- The page contract is in `contracts/mediaExtension.ts`, and the UI is in `MediaExplorer.tsx` and `MediaFrameGrid.tsx`. The grid mounts only the rows near the viewport. The selection lives in the route parameters `org`, `camera`, `date` and `slot`.
- Frames: `node scripts/prepare-media-frames.cjs <ffmpeg>` extracts them from the bundled gate clips and writes `src/domain/media/framePool.json` and `components/mediaFrameSources.ts`. Extend the registry or the pool rather than hand-authoring frames.
- Tests: `tests/media-explorer.test.cjs`, and `npm run test:media-explorer` in the browser.

## ffmpeg

The `prepare-*` scripts take the ffmpeg executable as their first argument. ffmpeg is usually not on PATH. A full build ships with Python's `imageio_ffmpeg` package under `site-packages/imageio_ffmpeg/binaries/ffmpeg-*.exe`.
