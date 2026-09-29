/**
 * Per-person capture gallery: every gate capture of one person, so opening one
 * image shows the others beside it. The reference rows hold only a person's
 * latest movement, so earlier days are derived from the person (UID, else
 * name) and always end with the row's own capture. The same person gets the
 * same history on every page, reload and role.
 *
 * A person can have hundreds of captures in the retention window, so they are
 * read a few days at a time (PAGE_DAYS), newest first, like a paged API.
 */
import type { DataRecord } from "../contracts/types";
import { cellText } from "../contracts/logic";
import { userIdentity } from "../contracts/userIdentity";
import { fmix32, fnv1a } from "../common/hash";
import {
  addDays,
  DEMO_SNAPSHOT as SNAPSHOT,
  hhmm as clock,
  MONTHS,
  pad,
  WEEKDAYS_SHORT as DAYS,
} from "../common/time";

/** Record types whose captures open the gallery. Add a detailType to enable a page. */
const PERSON_GALLERY_TYPES: readonly string[] = ["gate_in_out"];
export const personGalleryEnabled = (page?: { detailType?: string }) =>
  !!page && PERSON_GALLERY_TYPES.includes(page.detailType ?? "");

/** How far back the gate keeps a person's captures. */
export const RETENTION_DAYS = 30;
/** Days read at a time; earlier days load on request. */
export const PAGE_DAYS = 3;
const GATES = ["Main Gate", "Gate 2", "Gate 3", "Gate 4"];

export type Direction = "In" | "Out";
export interface PersonCapture {
  id: string;
  /** Local day, "2026-09-14". */
  day: string;
  /** "Mon, 14 Sep" */
  dayLabel: string;
  /** "18:42" */
  time: string;
  direction: Direction;
  gate: string;
  camera: string;
  /** Match confidence, 0–1. */
  confidence: number;
  /** The row's own capture. */
  current: boolean;
  /** How the face crop sits in its square: zoom and offset as a share of the size. */
  framing: { scale: number; x: number; y: number };
  /** Captured in the dark hours (the camera switches to low light). */
  lowLight: boolean;
}

// The final mix keeps keys that differ only in their last letter unrelated.
const hash = (text: string) => fmix32(fnv1a(text));
const unit = (text: string) => hash(text) / 4294967296;
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayLabel = (d: Date) =>
  `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

/**
 * The row's own capture: direction, gate and time. A time without a date is the
 * last event before the snapshot, so a time after 09:45 is the day before.
 */
export function latestCapture(record: DataRecord) {
  const status = cellText(record.cells.status);
  const direction: Direction = /^out/i.test(status) ? "Out" : "In";
  const gate = cellText(record.cells.gate) || GATES[0];
  const raw = cellText(record.cells.captured);
  const m = /^(?:([A-Z][a-z]{2}) (\d{1,2}) )?(\d{1,2}):(\d{2})$/.exec(
    raw.trim(),
  );
  const minutes = m ? Number(m[3]) * 60 + Number(m[4]) : 9 * 60;
  const snapshotMinutes = SNAPSHOT.getHours() * 60 + SNAPSHOT.getMinutes();
  const day = m?.[1]
    ? new Date(SNAPSHOT.getFullYear(), MONTHS.indexOf(m[1]), Number(m[2]))
    : addDays(SNAPSHOT, minutes > snapshotMinutes ? -1 : 0);
  return { direction, gate, day, minutes, noReturn: /no return/i.test(status) };
}

/** A resident's usual day, alternating Out and In, from the seed. */
function template(
  seed: string,
  date: Date,
): { direction: Direction; minutes: number }[] {
  const r = (k: string) => unit(`${seed}/${dayKey(date)}/${k}`);
  const between = (k: string, from: number, to: number) =>
    Math.round(from + r(k) * (to - from));
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  if (weekend) {
    if (r("stay") < 0.3) return [];
    const late = r("late") < 0.5;
    return [
      {
        direction: "Out",
        minutes: late
          ? between("o", 15 * 60, 17 * 60)
          : between("o", 9 * 60 + 30, 11 * 60 + 30),
      },
      {
        direction: "In",
        minutes: late
          ? between("i", 19 * 60, 20 * 60 + 45)
          : between("i", 12 * 60 + 45, 14 * 60),
      },
    ];
  }
  const day: { direction: Direction; minutes: number }[] = [
    { direction: "Out", minutes: between("am", 7 * 60 + 5, 8 * 60 + 55) },
  ];
  if (r("lunch") < 0.35)
    day.push(
      { direction: "In", minutes: between("li", 12 * 60 + 35, 13 * 60 + 15) },
      { direction: "Out", minutes: between("lo", 13 * 60 + 50, 14 * 60 + 35) },
    );
  day.push({
    direction: "In",
    minutes: between("pm", 16 * 60 + 25, 19 * 60 + 5),
  });
  if (r("night") < 0.18)
    day.push(
      { direction: "Out", minutes: between("no", 19 * 60 + 40, 20 * 60 + 25) },
      { direction: "In", minutes: between("ni", 21 * 60 + 10, 22 * 60 + 5) },
    );
  return day;
}

export interface CaptureDay {
  /** Local day, "2026-09-14". */
  day: string;
  /** "Mon, 14 Sep" */
  label: string;
  /** Newest first; empty when the person did not pass a gate that day. */
  captures: PersonCapture[];
}
export interface CapturePage {
  /** Calendar days, newest first. */
  days: CaptureDay[];
  hasMore: boolean;
  /** Pass as `before` to read the days before this page. */
  next?: string;
}

/** One day of the person's captures, in time order. */
function capturesOn(record: DataRecord, date: Date): PersonCapture[] {
  const person = userIdentity(record);
  const seed = person?.uid || person?.name || record.id;
  const latest = latestCapture(record);
  const others = GATES.filter((g) => g !== latest.gate);
  const today = dayKey(date) === dayKey(latest.day);
  let events = template(seed, date);
  if (today) {
    // The day runs up to the row's capture, which must follow the opposite move.
    events = events.filter((e) => e.minutes < latest.minutes - 20);
    if (latest.noReturn && latest.minutes < 7 * 60) events = [];
    while (
      events.length &&
      events[events.length - 1].direction === latest.direction
    )
      events.pop();
    events.push({ direction: latest.direction, minutes: latest.minutes });
  }
  return events.map((event, i) => {
    const current = today && i === events.length - 1;
    const key = `${seed}/${dayKey(date)}/${i}`;
    const gate =
      current || unit(key + "/gate") < 0.72
        ? latest.gate
        : others[hash(key) % others.length];
    const scale = current ? 1 : 1.04 + unit(key + "/zoom") * 0.2;
    const room = (scale - 1) / 2;
    return {
      id: `${dayKey(date)}T${clock(event.minutes)}-${event.direction}`,
      day: dayKey(date),
      dayLabel: dayLabel(date),
      time: clock(event.minutes),
      direction: event.direction,
      gate,
      camera: `${gate} · ${event.direction === "In" ? "entry" : "exit"} camera`,
      confidence: current
        ? 0.97
        : Math.round((0.88 + unit(key + "/match") * 0.11) * 100) / 100,
      current,
      framing: current
        ? { scale: 1, x: 0, y: 0 }
        : {
            scale: Math.round(scale * 100) / 100,
            x: Math.round((unit(key + "/x") - 0.5) * 1.8 * room * 1000) / 1000,
            y: Math.round((unit(key + "/y") - 0.5) * 1.8 * room * 1000) / 1000,
          },
      lowLight: event.minutes < 6 * 60 + 30 || event.minutes > 19 * 60 + 30,
    };
  });
}

const parseDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * One page of the person's captures: PAGE_DAYS calendar days, newest first,
 * ending with the row's own capture, or the days before `before`.
 */
export function captureHistory(
  record: DataRecord,
  { before, days = PAGE_DAYS }: { before?: string; days?: number } = {},
): CapturePage {
  const latest = latestCapture(record).day;
  const oldest = addDays(latest, -(RETENTION_DAYS - 1)).getTime();
  const out: CaptureDay[] = [];
  let date = before ? addDays(parseDay(before), -1) : latest;
  if (date.getTime() > latest.getTime()) date = latest;
  for (let i = 0; i < days && date.getTime() >= oldest; i++) {
    out.push({
      day: dayKey(date),
      label: dayLabel(date),
      captures: capturesOn(record, date).reverse(),
    });
    date = addDays(date, -1);
  }
  const last = out[out.length - 1];
  const hasMore = !!last && parseDay(last.day).getTime() > oldest;
  return { days: out, hasMore, next: hasMore ? last.day : undefined };
}

/** "12–14 Sep", or "30 Aug – 1 Sep" across months, for days newest first. */
export function rangeLabel(days: { day: string }[]) {
  if (!days.length) return "";
  const to = parseDay(days[0].day);
  const from = parseDay(days[days.length - 1].day);
  if (from.getTime() === to.getTime())
    return `${to.getDate()} ${MONTHS[to.getMonth()]}`;
  return from.getMonth() === to.getMonth()
    ? `${from.getDate()}–${to.getDate()} ${MONTHS[to.getMonth()]}`
    : `${from.getDate()} ${MONTHS[from.getMonth()]} – ${to.getDate()} ${MONTHS[to.getMonth()]}`;
}
