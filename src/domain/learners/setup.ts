import type { DataRecord, PageContract, Workspace } from "../contracts/types";
export const LEARNER_COLUMNS = [
  "uid",
  "first_name",
  "last_name",
  "gender",
  "email",
  "mobile",
  "dob",
  "type",
  "group_name",
  "Department_name",
  "program",
  "section",
  "parentsemail",
  "parentsmobile",
] as const;
export type Column = (typeof LEARNER_COLUMNS)[number];
export type NewLearner = Record<Column, string> & { image?: string };
export const REQUIRED: Column[] = ["uid", "first_name", "last_name", "type"];
export const LABELS: Record<Column, string> = {
  uid: "UID",
  first_name: "First name",
  last_name: "Last name",
  gender: "Gender",
  email: "Email",
  mobile: "Phone",
  dob: "DOB",
  type: "User type",
  group_name: "Group",
  Department_name: "Department",
  program: "Program",
  section: "Section",
  parentsemail: "Parent's email",
  parentsmobile: "Parent's mobile",
};
export const GENDERS = ["Male", "Female"];
export const USER_TYPES = ["Learner", "Faculty"];

export const emptyLearner = (): NewLearner =>
  ({
    ...Object.fromEntries(LEARNER_COLUMNS.map((k) => [k, ""])),
    type: "Learner",
  }) as NewLearner;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?\d{10,15}$/;

/** Field-level problems for one learner; empty when valid. */
export function validateLearner(
  l: NewLearner,
): Partial<Record<Column, string>> {
  const e: Partial<Record<Column, string>> = {};
  for (const k of REQUIRED) if (!l[k].trim()) e[k] = `${LABELS[k]} is required`;
  if (l.email && !EMAIL.test(l.email)) e.email = "Enter a valid email";
  if (l.parentsemail && !EMAIL.test(l.parentsemail))
    e.parentsemail = "Enter a valid email";
  if (l.mobile && !PHONE.test(l.mobile.replace(/[\s-]/g, "")))
    e.mobile = "Use 10–15 digits";
  if (l.parentsmobile && !PHONE.test(l.parentsmobile.replace(/[\s-]/g, "")))
    e.parentsmobile = "Use 10–15 digits";
  if (l.dob) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(l.dob)) e.dob = "Use YYYY-MM-DD";
    else if (
      Number.isNaN(Date.parse(l.dob)) ||
      new Date(l.dob).toISOString().slice(0, 10) !== l.dob
    )
      e.dob = "Enter a valid date";
    else if (new Date(l.dob) > new Date()) e.dob = "DOB is in the future";
  }
  if (
    l.gender &&
    !GENDERS.some((g) => g.toLowerCase() === l.gender.toLowerCase())
  )
    e.gender = "Use Male or Female";
  if (
    l.type &&
    !USER_TYPES.some((t) => t.toLowerCase() === l.type.toLowerCase())
  )
    e.type = `User type must be ${USER_TYPES.join(" or ")}`;
  return e;
}

export const learnerName = (l: NewLearner) =>
  [l.first_name, l.last_name].filter(Boolean).join(" ");
const academicPath = (l: NewLearner) =>
  [l.Department_name, l.program, l.section && `Sem ${l.section}`]
    .filter(Boolean)
    .join(" · ");

/** UIDs already listed on a page (first column is "Name · UID"). */
export function listedUids(rows: DataRecord[]): string[] {
  return rows.map((row) => learnerFromRecord(row).uid).filter(Boolean);
}

export type LearnerStatus = "Valid" | "Invalid" | "Duplicate" | "Existing";
export interface LearnerRow {
  key: number;
  data: NewLearner;
  status: LearnerStatus;
  message: string;
}

/** Classify rows before saving; existing UIDs cannot be added again. */
export function checkLearnerUpload(
  table: string[][],
  existingUids: string[],
): { rows: LearnerRow[]; error?: string } {
  if (!table.length) return { rows: [], error: "The file is empty." };
  const norm = (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_");
  const header = table[0].map(norm);
  if (new Set(header).size !== header.length)
    return { rows: [], error: "Duplicate column headers." };
  const index = Object.fromEntries(
    LEARNER_COLUMNS.map((k) => [k, header.indexOf(norm(k))]),
  ) as Record<Column, number>;
  const missing = REQUIRED.filter((k) => index[k] < 0);
  if (missing.length)
    return {
      rows: [],
      error: `Missing template columns: ${missing.join(", ")}. Download the template and keep its header row.`,
    };
  const existing = new Set(existingUids.map((u) => u.trim().toLowerCase()));
  const seen = new Set<string>();
  const rows = table.slice(1).map((values, i): LearnerRow => {
    const data = emptyLearner();
    for (const k of LEARNER_COLUMNS)
      data[k] = index[k] >= 0 ? (values[index[k]] ?? "").trim() : "";
    const errors = Object.values(validateLearner(data));
    if (values.length !== header.length)
      errors.push("Row has the wrong number of fields");
    const uid = data.uid.toLowerCase();
    let status: LearnerStatus = "Valid";
    let message = "Ready to add";
    if (errors.length) {
      status = "Invalid";
      message = errors.join("; ");
    } else if (seen.has(uid)) {
      status = "Duplicate";
      message = `UID ${data.uid} appears more than once in this file`;
    } else if (existing.has(uid)) {
      status = "Existing";
      message = `UID ${data.uid} is already listed; remove this row before saving`;
    }
    seen.add(uid);
    return { key: i, data, status, message };
  });
  if (!rows.length)
    return { rows, error: "The file has a header row but no learners." };
  return { rows };
}

/** Builds a table record in the shape of the page the learner is added to. */
export function learnerRecord(
  page: PageContract,
  l: NewLearner,
  scope: string[],
  actor: string,
  source: string,
  previous?: DataRecord,
): DataRecord {
  const name = learnerName(l);
  const label = `${name} · ${l.uid}`;
  const path = academicPath(l) || "—";
  const byColumn: Record<string, string> = {
    learner: label,
    path,
    classes: "0",
    period: "Not available",
    rate: "—",
    exceptions: "0",
    mapping: "Pending",
    state: "Prepare",
  };
  const cells = Object.fromEntries(
    page.columns.map((col) => [col.id, byColumn[col.id] ?? "—"]),
  );
  const event = { time: "Just now", event: source, actor };
  if (previous && !previous.sessionCreated) {
    // Editing a source row: update identity and path only, keep its status
    // and attendance measurements, which come from the source services.
    const owned = new Set(["learner", "path"]);
    return {
      ...previous,
      setup: l,
      setupKind: "learner",
      cells: Object.fromEntries(
        page.columns.map((col) => [
          col.id,
          owned.has(col.id) ? cells[col.id] : previous.cells[col.id],
        ]),
      ),
      detail: {
        ...previous.detail,
        title: label,
        sections: [
          ...previous.detail.sections.filter(
            (section) => section.title !== "Learner configuration",
          ),
          {
            title: "Learner configuration",
            items: LEARNER_COLUMNS.map((key) => ({
              label: LABELS[key],
              value: l[key] || "-",
            })),
          },
        ],
        timeline: [event, ...previous.detail.timeline],
      },
    };
  }
  return {
    id:
      previous?.id ??
      `NEW-LRN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    sessionCreated: true,
    type: "learner",
    setup: l,
    setupKind: "learner",
    cells,
    state: { label: "Pending", tone: "pending" },
    action: "Open learner",
    scope,
    detail: {
      title: label,
      eyebrow: "NEW LEARNER",
      summary:
        "Added in this session. Class mapping and face-image validation are still required before attendance can be recorded.",
      facts: [
        { label: "UID", value: l.uid },
        { label: "User type", value: l.type },
        { label: "Email", value: l.email || "—" },
        { label: "Phone", value: l.mobile || "—" },
      ],
      sections: [
        {
          title: "Academic",
          description: "From the learner form",
          items: [
            { label: "Academic path", value: path },
            { label: "Group", value: l.group_name || "—" },
            {
              label: "Face image",
              value: l.image ? "Provided" : "Missing",
              tone: l.image ? "healthy" : "attention",
            },
          ],
        },
        {
          title: "Personal",
          description: "Contact and guardian details",
          items: [
            { label: "Gender", value: l.gender || "—" },
            { label: "DOB", value: l.dob || "—" },
            { label: "Parent's email", value: l.parentsemail || "—" },
            { label: "Parent's mobile", value: l.parentsmobile || "—" },
          ],
        },
      ],
      timeline: [event, ...(previous?.detail.timeline ?? [])],
      permittedActions: [],
    },
  };
}

/** Form values for editing a row; source rows start from the table. */
export function learnerFromRecord(record: DataRecord): NewLearner {
  if (record.setup) return { ...(record.setup as NewLearner) };
  const form = emptyLearner();
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  const first = text(record.cells.learner);
  const [name, uid] = first.split(" · ");
  const words = (name ?? "").trim().split(/\s+/);
  form.first_name = words[0] ?? "";
  form.last_name = words.slice(1).join(" ");
  form.uid = (uid ?? "").replace(/^UID\s*/i, "").trim();
  const path = text(record.cells.path).split(" · ");
  if (path[0] && path[0] !== "—") form.Department_name = path[0];
  if (path[1]) form.program = path[1];
  if (path[2]) form.section = path[2].replace(/^Sem\s*/i, "");
  return form;
}

export function learnerSetupEnabled(w: Workspace, pageId?: string) {
  return (
    w.industry === "education" &&
    (
      {
        customer_admin: "ca-class-learners",
        dean: "dean-learners",
        coordinator: "coordinator-learners",
      } as Record<string, string>
    )[w.role] === pageId &&
    !!pageId
  );
}
