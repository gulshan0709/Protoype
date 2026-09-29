import type { DataRecord, PageContract, Workspace } from "../contracts/types";
import { fullName, str } from "../common/text";
import { readUploadTable, type UploadRow } from "../common/upload";
import {
  ISO_DATE,
  isEmail,
  isPhone,
  isRealDate,
} from "../common/validation";
import {
  cellsFor,
  editSourceRecord,
  sessionEvent,
  sessionId,
} from "../contracts/sessionRecords";
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

/** Field-level problems for one learner; empty when valid. */
export function validateLearner(
  l: NewLearner,
): Partial<Record<Column, string>> {
  const e: Partial<Record<Column, string>> = {};
  for (const k of REQUIRED) if (!l[k].trim()) e[k] = `${LABELS[k]} is required`;
  if (l.email && !isEmail(l.email)) e.email = "Enter a valid email";
  if (l.parentsemail && !isEmail(l.parentsemail))
    e.parentsemail = "Enter a valid email";
  if (l.mobile && !isPhone(l.mobile, 10)) e.mobile = "Use 10–15 digits";
  if (l.parentsmobile && !isPhone(l.parentsmobile, 10))
    e.parentsmobile = "Use 10–15 digits";
  if (l.dob) {
    if (!ISO_DATE.test(l.dob)) e.dob = "Use YYYY-MM-DD";
    else if (!isRealDate(l.dob)) e.dob = "Enter a valid date";
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

const academicPath = (l: NewLearner) =>
  [l.Department_name, l.program, l.section && `Sem ${l.section}`]
    .filter(Boolean)
    .join(" · ");

/** UIDs already listed on a page (first column is "Name · UID"). */
export function listedUids(rows: DataRecord[]): string[] {
  return rows.map((row) => learnerFromRecord(row).uid).filter(Boolean);
}

/** Classify rows before saving; existing UIDs cannot be added again. */
export function checkLearnerUpload(
  table: string[][],
  existingUids: string[],
): { rows: UploadRow<NewLearner>[]; error?: string } {
  const existing = new Set(existingUids.map((u) => u.trim().toLowerCase()));
  const seen = new Set<string>();
  return readUploadTable(table, {
    columns: LEARNER_COLUMNS,
    required: REQUIRED,
    empty: emptyLearner,
    noun: "learners",
    validate: validateLearner,
    classify: (data, valid) => {
      const uid = data.uid.toLowerCase();
      const verdict = !valid
        ? undefined
        : seen.has(uid)
          ? {
              status: "Duplicate" as const,
              message: `UID ${data.uid} appears more than once in this file`,
            }
          : existing.has(uid)
            ? {
                status: "Existing" as const,
                message: `UID ${data.uid} is already listed; remove this row before saving`,
              }
            : undefined;
      seen.add(uid);
      return verdict;
    },
  });
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
  const label = `${fullName(l)} · ${l.uid}`;
  const path = academicPath(l) || "—";
  const cells = cellsFor(page, {
    learner: label,
    path,
    classes: "0",
    period: "Not available",
    rate: "—",
    exceptions: "0",
    mapping: "Pending",
    state: "Prepare",
  });
  const event = sessionEvent(source, actor);
  if (previous && !previous.sessionCreated)
    // Editing a source row: update identity and path only, keep its status
    // and attendance measurements, which come from the source services.
    return editSourceRecord(previous, {
      page,
      setup: l,
      setupKind: "learner",
      cells,
      owned: ["learner", "path"],
      title: label,
      sections: [
        {
          title: "Learner configuration",
          items: LEARNER_COLUMNS.map((key) => ({
            label: LABELS[key],
            value: l[key] || "-",
          })),
        },
      ],
      event,
    });
  return {
    id: previous?.id ?? sessionId("LRN"),
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
  const first = str(record.cells.learner);
  const [name, uid] = first.split(" · ");
  const words = (name ?? "").trim().split(/\s+/);
  form.first_name = words[0] ?? "";
  form.last_name = words.slice(1).join(" ");
  form.uid = (uid ?? "").replace(/^UID\s*/i, "").trim();
  const path = str(record.cells.path).split(" · ");
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
        vizenta_admin: "va-class-learners",
        dean: "dean-learners",
        coordinator: "coordinator-learners",
      } as Record<string, string>
    )[w.role] === pageId &&
    !!pageId
  );
}
