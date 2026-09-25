import React, { useMemo, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import type { DataRecord, PageContract } from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { Field, Row, Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Select } from "../../../shared/ui/Select";
import { REF, RefButton } from "./referenceUi";

// Camera setup (create / edit / delete), carried over from the legacy camera
// configuration (skillatracker-ui Classstructure/Addcamera.jsx and
// Cameraconfig.jsx): one location (building + room, or gate + lane) with
// one or more cameras. No camera service is connected yet: changes stay in
// this session and credentials are never shown outside the form.

/** "room" = class and lab spaces; "gate" = gate lanes. */
export type CameraVariant = "room" | "gate";

export interface CameraDevice {
  display_name: string;
  camera_brand: string;
  ip: string;
  port: string;
  camera_id: string;
  user_name: string;
  password: string;
}
export interface CameraConfig {
  building: string;
  room_number: string;
  capture_per_hour: string;
  detection: string;
  recognition: string;
  attendance_type: string;
  allow_duplicate_classes: boolean;
  cameras: CameraDevice[];
}

export const ATTENDANCE_TYPES = ["Periodic Snapshot", "In-Out"];
export const DIRECTIONS = ["Entry", "Exit", "Both"];
// Legacy supported brands (skillatracker-ui Common/Constant.js camera_name).
export const CAMERA_BRANDS = [
  "Hikvision",
  "Honeywell",
  "Honeywell-HC35W45R2",
  "Honeywell2",
  "Honeywell3",
  "Dahua Technology",
  "CP Plus",
  "CP Plus-2",
  "Matrix-SATATAYA",
  "Indinatus",
  "Holowits",
  "Axis",
  "Unv",
  "Unv2",
  "Unv3",
  "TP-Link",
  "MILESIGHT",
];

const LOCATION_LABELS: Record<CameraVariant, [string, string]> = {
  room: ["Building", "Room number"],
  gate: ["Gate", "Lane"],
};

export const emptyDevice = (): CameraDevice => ({
  display_name: "",
  camera_brand: "",
  ip: "",
  port: "",
  camera_id: "",
  user_name: "",
  password: "",
});
export const emptyCamera = (variant: CameraVariant): CameraConfig => ({
  building: "",
  room_number: "",
  capture_per_hour: "",
  detection: "",
  recognition: "",
  attendance_type: variant === "gate" ? "Entry" : "Periodic Snapshot",
  allow_duplicate_classes: false,
  cameras: [emptyDevice()],
});

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const HOST =
  /^(?=.{1,253}$)[a-z\d]([a-z\d-]*[a-z\d])?(\.[a-z\d]([a-z\d-]*[a-z\d])?)*$/i;

export interface CameraErrors {
  building?: string;
  room_number?: string;
  capture_per_hour?: string;
  detection?: string;
  recognition?: string;
  cameras: Partial<Record<keyof CameraDevice, string>>[];
}

/** Legacy mandatory fields, plus format checks for network settings. */
export function validateCamera(
  c: CameraConfig,
  variant: CameraVariant,
): CameraErrors {
  const [locationA, locationB] = LOCATION_LABELS[variant];
  const e: CameraErrors = { cameras: [] };
  if (!c.building.trim()) e.building = `${locationA} is required`;
  if (!c.room_number.trim()) e.room_number = `${locationB} is required`;
  if (!c.detection.trim()) e.detection = "Detection is required";
  if (!c.recognition.trim()) e.recognition = "Recognition is required";
  if (c.capture_per_hour && !/^[1-9]\d*$/.test(c.capture_per_hour))
    e.capture_per_hour = "Use a whole number";
  const names = new Set<string>();
  c.cameras.forEach((d, i) => {
    const de: Partial<Record<keyof CameraDevice, string>> = {};
    if (!d.display_name.trim()) de.display_name = "Display name is required";
    if (!d.camera_brand.trim()) de.camera_brand = "Camera brand is required";
    if (!d.ip.trim()) de.ip = "IP address is required";
    else if (
      // Digits-and-dots must be a real IPv4 address, not a host name.
      /^[\d.]+$/.test(d.ip.trim())
        ? !IPV4.test(d.ip.trim())
        : !HOST.test(d.ip.trim())
    )
      de.ip = "Enter an IPv4 address or host name";
    if (!d.port.trim()) de.port = "Port is required";
    else if (!/^\d+$/.test(d.port) || +d.port < 1 || +d.port > 65535)
      de.port = "Port must be 1–65535";
    if (!d.camera_id.trim()) de.camera_id = "Camera ID is required";
    if (!d.user_name.trim()) de.user_name = "User name is required";
    if (!d.password) de.password = "Password is required";
    const key = d.display_name.trim().toLowerCase();
    if (key && names.has(key))
      de.display_name = "Each camera needs a different display name";
    names.add(key);
    e.cameras[i] = de;
  });
  return e;
}
export const hasCameraErrors = (e: CameraErrors) =>
  Object.keys(e).some((k) => k !== "cameras" && (e as any)[k]) ||
  e.cameras.some((d) => Object.keys(d).length > 0);

/** Builds a table record in the shape of the page the camera is added to. */
export function cameraRecord(
  page: PageContract,
  c: CameraConfig,
  variant: CameraVariant,
  scope: string[],
  actor: string,
  source: string,
  previous?: DataRecord,
): DataRecord {
  const names = c.cameras.map((d) => d.display_name.trim()).join(", ");
  const count = c.cameras.length;
  const location =
    variant === "gate"
      ? `${c.building} · Lane ${c.room_number}`
      : `${c.building} · Room ${c.room_number}`;
  const byColumn: Record<string, string> =
    variant === "gate"
      ? {
          source: names,
          gate: location,
          direction: c.attendance_type,
          lastEvent: "Not connected",
          lag: "—",
          fallback: count > 1 ? `${count} cameras` : "None",
          state: "Pending",
        }
      : {
          source: names,
          type:
            c.attendance_type === "In-Out"
              ? count > 1
                ? "In-out cameras"
                : "In-out camera"
              : count > 1
                ? "Snapshot cameras"
                : "Snapshot camera",
          mapped: location,
          lastSignal: "Not connected",
          latency: "—",
          fallback: count > 1 ? `${count}-camera overlap` : "Not required",
          owner: actor,
          state: "Pending",
        };
  const cells = Object.fromEntries(
    page.columns.map((col) => [col.id, byColumn[col.id] ?? "—"]),
  );
  const event = { time: "Just now", event: source, actor };
  if (previous && !previous.setup) {
    // Editing a source row: update what the form owns, keep the health
    // signals (last event, lag, state), which come from the camera service.
    const owned = new Set(["source", "type", "mapped", "gate", "direction"]);
    return {
      ...previous,
      setup: c,
      setupKind: "camera",
      cells: Object.fromEntries(
        page.columns.map((col) => [
          col.id,
          owned.has(col.id) ? cells[col.id] : previous.cells[col.id],
        ]),
      ),
      detail: {
        ...previous.detail,
        timeline: [event, ...previous.detail.timeline],
      },
    };
  }
  const [locationA, locationB] = LOCATION_LABELS[variant];
  return {
    id:
      previous?.id ??
      `NEW-CAM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type: "camera",
    setup: c,
    setupKind: "camera",
    cells,
    state: { label: "Pending", tone: "pending" },
    action: "Open camera",
    scope,
    detail: {
      title: names,
      eyebrow: "NEW CAMERA",
      summary:
        "Added in this session. The camera service must connect and validate the stream before it can be used for attendance.",
      facts: [
        { label: locationA, value: c.building },
        { label: locationB, value: c.room_number },
        {
          label: variant === "gate" ? "Direction" : "Attendance type",
          value: c.attendance_type,
        },
        { label: "Cameras", value: String(count) },
      ],
      sections: [
        {
          title: "Processing",
          description: "From the camera form",
          items: [
            { label: "Capture per hour", value: c.capture_per_hour || "—" },
            { label: "Detection", value: c.detection },
            { label: "Recognition", value: c.recognition },
            ...(variant === "room"
              ? [
                  {
                    label: "Allowed duplicate class",
                    value: c.allow_duplicate_classes ? "Yes" : "No",
                  },
                ]
              : []),
          ],
        },
        {
          title: "Cameras",
          description: "Credentials are stored for this session only",
          items: c.cameras.map((d) => ({
            label: d.display_name,
            value: `${d.camera_brand} · ${d.ip}:${d.port}`,
            meta: `Camera ID ${d.camera_id}`,
          })),
        },
      ],
      timeline: [event, ...(previous?.detail.timeline ?? [])],
      permittedActions: [],
    },
  };
}

/** Form values for editing; source rows start from what the table shows. */
export function cameraFromRecord(
  record: DataRecord,
  variant: CameraVariant,
): CameraConfig {
  if (record.setup) {
    const s = record.setup as CameraConfig;
    return { ...s, cameras: s.cameras.map((d) => ({ ...d })) };
  }
  const form = emptyCamera(variant);
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  form.cameras[0].display_name = text(record.cells.source);
  if (variant === "gate") {
    // "Main Gate · Lane 1"
    const [gate, lane] = text(record.cells.gate).split(" · ");
    form.building = gate ?? "";
    form.room_number = (lane ?? "").replace(/^Lane\s*/i, "");
    const dir = text(record.cells.direction);
    if (DIRECTIONS.includes(dir)) form.attendance_type = dir;
  } else {
    // "Room 204" or "AI Systems Lab 2"
    const mapped = text(record.cells.mapped);
    const room = mapped.match(/^Room\s+(.+)$/i);
    form.room_number = room ? room[1] : mapped;
  }
  return form;
}

function Cell({
  children,
  basis = 200,
}: {
  children: React.ReactNode;
  basis?: number;
}) {
  return <View style={{ flexGrow: 1, flexBasis: basis }}>{children}</View>;
}

export function AddCameraForm({
  variant,
  initial,
  submitLabel = "Save camera",
  onSave,
  onCancel,
}: {
  variant: CameraVariant;
  initial?: CameraConfig;
  submitLabel?: string;
  onSave: (c: CameraConfig) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [form, setForm] = useState<CameraConfig>(
    initial ?? emptyCamera(variant),
  );
  const [submitted, setSubmitted] = useState(!!initial);
  const [shown, setShown] = useState<Record<number, boolean>>({});
  const errors = useMemo(() => validateCamera(form, variant), [form, variant]);
  const [locationA, locationB] = LOCATION_LABELS[variant];
  const err = (v?: string) => (submitted ? v : undefined);
  const set = (k: keyof CameraConfig) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setDevice = (i: number, k: keyof CameraDevice) => (v: string) =>
    setForm((f) => ({
      ...f,
      cameras: f.cameras.map((d, j) => (j === i ? { ...d, [k]: v } : d)),
    }));
  return (
    <View style={{ gap: 16 }}>
      <Txt size={12} color={c.muted}>
        Fields marked * are required.
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Cell>
          <Field
            label={`${locationA} *`}
            value={form.building}
            onChange={set("building")}
            placeholder={
              variant === "gate" ? "e.g. Main Gate" : "e.g. Engineering Block"
            }
            error={err(errors.building)}
          />
        </Cell>
        <Cell>
          <Field
            label={`${locationB} *`}
            value={form.room_number}
            onChange={set("room_number")}
            placeholder={variant === "gate" ? "e.g. 1" : "e.g. 204"}
            error={err(errors.room_number)}
          />
        </Cell>
        <Cell>
          <Field
            label="Capture per hour"
            value={form.capture_per_hour}
            onChange={set("capture_per_hour")}
            placeholder="e.g. 4"
            error={err(errors.capture_per_hour)}
          />
        </Cell>
        <Cell>
          <View style={{ gap: 7 }}>
            <Txt size={12} bold>
              {variant === "gate" ? "Direction" : "Attendance type"}
            </Txt>
            <Select
              field
              label={variant === "gate" ? "Direction" : "Attendance type"}
              value={form.attendance_type}
              options={(variant === "gate" ? DIRECTIONS : ATTENDANCE_TYPES).map(
                (o) => ({ label: o, value: o }),
              )}
              onChange={set("attendance_type")}
            />
          </View>
        </Cell>
        <Cell>
          <Field
            label="Detection *"
            value={form.detection}
            onChange={set("detection")}
            placeholder="e.g. 0.6"
            error={err(errors.detection)}
          />
        </Cell>
        <Cell>
          <Field
            label="Recognition *"
            value={form.recognition}
            onChange={set("recognition")}
            placeholder="e.g. 0.8"
            error={err(errors.recognition)}
          />
        </Cell>
        {variant === "room" && (
          <Cell>
            <Row style={{ gap: 10, minHeight: 44, marginTop: 20 }}>
              <Switch
                accessibilityLabel="Allowed duplicate class"
                value={form.allow_duplicate_classes}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, allow_duplicate_classes: v }))
                }
                trackColor={{ true: REF.cyan, false: c.border }}
              />
              <Txt size={12}>Allowed duplicate class</Txt>
            </Row>
          </Cell>
        )}
      </View>

      {form.cameras.map((d, i) => {
        const de = submitted ? (errors.cameras[i] ?? {}) : {};
        return (
          <View
            key={i}
            style={{
              gap: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
            }}
          >
            <Row style={{ justifyContent: "space-between" }}>
              <Txt size={13} bold>
                Camera {i + 1}
              </Txt>
              {form.cameras.length > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove camera ${i + 1}`}
                  hitSlop={8}
                  onPress={() =>
                    setForm((f) => ({
                      ...f,
                      cameras: f.cameras.filter((_, j) => j !== i),
                    }))
                  }
                >
                  <Icon name="close" size={16} color={c.muted} />
                </Pressable>
              )}
            </Row>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <Cell>
                <Field
                  label="Display name *"
                  value={d.display_name}
                  onChange={setDevice(i, "display_name")}
                  placeholder="e.g. CAM-E204-01"
                  error={de.display_name}
                />
              </Cell>
              <Cell>
                <View style={{ gap: 7 }}>
                  <Txt size={12} bold>
                    Camera brand *
                  </Txt>
                  <Select
                    field
                    label="Camera brand"
                    value={d.camera_brand}
                    options={[
                      { label: "Choose brand", value: "" },
                      // Keep a brand that is not in the list (edited rows).
                      ...(d.camera_brand &&
                      !CAMERA_BRANDS.includes(d.camera_brand)
                        ? [d.camera_brand]
                        : []
                      )
                        .concat(CAMERA_BRANDS)
                        .map((b) => ({ label: b, value: b })),
                    ]}
                    onChange={setDevice(i, "camera_brand")}
                  />
                  {!!de.camera_brand && (
                    <Txt size={12} color={c.critical}>
                      {de.camera_brand}
                    </Txt>
                  )}
                </View>
              </Cell>
              <Cell>
                <Field
                  label="IP address *"
                  value={d.ip}
                  onChange={setDevice(i, "ip")}
                  placeholder="e.g. 192.168.1.20"
                  error={de.ip}
                />
              </Cell>
              <Cell basis={120}>
                <Field
                  label="Port *"
                  value={d.port}
                  onChange={setDevice(i, "port")}
                  placeholder="554"
                  error={de.port}
                />
              </Cell>
              <Cell>
                <Field
                  label="Camera ID *"
                  value={d.camera_id}
                  onChange={setDevice(i, "camera_id")}
                  placeholder="e.g. 101"
                  error={de.camera_id}
                />
              </Cell>
              <Cell>
                <Field
                  label="User name *"
                  value={d.user_name}
                  onChange={setDevice(i, "user_name")}
                  placeholder="Camera login"
                  error={de.user_name}
                />
              </Cell>
              <Cell>
                <View style={{ gap: 4 }}>
                  <Field
                    label="Password *"
                    value={d.password}
                    onChange={setDevice(i, "password")}
                    placeholder="Camera password"
                    secure={!shown[i]}
                    error={de.password}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      shown[i] ? "Hide password" : "Show password"
                    }
                    onPress={() => setShown((s) => ({ ...s, [i]: !s[i] }))}
                    style={{ alignSelf: "flex-start" }}
                  >
                    <Txt size={11} color={c.link}>
                      {shown[i] ? "Hide password" : "Show password"}
                    </Txt>
                  </Pressable>
                </View>
              </Cell>
            </View>
          </View>
        );
      })}
      <Row
        style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
      >
        <RefButton
          label="Add another camera"
          icon="plus"
          onPress={() =>
            setForm((f) => ({ ...f, cameras: [...f.cameras, emptyDevice()] }))
          }
        />
        <Row style={{ gap: 8 }}>
          <RefButton label="Cancel" onPress={onCancel} />
          <RefButton
            label={submitLabel}
            kind="primary"
            onPress={() => {
              setSubmitted(true);
              if (!hasCameraErrors(errors)) onSave(form);
            }}
          />
        </Row>
      </Row>
      {submitted && hasCameraErrors(errors) && (
        <Txt size={12} color={c.critical}>
          Please fill the mandatory fields.
        </Txt>
      )}
    </View>
  );
}
