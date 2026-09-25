import React, { useMemo, useState } from "react";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import type {
  DataRecord,
  Metric,
  PageContract,
} from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { Field, Row, Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Select } from "../../../shared/ui/Select";
import { REF, RefButton } from "./referenceUi";
import { parseCsv, pickCsv, saveCsv } from "./ClassSetup";
import { pickImages } from "./LearnerSetup";

// Surveillance users (people the cameras recognise), carried over from the
// legacy users screen (skillatracker-ui Surveillance/Users/User_table.jsx,
// Create_&_Update_User.jsx, BulkUpload.jsx). No user service is connected
// yet: changes stay in this session.

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
type Column = (typeof USER_COLUMNS)[number];
export type SurveillanceUser = Record<Column, string> & { image?: string };
const LABELS: Record<Column, string> = {
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
const isVisitor = (u: SurveillanceUser) => u.user_type === "Visitor";
const isThreat = (u: SurveillanceUser) => u.user_type === "Threat";

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
    else if (!DATE_TIME.test(u.start_time))
      e.start_time = "Use YYYY-MM-DD HH:MM";
    if (!u.end_time) e.end_time = "End time is required";
    else if (!DATE_TIME.test(u.end_time)) e.end_time = "Use YYYY-MM-DD HH:MM";
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
    uids: users.map((u) => u.uid.toLowerCase()),
    emails: users.map((u) => u.email.toLowerCase()).filter(Boolean),
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

function downloadUserTemplate() {
  const rows = [
    USER_COLUMNS.join(","),
    "E1001,Ravi,Kumar,ravi@campus.edu,9876543210,Identified,General (09:00-18:00),Main Gate,,",
    "V2001,Anita,Shah,anita@mail.com,,Visitor,,Main Gate,2026-09-28 10:00,2026-09-28 17:00",
  ];
  saveCsv(
    "surveillance_user_template.csv",
    "User upload template",
    rows.join("\r\n"),
  );
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

function FormCell({ children }: { children: React.ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: 220 }}>{children}</View>;
}

export function UserForm({
  initial,
  taken,
  submitLabel = "Add user",
  onSave,
  onCancel,
}: {
  initial?: SurveillanceUser;
  // UIDs and emails used by other users (a face identity must be unique).
  taken: { uids: string[]; emails: string[] };
  submitLabel?: string;
  onSave: (u: SurveillanceUser) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [form, setForm] = useState<SurveillanceUser>(initial ?? emptyUser());
  const [submitted, setSubmitted] = useState(!!initial);
  const errors = useMemo(() => {
    const e = validateUser(form);
    const own = (v?: string) => (v ?? "").toLowerCase();
    if (
      !e.uid &&
      form.uid.toLowerCase() !== own(initial?.uid) &&
      taken.uids.includes(form.uid.toLowerCase())
    )
      e.uid = "A user with this UID already exists";
    if (
      !e.email &&
      form.email &&
      form.email.toLowerCase() !== own(initial?.email) &&
      taken.emails.includes(form.email.toLowerCase())
    )
      e.email = "A user with this email already exists";
    return e;
  }, [form, initial, taken]);
  const set = (k: Column) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const required = (k: Column) =>
    k === "uid" ||
    k === "first_name" ||
    k === "user_type" ||
    (k === "email" && !isThreat(form)) ||
    ((k === "start_time" || k === "end_time") && isVisitor(form));
  const text = (k: Column, placeholder?: string) => (
    <FormCell key={k}>
      <Field
        label={`${LABELS[k]}${required(k) ? " *" : ""}`}
        value={form[k]}
        onChange={set(k)}
        placeholder={placeholder}
        error={submitted ? errors[k] : undefined}
      />
    </FormCell>
  );
  return (
    <View style={{ gap: 16 }}>
      <Txt size={12} color={c.muted}>
        Fields marked * are required. Email is optional for Threat users;
        visitors need a validity window.
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {text("uid", "e.g. E1001")}
        {text("first_name", "e.g. Ravi")}
        {text("last_name", "e.g. Kumar")}
        <FormCell>
          <View style={{ gap: 7 }}>
            <Txt size={12} bold>
              User type *
            </Txt>
            <Select
              field
              label="User type"
              value={form.user_type}
              options={USER_TYPES.map((t) => ({ label: t, value: t }))}
              onChange={set("user_type")}
            />
          </View>
        </FormCell>
        {text("email", "person@campus.edu")}
        {text("phone", "Digits only")}
        {!isVisitor(form) && text("shift", "e.g. General (09:00–18:00)")}
        {text("camera_group", "e.g. Main Gate (blank = all cameras)")}
        {isVisitor(form) && text("start_time", "YYYY-MM-DD HH:MM")}
        {isVisitor(form) && text("end_time", "YYYY-MM-DD HH:MM")}
      </View>
      <View style={{ gap: 7 }}>
        <Txt size={12} bold>
          Profile image
        </Txt>
        <Row style={{ flexWrap: "wrap", gap: 10 }}>
          {!!form.image && (
            <Image
              accessibilityLabel="User image"
              source={{ uri: form.image }}
              style={{ width: 56, height: 56, borderRadius: 8 }}
            />
          )}
          <RefButton
            label={form.image ? "Change image" : "Choose image"}
            icon="camera"
            onPress={() =>
              void pickImages(false).then((assets) => {
                if (assets.length)
                  setForm((f) => ({ ...f, image: assets[0].uri }));
              })
            }
          />
          {!!form.image && (
            <RefButton
              label="Remove image"
              onPress={() => setForm((f) => ({ ...f, image: undefined }))}
            />
          )}
        </Row>
        <Txt size={11} color={c.muted}>
          JPG or PNG. A clear front-facing photo is used for recognition.
        </Txt>
      </View>
      <Row style={{ justifyContent: "flex-end", gap: 8 }}>
        <RefButton label="Cancel" onPress={onCancel} />
        <RefButton
          label={submitLabel}
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

const STATUS_COLOR: Record<UserStatus, string> = {
  Valid: REF.green,
  Invalid: "#e15768",
  Duplicate: "#6a7199",
  Existing: REF.amber,
};

export function BulkUploadUsers({
  existing,
  onSave,
  onCancel,
}: {
  existing: { uids: string[]; emails: string[] };
  onSave: (users: SurveillanceUser[], fileName: string) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const narrow = useWindowDimensions().width < 768;
  const [file, setFile] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const [images, setImages] = useState(0);
  const blocking = rows.some((r) => r.status !== "Valid");
  const valid = rows.filter((r) => r.status === "Valid");
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
  const remove = (key: number) =>
    setRows((all) => all.filter((x) => x.key !== key));
  return (
    <View style={{ gap: 16 }}>
      <Row style={{ gap: 24, flexWrap: "wrap" }}>
        {step(1, "Download template", true)}
        {step(2, "Populate user template", !!file)}
        {step(3, "Populate user images", images > 0)}
      </Row>
      <Row style={{ flexWrap: "wrap", gap: 10 }}>
        <RefButton
          label="Template"
          icon="download"
          kind="export"
          onPress={downloadUserTemplate}
        />
        <RefButton
          label={file ? "Choose another file" : "Choose CSV file"}
          icon="folder"
          onPress={() =>
            void pickCsv()
              .then((picked) => {
                if (!picked) return;
                if ("error" in picked) return setError(picked.error);
                const result = checkUserUpload(parseCsv(picked.text), existing);
                setFile(picked.name);
                setRows(result.rows);
                setImages(0);
                setError(result.error ?? "");
              })
              .catch(() => setError("The file could not be read."))
          }
        />
        {rows.length > 0 && (
          <RefButton
            label="Choose images"
            icon="camera"
            onPress={() =>
              void pickImages(true).then((assets) => {
                // Image files are matched to rows by UID: E1001.jpg → E1001.
                const byUid = new Map(
                  assets.map((a) => [
                    a.name.replace(/\.[^.]+$/, "").toLowerCase(),
                    a.uri,
                  ]),
                );
                const matched = rows.filter((r) =>
                  byUid.has(r.data.uid.toLowerCase()),
                ).length;
                setRows(
                  rows.map((r) => {
                    const uri = byUid.get(r.data.uid.toLowerCase());
                    return uri ? { ...r, data: { ...r.data, image: uri } } : r;
                  }),
                );
                setImages(assets.length);
                setError(
                  assets.length && !matched
                    ? "No image file name matched a UID. Name each image after the user's UID, e.g. E1001.jpg."
                    : "",
                );
              })
            }
          />
        )}
        {!!file && (
          <Txt size={12} color={c.muted}>
            {file}
            {images ? ` · ${images} image${images === 1 ? "" : "s"}` : ""}
          </Txt>
        )}
      </Row>
      <Txt size={11} color={c.muted}>
        Only .csv is supported. In Excel, open the template and use File → Save
        As → CSV. Required columns: uid, first_name, user_type (Identified,
        Threat or Visitor). Visitor rows need start_time and end_time as
        YYYY-MM-DD HH:MM. Name each image after the user's UID (E1001.jpg).
      </Txt>
      {!!error && (
        <Txt size={12} color={c.critical}>
          {error}
        </Txt>
      )}
      {rows.length > 0 && (
        <>
          <Row style={{ flexWrap: "wrap", gap: 16 }}>
            {(Object.keys(STATUS_COLOR) as UserStatus[]).map((s) => (
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
          <View style={{ gap: 8 }}>
            {rows.map((r) => (
              <View
                key={r.key}
                style={{
                  flexDirection: narrow ? "column" : "row",
                  alignItems: narrow ? "stretch" : "center",
                  gap: narrow ? 3 : 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderLeftWidth: 4,
                  borderLeftColor: STATUS_COLOR[r.status],
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <Row
                  style={{
                    flexGrow: 1,
                    flexBasis: narrow ? "auto" : 240,
                    gap: 10,
                  }}
                >
                  {r.data.image ? (
                    <Image
                      source={{ uri: r.data.image }}
                      style={{ width: 32, height: 32, borderRadius: 6 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        backgroundColor: c.primarySoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="person" size={16} color={c.muted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Txt size={12} bold>
                      {userName(r.data) || "—"} · {r.data.uid || "—"}
                    </Txt>
                    <Txt size={11} color={c.muted}>
                      {[r.data.user_type, r.data.email, r.data.camera_group]
                        .filter(Boolean)
                        .join(" · ")}
                    </Txt>
                  </View>
                  {narrow && (
                    <RemoveRow
                      label={`Remove row ${r.key + 2}`}
                      onPress={() => remove(r.key)}
                    />
                  )}
                </Row>
                <Txt
                  size={11}
                  color={STATUS_COLOR[r.status]}
                  style={narrow ? undefined : { flexGrow: 1, flexBasis: 220 }}
                >
                  {r.status}: {r.message}
                </Txt>
                {!narrow && (
                  <RemoveRow
                    label={`Remove row ${r.key + 2}`}
                    onPress={() => remove(r.key)}
                  />
                )}
              </View>
            ))}
          </View>
          {blocking && (
            <Txt size={12} color={c.critical}>
              Remove or fix the Invalid, Duplicate and Existing rows, then
              choose the file again.
            </Txt>
          )}
        </>
      )}
      <Row style={{ justifyContent: "flex-end", gap: 8 }}>
        <RefButton label="Cancel" onPress={onCancel} />
        <RefButton
          label={`Save ${valid.length} users`}
          kind="primary"
          onPress={() => {
            if (!valid.length || blocking) return;
            onSave(
              valid.map((r) => r.data),
              file,
            );
          }}
        />
      </Row>
    </View>
  );
}

function RemoveRow({ onPress, label }: { onPress: () => void; label: string }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
    >
      <Icon name="close" size={15} color={c.muted} />
    </Pressable>
  );
}
