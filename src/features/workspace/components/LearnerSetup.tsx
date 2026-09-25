import React, { useMemo, useState } from "react";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import type { DataRecord, PageContract } from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { Field, Row, Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Select } from "../../../shared/ui/Select";
import { REF, RefButton } from "./referenceUi";
import { parseCsv, pickCsv, saveCsv } from "./ClassSetup";

// Add Learner, Bulk Upload Learner, Edit and Delete, carried over from the
// legacy learner screen (skillatracker-ui Learners/Learner.jsx,
// AddLearner.jsx, BulkUpload.jsx). No learner service is connected yet:
// changes stay in this session.

// Legacy template columns, plus program and section for the academic path.
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
type Column = (typeof LEARNER_COLUMNS)[number];
export type NewLearner = Record<Column, string> & { image?: string };
const REQUIRED: Column[] = ["uid", "first_name", "last_name", "type"];
const LABELS: Record<Column, string> = {
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
  return rows.flatMap((r) => {
    if (r.setupKind === "learner") return [(r.setup as NewLearner).uid];
    const first = Object.values(r.cells)[0];
    const m = typeof first === "string" ? first.match(/(\d{3,})\s*$/) : null;
    return m ? [m[1]] : [];
  });
}

export type LearnerStatus = "Valid" | "Invalid" | "Duplicate" | "Existing";
export interface LearnerRow {
  key: number;
  data: NewLearner;
  status: LearnerStatus;
  message: string;
}

/** Maps CSV rows onto the template and classifies each one. As in the legacy
 * upload, Invalid and Duplicate rows block saving; Existing only warns. */
export function checkLearnerUpload(
  table: string[][],
  existingUids: string[],
): { rows: LearnerRow[]; error?: string } {
  if (!table.length) return { rows: [], error: "The file is empty." };
  const norm = (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_");
  const header = table[0].map(norm);
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
      message = `UID ${data.uid} is already listed; it will be added again`;
    }
    seen.add(uid);
    return { key: i, data, status, message };
  });
  if (!rows.length)
    return { rows, error: "The file has a header row but no learners." };
  return { rows };
}

function downloadLearnerTemplate() {
  const example = [
    "24190",
    "Riya",
    "Sharma",
    "Female",
    "riya@college.edu",
    "9876543210",
    "2005-04-12",
    "Learner",
    "CSE 2026",
    "Computing",
    "B.Tech CSE",
    "5A",
    "parent@mail.com",
    "9876500000",
  ];
  saveCsv(
    "learner_upload_template.csv",
    "Learner upload template",
    [LEARNER_COLUMNS.join(","), example.join(",")].join("\r\n"),
  );
}

/** Image picker for learner photos (web, iOS Photos/Files, Android). */
export async function pickImages(multiple: boolean) {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/jpeg", "image/png", "image/gif"],
    multiple,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return (result.assets ?? []).filter((a) =>
    /\.(jpe?g|png|gif)$/i.test(a.name),
  );
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
  if (previous && !previous.setup) {
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
        timeline: [event, ...previous.detail.timeline],
      },
    };
  }
  return {
    id:
      previous?.id ??
      `NEW-LRN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
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

function FormCell({ children }: { children: React.ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: 220 }}>{children}</View>;
}

export function AddLearnerForm({
  initial,
  submitLabel = "Add learner",
  onSave,
  onCancel,
}: {
  initial?: NewLearner;
  submitLabel?: string;
  onSave: (l: NewLearner) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [form, setForm] = useState<NewLearner>(initial ?? emptyLearner());
  // Editing shows what still needs completing straight away.
  const [submitted, setSubmitted] = useState(!!initial);
  const [imageError, setImageError] = useState("");
  const errors = useMemo(() => validateLearner(form), [form]);
  const set = (k: Column) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const label = (k: Column) =>
    `${LABELS[k]}${REQUIRED.includes(k) ? " *" : ""}`;
  const text = (k: Column, placeholder?: string) => (
    <FormCell key={k}>
      <Field
        label={label(k)}
        value={form[k]}
        onChange={set(k)}
        placeholder={placeholder}
        error={submitted ? errors[k] : undefined}
      />
    </FormCell>
  );
  const choice = (k: Column, options: string[]) => (
    <FormCell key={k}>
      <View style={{ gap: 7 }}>
        <Txt size={12} bold>
          {label(k)}
        </Txt>
        <Select
          field
          label={LABELS[k]}
          value={form[k]}
          options={[
            ...(REQUIRED.includes(k) ? [] : [{ label: "Not set", value: "" }]),
            ...options.map((o) => ({ label: o, value: o })),
          ]}
          onChange={set(k)}
        />
        {submitted && errors[k] && (
          <Txt size={12} color={c.critical}>
            {errors[k]}
          </Txt>
        )}
      </View>
    </FormCell>
  );
  return (
    <View style={{ gap: 16 }}>
      <Txt size={12} color={c.muted}>
        Fields marked * are required.
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {text("uid", "e.g. 24031")}
        {text("first_name", "e.g. Aarav")}
        {text("last_name", "e.g. Mehta")}
        {choice("type", USER_TYPES)}
        {text("email", "learner@college.edu")}
        {text("mobile", "10–15 digits")}
        {choice("gender", GENDERS)}
        {text("dob", "YYYY-MM-DD")}
        {text("group_name", "e.g. CSE 2026")}
        {text("Department_name", "e.g. Computing")}
        {text("program", "e.g. B.Tech CSE")}
        {text("section", "e.g. 5A")}
        {text("parentsemail", "parent@mail.com")}
        {text("parentsmobile", "10–15 digits")}
      </View>
      <View style={{ gap: 7 }}>
        <Txt size={12} bold>
          Image
        </Txt>
        <Row style={{ flexWrap: "wrap", gap: 10 }}>
          {!!form.image && (
            <Image
              accessibilityLabel="Learner image"
              source={{ uri: form.image }}
              style={{ width: 56, height: 56, borderRadius: 8 }}
            />
          )}
          <RefButton
            label={form.image ? "Change image" : "Choose image"}
            icon="camera"
            onPress={() =>
              void pickImages(false).then(
                (assets) => {
                  if (!assets.length) return;
                  setImageError("");
                  setForm((f) => ({ ...f, image: assets[0].uri }));
                },
                () => setImageError("The image could not be read."),
              )
            }
          />
          {!!form.image && (
            <RefButton
              label="Remove image"
              onPress={() => setForm((f) => ({ ...f, image: undefined }))}
            />
          )}
        </Row>
        <Txt size={11} color={imageError ? c.critical : c.muted}>
          {imageError ||
            "JPEG, PNG or GIF. Used for face matching during attendance."}
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

const STATUS_COLOR: Record<LearnerStatus, string> = {
  Valid: REF.green,
  Invalid: "#e15768",
  Duplicate: "#6a7199",
  Existing: REF.amber,
};

export function BulkUploadLearner({
  existingUids,
  onSave,
  onCancel,
}: {
  existingUids: string[];
  onSave: (learners: NewLearner[], fileName: string) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const narrow = useWindowDimensions().width < 768;
  const [file, setFile] = useState("");
  const [rows, setRows] = useState<LearnerRow[]>([]);
  const [error, setError] = useState("");
  const [images, setImages] = useState(0);
  const blocking = rows.some(
    (r) => r.status === "Invalid" || r.status === "Duplicate",
  );
  const saveable = rows.filter(
    (r) => r.status === "Valid" || r.status === "Existing",
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
        {step(3, "Choose images", images > 0)}
      </Row>
      <Row style={{ flexWrap: "wrap", gap: 10 }}>
        <RefButton
          label="Template"
          icon="download"
          kind="export"
          onPress={downloadLearnerTemplate}
        />
        <RefButton
          label={file ? "Choose another file" : "Choose CSV file"}
          icon="folder"
          onPress={() =>
            void pickCsv()
              .then((picked) => {
                if (!picked) return;
                if ("error" in picked) return setError(picked.error);
                const result = checkLearnerUpload(
                  parseCsv(picked.text),
                  existingUids,
                );
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
                // Image files are matched to rows by UID: 24031.jpg → 24031.
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
                    ? "No image file name matched a UID. Name each image after the learner's UID, e.g. 24031.jpg."
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
        As → CSV. Required columns: uid, first_name, last_name, type. Images are
        optional; name each one after the learner's UID (24031.jpg).
      </Txt>
      {!!error && (
        <Txt size={12} color={c.critical}>
          {error}
        </Txt>
      )}
      {rows.length > 0 && (
        <>
          <Row style={{ flexWrap: "wrap", gap: 16 }}>
            {(Object.keys(STATUS_COLOR) as LearnerStatus[]).map((s) => (
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
                    flexBasis: narrow ? "auto" : 220,
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
                      {learnerName(r.data) || "—"} · {r.data.uid || "—"}
                    </Txt>
                    <Txt size={11} color={c.muted}>
                      {[r.data.type, r.data.email, academicPath(r.data)]
                        .filter(Boolean)
                        .join(" · ")}
                    </Txt>
                  </View>
                  {narrow && (
                    <RemoveRow
                      onPress={() =>
                        setRows((all) => all.filter((x) => x.key !== r.key))
                      }
                      label={`Remove row ${r.key + 2}`}
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
                    onPress={() =>
                      setRows((all) => all.filter((x) => x.key !== r.key))
                    }
                    label={`Remove row ${r.key + 2}`}
                  />
                )}
              </View>
            ))}
          </View>
          {blocking && (
            <Txt size={12} color={c.critical}>
              Remove or fix the Invalid and Duplicate rows, then choose the file
              again.
            </Txt>
          )}
        </>
      )}
      <Row style={{ justifyContent: "flex-end", gap: 8 }}>
        <RefButton label="Cancel" onPress={onCancel} />
        <RefButton
          label={`Save ${saveable.length} learners`}
          kind="primary"
          onPress={() => {
            if (!saveable.length || blocking) return;
            onSave(
              saveable.map((r) => r.data),
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
