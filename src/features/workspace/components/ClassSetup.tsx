import React, { useMemo, useState, useSyncExternalStore } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  View,
  useWindowDimensions,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import type {
  DataRecord,
  PageContract,
  Tone,
} from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { Field, Row, Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Select } from "../../../shared/ui/Select";
import { REF, RefButton } from "./referenceUi";

// Add Class / Lab and Bulk Upload Class / Lab, carried over from the legacy
// class structure screen (skillatracker-ui Addclass.jsx /
// Bulk_upload_class.jsx). Labs use the same form and template with a lab name,
// capacity and continuous verification by default. No class service is
// connected yet: saved classes and labs stay in this session.

export type SetupKind =
  | "class"
  | "lab"
  | "learner"
  | "camera"
  | "user"
  | "warden"
  | "hostel"
  | "leave"
  | "setupCamera"
  | "shift";
export const NOUN: Record<
  SetupKind,
  { one: string; title: string; many: string }
> = {
  class: { one: "class", title: "Class", many: "classes" },
  lab: { one: "lab", title: "Lab", many: "labs" },
  learner: { one: "learner", title: "Learner", many: "learners" },
  camera: { one: "camera", title: "Camera", many: "cameras" },
  user: { one: "user", title: "User", many: "users" },
  warden: { one: "warden", title: "Warden", many: "wardens" },
  hostel: { one: "hostel", title: "Hostel", many: "hostels" },
  setupCamera: { one: "camera", title: "Camera", many: "cameras" },
  shift: { one: "shift", title: "Shift", many: "shifts" },
  leave: {
    one: "leave application",
    title: "Leave",
    many: "leave applications",
  },
};

export const CLASS_TAGS = [
  "Lecture",
  "Practical",
  "Tutorial",
  "Skills",
  "Lab",
  "Other",
];
export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const ATTENDANCE_TYPES = ["Snapshot", "Continuous"];

// Same column names as the legacy bulk upload template.
export const TEMPLATE_COLUMNS = [
  "class_name",
  "program",
  "department",
  "cohort",
  "section",
  "semester",
  "faculty_email",
  "Tag",
  "attendance_type",
  "start_date",
  "end_date",
  "day",
  "start_time",
  "end_time",
  "building",
  "room",
  "capacity",
] as const;
type Column = (typeof TEMPLATE_COLUMNS)[number];
export type NewClass = Record<Column, string>;
const REQUIRED: Column[] = ["class_name", "faculty_email", "Tag"];
const LABELS: Record<Column, string> = {
  class_name: "Class name",
  program: "Program",
  department: "Department",
  cohort: "Cohort",
  section: "Section",
  semester: "Semester",
  faculty_email: "Faculty email",
  Tag: "Tag",
  attendance_type: "Attendance type",
  start_date: "Start date",
  end_date: "End date",
  day: "Day",
  start_time: "Start time",
  end_time: "End time",
  building: "Building",
  room: "Room number",
  capacity: "Capacity",
};
const labelFor = (k: Column, kind: SetupKind) =>
  k === "class_name" ? `${NOUN[kind].title} name` : LABELS[k];

export interface Learner {
  uid: string;
  name: string;
  email: string;
}
// Session changes to class and lab pages, keyed by page id. Kept outside any
// screen because every navigation mounts a new screen instance (list →
// detail). No class service is connected yet, so nothing is persisted.
interface SetupState {
  added: Record<string, DataRecord[]>;
  edited: Record<string, Record<string, DataRecord>>;
  deleted: Record<string, string[]>;
  learners: Record<string, Learner[]>;
}
let setupState: SetupState = {
  added: {},
  edited: {},
  deleted: {},
  learners: {},
};
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const update = (next: Partial<SetupState>) => {
  setupState = { ...setupState, ...next };
  listeners.forEach((l) => l());
};
export function useSetupState(): SetupState {
  return useSyncExternalStore(subscribe, () => setupState);
}
export function storeAddedClasses(pageId: string, records: DataRecord[]) {
  update({
    added: {
      ...setupState.added,
      [pageId]: [...records, ...(setupState.added[pageId] ?? [])],
    },
  });
}
export function storeEditedRecord(pageId: string, record: DataRecord) {
  const added = setupState.added[pageId] ?? [];
  if (added.some((r) => r.id === record.id))
    update({
      added: {
        ...setupState.added,
        [pageId]: added.map((r) => (r.id === record.id ? record : r)),
      },
    });
  else
    update({
      edited: {
        ...setupState.edited,
        [pageId]: { ...setupState.edited[pageId], [record.id]: record },
      },
    });
}
export function storeDeletedRecord(pageId: string, id: string) {
  update({
    added: {
      ...setupState.added,
      [pageId]: (setupState.added[pageId] ?? []).filter((r) => r.id !== id),
    },
    deleted: {
      ...setupState.deleted,
      [pageId]: [...(setupState.deleted[pageId] ?? []), id],
    },
  });
}
export function storeLearners(key: string, list: Learner[]) {
  update({ learners: { ...setupState.learners, [key]: list } });
}
/** Session-added rows first, then contract rows with edits and deletions. */
export function applySetup(
  state: SetupState,
  pageId: string,
  scope: string,
  contractRows: DataRecord[],
): DataRecord[] {
  const deleted = new Set(state.deleted[pageId] ?? []);
  const edited = state.edited[pageId] ?? {};
  return [
    ...(state.added[pageId] ?? []).filter((r) => r.scope.includes(scope)),
    ...contractRows
      .filter((r) => !deleted.has(r.id))
      .map((r) => edited[r.id] ?? r),
  ];
}

export const emptyClass = (): NewClass =>
  Object.fromEntries(TEMPLATE_COLUMNS.map((k) => [k, ""])) as NewClass;

/** Field-level problems for one class; empty when the class is valid. */
export function validateClass(
  c: NewClass,
  kind: SetupKind = "class",
): Partial<Record<Column, string>> {
  const e: Partial<Record<Column, string>> = {};
  for (const k of REQUIRED)
    if (!c[k].trim()) e[k] = `${labelFor(k, kind)} is required`;
  if (c.capacity && !/^[1-9]\d*$/.test(c.capacity))
    e.capacity = "Capacity must be a whole number";
  if (c.faculty_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.faculty_email))
    e.faculty_email = "Enter a valid email";
  if (c.Tag && !CLASS_TAGS.some((t) => t.toLowerCase() === c.Tag.toLowerCase()))
    e.Tag = `Tag must be one of ${CLASS_TAGS.join(", ")}`;
  if (
    c.attendance_type &&
    !ATTENDANCE_TYPES.some(
      (t) => t.toLowerCase() === c.attendance_type.toLowerCase(),
    )
  )
    e.attendance_type = "Use Snapshot or Continuous";
  const date = /^\d{4}-\d{2}-\d{2}$/;
  for (const k of ["start_date", "end_date"] as const)
    if (c[k] && !date.test(c[k])) e[k] = "Use YYYY-MM-DD";
  if (!e.start_date && !e.end_date && c.start_date && c.end_date)
    if (c.end_date < c.start_date) e.end_date = "End date is before start date";
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const k of ["start_time", "end_time"] as const)
    if (c[k] && !time.test(c[k])) e[k] = "Use 24-hour HH:MM";
  if (!e.start_time && !e.end_time && c.start_time && c.end_time)
    if (c.end_time <= c.start_time) e.end_time = "End time must be after start";
  if (c.day) {
    const bad = c.day
      .split(",")
      .map((d) => d.trim())
      .filter(
        (d) => d && !WEEKDAYS.some((w) => w.toLowerCase() === d.toLowerCase()),
      );
    if (bad.length) e.day = `Unknown day: ${bad.join(", ")}`;
  }
  return e;
}

/** Minimal RFC 4180 CSV reader (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim()));
}

export type UploadStatus = "Valid" | "Invalid" | "Duplicate" | "Existing";
export interface UploadRow {
  key: number;
  data: NewClass;
  status: UploadStatus;
  message: string;
}
const classKey = (c: NewClass) =>
  [c.class_name, c.section, c.day, c.start_time]
    .map((v) => v.trim().toLowerCase())
    .join("|");

/** Maps CSV rows onto template columns and classifies each row. */
export function checkUpload(
  table: string[][],
  existingNames: string[],
  kind: SetupKind = "class",
): { rows: UploadRow[]; error?: string } {
  const noun = NOUN[kind];
  if (!table.length) return { rows: [], error: "The file is empty." };
  const norm = (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_");
  const header = table[0].map(norm);
  const index = Object.fromEntries(
    TEMPLATE_COLUMNS.map((k) => [k, header.indexOf(norm(k))]),
  ) as Record<Column, number>;
  // The lab template names its first column lab_name.
  if (index.class_name < 0) index.class_name = header.indexOf("lab_name");
  const missing = REQUIRED.filter((k) => index[k] < 0).map((k) =>
    k === "class_name" ? `${kind}_name` : k,
  );
  if (missing.length)
    return {
      rows: [],
      error: `Missing template columns: ${missing.join(", ")}. Download the template and keep its header row.`,
    };
  const existing = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  const seen = new Set<string>();
  const rows = table.slice(1).map((values, i): UploadRow => {
    const data = emptyClass();
    for (const k of TEMPLATE_COLUMNS)
      data[k] = index[k] >= 0 ? (values[index[k]] ?? "").trim() : "";
    const errors = Object.values(validateClass(data, kind));
    const key = classKey(data);
    let status: UploadStatus = "Valid";
    let message = "Ready to add";
    if (errors.length) {
      status = "Invalid";
      message = errors.join("; ");
    } else if (existing.has(data.class_name.toLowerCase())) {
      status = "Existing";
      message = `A ${noun.one} with this name is already listed`;
    } else if (seen.has(key)) {
      status = "Duplicate";
      message = `Same ${noun.one}, section, day and start time as an earlier row`;
    }
    seen.add(key);
    return { key: i, data, status, message };
  });
  if (!rows.length)
    return {
      rows,
      error: `The file has a header row but no ${noun.many}.`,
    };
  return { rows };
}

function downloadTemplate(kind: SetupKind) {
  const example =
    kind === "lab"
      ? [
          "AI Systems Lab 3",
          "B.Tech CSE",
          "Computing",
          "2026",
          "CSE-5A",
          "5",
          "faculty@college.edu",
          "Lab",
          "Continuous",
          "2026-09-28",
          "2026-12-18",
          "Wednesday",
          "11:00",
          "13:00",
          "Engineering Block",
          "L-12",
          "30",
        ]
      : [
          "Data Structures",
          "B.Tech CSE",
          "Computing",
          "2026",
          "CSE-5A",
          "5",
          "faculty@college.edu",
          "Lecture",
          "Snapshot",
          "2026-09-28",
          "2026-12-18",
          "Monday",
          "09:00",
          "10:00",
          "Engineering Block",
          "204",
          "",
        ];
  const header = TEMPLATE_COLUMNS.map((k) =>
    k === "class_name" ? `${kind}_name` : k,
  );
  const csv = [header.join(","), example.join(",")].join("\r\n");
  saveCsv(
    `${kind}_upload_template.csv`,
    `${NOUN[kind].title} upload template`,
    csv,
  );
}

/** Downloads a CSV on web; on iOS / Android hands it to the share sheet
 * (save to Files, mail it, open it in a spreadsheet app). */
export function saveCsv(fileName: string, title: string, csv: string) {
  if (Platform.OS !== "web") {
    void Share.share({ title, message: csv });
    return;
  }
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the system file picker (browser, iOS Files, Android documents). */
export async function pickCsv(): Promise<
  { name: string; text: string } | { error: string } | undefined
> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "text/csv",
      "text/comma-separated-values",
      "application/csv",
      "text/plain",
    ],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return undefined;
  const asset = result.assets[0];
  if (!/\.csv$/i.test(asset.name))
    return { error: "Please choose a .csv file." };
  // The web picker returns a browser File; native returns a file URI.
  const text = asset.file
    ? await asset.file.text()
    : await new File(asset.uri).text();
  return { name: asset.name, text };
}

/** Builds a table record in the shape of the page the class is added to. */
export function classRecord(
  page: PageContract,
  c: NewClass,
  scope: string[],
  actor: string,
  source: string,
  kind: SetupKind = "class",
  // When editing: keep the record id and its earlier history.
  previous?: DataRecord,
): DataRecord {
  const noun = NOUN[kind];
  const id =
    previous?.id ??
    `NEW-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const name = [c.class_name, c.section].filter(Boolean).join(" · ");
  const schedule = [
    c.day,
    c.start_time && c.end_time ? `${c.start_time}–${c.end_time}` : c.start_time,
  ]
    .filter(Boolean)
    .join(" · ");
  const room = c.room ? `Room ${c.room}` : "Room not mapped";
  const byColumn: Record<string, string> = page.id.endsWith("-labs")
    ? {
        lab: [c.class_name, c.department].filter(Boolean).join(" · "),
        session: `${
          c.start_time && c.end_time
            ? `${c.start_time}–${c.end_time}`
            : "Not scheduled"
        } · ${c.attendance_type || "Continuous"}`,
        expected: c.capacity || "—",
        present: "Not started",
        authorization: "Not configured",
        source: c.room ? `${room} · camera not mapped` : "Not mapped",
        state: "Prepare",
      }
    : page.id === "ca-class-coverage"
      ? {
          space: c.room
            ? `${kind === "lab" ? "Lab" : "Room"} ${c.room} · ${c.class_name}`
            : c.class_name,
          campus: c.building || scope[0],
          owner: c.department || "—",
          roster: "0 / 0",
          camera: "Not mapped",
          policy: "EDU-PRES-03",
          validated: "Not validated",
          state: "Setup incomplete",
        }
      : {
          class: name,
          path: [c.department, c.program].filter(Boolean).join(" · ") || "—",
          session: schedule ? `${schedule} upcoming` : "Not scheduled",
          attendance: "Not started",
          exceptions: "0",
          readiness: room,
          state: "Prepare",
        };
  const cells = Object.fromEntries(
    page.columns.map((col) => [col.id, byColumn[col.id] ?? "—"]),
  );
  if (previous && !previous.setup) {
    // Editing a source row: update only what the form owns and keep its
    // status, measurements and detail. Status comes from the source services.
    const owned = new Set([
      "space",
      "owner",
      "class",
      "path",
      "lab",
      ...(schedule || c.start_time ? ["session"] : []),
      ...(c.capacity ? ["expected"] : []),
    ]);
    return {
      ...previous,
      setup: c,
      setupKind: kind,
      cells: Object.fromEntries(
        page.columns.map((col) => [
          col.id,
          owned.has(col.id) ? cells[col.id] : previous.cells[col.id],
        ]),
      ),
      detail: {
        ...previous.detail,
        timeline: [
          { time: "Just now", event: source, actor },
          ...previous.detail.timeline,
        ],
      },
    };
  }
  const tone: Tone = "pending";
  return {
    id,
    type: kind,
    setup: c,
    setupKind: kind,
    cells,
    state: { label: "Pending", tone },
    action: `Open ${noun.one}`,
    scope,
    detail: {
      title: name,
      eyebrow: `NEW ${noun.title.toUpperCase()}`,
      summary:
        "Added in this session. Roster mapping and camera validation are still required before attendance can be captured.",
      facts: [
        { label: "Program", value: c.program || "—" },
        { label: "Department", value: c.department || "—" },
        { label: "Faculty", value: c.faculty_email },
        kind === "lab"
          ? { label: "Capacity", value: c.capacity || "—" }
          : { label: "Tag", value: c.Tag },
      ],
      sections: [
        {
          title: "Schedule",
          description: `From the ${noun.one} form`,
          items: [
            { label: "Semester", value: c.semester || "—" },
            { label: "Cohort", value: c.cohort || "—" },
            {
              label: "Dates",
              value:
                c.start_date || c.end_date
                  ? `${c.start_date || "?"} to ${c.end_date || "?"}`
                  : "—",
            },
            { label: "Day and time", value: schedule || "—" },
            {
              label: "Attendance type",
              value:
                c.attendance_type ||
                (kind === "lab" ? "Continuous" : "Snapshot"),
            },
          ],
        },
        {
          title: "Location",
          description: "Where attendance will be captured",
          items: [
            { label: "Building", value: c.building || "—" },
            {
              label: "Room",
              value: room,
              tone: c.room ? "healthy" : "attention",
            },
          ],
        },
      ],
      timeline: [
        { time: "Just now", event: source, actor },
        ...(previous?.detail.timeline ?? []),
      ],
      permittedActions: [],
    },
  };
}

/** Class or lab for a row: stored on session rows, inferred for others. */
export function kindOf(record: DataRecord, fallback: SetupKind): SetupKind {
  if (record.setupKind === "class" || record.setupKind === "lab")
    return record.setupKind;
  if (record.type === "lab") return "lab";
  const first = Object.values(record.cells)[0];
  return typeof first === "string" && /\blab\b/i.test(first) ? "lab" : fallback;
}

/**
 * Form values for editing a row. Session rows keep their original values;
 * other rows start from what the table shows (name, section, department,
 * program, room) and the rest must be completed.
 */
export function formFromRecord(record: DataRecord, kind: SetupKind): NewClass {
  if (record.setup) return { ...(record.setup as NewClass) };
  const form = {
    ...emptyClass(),
    Tag: kind === "lab" ? "Lab" : "Lecture",
    attendance_type: kind === "lab" ? "Continuous" : "Snapshot",
  };
  const text = (v: unknown) =>
    typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
  const cells = record.cells;
  const first = text(Object.values(cells)[0]);
  const parts = first.split(" · ").map((x) => x.trim());
  if (cells.space !== undefined) {
    // Coverage: "Room 204 · CS 301" or "AI Systems Lab 2"
    const room = parts[0].match(/^(?:Room|Lab)\s+(.+)$/);
    if (room && parts.length > 1) {
      form.room = room[1];
      form.class_name = parts.slice(1).join(" · ");
    } else form.class_name = first;
    form.department = text(cells.owner) === "—" ? "" : text(cells.owner);
  } else if (cells.lab !== undefined) {
    // Labs: "AI Systems Lab 2 · Computing"
    form.class_name = parts[0];
    form.department = parts[1] ?? "";
    if (/^\d+$/.test(text(cells.expected)))
      form.capacity = text(cells.expected);
  } else {
    // Classes: "CS 301 · CSE-5A", path "Computing · B.Tech CSE"
    form.class_name = parts[0];
    form.section = parts[1] ?? "";
    const path = text(cells.path).split(" · ");
    if (path[0] && path[0] !== "—") form.department = path[0];
    if (path[1]) form.program = path[1];
  }
  return form;
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {children}
    </View>
  );
}
function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: 220 }}>{children}</View>;
}

export function AddClassForm({
  kind = "class",
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  kind?: SetupKind;
  initial?: NewClass;
  submitLabel?: string;
  onSave: (c: NewClass) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [form, setForm] = useState<NewClass>(
    initial ?? {
      ...emptyClass(),
      Tag: kind === "lab" ? "Lab" : "Lecture",
      attendance_type: kind === "lab" ? "Continuous" : "Snapshot",
    },
  );
  // Editing shows what still needs completing straight away.
  const [submitted, setSubmitted] = useState(!!initial);
  const errors = useMemo(() => validateClass(form, kind), [form, kind]);
  const set = (k: Column) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const text = (k: Column, placeholder?: string) => (
    <Cell key={k}>
      <Field
        label={`${labelFor(k, kind)}${REQUIRED.includes(k) ? " *" : ""}`}
        value={form[k]}
        onChange={set(k)}
        placeholder={placeholder}
        error={submitted ? errors[k] : undefined}
      />
    </Cell>
  );
  const choice = (k: Column, options: string[]) => (
    <Cell key={k}>
      <View style={{ gap: 7 }}>
        <Txt size={12} bold>
          {LABELS[k]}
          {REQUIRED.includes(k) ? " *" : ""}
        </Txt>
        <Select
          field
          label={LABELS[k]}
          value={form[k]}
          options={[
            ...(REQUIRED.includes(k) ? [] : [{ label: "Not set", value: "" }]),
            ...options.map((o) => ({ label: o, value: o })),
          ]}
          onChange={(v) => {
            set(k)(v);
            // Labs and practicals use continuous verification by default.
            if (k === "Tag")
              set("attendance_type")(
                v === "Lab" || v === "Practical" ? "Continuous" : "Snapshot",
              );
          }}
        />
        {submitted && errors[k] && (
          <Txt size={12} color={c.critical}>
            {errors[k]}
          </Txt>
        )}
      </View>
    </Cell>
  );
  return (
    <View style={{ gap: 16 }}>
      <Txt size={12} color={c.muted}>
        Fields marked * are required.
      </Txt>
      <FormGrid>
        {text(
          "class_name",
          kind === "lab" ? "e.g. AI Systems Lab 3" : "e.g. Data Structures",
        )}
        {text("program", "e.g. B.Tech CSE")}
        {text("department", "e.g. Computing")}
        {text("cohort", "e.g. 2026")}
        {text("section", "e.g. CSE-5A")}
        {text("semester", "e.g. 5")}
        {choice("Tag", CLASS_TAGS)}
        {text("faculty_email", "faculty@college.edu")}
        {choice("attendance_type", ATTENDANCE_TYPES)}
        {text("start_date", "YYYY-MM-DD")}
        {text("end_date", "YYYY-MM-DD")}
        {choice("day", WEEKDAYS)}
        {text("start_time", "HH:MM, e.g. 09:00")}
        {text("end_time", "HH:MM, e.g. 10:00")}
        {text("building", "e.g. Engineering Block")}
        {text("room", kind === "lab" ? "e.g. L-12" : "e.g. 204")}
        {kind === "lab" && text("capacity", "e.g. 30")}
      </FormGrid>
      <Row style={{ justifyContent: "flex-end", gap: 8 }}>
        <RefButton label="Cancel" onPress={onCancel} />
        <RefButton
          label={submitLabel ?? `Add ${NOUN[kind].one}`}
          kind="primary"
          onPress={() => {
            setSubmitted(true);
            if (!Object.keys(errors).length) onSave(form);
          }}
        />
      </Row>
    </View>
  );
}

const STATUS_COLOR: Record<UploadStatus, string> = {
  Valid: REF.green,
  Invalid: "#e15768",
  Duplicate: "#6a7199",
  Existing: REF.amber,
};

export function BulkUploadClass({
  kind = "class",
  existingNames,
  onSave,
  onCancel,
}: {
  kind?: SetupKind;
  existingNames: string[];
  onSave: (classes: NewClass[], fileName: string) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const narrow = useWindowDimensions().width < 768;
  const [file, setFile] = useState("");
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [error, setError] = useState("");
  const blocking = rows.some(
    (r) => r.status === "Invalid" || r.status === "Existing",
  );
  const step = (n: number, title: string, done: boolean) => (
    <Row style={{ gap: 8 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: done ? REF.cyan : c.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Txt size={11} bold color={done ? REF.actionInk : c.muted}>
          {String(n)}
        </Txt>
      </View>
      <Txt size={12} bold>
        {title}
      </Txt>
    </Row>
  );
  return (
    <View style={{ gap: 16 }}>
      <Row style={{ gap: 24, flexWrap: "wrap" }}>
        {step(1, "Download template", true)}
        {step(2, "Choose CSV file", !!file)}
        {step(3, "Review and save", rows.length > 0 && !blocking)}
      </Row>
      <Row style={{ flexWrap: "wrap", gap: 10 }}>
        <RefButton
          label="Template"
          icon="download"
          kind="export"
          onPress={() => downloadTemplate(kind)}
        />
        <RefButton
          label={file ? "Choose another file" : "Choose CSV file"}
          icon="folder"
          onPress={() =>
            void pickCsv()
              .then((picked) => {
                if (!picked) return;
                if ("error" in picked) {
                  setError(picked.error);
                  return;
                }
                const result = checkUpload(
                  parseCsv(picked.text),
                  existingNames,
                  kind,
                );
                setFile(picked.name);
                setRows(result.rows);
                setError(result.error ?? "");
              })
              .catch(() => setError("The file could not be read."))
          }
        />
        {!!file && (
          <Txt size={12} color={c.muted}>
            {file}
          </Txt>
        )}
      </Row>
      <Txt size={11} color={c.muted}>
        Only .csv is supported. In Excel, open the template and use File → Save
        As → CSV. Required columns: {kind}_name, faculty_email, Tag.
      </Txt>
      {!!error && (
        <Txt size={12} color={c.critical}>
          {error}
        </Txt>
      )}
      {rows.length > 0 && (
        <>
          <Row style={{ flexWrap: "wrap", gap: 16 }}>
            {(Object.keys(STATUS_COLOR) as UploadStatus[]).map((s) => (
              <Row key={s} style={{ gap: 6 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: STATUS_COLOR[s],
                  }}
                />
                <Txt size={11}>
                  {s} · {rows.filter((r) => r.status === s).length}
                </Txt>
              </Row>
            ))}
          </Row>
          {narrow ? (
            // Phones: one card per row so the status stays readable.
            <View style={{ gap: 8 }}>
              {rows.map((r) => (
                <View
                  key={r.key}
                  style={{
                    borderWidth: 1,
                    borderColor: c.border,
                    borderLeftWidth: 4,
                    borderLeftColor: STATUS_COLOR[r.status],
                    borderRadius: 8,
                    padding: 10,
                    gap: 3,
                  }}
                >
                  <Row style={{ alignItems: "flex-start" }}>
                    <Txt size={12} bold style={{ flex: 1 }}>
                      {[r.data.class_name, r.data.section]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </Txt>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove row ${r.key + 2}`}
                      onPress={() =>
                        setRows((all) => all.filter((x) => x.key !== r.key))
                      }
                      hitSlop={8}
                    >
                      <Icon name="close" size={16} color={c.muted} />
                    </Pressable>
                  </Row>
                  <Txt size={11} color={c.muted}>
                    {[
                      r.data.faculty_email,
                      r.data.Tag,
                      [r.data.day, r.data.start_time].filter(Boolean).join(" "),
                      r.data.room && `Room ${r.data.room}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Txt>
                  <Txt size={11} color={STATUS_COLOR[r.status]}>
                    {r.status}: {r.message}
                  </Txt>
                </View>
              ))}
            </View>
          ) : (
            <ScrollView horizontal>
              <View
                style={{
                  minWidth: 900,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 8,
                }}
              >
                <Row
                  style={{
                    backgroundColor: c.primarySoft,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                  }}
                >
                  {[
                    [`${NOUN[kind].title} name`, 1.3],
                    ["Section", 0.7],
                    ["Faculty email", 1.4],
                    ["Tag", 0.7],
                    ["Day / time", 1.1],
                    ["Room", 0.6],
                    ["Status", 2],
                  ].map(([label, flex]) => (
                    <Txt
                      key={label as string}
                      size={10}
                      bold
                      color={c.muted}
                      style={{ flex: flex as number }}
                    >
                      {(label as string).toUpperCase()}
                    </Txt>
                  ))}
                  <View style={{ width: 30 }} />
                </Row>
                {rows.map((r) => (
                  <Row
                    key={r.key}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderTopWidth: 1,
                      borderColor: c.border,
                      alignItems: "flex-start",
                    }}
                  >
                    <Txt size={11} bold style={{ flex: 1.3 }}>
                      {r.data.class_name || "—"}
                    </Txt>
                    <Txt size={11} style={{ flex: 0.7 }}>
                      {r.data.section || "—"}
                    </Txt>
                    <Txt size={11} style={{ flex: 1.4 }}>
                      {r.data.faculty_email || "—"}
                    </Txt>
                    <Txt size={11} style={{ flex: 0.7 }}>
                      {r.data.Tag || "—"}
                    </Txt>
                    <Txt size={11} style={{ flex: 1.1 }}>
                      {[r.data.day, r.data.start_time]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </Txt>
                    <Txt size={11} style={{ flex: 0.6 }}>
                      {r.data.room || "—"}
                    </Txt>
                    <Txt
                      size={11}
                      color={STATUS_COLOR[r.status]}
                      style={{ flex: 2 }}
                    >
                      {r.status}: {r.message}
                    </Txt>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove row ${r.key + 2}`}
                      onPress={() =>
                        setRows((all) => all.filter((x) => x.key !== r.key))
                      }
                      style={{ width: 30, alignItems: "center" }}
                    >
                      <Icon name="close" size={15} color={c.muted} />
                    </Pressable>
                  </Row>
                ))}
              </View>
            </ScrollView>
          )}
          {blocking && (
            <Txt size={12} color={c.critical}>
              Remove or fix the Invalid and Existing rows, then choose the file
              again.
            </Txt>
          )}
        </>
      )}
      <Row style={{ justifyContent: "flex-end", gap: 8 }}>
        <RefButton label="Cancel" onPress={onCancel} />
        <RefButton
          label={`Save ${rows.filter((r) => r.status === "Valid").length} ${NOUN[kind].many}`}
          kind="primary"
          onPress={() => {
            if (!rows.length || blocking) return;
            onSave(
              rows.filter((r) => r.status === "Valid").map((r) => r.data),
              file,
            );
          }}
        />
      </Row>
    </View>
  );
}
