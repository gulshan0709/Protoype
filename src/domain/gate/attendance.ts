import type {
  DataRecord,
  Metric,
  PageContract,
  Tone,
} from "../contracts/types";
import type { SurveillanceUser } from "../surveillance/setup";
import { fullName } from "../common/text";
import { minutesOf } from "../common/time";
import { cellsFor, sessionEvent } from "../contracts/sessionRecords";
export { TIME } from "../common/validation";
const statusOf = (r: DataRecord) =>
  typeof r.cells.status === "string" ? r.cells.status : "";
/** How many rows' status passes `test`, as metric text. */
const countWhere = (rows: DataRecord[], test: (status: string) => boolean) =>
  String(rows.filter((r) => test(statusOf(r))).length);

/** Header counts for User Attendance, from the rows in scope. */
export function attendanceMetrics(rows: DataRecord[]): Metric[] {
  const n = (test: (s: string) => boolean) => countWhere(rows, test);
  return [
    {
      label: "Present",
      value: n((s) => s.startsWith("Present")),
      context: "Verified at a gate",
      tone: "healthy",
    },
    {
      label: "Still inside",
      value: n((s) => s === "Present · inside"),
      context: "No exit recorded yet",
      tone: "attention",
    },
    {
      label: "Low confidence",
      value: n((s) => s === "Low confidence"),
      context: "Needs review",
      tone: "attention",
    },
    {
      label: "Absent",
      value: n((s) => s === "Absent"),
      context: "No verified entry",
      tone: rows.some((r) => statusOf(r) === "Absent") ? "critical" : "healthy",
    },
  ];
}

/** Header counts for In/Out, from the rows in scope. */
export function inOutMetrics(rows: DataRecord[]): Metric[] {
  const n = (test: (s: string) => boolean) => countWhere(rows, test);
  return [
    {
      label: "In",
      value: n((s) => s === "In"),
      context: "Inside the campus",
      tone: "healthy",
    },
    {
      label: "Out",
      value: n((s) => s.startsWith("Out")),
      context: "Last seen leaving",
      tone: "attention",
    },
    {
      label: "Out without return",
      value: n((s) => s === "Out · no return"),
      context: "Past the expected return",
      tone: rows.some((r) => statusOf(r) === "Out · no return")
        ? "critical"
        : "healthy",
    },
  ];
}

const today = () =>
  new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * Surveillance users added in this session have no verified gate event yet,
 * so they appear as Absent today and can be marked manually.
 */
export function absentRowsFromUsers(
  page: PageContract,
  users: DataRecord[],
): DataRecord[] {
  const date = today();
  return users
    .filter((r) => {
      const u = r.setup as SurveillanceUser | undefined;
      return u && u.user_type !== "Threat";
    })
    .map((r) => {
      const u = r.setup as SurveillanceUser;
      const name = fullName(u);
      return {
        id: `ATT-${r.id}`,
        type: "gate_attendance",
        person: { name, uid: u.uid, image: u.image },
        cells: cellsFor(page, {
          user: `${name} · ${u.uid}`,
          type: u.user_type,
          date,
          shift: u.shift || "—",
          status: "Absent",
          log: "—",
          checkIn: "—",
          checkOut: "—",
          state: "Absent",
        }),
        state: { label: "Absent", tone: "critical" as Tone },
        action: "Open attendance",
        scope: r.scope,
        detail: {
          title: `${name} · ${u.uid}`,
          eyebrow: "GATE ATTENDANCE",
          summary: `No verified gate entry on ${date}. Attendance can be marked manually with a reason.`,
          facts: [
            { label: "User type", value: u.user_type },
            { label: "Date", value: date },
            { label: "Status", value: "Absent" },
            { label: "Shift", value: u.shift || "—" },
          ],
          sections: [],
          timeline: [],
          permittedActions: [],
        },
      };
    });
}

/** "HH:MM" → minutes after midnight. */
export const minutes = minutesOf;
const hours = (from: string, to: string) => {
  const m = minutes(to) - minutes(from);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};

export interface Marking {
  checkIn: string;
  checkOut: string;
  reason: string;
}

/** Marks an absent row present; the reason goes to the activity trail. */
export function markedRecord(
  record: DataRecord,
  m: Marking,
  actor: string,
): DataRecord {
  const cells = {
    ...record.cells,
    status: "Present · manual",
    checkIn: m.checkIn,
    checkOut: m.checkOut || "—",
    log: m.checkOut ? hours(m.checkIn, m.checkOut) : "—",
    state: "Marked",
  };
  return {
    ...record,
    cells,
    state: { label: "Marked", tone: "complete" },
    detail: {
      ...record.detail,
      facts: record.detail.facts.map((fact) =>
        fact.label === "Status" ? { ...fact, value: "Present - manual" } : fact,
      ),
      summary: `Marked present manually by ${actor}: ${m.reason}`,
      timeline: [
        sessionEvent(
          `Attendance marked ${m.checkIn}${m.checkOut ? `–${m.checkOut}` : ""} · ${m.reason}`,
          actor,
        ),
        ...record.detail.timeline,
      ],
    },
  };
}
