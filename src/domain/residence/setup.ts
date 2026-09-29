// Presence → Warden, carried over from the legacy skillatracker-ui
// Surveillance/Warden (Warden / Sub Admin Management), Surveillance/Hostel
// (Hostel Management) and Surveillance/Leave (Leave Management). No residence
// service is connected yet: changes stay in this session. Pure, so node tests
// can load it.
import type {
  DataRecord,
  Metric,
  PageContract,
  Tone,
  Workspace,
} from "../contracts/types";
import { str } from "../common/text";
import { TIME, isEmail, isPhone, isRealDate } from "../common/validation";
import { cellsFor, sessionEvent, sessionId } from "../contracts/sessionRecords";

/** Warden setup pages: Customer Admin and Vizenta Admin → Warden. */
export function residenceSetupEnabled(
  w: Pick<Workspace, "industry" | "role">,
  pageId?: string,
) {
  return (
    w.industry === "education" &&
    ["customer_admin", "vizenta_admin"].includes(w.role) &&
    /^(ca|va)-warden-(wardens|hostels|leaves)$/.test(pageId ?? "")
  );
}

// ─────────────────────────── Wardens ───────────────────────────

export const DESIGNATIONS = ["Warden", "Sub Admin"] as const;
export const PERMISSION_MODULES = [
  "Hostels",
  "Leave management",
  "In/Out",
  "Gate attendance",
  "Reports",
];
export const PERMISSION_GROUPS = ["View", "Edit", "Download"];
/** Sub Admin baseline: view everything and download reports. */
export const subAdminDefaults = () =>
  Object.fromEntries(
    PERMISSION_MODULES.map((m) => [m, ["View", "Download"]]),
  ) as Record<string, string[]>;

export interface Warden {
  name: string;
  email: string;
  phone: string;
  designation: (typeof DESIGNATIONS)[number];
  hostels: string[];
  permissions: Record<string, string[]>;
}
export const emptyWarden = (): Warden => ({
  name: "",
  email: "",
  phone: "",
  designation: "Warden",
  hostels: [],
  permissions: {},
});
export function wardenFromRecord(r: DataRecord): Warden {
  if (r.setup) return JSON.parse(JSON.stringify(r.setup)) as Warden;
  const w = emptyWarden();
  w.name = str(r.cells.warden);
  const email = str(r.cells.email);
  const phone = str(r.cells.phone);
  if (email !== "—") w.email = email;
  if (phone !== "—") w.phone = phone;
  if (str(r.cells.designation) === "Sub Admin") w.designation = "Sub Admin";
  const hostels = str(r.cells.hostels);
  if (hostels && hostels !== "—") w.hostels = hostels.split(", ");
  return w;
}
/** `takenEmails`: other wardens' emails, trimmed and lower-case. */
export function validateWarden(w: Warden, takenEmails: string[]) {
  const e: Partial<Record<"name" | "email" | "phone", string>> = {};
  if (!w.name.trim()) e.name = "Name is required";
  if (!w.email.trim()) e.email = "Email is required";
  else if (!isEmail(w.email.trim())) e.email = "Enter a valid email";
  else if (takenEmails.includes(w.email.trim().toLowerCase()))
    e.email = "Another warden uses this email";
  if (!w.phone.trim()) e.phone = "Phone is required";
  else if (!isPhone(w.phone, 7)) e.phone = "Enter a valid phone number";
  return e;
}
export function wardenRecord(
  page: PageContract,
  w: Warden,
  scope: string[],
  actor: string,
  source: string,
  previous?: DataRecord,
): DataRecord {
  const hostels =
    w.designation === "Sub Admin"
      ? "All (view only)"
      : w.hostels.join(", ") || "—";
  const perms =
    w.designation === "Sub Admin"
      ? PERMISSION_MODULES.map((m) => ({
          label: m,
          value:
            (w.permissions[m] ?? subAdminDefaults()[m]).join(", ") || "None",
        }))
      : [
          {
            label: "Rights",
            value: "View, edit and download for assigned hostels",
          },
        ];
  return {
    id: previous?.id ?? sessionId("WDN"),
    type: "warden",
    setup: w,
    setupKind: "warden",
    cells: cellsFor(page, {
      warden: w.name,
      email: w.email,
      phone: w.phone,
      designation: w.designation,
      hostels,
      state: "Active",
    }),
    state: { label: "Active", tone: "healthy" },
    action: "Open warden",
    scope: previous?.scope ?? scope,
    detail: {
      title: w.name,
      eyebrow: w.designation.toUpperCase(),
      summary:
        w.designation === "Sub Admin"
          ? "Sees the whole residence dashboard in view-only mode and can download reports."
          : "Can view, edit and download, but only for the hostels assigned to them.",
      facts: [
        { label: "Designation", value: w.designation },
        { label: "Email", value: w.email },
        { label: "Phone", value: w.phone },
        { label: "Hostels", value: hostels },
      ],
      sections: [
        { title: "Permissions", description: "Effective rights", items: perms },
      ],
      timeline: [
        sessionEvent(source, actor),
        ...(previous?.detail.timeline ?? []),
      ],
      permittedActions: [],
    },
  };
}

// ─────────────────────────── Hostels ───────────────────────────

export interface Hostel {
  hostel_name: string;
  closing_time: string;
  wardens: string[];
  rooms: string;
}
export const emptyHostel = (): Hostel => ({
  hostel_name: "",
  closing_time: "",
  wardens: [],
  rooms: "",
});
export function hostelFromRecord(r: DataRecord): Hostel {
  if (r.setup) return JSON.parse(JSON.stringify(r.setup)) as Hostel;
  // "22:30 (weekdays)": the time the cell starts with.
  const closing = str(r.cells.closing).slice(0, 5);
  return {
    hostel_name: str(r.cells.hostel),
    closing_time: TIME.test(closing) ? closing : "",
    // Reference rows describe staffing ("Chief Warden + 4"), not names.
    wardens: [],
    rooms: str(r.cells.rooms),
  };
}
/** `takenNames`: other hostels' names, trimmed and lower-case. */
export function validateHostel(h: Hostel, takenNames: string[]) {
  const e: Partial<Record<"hostel_name" | "closing_time", string>> = {};
  if (!h.hostel_name.trim()) e.hostel_name = "Hostel name is required";
  else if (takenNames.includes(h.hostel_name.trim().toLowerCase()))
    e.hostel_name = "A hostel with this name already exists";
  if (h.closing_time && !TIME.test(h.closing_time))
    e.closing_time = "Use 24-hour HH:MM";
  return e;
}
export function hostelRecord(
  page: PageContract,
  h: Hostel,
  scope: string[],
  actor: string,
  source: string,
  previous?: DataRecord,
): DataRecord {
  const keepStaffing = previous && !h.wardens.length;
  const cells: Record<string, string> = {
    hostel: h.hostel_name,
    wardens:
      h.wardens.join(", ") ||
      (keepStaffing ? str(previous.cells.wardens) : "—"),
    closing: h.closing_time || "—",
    rooms: h.rooms || "—",
    state: previous ? str(previous.cells.state) || "Ready" : "Setup",
  };
  const tone: Tone = previous ? previous.state.tone : "pending";
  return {
    ...(previous ?? {}),
    id: previous?.id ?? sessionId("HST"),
    type: "hostel",
    setup: h,
    setupKind: "hostel",
    cells: cellsFor(page, cells),
    state: previous ? previous.state : { label: "Setup", tone },
    action: "Open hostel",
    scope: previous?.scope ?? scope,
    detail: {
      ...(previous?.detail ?? {}),
      title: h.hostel_name,
      eyebrow: "HOSTEL",
      summary:
        previous?.detail.summary ??
        "Added in this session. Assign rooms and gate sources before residents are tracked.",
      facts: [
        { label: "Closing time", value: h.closing_time || "—" },
        { label: "Wardens", value: cells.wardens },
        { label: "Blocks / rooms", value: h.rooms || "—" },
      ],
      sections: previous?.detail.sections ?? [],
      timeline: [
        sessionEvent(source, actor),
        ...(previous?.detail.timeline ?? []),
      ],
      permittedActions: [],
    },
  };
}

// ──────────────────────── Leave management ────────────────────────

export const LEAVE_STATUSES = ["Pending", "Approved", "Rejected"] as const;
export interface Leave {
  student: string;
  status: (typeof LEAVE_STATUSES)[number];
  start_date: string;
  end_date: string;
  reason: string;
}
export const emptyLeave = (): Leave => ({
  student: "",
  status: "Pending",
  start_date: "",
  end_date: "",
  reason: "",
});
/** Days from start to end date, both included. */
export const leaveDays = (l: Leave) =>
  Math.round((Date.parse(l.end_date) - Date.parse(l.start_date)) / 86400000) +
  1;
export function leaveFromRecord(r: DataRecord): Leave {
  if (r.setup) return { ...(r.setup as Leave) };
  const status = str(r.cells.status);
  return {
    student: str(r.cells.student),
    status: (LEAVE_STATUSES as readonly string[]).includes(status)
      ? (status as Leave["status"])
      : "Pending",
    start_date: str(r.cells.start),
    end_date: str(r.cells.end),
    reason: str(r.cells.reason),
  };
}
/** Only pending leave can be edited or deleted. */
export const leaveEditable = (r: DataRecord) =>
  str(r.cells.status) === "Pending";
export function validateLeave(l: Leave) {
  const e: Partial<Record<keyof Leave, string>> = {};
  if (!l.student) e.student = "Please select a student";
  if (!l.start_date) e.start_date = "Start date is required";
  else if (!isRealDate(l.start_date)) e.start_date = "Use YYYY-MM-DD";
  if (!l.end_date) e.end_date = "End date is required";
  else if (!isRealDate(l.end_date)) e.end_date = "Use YYYY-MM-DD";
  else if (!e.start_date && l.end_date < l.start_date)
    e.end_date = "End date is before start date";
  if (!l.reason.trim()) e.reason = "Please provide a reason";
  return e;
}
export function leaveRecord(
  page: PageContract,
  l: Leave,
  scope: string[],
  actor: string,
  source: string,
  previous?: DataRecord,
): DataRecord {
  const tone: Tone =
    l.status === "Approved"
      ? "complete"
      : l.status === "Rejected"
        ? "critical"
        : "pending";
  return {
    ...(previous ?? {}),
    id: previous?.id ?? sessionId("LV"),
    type: "leave",
    setup: l,
    setupKind: "leave",
    cells: cellsFor(page, {
      student: l.student,
      start: l.start_date,
      end: l.end_date,
      count: String(leaveDays(l)),
      reason: l.reason,
      status: l.status,
      state: l.status,
    }),
    state: { label: l.status, tone },
    action: "Open leave",
    scope: previous?.scope ?? scope,
    detail: {
      title: `${l.student} · leave`,
      eyebrow: "LEAVE APPLICATION",
      summary: `${leaveDays(l)} day${leaveDays(l) === 1 ? "" : "s"} · ${l.reason}`,
      facts: [
        { label: "Status", value: l.status },
        { label: "Start date", value: l.start_date },
        { label: "End date", value: l.end_date },
        { label: "Leave count", value: String(leaveDays(l)) },
      ],
      sections: previous?.detail.sections ?? [],
      timeline: [
        sessionEvent(source, actor),
        ...(previous?.detail.timeline ?? []),
      ],
      permittedActions: [],
    },
  };
}

// ───────────────────────── Live counts ─────────────────────────

const count = (rows: DataRecord[], test: (r: DataRecord) => boolean) =>
  String(rows.filter(test).length);
export function wardenMetrics(rows: DataRecord[]): Metric[] {
  return [
    {
      label: "Wardens",
      value: count(rows, (r) => r.cells.designation === "Warden"),
      context: "Assigned hostels only",
      tone: "healthy",
    },
    {
      label: "Sub admins",
      value: count(rows, (r) => r.cells.designation === "Sub Admin"),
      context: "View-only dashboard",
      tone: "healthy",
    },
    {
      label: "Details missing",
      value: count(rows, (r) => r.cells.email === "—" || r.cells.phone === "—"),
      context: "Email or phone to add",
      tone: rows.some((r) => r.cells.email === "—") ? "attention" : "healthy",
    },
  ];
}
export function hostelMetrics(rows: DataRecord[]): Metric[] {
  return [
    {
      label: "Hostels",
      value: String(rows.length),
      context: "In scope",
      tone: "healthy",
    },
    {
      label: "Without named warden",
      value: count(
        rows,
        (r) => !(r.setup as Hostel | undefined)?.wardens.length,
      ),
      context: "Assign on Edit",
      tone: "attention",
    },
    {
      label: "Not ready",
      value: count(rows, (r) => r.state.tone !== "healthy"),
      context: "Setup, review or blocked",
      tone: rows.some((r) => r.state.tone === "critical")
        ? "critical"
        : "attention",
    },
  ];
}
export function leaveMetrics(rows: DataRecord[]): Metric[] {
  return [
    {
      label: "Pending",
      value: count(rows, (r) => r.cells.status === "Pending"),
      context: "Awaiting a decision",
      tone: "pending",
    },
    {
      label: "Approved",
      value: count(rows, (r) => r.cells.status === "Approved"),
      context: "Explains an exit",
      tone: "healthy",
    },
    {
      label: "Rejected",
      value: count(rows, (r) => r.cells.status === "Rejected"),
      context: "Exit not covered",
      tone: "critical",
    },
  ];
}
