import type { DataRecord, PageContract, Workspace } from "../contracts/types";
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

export const LOCATION_LABELS: Record<CameraVariant, [string, string]> = {
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
  devices?: string;
  attendance_type?: string;
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
  if (!c.cameras.length) e.devices = "Add at least one camera";
  if (
    !(variant === "gate" ? DIRECTIONS : ATTENDANCE_TYPES).includes(
      c.attendance_type,
    )
  )
    e.attendance_type = "Choose a valid capture mode";
  const ids = new Set<string>();
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
    const id = d.camera_id.trim().toLowerCase();
    if (id && ids.has(id)) de.camera_id = "Each camera needs a different ID";
    ids.add(id);
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
  if (previous && !previous.sessionCreated) {
    // Editing a source row: update what the form owns, keep the health
    // signals (last event, lag, state), which come from the camera service.
    const configuration = cameraRecord(page, c, variant, scope, actor, source);
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
        title: names,
        facts: configuration.detail.facts,
        sections: [
          ...previous.detail.sections.filter(
            (section) => !["Processing", "Cameras"].includes(section.title),
          ),
          ...configuration.detail.sections,
        ],
        timeline: [event, ...previous.detail.timeline],
      },
    };
  }
  const [locationA, locationB] = LOCATION_LABELS[variant];
  return {
    id:
      previous?.id ??
      `NEW-CAM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    sessionCreated: true,
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

export function cameraSetupVariant(
  w: Workspace,
  pageId?: string,
): CameraVariant | undefined {
  if (w.industry !== "education" || w.role !== "customer_admin") return;
  if (pageId === "ca-class-sources") return "room";
  if (pageId === "ca-gate-cameras") return "gate";
}
