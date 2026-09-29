import type {
  DataRecord,
  PageContract,
  Tone,
  Workspace,
} from "../contracts/types";
import { isAggregateScope } from "../contracts/logic";
import {
  cellsFor,
  editSourceRecord,
  sessionEvent,
  sessionId,
} from "../contracts/sessionRecords";
import { readUploadTable, type UploadRow } from "../common/upload";
import { isEmail, isRealDate, TIME } from "../common/validation";
export { parseCsv } from "../common/csv";

export type SetupKind = "class" | "lab";
export const NOUN = {
  class: { one: "class", title: "Class", many: "classes" },
  lab: { one: "lab", title: "Lab", many: "labs" },
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
export type Column = (typeof TEMPLATE_COLUMNS)[number];
export type NewClass = Record<Column, string>;
export const REQUIRED: Column[] = ["class_name", "faculty_email", "Tag"];
export const LABELS: Record<Column, string> = {
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
export const labelFor = (k: Column, kind: SetupKind) =>
  k === "class_name" ? `${NOUN[kind].title} name` : LABELS[k];

export interface Learner {
  uid: string;
  name: string;
  email: string;
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
  if (c.faculty_email && !isEmail(c.faculty_email))
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
  for (const k of ["start_date", "end_date"] as const)
    if (c[k] && !isRealDate(c[k]))
      e[k] = "Use a valid date in YYYY-MM-DD format";
  if (!e.start_date && !e.end_date && c.start_date && c.end_date)
    if (c.end_date < c.start_date) e.end_date = "End date is before start date";
  for (const k of ["start_time", "end_time"] as const)
    if (c[k] && !TIME.test(c[k])) e[k] = "Use 24-hour HH:MM";
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

export const classKey = (c: NewClass) =>
  [c.class_name, c.section, c.day, c.start_time]
    .map((v) => v.trim().toLowerCase())
    .join("|");

/** Maps CSV rows onto template columns and classifies each row. */
export function checkUpload(
  table: string[][],
  existingNames: string[],
  kind: SetupKind = "class",
): { rows: UploadRow<NewClass>[]; error?: string } {
  const noun = NOUN[kind];
  const existing = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  const seen = new Set<string>();
  return readUploadTable(table, {
    columns: TEMPLATE_COLUMNS,
    required: REQUIRED,
    empty: emptyClass,
    noun: noun.many,
    // The lab template names its first column lab_name.
    alias: { class_name: "lab_name" },
    requiredName: (k) => (k === "class_name" ? `${kind}_name` : k),
    messages: {
      duplicateHeaders: "The CSV contains duplicate column headings.",
      fieldCount:
        "The row has a different number of fields than the header. Quote values containing commas.",
    },
    validate: (data) => validateClass(data, kind),
    // An already listed name wins over a repeat; only valid rows count as seen.
    classify: (data, valid) => {
      if (!valid) return undefined;
      if (existing.has(data.class_name.toLowerCase()))
        return {
          status: "Existing",
          message: `A ${noun.one} with this name is already listed`,
        };
      const key = classKey(data);
      if (seen.has(key))
        return {
          status: "Duplicate",
          message: `Same ${noun.one}, section, day and start time as an earlier row`,
        };
      seen.add(key);
      return undefined;
    },
  });
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
    : /^(ca|va)-class-coverage$/.test(page.id)
      ? {
          space: c.room
            ? `${kind === "lab" ? "Lab" : "Room"} ${c.room} · ${c.class_name}`
            : c.class_name,
          campus: scope.find((value) => !isAggregateScope(value)) || scope[0],
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
  const cells = cellsFor(page, byColumn);
  const event = sessionEvent(source, actor);
  if (previous && !previous.sessionCreated)
    // Editing a source row: update only what the form owns and keep its
    // status, measurements and detail. Status comes from the source services.
    return editSourceRecord(previous, {
      page,
      setup: c,
      setupKind: kind,
      cells,
      owned: [
        "space",
        "owner",
        "class",
        "path",
        "lab",
        ...(schedule || c.start_time ? ["session"] : []),
        ...(c.capacity ? ["expected"] : []),
      ],
      title: name,
      sections: [
        {
          title: "Class / lab configuration",
          description: "Configuration edited in this session",
          items: TEMPLATE_COLUMNS.map((key) => ({
            label: labelFor(key, kind),
            value: c[key] || "—",
          })),
        },
      ],
      sectionsFirst: true,
      event,
    });
  const tone: Tone = "pending";
  return {
    id: previous?.id ?? sessionId(),
    type: kind,
    sessionCreated: true,
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
      timeline: [event, ...(previous?.detail.timeline ?? [])],
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

export function setupKinds(workspace: Workspace, pageId?: string): SetupKind[] {
  if (workspace.industry !== "education") return [];
  const pages: Record<string, Record<string, SetupKind[]>> = {
    customer_admin: { "ca-class-coverage": ["class", "lab"] },
    vizenta_admin: { "va-class-coverage": ["class", "lab"] },
    dean: { "dean-classes": ["class"], "dean-labs": ["lab"] },
    coordinator: {
      "coordinator-classes": ["class"],
      "coordinator-labs": ["lab"],
    },
  };
  return pages[workspace.role]?.[pageId ?? ""] ?? [];
}
