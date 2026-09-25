import type {
  DataRecord,
  PageContract,
  Tone,
  Workspace,
} from "../contracts/types";

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
  for (const k of ["start_date", "end_date"] as const) {
    if (!c[k]) continue;
    const parsed = new Date(`${c[k]}T00:00:00Z`);
    if (
      !date.test(c[k]) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== c[k]
    )
      e[k] = "Use a valid date in YYYY-MM-DD format";
  }
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
  const src = text.replace(/^\uFEFF/, "");
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
  if (quoted) throw new Error("A quoted CSV field is not closed.");
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
export const classKey = (c: NewClass) =>
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
  if (new Set(header).size !== header.length)
    return { rows: [], error: "The CSV contains duplicate column headings." };
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
    if (values.length !== header.length)
      errors.push(
        "The row has a different number of fields than the header. Quote values containing commas.",
      );
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
    if (status === "Valid") seen.add(key);
    return { key: i, data, status, message };
  });
  if (!rows.length)
    return {
      rows,
      error: `The file has a header row but no ${noun.many}.`,
    };
  return { rows };
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
          campus:
            scope.find((value) => value !== "Across campuses") || scope[0],
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
  if (previous && !previous.sessionCreated) {
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
          ...previous.detail.sections.filter(
            (section) => section.title !== "Class / lab configuration",
          ),
        ],
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

export function setupKinds(workspace: Workspace, pageId?: string): SetupKind[] {
  if (workspace.industry !== "education") return [];
  const pages: Record<string, Record<string, SetupKind[]>> = {
    customer_admin: { "ca-class-coverage": ["class", "lab"] },
    dean: { "dean-classes": ["class"], "dean-labs": ["lab"] },
    coordinator: {
      "coordinator-classes": ["class"],
      "coordinator-labs": ["lab"],
    },
  };
  return pages[workspace.role]?.[pageId ?? ""] ?? [];
}
