---
paths:
  - "app/**"
  - "src/features/**"
  - "src/shared/**"
  - "src/application/**"
---

# Screens, shared UI and render performance

## How the workspace screen works

- `app/index.tsx` is the only workspace route. The location lives in URL parameters (`type`, `name`, `tab`, `record`, `metric`, plus page-specific ones such as Media Explorer's `org`, `camera`, `date` and `slot`), so every view can be deep-linked and Back works.
- Every navigation pushes a route. On web, earlier screens stay mounted and are frozen with `react-freeze`, so state that must survive Back belongs inside the screen, and app-wide state in `AppProvider`.
- `WorkspaceScreen.tsx` is the login gate plus the `Workspace` body. Put new chrome in its extracted parts (`WorkspaceHeader`, `WorkspaceChrome`, `WorkspaceDialogs`, `MetricDetail`, `SetupActions`, `PageSections`) rather than growing the screen file.
- `pageSetup.ts` decides what the current page offers. `pageSetup()` picks the setup dialog, `pageRows()` applies scope, session edits and lifecycle, and `pageMetrics()` counts rows for setup and gate pages.
- App-wide state comes from `useApp()` (workspace, preferences, audit, theme) and `useToast()`. The toast has its own context, so showing a message re-renders only `ToastBanner`.

## Shared UI kit (`src/shared/ui/`)

- `Primitives.tsx`: `Txt`, `Row`, `Card`, `Button` (`variant`: `primary` | `secondary` | `ghost`; `iconOnly` keeps `label` as the accessible name), `IconButton` (`variant`: `outline` | `filled` | `overlay` | `ghost`), `Badge`, `Field`, `EmptyState`, `SectionTitle`, `PanelCard`, `LabeledValue`, `Divider`, `CheckboxBox`, `usePaged` + `Pager`.
- `Dialog.tsx` handles Android Back, backdrop taps, web Escape, initial focus, Tab containment and focus return, and nested dialogs close from the top. Use it for every modal instead of building one.
- `Select.tsx`, `SegmentedControl.tsx`, `Chip.tsx` (`Chip`, `ChipSelect`), `TabBar.tsx`, and `Icon.tsx` (the vector icon set, `BrandMark`, `BrandWordmark`).
- `format.ts` (`humanize`, `formatAuditTime`). `pressable.d.ts` types RN Web's `hovered` in Pressable style callbacks.

## Theme

- Read colours with `const c = useTheme()`. Tone colours come from `toneColors(c, tone)` and mission accents from `missionColor(c, family)`. Fonts come from `font` in `Theme.tsx` (Inter Regular, Medium and Bold).
- Filled actions use the `actionPrimary`, `actionSecondary`, `actionExport` and `actionAssistant` tokens (each with Hover and Pressed variants) with `actionInk` (white) text. Links use `primary` cyan.
- Both light and dark, and all three accent styles (Signature, Cobalt, Teal), must work. The only fixed colours are media backgrounds (`MEDIA_BG`) and the avatar gradients.
- Panels have 12 px corners and buttons 8 px. Statuses are pills. See `src/shared/theme/README.md`.

## Forms

`ClassForm.tsx` is the reference:

```tsx
const { value: form, set, err, submit } = useFormState(
  initial ?? emptyClass(),
  (f) => validateClass(f, kind),
  { reveal: !!initial },
);
<RequiredNote />
<FormGrid>
  <FormCell>
    <Field label="Class name *" value={form.class_name} onChange={set("class_name")} error={err("class_name")} />
  </FormCell>
  <FormCell>
    <SelectField label="Tag" required value={form.Tag} options={CLASS_TAGS} onChange={set("Tag")} error={err("Tag")} />
  </FormCell>
</FormGrid>
<FormActions submitLabel="Add class" onCancel={onCancel} onSubmit={submit(onSave)} />
```

- The rules live in the domain model (`validateX`), never in the component.
- Errors show after the first submit, or at once with `reveal`, so an edit shows what still needs filling in.
- `RequiredNote` prints the "Fields marked * are required." legend. `FormLabel required` and `SelectField required` add the " *".

## Setup dialogs

Every setup dialog takes `SetupDialogProps` (`components/setup/types.ts`) and follows `LearnerSetupDialog.tsx`:

1. `const setup = useSetupScope({ workspace, scopes, target, editing })`. It shows `ScopePicker` when a new record is created in an aggregate scope.
2. On save: `setup.requireScope()`, validate with the domain model, check for duplicates against `rows`, build records with the domain's `xRecord(...)` using `setup.recordScope()`, then call `storeSetupRecords(storeKey, records, editing)` and `onSaved(message)`.
3. Use `RecordMenu` for the row menu, `DeleteConfirm` before deleting (then `storeDeletedRecord`), `SessionNotice` to say that changes last only for the session, and `setupTitle` for the title.
4. CSV upload: `CsvBulkUpload` with the domain's `checkXUpload`, and `usePickedCsv` for the file. Keep derived inputs such as existing UIDs in `useMemo`, so the upload doesn't re-check its file on every render.
5. Register the dialog and its `xSetupEnabled` check in `pageSetup()`.

## People and media in the UI

- Any person's name renders through `PersonChip` / `PersonAvatar` (`components/PersonChip.tsx`), never as plain text. Sizes: `PERSON_ROW` (38) in tables, cards, lists and dialogs, `PERSON_HEADER` (72) in detail headers, 56 in form previews, `PERSON_INLINE` (28) on timelines.
- For cells and records, use `cellPerson(cell)`, `recordPerson(record)` and `personChip(...)`. A comma-separated list of people renders an avatar stack through the chip's `people` prop.
- Capture and face views come from `components/mediaParts.tsx`: `FaceCrop`, `DetectionBox`, `LowLightTint`, `StepArrows`, `useArrowKeys`, `KeyboardHint`.
- See `people-media.md` for how portraits and initials are chosen.

## Render performance

- Keep fast-changing state (query text, hover, scroll position, animation values) in the smallest component that uses it. The search dialog and Records search own their query, so typing does not re-render the workspace.
- `Navigation`, `Metrics`, `ContextPanels`, `WorkspaceHeader`, `FrameTile` and `Icon` are `memo`. Give them stable props: `useMemo` for objects and arrays, `useCallback` for handlers. Keep one object per directory or filter set, as `WorkspaceScreen` does, so memoised rows stay memoised.
- Don't memo a component whose children are always new (`MotionView` is deliberately not memoised).
- Lists that can grow page or window: `usePaged` + `Pager` for tables (12 learners per page on attendance), and "load more" in slices for galleries. `MediaFrameGrid` mounts only the rows near the viewport and re-renders once per row, not once per scroll event.
- Create heavy players lazily. Video players (`expo-video`) are created only after Play, so camera lists stay light.
- Parse once. `PersonChip` memoises name detection per text, because tables re-render every cell on hover and paging.

## Motion and accessibility

- Use `MotionView` / `useEntrance` and the `motion` tokens. Respect `useReducedMotion()`: with reduced motion everything is static. Never re-key providers, routes, forms or scroll views to restart an animation.
- Every icon-only control needs an accessible label, and tabs expose their selection state.
- The browser checks depend on the test IDs `records-table`, `dialog-transition` and `launch-screen`. Don't rename or remove them.

## Platform files and web quirks

- Platform variants use suffixes: `WebRefresh.tsx` (native no-op) and `WebRefresh.web.tsx`, `RefreshIndicator.web.tsx`. Import the base name.
- RN Web renders a bundled `<Image>` at its intrinsic size unless the style sets `width` and `height` to `"100%"`.
- Don't create files whose names differ only in case (TS1261 on Windows).
