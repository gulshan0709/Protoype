import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import type {
  DataRecord,
  Metric,
  PageContract,
  Tone,
} from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Field, Row, Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Select } from "../../../shared/ui/Select";

// Presence → Warden, carried over from the legacy skillatracker-ui
// Surveillance/Warden (Warden / Sub Admin Management), Surveillance/Hostel
// (Hostel Management) and Surveillance/Leave (Leave Management). No residence
// service is connected yet: changes stay in this session.

const text = (v: unknown) => (typeof v === "string" ? v : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+]?\d{7,15}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function newId(prefix: string) {
  return `NEW-${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
function FormCell({
  children,
  basis = 220,
}: {
  children: React.ReactNode;
  basis?: number;
}) {
  return <View style={{ flexGrow: 1, flexBasis: basis }}>{children}</View>;
}
function Label({ children }: { children: React.ReactNode }) {
  return (
    <Txt size={12} bold>
      {children}
    </Txt>
  );
}
function ErrorText({ children }: { children?: string }) {
  const c = useTheme();
  return children ? (
    <Txt size={12} color={c.critical}>
      {children}
    </Txt>
  ) : null;
}
function Actions({
  submitLabel,
  onSubmit,
  onCancel,
}: {
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <Row style={{ justifyContent: "flex-end", gap: 8 }}>
      <Button label="Cancel" onPress={onCancel} />
      <Button label={submitLabel} variant="primary" onPress={onSubmit} />
    </Row>
  );
}
/** Multi-select as toggle chips (works the same on web, iOS and Android). */
function Chips({
  label,
  options,
  value,
  onChange,
  empty,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  empty: string;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Label>{label}</Label>
      {options.length ? (
        <Row style={{ flexWrap: "wrap", gap: 8 }}>
          {options.map((o) => {
            const on = value.includes(o);
            return (
              <Pressable
                key={o}
                accessibilityRole="checkbox"
                accessibilityLabel={o}
                accessibilityState={{ checked: on }}
                aria-checked={on}
                onPress={() =>
                  onChange(on ? value.filter((x) => x !== o) : [...value, o])
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 99,
                  borderWidth: 1,
                  borderColor: on ? c.actionPrimary : c.border,
                  backgroundColor: on ? c.primarySoft : c.surface,
                }}
              >
                {on && <Icon name="check" size={14} color={c.link} />}
                <Txt size={12}>{o}</Txt>
              </Pressable>
            );
          })}
        </Row>
      ) : (
        <Txt size={12} color={c.muted}>
          {empty}
        </Txt>
      )}
    </View>
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
const subAdminDefaults = () =>
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
const emptyWarden = (): Warden => ({
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
  w.name = text(r.cells.warden);
  const email = text(r.cells.email);
  const phone = text(r.cells.phone);
  if (email !== "—") w.email = email;
  if (phone !== "—") w.phone = phone;
  if (text(r.cells.designation) === "Sub Admin") w.designation = "Sub Admin";
  const hostels = text(r.cells.hostels);
  if (hostels && hostels !== "—") w.hostels = hostels.split(", ");
  return w;
}
export function validateWarden(w: Warden, takenEmails: string[]) {
  const e: Partial<Record<"name" | "email" | "phone", string>> = {};
  if (!w.name.trim()) e.name = "Name is required";
  if (!w.email.trim()) e.email = "Email is required";
  else if (!EMAIL.test(w.email.trim())) e.email = "Enter a valid email";
  else if (takenEmails.includes(w.email.trim().toLowerCase()))
    e.email = "Another warden uses this email";
  if (!w.phone.trim()) e.phone = "Phone is required";
  else if (!PHONE.test(w.phone.replace(/[\s-]/g, "")))
    e.phone = "Enter a valid phone number";
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
  const byColumn: Record<string, string> = {
    warden: w.name,
    email: w.email,
    phone: w.phone,
    designation: w.designation,
    hostels,
    state: "Active",
  };
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
    id: previous?.id ?? newId("WDN"),
    type: "warden",
    setup: w,
    setupKind: "warden",
    cells: Object.fromEntries(
      page.columns.map((c) => [c.id, byColumn[c.id] ?? "—"]),
    ),
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
        { time: "Just now", event: source, actor },
        ...(previous?.detail.timeline ?? []),
      ],
      permittedActions: [],
    },
  };
}

export function WardenForm({
  initial,
  hostelOptions,
  takenEmails,
  submitLabel = "Add warden",
  onSave,
  onCancel,
}: {
  initial?: Warden;
  hostelOptions: string[];
  takenEmails: string[];
  submitLabel?: string;
  onSave: (w: Warden) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [w, setW] = useState<Warden>(initial ?? emptyWarden());
  const [submitted, setSubmitted] = useState(!!initial);
  const own = (initial?.email ?? "").toLowerCase();
  const errors = useMemo(
    () =>
      validateWarden(
        w,
        takenEmails.filter((e) => e !== own),
      ),
    [w, takenEmails, own],
  );
  const set = (k: "name" | "email" | "phone") => (v: string) =>
    setW((x) => ({ ...x, [k]: v }));
  const err = (k: keyof typeof errors) => (submitted ? errors[k] : undefined);
  const perms =
    w.designation === "Sub Admin"
      ? { ...subAdminDefaults(), ...w.permissions }
      : {};
  return (
    <View style={{ gap: 16 }}>
      <Txt size={12} color={c.muted}>
        Fields marked * are required.
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <FormCell>
          <Field
            label="Name *"
            value={w.name}
            onChange={set("name")}
            placeholder="e.g. Warden Rao"
            error={err("name")}
          />
        </FormCell>
        <FormCell>
          <Field
            label="Email *"
            value={w.email}
            onChange={set("email")}
            placeholder="warden@campus.edu"
            error={err("email")}
          />
        </FormCell>
        <FormCell>
          <Field
            label="Phone *"
            value={w.phone}
            onChange={set("phone")}
            placeholder="7–15 digits"
            error={err("phone")}
          />
        </FormCell>
      </View>
      <View style={{ gap: 7 }}>
        <Label>Role</Label>
        <Row style={{ gap: 0 }}>
          {DESIGNATIONS.map((d, i) => {
            const on = w.designation === d;
            return (
              <Pressable
                key={d}
                accessibilityRole="radio"
                accessibilityLabel={d}
                accessibilityState={{ selected: on }}
                aria-checked={on}
                // Switching role changes the baseline, so start permissions clean.
                onPress={() =>
                  setW((x) => ({ ...x, designation: d, permissions: {} }))
                }
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: on ? c.actionPrimary : c.border,
                  backgroundColor: on ? c.actionPrimary : c.surface,
                  borderTopLeftRadius: i === 0 ? 8 : 0,
                  borderBottomLeftRadius: i === 0 ? 8 : 0,
                  borderTopRightRadius: i === 1 ? 8 : 0,
                  borderBottomRightRadius: i === 1 ? 8 : 0,
                }}
              >
                <Txt size={12} bold color={on ? c.actionInk : c.text}>
                  {d}
                </Txt>
              </Pressable>
            );
          })}
        </Row>
        <Txt size={11} color={c.muted}>
          {w.designation === "Sub Admin"
            ? "Sub Admin sees the whole dashboard in view-only mode, and can download reports."
            : "Warden can view, edit and download, but only for the hostels assigned to them."}
        </Txt>
      </View>
      {w.designation === "Warden" ? (
        <Chips
          label="Assigned hostels"
          options={hostelOptions}
          value={w.hostels}
          onChange={(hostels) => setW((x) => ({ ...x, hostels }))}
          empty="Add hostels on the Hostels tab first."
        />
      ) : (
        <View
          style={{
            gap: 8,
            padding: 12,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 10,
          }}
        >
          <Label>Permissions</Label>
          <Txt size={11} color={c.muted}>
            Defaults for this role are applied automatically. Adjust only if
            this account needs something extra.
          </Txt>
          {PERMISSION_MODULES.map((m) => (
            <Row
              key={m}
              style={{
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "space-between",
              }}
            >
              <Txt size={12} bold style={{ minWidth: 130 }}>
                {m}
              </Txt>
              <Row style={{ gap: 6, flexWrap: "wrap" }}>
                {PERMISSION_GROUPS.map((g) => {
                  const on = perms[m]?.includes(g) ?? false;
                  return (
                    <Pressable
                      key={g}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${m} ${g}`}
                      accessibilityState={{ checked: on }}
                      aria-checked={on}
                      onPress={() =>
                        setW((x) => {
                          const current =
                            { ...subAdminDefaults(), ...x.permissions }[m] ??
                            [];
                          const next = on
                            ? current.filter((y) => y !== g)
                            : [...current, g];
                          return {
                            ...x,
                            permissions: { ...x.permissions, [m]: next },
                          };
                        })
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        paddingVertical: 5,
                        paddingHorizontal: 9,
                        borderRadius: 7,
                        borderWidth: 1,
                        borderColor: on ? c.actionPrimary : c.border,
                        backgroundColor: on ? c.primarySoft : c.surface,
                      }}
                    >
                      {on && <Icon name="check" size={13} color={c.link} />}
                      <Txt size={11}>{g}</Txt>
                    </Pressable>
                  );
                })}
              </Row>
            </Row>
          ))}
        </View>
      )}
      <Actions
        submitLabel={submitLabel}
        onCancel={onCancel}
        onSubmit={() => {
          setSubmitted(true);
          if (!Object.keys(errors).length) onSave(w);
        }}
      />
    </View>
  );
}

// ─────────────────────────── Hostels ───────────────────────────

export interface Hostel {
  hostel_name: string;
  closing_time: string;
  wardens: string[];
  rooms: string;
}
export function hostelFromRecord(r: DataRecord): Hostel {
  if (r.setup) return JSON.parse(JSON.stringify(r.setup)) as Hostel;
  const closing = text(r.cells.closing).match(/^([01]\d|2[0-3]):[0-5]\d/);
  return {
    hostel_name: text(r.cells.hostel),
    closing_time: closing ? closing[0] : "",
    // Reference rows describe staffing ("Chief Warden + 4"), not names.
    wardens: [],
    rooms: text(r.cells.rooms),
  };
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
      (keepStaffing ? text(previous.cells.wardens) : "—"),
    closing: h.closing_time || "—",
    rooms: h.rooms || "—",
    state: previous ? text(previous.cells.state) || "Ready" : "Setup",
  };
  const tone: Tone = previous ? previous.state.tone : "pending";
  return {
    ...(previous ?? {}),
    id: previous?.id ?? newId("HST"),
    type: "hostel",
    setup: h,
    setupKind: "hostel",
    cells: Object.fromEntries(
      page.columns.map((c) => [c.id, cells[c.id] ?? "—"]),
    ),
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
        { time: "Just now", event: source, actor },
        ...(previous?.detail.timeline ?? []),
      ],
      permittedActions: [],
    },
  };
}
export function HostelForm({
  initial,
  wardenOptions,
  takenNames,
  submitLabel = "Add hostel",
  onSave,
  onCancel,
}: {
  initial?: Hostel;
  wardenOptions: string[];
  takenNames: string[];
  submitLabel?: string;
  onSave: (h: Hostel) => void;
  onCancel: () => void;
}) {
  const [h, setH] = useState<Hostel>(
    initial ?? { hostel_name: "", closing_time: "", wardens: [], rooms: "" },
  );
  const [submitted, setSubmitted] = useState(!!initial);
  const own = (initial?.hostel_name ?? "").toLowerCase();
  const errors = useMemo(() => {
    const e: Partial<Record<"hostel_name" | "closing_time", string>> = {};
    if (!h.hostel_name.trim()) e.hostel_name = "Hostel name is required";
    else if (
      h.hostel_name.trim().toLowerCase() !== own &&
      takenNames.includes(h.hostel_name.trim().toLowerCase())
    )
      e.hostel_name = "A hostel with this name already exists";
    if (h.closing_time && !TIME.test(h.closing_time))
      e.closing_time = "Use 24-hour HH:MM";
    return e;
  }, [h, takenNames, own]);
  const err = (k: keyof typeof errors) => (submitted ? errors[k] : undefined);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <FormCell>
          <Field
            label="Hostel name *"
            value={h.hostel_name}
            onChange={(v) => setH((x) => ({ ...x, hostel_name: v }))}
            placeholder="e.g. Hostel D"
            error={err("hostel_name")}
          />
        </FormCell>
        <FormCell basis={160}>
          <Field
            label="Closing time"
            value={h.closing_time}
            onChange={(v) => setH((x) => ({ ...x, closing_time: v }))}
            placeholder="HH:MM, e.g. 22:30"
            error={err("closing_time")}
          />
        </FormCell>
        <FormCell>
          <Field
            label="Blocks / rooms"
            value={h.rooms}
            onChange={(v) => setH((x) => ({ ...x, rooms: v }))}
            placeholder="e.g. 2 blocks · 180 rooms"
          />
        </FormCell>
      </View>
      <Chips
        label="Select wardens"
        options={wardenOptions}
        value={h.wardens}
        onChange={(wardens) => setH((x) => ({ ...x, wardens }))}
        empty="Add wardens on the Wardens tab first."
      />
      <Actions
        submitLabel={submitLabel}
        onCancel={onCancel}
        onSubmit={() => {
          setSubmitted(true);
          if (!Object.keys(errors).length) onSave(h);
        }}
      />
    </View>
  );
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
export const leaveDays = (l: Leave) =>
  Math.round((Date.parse(l.end_date) - Date.parse(l.start_date)) / 86400000) +
  1;
export function leaveFromRecord(r: DataRecord): Leave {
  if (r.setup) return { ...(r.setup as Leave) };
  const status = text(r.cells.status);
  return {
    student: text(r.cells.student),
    status: (LEAVE_STATUSES as readonly string[]).includes(status)
      ? (status as Leave["status"])
      : "Pending",
    start_date: text(r.cells.start),
    end_date: text(r.cells.end),
    reason: text(r.cells.reason),
  };
}
export const leaveEditable = (r: DataRecord) =>
  text(r.cells.status) === "Pending";
export function leaveRecord(
  page: PageContract,
  l: Leave,
  scope: string[],
  actor: string,
  source: string,
  previous?: DataRecord,
): DataRecord {
  const cells: Record<string, string> = {
    student: l.student,
    start: l.start_date,
    end: l.end_date,
    count: String(leaveDays(l)),
    reason: l.reason,
    status: l.status,
    state: l.status,
  };
  const tone: Tone =
    l.status === "Approved"
      ? "complete"
      : l.status === "Rejected"
        ? "critical"
        : "pending";
  return {
    ...(previous ?? {}),
    id: previous?.id ?? newId("LV"),
    type: "leave",
    setup: l,
    setupKind: "leave",
    cells: Object.fromEntries(
      page.columns.map((c) => [c.id, cells[c.id] ?? "—"]),
    ),
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
        { time: "Just now", event: source, actor },
        ...(previous?.detail.timeline ?? []),
      ],
      permittedActions: [],
    },
  };
}
export function LeaveForm({
  initial,
  students,
  submitLabel = "Create leave",
  onSave,
  onCancel,
}: {
  initial?: Leave;
  students: string[];
  submitLabel?: string;
  onSave: (l: Leave) => void;
  onCancel: () => void;
}) {
  const [l, setL] = useState<Leave>(
    initial ?? {
      student: "",
      status: "Pending",
      start_date: "",
      end_date: "",
      reason: "",
    },
  );
  const [submitted, setSubmitted] = useState(!!initial);
  const errors = useMemo(() => {
    const e: Partial<Record<keyof Leave, string>> = {};
    if (!l.student) e.student = "Please select a student";
    if (!l.start_date) e.start_date = "Start date is required";
    else if (!validDate(l.start_date)) e.start_date = "Use YYYY-MM-DD";
    if (!l.end_date) e.end_date = "End date is required";
    else if (!validDate(l.end_date)) e.end_date = "Use YYYY-MM-DD";
    else if (!e.start_date && l.end_date < l.start_date)
      e.end_date = "End date is before start date";
    if (!l.reason.trim()) e.reason = "Please provide a reason";
    return e;
  }, [l]);
  const err = (k: keyof Leave) => (submitted ? errors[k] : undefined);
  const set = (k: keyof Leave) => (v: string) =>
    setL((x) => ({ ...x, [k]: v }));
  const valid =
    !errors.start_date && !errors.end_date && l.start_date && l.end_date;
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <FormCell>
          <View style={{ gap: 7 }}>
            <Label>Select student *</Label>
            <Select
              label="Select student"
              value={l.student}
              options={[
                { label: "Choose a student", value: "" },
                ...students.map((s) => ({ label: s, value: s })),
              ]}
              onChange={set("student")}
            />
            <ErrorText>{err("student")}</ErrorText>
          </View>
        </FormCell>
        <FormCell basis={160}>
          <View style={{ gap: 7 }}>
            <Label>Status</Label>
            <Select
              label="Status"
              value={l.status}
              options={LEAVE_STATUSES.map((s) => ({ label: s, value: s }))}
              onChange={set("status")}
            />
          </View>
        </FormCell>
        <FormCell basis={160}>
          <Field
            label="Start date *"
            value={l.start_date}
            onChange={set("start_date")}
            placeholder="YYYY-MM-DD"
            error={err("start_date")}
          />
        </FormCell>
        <FormCell basis={160}>
          <Field
            label="End date *"
            value={l.end_date}
            onChange={set("end_date")}
            placeholder="YYYY-MM-DD"
            error={err("end_date")}
          />
        </FormCell>
      </View>
      <Field
        label="Reason *"
        value={l.reason}
        onChange={set("reason")}
        placeholder="e.g. Family function at home"
        multiline
        error={err("reason")}
      />
      {valid && (
        <Txt size={12}>
          Leave count: {leaveDays(l)} day{leaveDays(l) === 1 ? "" : "s"}
        </Txt>
      )}
      <Actions
        submitLabel={submitLabel}
        onCancel={onCancel}
        onSubmit={() => {
          setSubmitted(true);
          if (!Object.keys(errors).length) onSave(l);
        }}
      />
    </View>
  );
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

function validDate(value: string) {
  return (
    DATE.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
