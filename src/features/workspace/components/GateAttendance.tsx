import React, { useMemo, useState } from "react";
import { View } from "react-native";
import type {
  DataRecord,
  Metric,
  PageContract,
  Tone,
} from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { Field, Row, Txt } from "../../../shared/ui/Primitives";
import { RefButton } from "./referenceUi";
import { userName, type SurveillanceUser } from "./SurveillanceUsers";

// Gate → User Attendance and In/Out, carried over from the legacy
// skillatracker-ui Surveillance/Attendance ("Gate Attendance", with manual
// marking for absent users) and Surveillance/Inout ("In–Out Summary").

const statusOf = (r: DataRecord) =>
  typeof r.cells.status === "string" ? r.cells.status : "";

/** Header counts for User Attendance, from the rows in scope. */
export function attendanceMetrics(rows: DataRecord[]): Metric[] {
  const n = (test: (s: string) => boolean) =>
    String(rows.filter((r) => test(statusOf(r))).length);
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
  const n = (test: (s: string) => boolean) =>
    String(rows.filter((r) => test(statusOf(r))).length);
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
      const byColumn: Record<string, string> = {
        user: `${userName(u)} · ${u.uid}`,
        type: u.user_type,
        date,
        shift: u.shift || "—",
        status: "Absent",
        log: "—",
        checkIn: "—",
        checkOut: "—",
        state: "Absent",
      };
      return {
        id: `ATT-${r.id}`,
        type: "gate_attendance",
        cells: Object.fromEntries(
          page.columns.map((col) => [col.id, byColumn[col.id] ?? "—"]),
        ),
        state: { label: "Absent", tone: "critical" as Tone },
        action: "Open attendance",
        scope: r.scope,
        detail: {
          title: `${userName(u)} · ${u.uid}`,
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

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutes = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3);
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
      summary: `Marked present manually by ${actor}: ${m.reason}`,
      timeline: [
        {
          time: "Just now",
          event: `Attendance marked ${m.checkIn}${m.checkOut ? `–${m.checkOut}` : ""} · ${m.reason}`,
          actor,
        },
        ...record.detail.timeline,
      ],
    },
  };
}

/** Legacy "Mark Attendance" dialog, plus a required reason for the audit. */
export function MarkAttendanceForm({
  title,
  onSave,
  onCancel,
}: {
  title: string;
  onSave: (m: Marking) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [m, setM] = useState<Marking>({
    checkIn: "",
    checkOut: "",
    reason: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const errors = useMemo(() => {
    const e: Partial<Record<keyof Marking, string>> = {};
    if (!m.checkIn) e.checkIn = "Check-in time is required";
    else if (!TIME.test(m.checkIn)) e.checkIn = "Use 24-hour HH:MM";
    if (m.checkOut && !TIME.test(m.checkOut)) e.checkOut = "Use 24-hour HH:MM";
    else if (
      m.checkOut &&
      !e.checkIn &&
      minutes(m.checkOut) <= minutes(m.checkIn)
    )
      e.checkOut = "Check-out must be after check-in";
    if (!m.reason.trim()) e.reason = "A reason is required for the audit trail";
    return e;
  }, [m]);
  const set = (k: keyof Marking) => (v: string) =>
    setM((x) => ({ ...x, [k]: v }));
  const err = (k: keyof Marking) => (submitted ? errors[k] : undefined);
  return (
    <View style={{ gap: 16 }}>
      <Txt size={13}>
        Mark attendance for{" "}
        <Txt size={13} bold>
          {title}
        </Txt>
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <View style={{ flexGrow: 1, flexBasis: 180 }}>
          <Field
            label="Check-in time *"
            value={m.checkIn}
            onChange={set("checkIn")}
            placeholder="HH:MM, e.g. 09:05"
            error={err("checkIn")}
          />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 180 }}>
          <Field
            label="Check-out time"
            value={m.checkOut}
            onChange={set("checkOut")}
            placeholder="HH:MM, e.g. 17:30"
            error={err("checkOut")}
          />
        </View>
      </View>
      <Field
        label="Reason *"
        value={m.reason}
        onChange={set("reason")}
        placeholder="e.g. Camera offline at Main Gate; verified by guard"
        multiline
        error={err("reason")}
      />
      <Txt size={11} color={c.muted}>
        Manual marks are labelled "Present · manual" and keep the reason in the
        activity trail.
      </Txt>
      <Row style={{ justifyContent: "flex-end", gap: 8 }}>
        <RefButton label="Cancel" onPress={onCancel} />
        <RefButton
          label="Mark attendance"
          kind="primary"
          onPress={() => {
            setSubmitted(true);
            if (!Object.keys(errors).length) onSave(m);
          }}
        />
      </Row>
    </View>
  );
}
