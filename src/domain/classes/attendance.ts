import type { Cell, DataRecord } from "../contracts/types";

/*
 * Per-learner attendance for one class or lab session, derived from the
 * session row the user opened. The roster is the class's mapped learners;
 * the row's own figures ("59 / 68", "3 low confidence", "28 now") decide how
 * many learners are present, need review or are absent, so the detail always
 * agrees with the table. Assignment is seeded by class and session start, so
 * the Dean, Coordinator and Faculty views of the same class show the same
 * learners present.
 */

export type AttendanceStatus = "present" | "late" | "review" | "absent" | "scheduled";
export interface SessionLearner {
  uid: string;
  name: string;
  email: string;
  status: AttendanceStatus;
  /** First verified capture, "—" when there is none. */
  checkIn: string;
  confidence: string;
}
export interface ClassSession {
  title: string;
  subtitle: string;
  start: string;
  end?: string;
  mode: "Snapshot" | "Continuous";
  upcoming: boolean;
  learners: SessionLearner[];
  counts: Record<AttendanceStatus, number> & { total: number; attended: number };
}

/** Pages whose rows are class or lab sessions with a roster. */
const sessionPages =
  /^(ca-class-coverage|(dean|coordinator|faculty)-(classes|labs)|faculty-attendance-today)$/;

const text = (value: Cell | undefined): string =>
  value == null
    ? ""
    : typeof value === "object"
      ? String(value.primary ?? value.label ?? value.value ?? "")
      : String(value);
function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Same pools and formula as the class rosters in contracts/demoData.ts, so a
// generated roster continues the mapped one without repeating a learner.
const firsts = ["Aarav", "Riya", "Kabir", "Ananya", "Arjun", "Priya", "Neha", "Dev", "Meera", "Rahul", "Isha", "Karan"];
const lasts = ["Mehta", "Sharma", "Rao", "Das", "Nair", "Sen", "Patel", "Gupta"];
const moreLasts = ["Iyer", "Menon", "Reddy", "Joshi", "Kapoor", "Bose", "Shah", "Verma"];
function learnerAt(j: number) {
  const pool = j < firsts.length * lasts.length ? lasts : moreLasts;
  return {
    uid: String(24031 + j),
    name: firsts[j % firsts.length] + " " + pool[(j + Math.floor(j / firsts.length)) % pool.length],
    email: "student." + (24031 + j) + "@northbridge.edu",
  };
}

const clock = (minutes: number) =>
  String(Math.floor(minutes / 60) % 24).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const cellsOf = (record: DataRecord) =>
  Object.fromEntries(Object.entries(record.cells).map(([k, v]) => [k, text(v)])) as Record<string, string>;
const titleOf = (record: DataRecord, cells = cellsOf(record)) =>
  cells.class ||
  cells.lab ||
  cells.space ||
  (!/\d{2}:\d{2}/.test(cells.session ?? "") && cells.session) ||
  record.detail.title;
/** Course code shared by a class's views ("CS 301" in "Room 204 · CS 301"). */
const courseOf = (title: string) => title.match(/\b[A-Z]{2,4}\s?\d{3}\b/)?.[0]?.replace(/\s/, " ");
/** Counts a row states itself: "59 / 68", "28 now" of 30 expected, "52 / 54 mapped". */
function statedCounts(cells: Record<string, string>) {
  const fraction = /(\d+)\s*\/\s*(\d+)/;
  let attended: number | undefined;
  let total: number | undefined;
  const ratio = cells.attendance?.match(fraction);
  if (ratio) [attended, total] = [Number(ratio[1]), Number(ratio[2])];
  if (total === undefined && cells.expected) total = parseInt(cells.expected, 10) || undefined;
  if (attended === undefined && cells.present) attended = parseInt(cells.present, 10) || undefined;
  if (total === undefined && cells.roster) {
    const r = cells.roster.match(fraction);
    total = r ? Number(r[2]) : parseInt(cells.roster, 10) || undefined;
  }
  if (total === undefined)
    for (const v of Object.values(cells)) {
      const m = v.match(/(\d+)\s*\/\s*(\d+)\s+mapped/);
      if (m) total = Number(m[2]);
    }
  const lowConfidence = Number(cells.exceptions?.match(/(\d+)\s+low confidence/i)?.[1] ?? 0);
  return { attended, total, lowConfidence };
}

/**
 * `related` holds the other session rows of the tenant (Classes and Labs of
 * every persona). A row without its own count (Faculty's timetable, the
 * admin's coverage view) borrows the count of the same class there, so every
 * view of one session shows the same learners present.
 */
export function classSession(
  pageId: string,
  record: DataRecord,
  related: DataRecord[] = [],
): ClassSession | undefined {
  if (!sessionPages.test(pageId)) return undefined;
  const cells = cellsOf(record);
  const setup = (record.setup ?? {}) as Record<string, unknown>;
  let { attended, total, lowConfidence } = statedCounts(cells);
  const title = titleOf(record, cells);
  const range = Object.values(cells)
    .map((v) => v.match(/(\d{2}:\d{2})\s?[–-]\s?(\d{2}:\d{2})/))
    .find(Boolean);
  const single = (cells.session ?? "").match(/\d{2}:\d{2}/)?.[0];
  const start = range?.[1] ?? single ?? (setup.start_time as string | undefined) ?? "09:00";
  const lab = setup.Tag === "Lab" || record.setupKind === "lab" || /\blab\b/i.test(title) || pageId.endsWith("labs");
  const planned =
    setup.start_time && setup.end_time
      ? minutesOf(String(setup.end_time)) - minutesOf(String(setup.start_time))
      : lab
        ? 120
        : 50;
  const end = range?.[2] ?? clock(minutesOf(start) + (planned > 0 ? planned : 50));
  const mode = /continuous/i.test(Object.values(cells).join(" ")) || lab ? "Continuous" : "Snapshot";
  const upcoming =
    /not started|upcoming|prepare|scheduled/i.test(
      [cells.session, cells.capture, cells.state, cells.attendance, record.state.label].join(" "),
    ) && attended === undefined;

  let key = title + "@" + start;
  if (attended === undefined && !upcoming) {
    const course = courseOf(title);
    const twin = related.find((r) => {
      if (r === record) return false;
      const t = titleOf(r);
      return (t === title || (!!course && courseOf(t) === course)) && statedCounts(cellsOf(r)).attended !== undefined;
    });
    if (twin) {
      const c = statedCounts(cellsOf(twin));
      attended = c.attended;
      total = c.total ?? total;
      lowConfidence = c.lowConfidence || lowConfidence;
      key = titleOf(twin) + "@" + start;
    }
  }
  const mapped = (record.demoLearners as { uid: string; name: string; email?: string }[] | undefined) ?? [];
  total = Math.min(120, Math.max(1, total ?? (mapped.length || 30)));
  if (attended === undefined && !upcoming) {
    // Rows without a count (configuration and timetable views) get a rate that
    // fits their state: healthy sessions attend 88–96 %, others lower.
    const base = { healthy: 0.88, complete: 0.88, attention: 0.8, pending: 0.8 }[record.state.tone as string] ?? 0.72;
    attended = Math.round(total * (base + (hash(key) % 9) / 100));
  }
  attended = Math.min(total, attended ?? 0);
  const review = upcoming ? 0 : Math.min(lowConfidence, total - attended);

  const roster = Array.from({ length: total }, (_, j) => {
    const l = mapped[j] ?? learnerAt(j);
    return { uid: l.uid, name: l.name, email: l.email ?? learnerAt(j).email };
  });
  const order = roster
    .map((l) => ({ l, h: hash(key + "#" + l.uid) }))
    .sort((a, b) => a.h - b.h || a.l.uid.localeCompare(b.l.uid));
  const status = new Map<string, AttendanceStatus>();
  order.forEach(({ l, h }, i) => {
    if (upcoming) status.set(l.uid, "scheduled");
    else if (i < attended!) status.set(l.uid, h % 100 < 12 ? "late" : "present");
    else if (i < attended! + review) status.set(l.uid, "review");
    else status.set(l.uid, "absent");
  });
  const begin = minutesOf(start);
  const learners: SessionLearner[] = roster.map((l) => {
    const s = status.get(l.uid)!;
    const h = hash(key + "@" + l.uid);
    const offset = s === "late" ? 11 + (h % 14) : s === "review" ? h % 20 : h % 9;
    const captured = s === "present" || s === "late" || s === "review";
    return {
      ...l,
      status: s,
      checkIn: captured ? clock(begin + offset) : "—",
      confidence: captured
        ? (s === "review" ? 55 + (h % 140) / 10 : 92 + (h % 75) / 10).toFixed(1) + "%"
        : "—",
    };
  });
  const counts = { present: 0, late: 0, review: 0, absent: 0, scheduled: 0 };
  for (const l of learners) counts[l.status]++;

  const room =
    cells.room ||
    title.match(/\b(Room|Lab) \d+\b/)?.[0] ||
    (setup.room ? (lab ? "Lab " : "Room ") + String(setup.room) : "");
  const day = (cells.session ?? "").match(/^[A-Z][a-z]{2} \d{1,2}/)?.[0] ?? "Today";
  const subtitle = [
    cells.path || (setup.department ? `${setup.department} · ${setup.program}` : ""),
    `${day} · ${start}${end ? "–" + end : ""}`,
    room,
    mode,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    title,
    subtitle,
    start,
    end,
    mode,
    upcoming,
    learners,
    counts: { ...counts, total, attended: counts.present + counts.late },
  };
}

/** CSV of the session roster, with spreadsheet-formula prefixes escaped. */
export function sessionCsv(session: ClassSession) {
  const quote = (v: string) => '"' + (/^[=+\-@]/.test(v) ? "'" + v : v).replaceAll('"', '""') + '"';
  const label: Record<AttendanceStatus, string> = {
    present: "Present",
    late: "Late",
    review: "Needs review",
    absent: "Absent",
    scheduled: "Scheduled",
  };
  return [
    ["UID", "Name", "Email", "Status", "Check-in", "Confidence"],
    ...session.learners.map((l) => [l.uid, l.name, l.email, label[l.status], l.checkIn, l.confidence]),
  ]
    .map((row) => row.map(quote).join(","))
    .join("\r\n");
}
