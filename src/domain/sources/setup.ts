// Customer Admin → Sources & Setup, carried over from the legacy
// skillatracker-ui Surveillance/SetUp (/skilla_SetUp: Camera Setup and Shift).
// No setup service is connected yet: changes are kept for this session. Pure,
// so node tests can load it.
import type { DataRecord, PageContract, Workspace } from "../contracts/types";
import { str } from "../common/text";
import { TIME } from "../common/validation";
import { endpointErrors } from "../cameras/setup";
import { cellsFor, sessionEvent, sessionId } from "../contracts/sessionRecords";

/** The Camera Setup and Shift pages of Customer Admin → Sources & Setup. */
export function sourcesSetupEnabled(
  w: Pick<Workspace, "industry" | "role">,
  pageId?: string,
) {
  return (
    w.industry === "education" &&
    w.role === "customer_admin" &&
    ["ca-setup-cameras", "ca-setup-shifts"].includes(pageId ?? "")
  );
}

// ───────────────────────── Camera Setup ─────────────────────────

export const DAYS = [
  "All Day",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];
export interface SetupCamera {
  display_name: string;
  group: string;
  brand: string;
  ip: string;
  port: string;
  camera_id: string;
  user_name: string;
  password: string;
  days: string[];
  start: string;
  end: string;
  location: string;
  camera_type: "Check In" | "Check Out";
}
/** Camera card `n` of the form; `from` is the first card, whose connection it copies. */
export const emptySetupCamera = (
  n: number,
  from?: SetupCamera,
): SetupCamera => ({
  display_name: `Camera-${n}`,
  group: "",
  brand: "",
  // A new card copies the connection of the first one (legacy behaviour).
  ip: from?.ip ?? "",
  port: from?.port ?? "",
  camera_id: "",
  user_name: from?.user_name ?? "",
  password: from?.password ?? "",
  days: ["All Day"],
  start: "",
  end: "",
  location: "",
  camera_type: "Check In",
});
export function setupCameraFromRecord(r: DataRecord): SetupCamera {
  if (r.setup) return { ...(r.setup as SetupCamera) };
  const cam = emptySetupCamera(1);
  cam.display_name = str(r.cells.display);
  cam.location = str(r.cells.location);
  return cam;
}
/** `taken`: display names already in use, trimmed and lower-case. */
export function validateSetupCamera(cam: SetupCamera, taken: string[]) {
  const e: Partial<Record<keyof SetupCamera, string>> = {};
  if (!cam.display_name.trim()) e.display_name = "Please enter display name";
  else if (taken.includes(cam.display_name.trim().toLowerCase()))
    e.display_name = "Another camera uses this name";
  if (!cam.brand) e.brand = "Please select camera brand";
  const endpoint = endpointErrors(cam);
  if (!cam.ip.trim()) e.ip = "Please enter IP address";
  else if (endpoint.ip) e.ip = endpoint.ip;
  if (!cam.port.trim()) e.port = "Please enter port";
  else if (endpoint.port) e.port = endpoint.port;
  if (!cam.camera_id.trim()) e.camera_id = "Please enter camera ID";
  if (!cam.user_name.trim()) e.user_name = "Please enter user name";
  if (!cam.password) e.password = "Please enter password";
  if (cam.start && !TIME.test(cam.start)) e.start = "Use 24-hour HH:MM";
  if (cam.end && !TIME.test(cam.end)) e.end = "Use 24-hour HH:MM";
  return e;
}
/** Every card of the form; a card's name must also differ from the other cards'. */
export const validateSetupCameras = (cams: SetupCamera[], taken: string[]) =>
  cams.map((cam, i) =>
    validateSetupCamera(cam, [
      ...taken,
      ...cams
        .filter((_, j) => j !== i)
        .map((x) => x.display_name.trim().toLowerCase()),
    ]),
  );
export function setupCameraRecord(
  page: PageContract,
  cam: SetupCamera,
  scope: string[],
  actor: string,
  source: string,
  previous?: DataRecord,
): DataRecord {
  const cells: Record<string, string> = {
    display: cam.display_name,
    location: cam.location || "—",
    brand: cam.brand,
    cameraId: cam.camera_id,
    ip: cam.ip,
    port: cam.port,
    days: cam.days.join(", ") || "—",
    start: cam.start || "—",
    end: cam.end || "—",
    status: previous ? str(previous.cells.status) : "Not active",
    state: previous ? str(previous.cells.state) : "Not connected",
  };
  return {
    ...(previous ?? {}),
    id: previous?.id ?? sessionId("CAM"),
    type: "setup_camera",
    setup: cam,
    setupKind: "setupCamera",
    cells: cellsFor(page, cells),
    state: previous
      ? previous.state
      : { label: "Not connected", tone: "pending" },
    action: "Open camera",
    scope: previous?.scope ?? scope,
    detail: {
      ...(previous?.detail ?? {}),
      title: cam.display_name,
      eyebrow: "CAMERA CONFIGURATION",
      summary:
        previous?.detail.summary ??
        "Added in this session. The camera service must connect before it can capture.",
      facts: [
        { label: "Brand", value: cam.brand },
        { label: "Endpoint", value: `${cam.ip}:${cam.port}` },
        { label: "Camera ID", value: cam.camera_id },
        { label: "Camera type", value: cam.camera_type },
      ],
      sections: [
        {
          title: "Schedule",
          description: "When the camera captures",
          items: [
            { label: "Active days", value: cells.days },
            { label: "Start", value: cells.start },
            { label: "End", value: cells.end },
            { label: "Location", value: cells.location },
            { label: "Camera group", value: cam.group || "—" },
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

// ───────────────────────── Shift ─────────────────────────

export interface Shift {
  name: string;
  start: string;
  end: string;
  startBuffer: string;
  endBuffer: string;
}
export const emptyShift = (): Shift => ({
  name: "",
  start: "",
  end: "",
  startBuffer: "0",
  endBuffer: "0",
});
export const shiftFromRecord = (r: DataRecord): Shift => ({
  ...(r.setup as Shift),
});
/** `takenNames`: other shifts' names, trimmed and lower-case. */
export function validateShift(sh: Shift, takenNames: string[]) {
  const e: Partial<Record<keyof Shift, string>> = {};
  if (!sh.name.trim()) e.name = "Please enter shift name";
  else if (takenNames.includes(sh.name.trim().toLowerCase()))
    e.name = "Shift with this name already exists";
  if (!sh.start) e.start = "Please select start time";
  else if (!TIME.test(sh.start)) e.start = "Use 24-hour HH:MM";
  if (!sh.end) e.end = "Please select end time";
  else if (!TIME.test(sh.end)) e.end = "Use 24-hour HH:MM";
  else if (!e.start && sh.start === sh.end)
    e.end = "Start time and end time cannot be the same";
  for (const k of ["startBuffer", "endBuffer"] as const)
    if (sh[k] && !/^\d+$/.test(sh[k])) e[k] = "Use whole minutes (0 or more)";
  return e;
}
export function shiftRecord(
  page: PageContract,
  sh: Shift,
  scope: string[],
  actor: string,
  source: string,
  previous?: DataRecord,
): DataRecord {
  const cells: Record<string, string> = {
    name: sh.name.trim(),
    start: sh.start,
    end: sh.end,
    startBuffer: sh.startBuffer || "0",
    endBuffer: sh.endBuffer || "0",
    state: "Active",
  };
  return {
    id: previous?.id ?? sessionId("SHF"),
    type: "shift",
    setup: sh,
    setupKind: "shift",
    cells: cellsFor(page, cells),
    state: { label: "Active", tone: "healthy" },
    action: "Open shift",
    scope: previous?.scope ?? scope,
    detail: {
      title: sh.name.trim(),
      eyebrow: "SHIFT",
      summary: `${sh.start}–${sh.end}${sh.end < sh.start ? " (overnight)" : ""}`,
      facts: [
        { label: "Start", value: sh.start },
        { label: "End", value: sh.end },
        { label: "Start buffer", value: `${cells.startBuffer} min` },
        { label: "End buffer", value: `${cells.endBuffer} min` },
      ],
      sections: [],
      timeline: [
        sessionEvent(source, actor),
        ...(previous?.detail.timeline ?? []),
      ],
      permittedActions: [],
    },
  };
}

// ───────────────────────── Surveillance Dashboard ─────────────────────────

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
/** A detection belongs to a camera when its place names the camera location. */
export function atCamera(detection: DataRecord, camera: DataRecord) {
  const place = words(str(detection.cells.camera));
  const location = words(
    str(camera.cells.location) || str(camera.cells.display),
  );
  return place.length > 0 && place.every((w) => location.includes(w));
}
