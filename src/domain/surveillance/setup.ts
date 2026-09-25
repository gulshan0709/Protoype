import type {
  DataRecord,
  Metric,
  PageContract,
  Workspace,
} from "../contracts/types";
export const USER_TYPES = ["Identified", "Threat", "Visitor"];

export const USER_COLUMNS = [
  "uid",
  "first_name",
  "last_name",
  "email",
  "phone",
  "user_type",
  "shift",
  "camera_group",
  "start_time",
  "end_time",
] as const;
export type Column = (typeof USER_COLUMNS)[number];
export type SurveillanceUser = Record<Column, string> & { image?: string };
export const LABELS: Record<Column, string> = {
  uid: "UID",
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  user_type: "User type",
  shift: "Shift",
  camera_group: "Camera group",
  start_time: "Start time",
  end_time: "End time",
};

export const emptyUser = (): SurveillanceUser =>
  ({
    ...Object.fromEntries(USER_COLUMNS.map((k) => [k, ""])),
    user_type: "Identified",
  }) as SurveillanceUser;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d$/;
export const isVisitor = (u: SurveillanceUser) => u.user_type === "Visitor";
export const isThreat = (u: SurveillanceUser) => u.user_type === "Threat";

/** Legacy rules: UID, first name and type are required; email is required
 * except for Threat; visitors need a validity window. */
export function validateUser(
  u: SurveillanceUser,
): Partial<Record<Column, string>> {
  const e: Partial<Record<Column, string>> = {};
  if (!u.uid.trim()) e.uid = "UID is required";
  if (!u.first_name.trim()) e.first_name = "First name is required";
  if (!USER_TYPES.includes(u.user_type))
    e.user_type = `User type must be ${USER_TYPES.join(", ")}`;
  if (!isThreat(u) && !u.email.trim()) e.email = "Email is required";
  else if (u.email && !EMAIL.test(u.email)) e.email = "Enter a valid email";
  if (u.phone && !/^\+?\d{7,15}$/.test(u.phone.replace(/[\s-]/g, "")))
    e.phone = "Use digits only";
  if (isVisitor(u)) {
    if (!u.start_time) e.start_time = "Start time is required";
    else if (!validDateTime(u.start_time))
      e.start_time = "Use YYYY-MM-DD HH:MM";
    if (!u.end_time) e.end_time = "End time is required";
    else if (!validDateTime(u.end_time)) e.end_time = "Use YYYY-MM-DD HH:MM";
    else if (!e.start_time && u.end_time <= u.start_time)
      e.end_time = "End time must be after start time";
  }
  return e;
}

export const userName = (u: SurveillanceUser) =>
  [u.first_name, u.last_name].filter(Boolean).join(" ");

/** UIDs and emails already listed on the page. */
export function listedIdentities(rows: DataRecord[]) {
  const users = rows
    .filter((r) => r.setupKind === "user")
    .map((r) => r.setup as SurveillanceUser);
  return {
    uids: users.map((u) => u.uid.trim().toLowerCase()),
    emails: users.map((u) => u.email.trim().toLowerCase()).filter(Boolean),
  };
}

export type UserStatus = "Valid" | "Invalid" | "Duplicate" | "Existing";
export interface UserRow {
  key: number;
  data: SurveillanceUser;
  status: UserStatus;
  message: string;
}

/** A face identity must be unique, so Invalid, Duplicate and Existing rows
 * all block saving (legacy upload rejected existing UIDs and emails). */
export function checkUserUpload(
  table: string[][],
  existing: { uids: string[]; emails: string[] },
): { rows: UserRow[]; error?: string } {
  if (!table.length) return { rows: [], error: "The file is empty." };
  const norm = (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_");
  const header = table[0].map(norm);
  if (new Set(header).size !== header.length)
    return { rows: [], error: "Duplicate column headers." };
  const index = Object.fromEntries(
    USER_COLUMNS.map((k) => [k, header.indexOf(k)]),
  ) as Record<Column, number>;
  const missing = (["uid", "first_name", "user_type"] as Column[]).filter(
    (k) => index[k] < 0,
  );
  if (missing.length)
    return {
      rows: [],
      error: `Missing template columns: ${missing.join(", ")}. Download the template and keep its header row.`,
    };
  const uids = new Set(existing.uids);
  const emails = new Set(existing.emails);
  const seenUid = new Set<string>();
  const seenEmail = new Set<string>();
  const rows = table.slice(1).map((values, i): UserRow => {
    const data = emptyUser();
    for (const k of USER_COLUMNS)
      data[k] = index[k] >= 0 ? (values[index[k]] ?? "").trim() : "";
    // Accept "visitor" / "THREAT" etc. from spreadsheets.
    data.user_type =
      USER_TYPES.find(
        (t) => t.toLowerCase() === data.user_type.toLowerCase(),
      ) ?? data.user_type;
    const errors = Object.values(validateUser(data));
    if (values.length !== header.length)
      errors.push("Row has the wrong number of fields");
    const uid = data.uid.toLowerCase();
    const email = data.email.toLowerCase();
    let status: UserStatus = "Valid";
    let message = "Ready to add";
    if (errors.length) {
      status = "Invalid";
      message = errors.join("; ");
    } else if (seenUid.has(uid) || (email && seenEmail.has(email))) {
      status = "Duplicate";
      message = "UID or email appears more than once in this file";
    } else if (uids.has(uid) || (email && emails.has(email))) {
      status = "Existing";
      message = "A user with this UID or email already exists";
    }
    seenUid.add(uid);
    if (email) seenEmail.add(email);
    return { key: i, data, status, message };
  });
  if (!rows.length)
    return { rows, error: "The file has a header row but no users." };
  return { rows };
}

/** Table record for the Surveillance Users page. */
export function userRecord(
  page: PageContract,
  u: SurveillanceUser,
  scope: string[],
  actor: string,
  source: string,
  previous?: DataRecord,
): DataRecord {
  const label = `${userName(u)} · ${u.uid}`;
  const tone =
    u.user_type === "Threat"
      ? "critical"
      : u.user_type === "Visitor"
        ? "attention"
        : "healthy";
  const byColumn: Record<string, string> = {
    user: label,
    email: u.email || "—",
    phone: u.phone || "—",
    type: u.user_type,
    shift: isVisitor(u) ? `${u.start_time} → ${u.end_time}` : u.shift || "—",
    group: u.camera_group || "All cameras",
    image: u.image ? "Provided" : "Missing",
    state: u.user_type,
  };
  return {
    id:
      previous?.id ??
      `NEW-USR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type: "surveillance_user",
    setup: u,
    setupKind: "user",
    cells: Object.fromEntries(
      page.columns.map((col) => [col.id, byColumn[col.id] ?? "—"]),
    ),
    state: { label: u.user_type, tone },
    action: "Open user",
    scope,
    detail: {
      title: label,
      eyebrow: `${u.user_type.toUpperCase()} USER`,
      summary: u.image
        ? "Face image provided. Recognition starts after the image is enrolled by the recognition service."
        : "No face image yet. Cameras cannot recognise this person until an image is added.",
      facts: [
        { label: "UID", value: u.uid },
        { label: "User type", value: u.user_type },
        { label: "Email", value: u.email || "—" },
        { label: "Phone", value: u.phone || "—" },
      ],
      sections: [
        {
          title: "Recognition",
          description: "Where and when this person is recognised",
          items: [
            { label: "Camera group", value: u.camera_group || "All cameras" },
            ...(isVisitor(u)
              ? [
                  { label: "Valid from", value: u.start_time },
                  { label: "Valid until", value: u.end_time },
                ]
              : [{ label: "Shift", value: u.shift || "—" }]),
            {
              label: "Face image",
              value: u.image ? "Provided" : "Missing",
              tone: u.image ? "healthy" : "attention",
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

/** Live counts for the page header, from the rows in scope. */
export function userMetrics(rows: DataRecord[]): Metric[] {
  const users = rows.map((r) => r.setup as SurveillanceUser | undefined);
  const count = (t: string) => users.filter((u) => u?.user_type === t).length;
  return [
    {
      label: "Identified",
      value: String(count("Identified")),
      context: "Staff, residents and learners",
      tone: "healthy",
    },
    {
      label: "Threat",
      value: String(count("Threat")),
      context: "Alert when recognised",
      tone: count("Threat") ? "critical" : "healthy",
    },
    {
      label: "Visitor",
      value: String(count("Visitor")),
      context: "Time-limited access",
      tone: "attention",
    },
    {
      label: "Without face image",
      value: String(users.filter((u) => u && !u.image).length),
      context: "Cannot be recognised yet",
      tone: users.some((u) => u && !u.image) ? "attention" : "healthy",
    },
  ];
}

function validDateTime(value: string) {
  if (!DATE_TIME.test(value)) return false;
  const date = new Date(value.replace(" ", "T") + ":00Z");
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 16) === value.replace(" ", "T")
  );
}
export function surveillanceEnabled(w: Workspace, pageId?: string) {
  return (
    w.industry === "education" &&
    ((w.role === "customer_admin" && pageId === "ca-surveillance-users") ||
      (w.role === "vizenta_admin" && pageId === "va-surveillance-users"))
  );
}
