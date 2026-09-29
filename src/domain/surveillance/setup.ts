import type {
  DataRecord,
  Metric,
  PageContract,
  Workspace,
} from "../contracts/types";
import { fullName } from "../common/text";
import { readUploadTable, type UploadRow } from "../common/upload";
import { isEmail, isPhone, isRealDateTime } from "../common/validation";
import { cellsFor, sessionEvent, sessionId } from "../contracts/sessionRecords";
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
  else if (u.email && !isEmail(u.email)) e.email = "Enter a valid email";
  if (u.phone && !isPhone(u.phone, 7)) e.phone = "Use digits only";
  if (isVisitor(u)) {
    if (!u.start_time) e.start_time = "Start time is required";
    else if (!isRealDateTime(u.start_time))
      e.start_time = "Use YYYY-MM-DD HH:MM";
    if (!u.end_time) e.end_time = "End time is required";
    else if (!isRealDateTime(u.end_time)) e.end_time = "Use YYYY-MM-DD HH:MM";
    else if (!e.start_time && u.end_time <= u.start_time)
      e.end_time = "End time must be after start time";
  }
  return e;
}

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

/** A face identity must be unique, so Invalid, Duplicate and Existing rows
 * all block saving (legacy upload rejected existing UIDs and emails). */
export function checkUserUpload(
  table: string[][],
  existing: { uids: string[]; emails: string[] },
): { rows: UploadRow<SurveillanceUser>[]; error?: string } {
  const uids = new Set(existing.uids);
  const emails = new Set(existing.emails);
  const seenUid = new Set<string>();
  const seenEmail = new Set<string>();
  return readUploadTable(table, {
    columns: USER_COLUMNS,
    required: ["uid", "first_name", "user_type"],
    empty: emptyUser,
    noun: "users",
    // Accept "visitor" / "THREAT" etc. from spreadsheets.
    prepare: (data) => {
      data.user_type =
        USER_TYPES.find(
          (t) => t.toLowerCase() === data.user_type.toLowerCase(),
        ) ?? data.user_type;
    },
    validate: validateUser,
    classify: (data, valid) => {
      const uid = data.uid.toLowerCase();
      const email = data.email.toLowerCase();
      const verdict = !valid
        ? undefined
        : seenUid.has(uid) || (email && seenEmail.has(email))
          ? {
              status: "Duplicate" as const,
              message: "UID or email appears more than once in this file",
            }
          : uids.has(uid) || (email && emails.has(email))
            ? {
                status: "Existing" as const,
                message: "A user with this UID or email already exists",
              }
            : undefined;
      seenUid.add(uid);
      if (email) seenEmail.add(email);
      return verdict;
    },
  });
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
  const label = `${fullName(u)} · ${u.uid}`;
  const tone =
    u.user_type === "Threat"
      ? "critical"
      : u.user_type === "Visitor"
        ? "attention"
        : "healthy";
  return {
    id: previous?.id ?? sessionId("USR"),
    type: "surveillance_user",
    setup: u,
    setupKind: "user",
    cells: cellsFor(page, {
      user: label,
      email: u.email || "—",
      phone: u.phone || "—",
      type: u.user_type,
      shift: isVisitor(u) ? `${u.start_time} → ${u.end_time}` : u.shift || "—",
      group: u.camera_group || "All cameras",
      image: u.image ? "Provided" : "Missing",
      state: u.user_type,
    }),
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
        sessionEvent(source, actor),
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
  const threats = count("Threat");
  const withoutImage = users.filter((u) => u && !u.image).length;
  return [
    {
      label: "Identified",
      value: String(count("Identified")),
      context: "Staff, residents and learners",
      tone: "healthy",
    },
    {
      label: "Threat",
      value: String(threats),
      context: "Alert when recognised",
      tone: threats ? "critical" : "healthy",
    },
    {
      label: "Visitor",
      value: String(count("Visitor")),
      context: "Time-limited access",
      tone: "attention",
    },
    {
      label: "Without face image",
      value: String(withoutImage),
      context: "Cannot be recognised yet",
      tone: withoutImage ? "attention" : "healthy",
    },
  ];
}

export function surveillanceEnabled(w: Workspace, pageId?: string) {
  return (
    w.industry === "education" &&
    ((w.role === "customer_admin" && pageId === "ca-surveillance-users") ||
      (w.role === "vizenta_admin" && pageId === "va-surveillance-users"))
  );
}
