/**
 * Camera Media Explorer, after skillatracker-ui-demo's MediaExplorer
 * (src/Components/Surveillance/MediaExplorer). The legacy screen lists a GCS
 * bucket whose folder tree is the index:
 *
 *   processed_img / org / camera / date / time-slot / frames
 *   processed_img/org_1042/102430205541/20260928/133000/1042_102430205541_20260928t133420980182_2261.jpg
 *
 * No bucket is connected here. This module is the demo store: a fixed camera
 * registry and a deterministic frame generator that produce the same tree,
 * file names and paging. Frames reuse the bundled footage in
 * src/domain/media/framePool.json. Everything is a pure function of the
 * selection, the assigned scope and `now`, so reloads show the same frames.
 */
import pool from "./framePool.json";
import type { DetectionKind } from "../contracts/detectionDemo";

export type MediaLevelKey = "org" | "camera" | "date" | "slot";
export interface MediaLevel {
  key: MediaLevelKey;
  label: string;
  plural: string;
}
/** The drill-down order; each key is also the route parameter. */
export const LEVELS: readonly MediaLevel[] = [
  { key: "org", label: "Organization", plural: "Organizations" },
  { key: "camera", label: "Camera", plural: "Cameras" },
  { key: "date", label: "Date", plural: "Dates" },
  { key: "slot", label: "Time slot", plural: "Time slots" },
];
export type MediaSelection = Partial<Record<MediaLevelKey, string>>;
export const MEDIA_ROOT = "processed_img";
export const MEDIA_SOURCE_LABEL = "Demo frame store";
export const SLOT_MINUTES = 30;
export const RETENTION_DAYS = 7;
export const FRAME_PAGE_SIZE = 250;
const ALL_CUSTOMERS = "All customers";

export interface MediaCustomer {
  folder: string;
  name: string;
  tenant: string;
  /** The Vizenta Admin scope that may browse this customer. */
  scope: string;
}
export const mediaCustomers: readonly MediaCustomer[] = [
  {
    folder: "org_1042",
    name: "Northbridge Education",
    tenant: "TEN-1042",
    scope: "Northbridge Education",
  },
  {
    folder: "org_1088",
    name: "Eastgate University",
    tenant: "TEN-1088",
    scope: "Eastgate University",
  },
];

type Scene = keyof typeof pool;
type Profile = "class" | "gate" | "hostel" | "office" | "library";
export interface MediaCamera {
  org: string;
  name: string;
  location: string;
  site: string;
  ip: string;
  port: string;
  channel: number;
  /** Active weekdays, 0 = Sunday. */
  days: readonly number[];
  start: string;
  end: string;
  status: "Active" | "Not active";
  state: string;
  /** A camera that stopped reporting keeps its older folders. */
  offline?: { daysAgo: number; at: string };
  scene: Scene;
  profile: Profile;
}
const WEEKDAYS = [1, 2, 3, 4, 5, 6];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
// Northbridge's first three match Sources & Setup and Gate → Cameras.
export const mediaCameras: readonly MediaCamera[] = [
  {
    org: "org_1042",
    name: "CAM-012",
    location: "Engineering Room 204",
    site: "Main Campus",
    ip: "10.24.30.20",
    port: "554",
    channel: 1,
    days: WEEKDAYS,
    start: "06:00",
    end: "23:00",
    status: "Active",
    state: "Online · 7/7 pass",
    scene: "classroom",
    profile: "class",
  },
  {
    org: "org_1042",
    name: "CAM-007",
    location: "Management Room 302",
    site: "North Campus",
    ip: "10.24.31.21",
    port: "554",
    channel: 2,
    days: WEEKDAYS,
    start: "06:00",
    end: "23:00",
    status: "Not active",
    state: "Degraded · sharpness fail",
    offline: { daysAgo: 2, at: "11:40:00" },
    scene: "classroom",
    profile: "class",
  },
  {
    org: "org_1042",
    name: "CAM-MG-IN1",
    location: "Main Gate · Lane 1 (Entry)",
    site: "Main Campus",
    ip: "10.24.30.11",
    port: "554",
    channel: 1,
    days: EVERY_DAY,
    start: "00:00",
    end: "24:00",
    status: "Active",
    state: "Healthy",
    scene: "corridor-a",
    profile: "gate",
  },
  {
    org: "org_1042",
    name: "CAM-NG-OUT2",
    location: "North Gate · Lane 2 (Exit)",
    site: "North Campus",
    ip: "10.24.32.12",
    port: "554",
    channel: 2,
    days: EVERY_DAY,
    start: "00:00",
    end: "24:00",
    status: "Not active",
    state: "Offline · 146 events queued",
    offline: { daysAgo: 0, at: "08:47:09" },
    scene: "corridor-b",
    profile: "gate",
  },
  {
    org: "org_1042",
    name: "CAM-HB-A1",
    location: "Hostel Block A Entrance",
    site: "Residential Campus",
    ip: "10.24.33.15",
    port: "554",
    channel: 1,
    days: EVERY_DAY,
    start: "00:00",
    end: "24:00",
    status: "Active",
    state: "Healthy",
    scene: "corridor-c",
    profile: "hostel",
  },
  {
    org: "org_1042",
    name: "CAM-ADM-02",
    location: "Admin Block Corridor",
    site: "Main Campus",
    ip: "10.24.30.52",
    port: "554",
    channel: 2,
    days: WEEKDAYS,
    start: "07:00",
    end: "21:00",
    status: "Active",
    state: "Healthy",
    scene: "hall",
    profile: "office",
  },
  {
    org: "org_1088",
    name: "EG-GATE-01",
    location: "Main Gate · Entry",
    site: "Eastgate Main",
    ip: "10.31.10.11",
    port: "554",
    channel: 1,
    days: EVERY_DAY,
    start: "00:00",
    end: "24:00",
    status: "Active",
    state: "Healthy",
    scene: "corridor-b",
    profile: "gate",
  },
  {
    org: "org_1088",
    name: "EG-GATE-02",
    location: "Main Gate · Exit",
    site: "Eastgate Main",
    ip: "10.31.10.12",
    port: "554",
    channel: 2,
    days: EVERY_DAY,
    start: "00:00",
    end: "24:00",
    status: "Active",
    state: "Healthy",
    scene: "corridor-a",
    profile: "gate",
  },
  {
    org: "org_1088",
    name: "EG-LOB-01",
    location: "Admissions Lobby",
    site: "Eastgate Main",
    ip: "10.31.11.31",
    port: "8554",
    channel: 1,
    days: WEEKDAYS,
    start: "08:00",
    end: "19:00",
    status: "Active",
    state: "Healthy",
    scene: "lobby",
    profile: "office",
  },
  {
    org: "org_1088",
    name: "EG-LIB-01",
    location: "Central Library Entrance",
    site: "Eastgate Main",
    ip: "10.31.12.21",
    port: "554",
    channel: 1,
    days: EVERY_DAY,
    start: "07:00",
    end: "22:00",
    status: "Active",
    state: "Healthy",
    scene: "library",
    profile: "library",
  },
  {
    org: "org_1088",
    name: "EG-LH-03",
    location: "Lecture Hall 3",
    site: "Eastgate Main",
    ip: "10.31.14.23",
    port: "554",
    channel: 3,
    days: [1, 2, 3, 4, 5],
    start: "08:00",
    end: "18:00",
    status: "Active",
    state: "Healthy",
    scene: "classroom",
    profile: "class",
  },
];

/**
 * The camera folder is "".join(IP.split(".")) + port + camera channel, as the
 * legacy backend builds it (create_video_from_frames). The token alone cannot
 * be split back into octets; the demo registry is what names it.
 */
export const cameraFolder = (camera: MediaCamera) =>
  camera.ip.split(".").join("") + camera.port + camera.channel;

// --- deterministic noise ------------------------------------------------------
const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};
const unit = (text: string) => hash(text) / 4294967296;

// --- dates and times ------------------------------------------------------------
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const pad = (n: number, width = 2) => String(n).padStart(width, "0");
/** Local calendar day as the folder name, e.g. "20260928". */
export const dayFolder = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const parseDay = (raw: string) => {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return dayFolder(d) === raw ? d : undefined;
};
const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};
const slotFolder = (minute: number) =>
  `${pad(Math.floor(minute / 60))}${pad(minute % 60)}00`;
const slotMinute = (raw: string) => {
  const m = /^(\d{2})(\d{2})00$/.exec(raw);
  if (!m) return undefined;
  const minute = Number(m[1]) * 60 + Number(m[2]);
  return minute < 24 * 60 && minute % SLOT_MINUTES === 0 ? minute : undefined;
};
/** 13:34:20 -> "1:34:20 PM"; seconds are optional. */
export const clockLabel = (seconds: number, withSeconds = true) => {
  const whole = Math.floor(seconds);
  const h = Math.floor(whole / 3600) % 24;
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return `${h % 12 || 12}:${pad(m)}${withSeconds ? ":" + pad(s) : ""} ${h < 12 ? "AM" : "PM"}`;
};
const addDays = (d: Date, days: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

// --- activity model ------------------------------------------------------------
// [from hour, share of a busy slot]. A busy slot holds about 1,300 frames.
const ACTIVITY: Record<Profile, [number, number][]> = {
  class: [
    [0, 0],
    [7, 0.3],
    [9, 1],
    [12.5, 0.35],
    [13.5, 0.9],
    [16.5, 0.2],
    [20, 0],
  ],
  gate: [
    [0, 0.03],
    [5, 0.25],
    [7, 1],
    [10, 0.45],
    [12, 0.7],
    [14, 0.4],
    [16.5, 0.95],
    [19.5, 0.35],
    [22, 0.08],
  ],
  hostel: [
    [0, 0.02],
    [5, 0.5],
    [8, 0.8],
    [10, 0.2],
    [17, 0.9],
    [22, 0.25],
  ],
  office: [
    [0, 0.03],
    [8, 0.6],
    [10, 0.8],
    [13, 0.5],
    [14, 0.7],
    [18, 0.25],
    [20, 0.03],
  ],
  library: [
    [0, 0],
    [7, 0.2],
    [9, 0.7],
    [13, 0.4],
    [14, 0.8],
    [20, 0.35],
    [22, 0],
  ],
};
const activity = (profile: Profile, hour: number) =>
  ACTIVITY[profile].reduce(
    (value, [from, share]) => (hour >= from ? share : value),
    0,
  );
const offlineAt = (camera: MediaCamera, now: Date) => {
  if (!camera.offline) return undefined;
  const [h, m, s] = camera.offline.at.split(":").map(Number);
  const day = addDays(now, -camera.offline.daysAgo);
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    h,
    m,
    s || 0,
  );
};
const slotStart = (day: Date, minute: number) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minute);

/** Frames recorded in one slot; 0 means the slot folder does not exist. */
export function slotFrameCount(
  camera: MediaCamera,
  date: string,
  slot: string,
  now: Date,
) {
  const day = parseDay(date);
  const minute = slotMinute(slot);
  if (!day || minute === undefined || !camera.days.includes(day.getDay()))
    return 0;
  if (minute < minutesOf(camera.start) || minute >= minutesOf(camera.end))
    return 0;
  const start = slotStart(day, minute).getTime();
  const oldest = addDays(now, -(RETENTION_DAYS - 1)).getTime();
  const cut = Math.min(
    now.getTime(),
    offlineAt(camera, now)?.getTime() ?? Infinity,
  );
  if (start < oldest || start >= cut) return 0;
  const span = SLOT_MINUTES * 60000;
  const share =
    activity(camera.profile, minute / 60) *
    (day.getDay() === 0 ? 0.4 : day.getDay() === 6 ? 0.55 : 1);
  const r = unit(`${camera.org}/${cameraFolder(camera)}/${date}/${slot}`);
  // Quiet slots are often empty: frames are only kept when something moves.
  if (share < 0.05 && r < 0.5) return 0;
  const full = Math.round((60 + share * 1100) * (0.75 + 0.5 * r));
  return Math.floor((full * Math.min(span, cut - start)) / span);
}

// --- scope and registry lookups -----------------------------------------------
export function customersIn(scope: string) {
  // Unknown scopes see nothing; only the platform-wide scope sees every customer.
  return mediaCustomers.filter(
    (c) => scope === ALL_CUSTOMERS || c.scope === scope,
  );
}
const customerOf = (folder?: string) =>
  mediaCustomers.find((c) => c.folder === folder);
const cameraOf = (org?: string, folder?: string) =>
  mediaCameras.find((c) => c.org === org && cameraFolder(c) === folder);
export const findCamera = (selection: MediaSelection) =>
  cameraOf(selection.org, selection.camera);
const numeric = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });

function slotsFor(camera: MediaCamera, date: string, now: Date) {
  const out: string[] = [];
  for (
    let m = minutesOf(camera.start);
    m < minutesOf(camera.end);
    m += SLOT_MINUTES
  ) {
    const slot = slotFolder(m);
    if (slotFrameCount(camera, date, slot, now) > 0) out.push(slot);
  }
  return out;
}
function datesFor(camera: MediaCamera, now: Date) {
  const out: string[] = [];
  for (let i = RETENTION_DAYS - 1; i >= 0; i--) {
    const date = dayFolder(addDays(now, -i));
    if (slotsFor(camera, date, now).length) out.push(date);
  }
  return out;
}
const camerasFor = (org: string, now: Date) =>
  mediaCameras.filter((c) => c.org === org && datesFor(c, now).length);

/** Folders under an already valid selection, in the store's (ascending) order. */
function childrenOf(
  valid: MediaSelection,
  key: MediaLevelKey,
  scope: string,
  now: Date,
): string[] {
  if (key === "org")
    return customersIn(scope)
      .filter((c) => camerasFor(c.folder, now).length)
      .map((c) => c.folder)
      .sort(numeric);
  if (key === "camera")
    return camerasFor(valid.org!, now).map(cameraFolder).sort(numeric);
  const camera = cameraOf(valid.org, valid.camera)!;
  return key === "date"
    ? datesFor(camera, now)
    : slotsFor(camera, valid.date!, now);
}
/** Child folders at the level being chosen. */
export function listFolders(
  selection: MediaSelection,
  scope: string,
  now: Date,
): string[] {
  const at = resolveSelection(selection, scope, now);
  const level = activeLevel(at);
  return level ? childrenOf(at, level.key, scope, now) : [];
}

/**
 * Keeps the deepest valid prefix: a level is kept only when its folder exists
 * for this scope, so a hand-edited link cannot reach another customer.
 */
export function resolveSelection(
  raw: MediaSelection,
  scope: string,
  now: Date,
): MediaSelection {
  const out: MediaSelection = {};
  for (const level of LEVELS) {
    const value = raw[level.key];
    if (!value || !childrenOf(out, level.key, scope, now).includes(value))
      break;
    out[level.key] = value;
  }
  return out;
}
/** The level being chosen, or undefined once a slot is picked. */
export const activeLevel = (selection: MediaSelection) =>
  LEVELS.find((l) => !selection[l.key]);
export const isLeaf = (selection: MediaSelection) => !activeLevel(selection);
export function prefixFor(selection: MediaSelection) {
  let prefix = MEDIA_ROOT + "/";
  for (const level of LEVELS) {
    const value = selection[level.key];
    if (!value) break;
    prefix += value + "/";
  }
  return prefix;
}

// --- labels ---------------------------------------------------------------------
export interface FolderInfo {
  label: string;
  sub: string;
  badge?: string;
  range?: string;
}
export function describeOrg(raw: string): FolderInfo {
  const customer = customerOf(raw);
  if (customer)
    return { label: customer.name, sub: `${raw} · ${customer.tenant}` };
  const id = raw.replace(/^org[_-]?/i, "");
  return { label: id ? `Org ${id}` : raw, sub: raw };
}
export function describeCamera(raw: string, org?: string): FolderInfo {
  const camera = org
    ? cameraOf(org, raw)
    : mediaCameras.find((c) => cameraFolder(c) === raw);
  if (camera)
    return {
      label: `${camera.name} · ${camera.location}`,
      sub: `${camera.site} · ${camera.ip}:${camera.port}`,
    };
  return { label: `Camera ${raw}`, sub: `IP + port + cam id · ${raw}` };
}
export function describeDate(raw: string, now: Date): FolderInfo {
  const day = parseDay(raw);
  if (!day) return { label: raw, sub: "" };
  const days = Math.round(
    (addDays(now, 0).getTime() - day.getTime()) / 86400000,
  );
  return {
    label: `${pad(day.getDate())} ${MONTHS[day.getMonth()]} ${day.getFullYear()}`,
    sub: WEEKDAY_NAMES[day.getDay()],
    badge: days === 0 ? "Today" : days === 1 ? "Yesterday" : undefined,
  };
}
export function describeSlot(raw: string): FolderInfo {
  const minute = slotMinute(raw);
  if (minute === undefined) return { label: raw, sub: "", range: raw };
  const start = clockLabel(minute * 60, false);
  return {
    label: start,
    sub: `${SLOT_MINUTES} min`,
    range: `${start} – ${clockLabel((minute + SLOT_MINUTES) * 60, false)}`,
  };
}
export function describe(
  key: MediaLevelKey,
  raw: string,
  selection: MediaSelection,
  now: Date,
) {
  return key === "org"
    ? describeOrg(raw)
    : key === "camera"
      ? describeCamera(raw, selection.org)
      : key === "date"
        ? describeDate(raw, now)
        : describeSlot(raw);
}
/** A card's second line: how much sits under a folder. */
export function folderStat(
  selection: MediaSelection,
  key: MediaLevelKey,
  raw: string,
  now: Date,
) {
  if (key === "org") {
    const n = camerasFor(raw, now).length;
    return `${n} camera${n === 1 ? "" : "s"}`;
  }
  const camera = cameraOf(
    selection.org,
    key === "camera" ? raw : selection.camera,
  );
  if (!camera) return "";
  if (key === "camera") {
    const dates = datesFor(camera, now);
    const last = dates[dates.length - 1];
    const latest = describeDate(last, now);
    return camera.status === "Active"
      ? `Active · ${dates.length} day${dates.length === 1 ? "" : "s"} retained`
      : `Not active · last frames ${latest.badge?.toLowerCase() ?? latest.label}`;
  }
  if (key === "date") {
    const slots = slotsFor(camera, raw, now);
    const frames = slots.reduce(
      (sum, slot) => sum + slotFrameCount(camera, raw, slot, now),
      0,
    );
    return `${slots.length} slot${slots.length === 1 ? "" : "s"} · ${formatCount(frames)} frames`;
  }
  const n = slotFrameCount(camera, selection.date!, raw, now);
  return `${formatCount(n)} frame${n === 1 ? "" : "s"}`;
}

// --- frames -----------------------------------------------------------------------
export interface MediaFrame {
  key: string;
  name: string;
  size: number;
  /** Bundled image in the frame pool. */
  file: string;
  /** Stills have no burned-in box; the UI draws it in this classification. */
  still?: string;
  kind?: DetectionKind;
}
export interface MediaRecording {
  key: string;
  name: string;
  size: number;
  video: number;
}
export interface FramePage {
  frames: MediaFrame[];
  recordings: MediaRecording[];
  total: number;
  hasMore: boolean;
  nextMarker?: string;
}
const KINDS: [DetectionKind, number][] = [
  ["identified", 0.72],
  ["visitor", 0.16],
  ["unidentified", 0.12],
];
const kindFor = (seed: string) => {
  let r = unit(seed);
  for (const [kind, share] of KINDS) if ((r -= share) < 0) return kind;
  return "identified";
};

/**
 * Every frame of one slot. Frames come in bursts, as when a camera keeps frames
 * while something moves: each burst replays one scene of the pool in order.
 */
export function slotFrames(
  camera: MediaCamera,
  date: string,
  slot: string,
  now: Date,
): MediaFrame[] {
  const count = slotFrameCount(camera, date, slot, now);
  if (!count) return [];
  const scene = pool[camera.scene];
  const day = parseDay(date)!;
  const minute = slotMinute(slot)!;
  const start = slotStart(day, minute).getTime();
  const cut = Math.min(
    now.getTime(),
    offlineAt(camera, now)?.getTime() ?? Infinity,
  );
  const span = Math.min(SLOT_MINUTES * 60, (cut - start) / 1000);
  const bursts = Math.ceil(count / scene.burst);
  const segment = span / bursts;
  // Busy slots tighten the burst so frames stay in time order, as a listing returns them.
  const interval = Math.min(scene.interval, (segment * 0.95) / scene.burst);
  const duration = scene.burst * interval;
  const folder = cameraFolder(camera);
  const orgId = camera.org.replace(/^org_/, "");
  const prefix = prefixFor({ org: camera.org, camera: folder, date, slot });
  // Frame numbers run through the day, so a slot continues where the last one ended.
  let sequence = 0;
  for (let m = minutesOf(camera.start); m < minute; m += SLOT_MINUTES)
    sequence += slotFrameCount(camera, date, slotFolder(m), now);
  const frames: MediaFrame[] = [];
  for (let b = 0; b < bursts; b++) {
    const seed = `${prefix}${b}`;
    const at = b * segment + unit(seed) * Math.max(0, segment - duration);
    for (let j = 0; j < scene.burst && frames.length < count; j++) {
      const offset = at + j * interval + unit(seed + "/" + j) * interval * 0.1;
      const seconds = minute * 60 + offset;
      const whole = Math.floor(seconds);
      const micro = pad(Math.floor((seconds - whole) * 1e6), 6);
      const time = `${pad(Math.floor(whole / 3600))}${pad(Math.floor((whole % 3600) / 60))}${pad(whole % 60)}`;
      // Clip frames keep their motion order; still scenes rotate so bursts differ.
      const entry = scene.frames[
        "recording" in scene ? j : (j + b) % scene.frames.length
      ] as { file: string; size: number; still?: string };
      sequence++;
      const name = `${orgId}_${folder}_${date}t${time}${micro}_${sequence}.jpg`;
      frames.push({
        key: prefix + name,
        name,
        size: entry.size,
        file: entry.file,
        ...(entry.still
          ? { still: entry.still, kind: kindFor(prefix + name) }
          : {}),
      });
    }
  }
  return frames;
}
/** The recording kept beside the frames, when the slot's scene has one. */
export function slotRecordings(
  camera: MediaCamera,
  date: string,
  slot: string,
  now: Date,
): MediaRecording[] {
  const scene = pool[camera.scene];
  if (!("recording" in scene) || !slotFrameCount(camera, date, slot, now))
    return [];
  const prefix = prefixFor({
    org: camera.org,
    camera: cameraFolder(camera),
    date,
    slot,
  });
  if (unit(prefix + "recording") > 0.45) return [];
  const name = `${cameraFolder(camera)}_${date}_${slot}.mp4`;
  return [
    {
      key: prefix + name,
      name,
      size: scene.recording.size,
      video: scene.recording.video,
    },
  ];
}

/** One page of a slot, resumed from `marker` (the offset of the next frame). */
export function listFrames(
  selection: MediaSelection,
  scope: string,
  now: Date,
  {
    marker,
    pageSize = FRAME_PAGE_SIZE,
  }: { marker?: string; pageSize?: number } = {},
): FramePage {
  const at = resolveSelection(selection, scope, now);
  const camera = isLeaf(at) ? cameraOf(at.org, at.camera) : undefined;
  if (!camera) return { frames: [], recordings: [], total: 0, hasMore: false };
  const all = slotFrames(camera, at.date!, at.slot!, now);
  const from = Math.max(0, Number(marker) || 0);
  const frames = all.slice(from, from + pageSize);
  const next = from + frames.length;
  return {
    frames,
    recordings: from ? [] : slotRecordings(camera, at.date!, at.slot!, now),
    total: all.length,
    hasMore: next < all.length,
    nextMarker: next < all.length ? String(next) : undefined,
  };
}

// 1042_102430205541_20260928t133420980182_2261.jpg
const FRAME_NAME = /^(\d+)_(\d+)_(\d{8})t(\d{6})(\d*)_(\d+)\.[a-z]+$/i;
/** Capture time and frame number from a file name, as the legacy grid shows them. */
export function describeFrame(name: string) {
  const match = FRAME_NAME.exec(name || "");
  if (!match) return { time: "", timeShort: "", sequence: "" };
  const [, , , , hhmmss, fraction, sequence] = match;
  const seconds =
    Number(hhmmss.slice(0, 2)) * 3600 +
    Number(hhmmss.slice(2, 4)) * 60 +
    Number(hhmmss.slice(4, 6));
  const millis = fraction.slice(0, 3);
  const short = clockLabel(seconds);
  return {
    time: millis ? short.replace(/ (AM|PM)$/, `.${millis} $1`) : short,
    timeShort: short,
    sequence: `#${sequence}`,
  };
}

// --- summary and formatting --------------------------------------------------------
/** Page KPIs for one scope: registry facts, not frame counts. */
export function mediaSummary(scope: string, now: Date) {
  const customers = customersIn(scope).filter(
    (c) => camerasFor(c.folder, now).length,
  );
  const cameras = mediaCameras.filter(
    (c) => customers.some((x) => x.folder === c.org) && datesFor(c, now).length,
  );
  return {
    customers: customers.length,
    cameras: cameras.length,
    active: cameras.filter((c) => c.status === "Active").length,
    inactive: cameras.filter((c) => c.status !== "Active").map((c) => c.name),
  };
}
/** 20257 -> "20 KB" */
export function formatBytes(bytes: number) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** power;
  return `${value >= 10 || power === 0 ? Math.round(value) : value.toFixed(1)} ${units[power]}`;
}
export const formatCount = (count: number) =>
  String(Math.round(count || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
