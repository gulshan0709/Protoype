import React, { useMemo, useState } from "react";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import type { DataRecord, Tone } from "../../../domain/contracts/types";
import {
  classSession,
  sessionCsv,
  type AttendanceStatus,
  type ClassSession,
  type SessionLearner,
} from "../../../domain/classes/attendance";
import { industries } from "../../../domain/contracts/registry";
import { useTheme } from "../../../shared/theme/Theme";
import { Badge, Button, Card, Field, Row, SectionTitle, Txt } from "../../../shared/ui/Primitives";
import { portraitFor } from "../../../shared/ui/demoPortrait";
import { saveCsv } from "../../../shared/files/classCsv";
import { RecordMedia } from "./RecordMedia";

const LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  review: "Needs review",
  absent: "Absent",
  scheduled: "Scheduled",
};
const TONE: Record<AttendanceStatus, Tone> = {
  present: "healthy",
  late: "attention",
  review: "pending",
  absent: "critical",
  scheduled: "neutral",
};
const PAGE_SIZE = 12;
const COLUMNS = { status: 128, checkIn: 84, confidence: 96, capture: 132 };

/** Session rows of every persona, so views without their own count can borrow one. */
function sessionRows(): DataRecord[] {
  return Object.values(industries.education.pages).flatMap((areas) =>
    ["Classes", "Labs"].flatMap(
      (tab) => areas.product["Class & Lab Attendance"]?.[tab]?.records ?? [],
    ),
  );
}
/** Session attendance for a class or lab row, if the page lists sessions. */
export function classSessionFor(pageId: string, record: DataRecord) {
  return classSession(pageId, record, sessionRows());
}

/** A capture record for the shared media preview (per-person HD still, box by status). */
function captureRecord(record: DataRecord, learner: SessionLearner, title: string): DataRecord {
  const name = `${learner.name} · ${learner.uid}`;
  return {
    id: `${record.id}:${learner.uid}`,
    type: "class_attendance",
    scope: record.scope,
    cells: { person: name, type: "Learner" },
    person: { name: learner.name, uid: learner.uid },
    captureAsset: 0,
    demoDetection: learner.status === "review" ? "unidentified" : "identified",
    state: { label: LABEL[learner.status], tone: TONE[learner.status] },
    action: "",
    detail: {
      title: name,
      eyebrow: "CLASS ATTENDANCE",
      summary: `${title} · first capture ${learner.checkIn}`,
      facts: [],
      sections: [],
      timeline: [],
      permittedActions: [],
    },
  };
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const c = useTheme();
  const source = portraitFor(name);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: c.primarySoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {source ? (
        <Image
          source={source}
          accessibilityLabel={name + " profile image"}
          style={{ width: size, height: size }}
        />
      ) : (
        <Txt size={12} bold color={c.muted}>
          {initials}
        </Txt>
      )}
    </View>
  );
}

function Person({ learner }: { learner: SessionLearner }) {
  const c = useTheme();
  return (
    <Row style={{ gap: 10, flex: 1, minWidth: 0 }}>
      <Avatar name={learner.name} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Txt size={13} bold lines={1}>
          {learner.name}
        </Txt>
        <Txt size={12} color={c.muted} lines={1}>
          {"UID: " + learner.uid}
        </Txt>
      </View>
    </Row>
  );
}

function Capture({ record, learner, title }: { record: DataRecord; learner: SessionLearner; title: string }) {
  const c = useTheme();
  if (learner.checkIn === "—")
    return (
      <Txt size={12} color={c.muted}>
        {learner.status === "scheduled" ? "After start" : "Not captured"}
      </Txt>
    );
  return <RecordMedia record={captureRecord(record, learner, title)} />;
}

/**
 * Attendance of one class or lab session: every mapped learner with profile
 * photo, status, first capture time, match confidence and attendance image.
 */
export function ClassAttendance({ session, record }: { session: ClassSession; record: DataRecord }) {
  const c = useTheme();
  const mobile = useWindowDimensions().width < 768;
  const [filter, setFilter] = useState<AttendanceStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [pageNo, setPageNo] = useState(0);
  const { counts } = session;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return session.learners.filter(
      (l) =>
        (filter === "all" || l.status === filter) &&
        (!q || `${l.name} ${l.uid}`.toLowerCase().includes(q)),
    );
  }, [session, filter, query]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(pageNo, pages - 1);
  const visible = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const rate = counts.total ? Math.round((counts.attended / counts.total) * 1000) / 10 : 0;
  const chips: [AttendanceStatus | "all", string, number][] = session.upcoming
    ? [["all", "All learners", counts.total]]
    : (
        [
          ["all", "All", counts.total],
          ["present", "Present", counts.present],
          ["late", "Late", counts.late],
          ["review", "Needs review", counts.review],
          ["absent", "Absent", counts.absent],
        ] as [AttendanceStatus | "all", string, number][]
      ).filter(([key, , n]) => key === "all" || n > 0);
  const tiles: [string, string, string][] = [
    ["Attended", `${counts.attended} / ${counts.total}`, c.text],
    ["Attendance rate", `${rate}%`, rate >= 85 ? c.healthy : c.attention],
    ["On time", String(counts.present), c.healthy],
    ["Late", String(counts.late), c.attention],
    ["Needs review", String(counts.review), c.link],
    ["Absent", String(counts.absent), c.critical],
  ];
  const segments: [number, string][] = [
    [counts.present, c.healthy],
    [counts.late, c.attention],
    [counts.review, c.link],
    [counts.absent, c.critical],
  ];
  const exportCsv = () =>
    saveCsv(
      session.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") + "_attendance.csv",
      `${session.title} attendance`,
      sessionCsv(session),
    );
  const header = (label: string, width?: number) => (
    <Txt size={11} bold color={c.muted} style={width ? { width } : { flex: 1 }}>
      {label}
    </Txt>
  );
  return (
    <Card>
      <View testID="class-attendance" style={{ gap: 18 }}>
        <SectionTitle
          title={`Session attendance · ${session.title}`}
          subtitle={session.subtitle}
          trailing={<Button compact label="Export" icon="download" onPress={exportCsv} />}
        />
        {session.upcoming ? (
          <Txt size={13} color={c.muted}>
            {`This session starts at ${session.start}. ${counts.total} learners are mapped; ${
              session.mode === "Continuous" ? "continuous verification" : "snapshot capture"
            } records attendance once it begins.`}
          </Txt>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {tiles.map(([label, value, color]) => (
                <View
                  key={label}
                  style={{
                    flexGrow: 1,
                    flexBasis: mobile ? 130 : 120,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    gap: 4,
                  }}
                >
                  <Txt size={11} color={c.muted}>
                    {label}
                  </Txt>
                  <Txt size={20} bold color={color}>
                    {value}
                  </Txt>
                </View>
              ))}
            </View>
            <View
              accessibilityLabel={`${counts.attended} of ${counts.total} attended`}
              style={{ flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: c.primarySoft }}
            >
              {segments.map(([n, color], i) => (n ? <View key={i} style={{ flex: n, backgroundColor: color }} /> : null))}
            </View>
          </View>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {chips.map(([key, label, n]) => {
            const selected = filter === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${label} ${n}`}
                onPress={() => {
                  setFilter(key);
                  setPageNo(0);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: selected ? c.actionPrimary : c.border,
                  backgroundColor: selected ? c.actionPrimary : c.surface,
                }}
              >
                <Txt size={12} bold color={selected ? c.actionInk : c.text}>
                  {`${label} · ${n}`}
                </Txt>
              </Pressable>
            );
          })}
          <View style={{ flexGrow: 1, flexBasis: 200, maxWidth: mobile ? undefined : 280, marginLeft: mobile ? 0 : "auto" }}>
            <Field
              value={query}
              onChange={(v) => {
                setQuery(v);
                setPageNo(0);
              }}
              placeholder="Search name or UID"
            />
          </View>
        </View>
        {!visible.length ? (
          <Txt size={13} color={c.muted} style={{ textAlign: "center", paddingVertical: 18 }}>
            No learners match this filter.
          </Txt>
        ) : mobile ? (
          <View style={{ gap: 10 }}>
            {visible.map((l) => (
              <View
                key={l.uid}
                testID="class-attendance-card"
                style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 14, gap: 12 }}
              >
                <Row style={{ gap: 10 }}>
                  <Person learner={l} />
                  <Badge label={LABEL[l.status]} tone={TONE[l.status]} />
                </Row>
                <View style={{ gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
                  {(
                    [
                      ["CHECK-IN", l.checkIn],
                      ["CONFIDENCE", l.confidence],
                    ] as const
                  ).map(([label, value]) => (
                    <Row key={label} style={{ gap: 12 }}>
                      <Txt size={10} bold color={c.muted} style={{ flex: 1, letterSpacing: 0.6 }}>
                        {label}
                      </Txt>
                      <Txt size={12} style={{ flex: 1.4, textAlign: "right" }}>
                        {value}
                      </Txt>
                    </Row>
                  ))}
                  <Row style={{ gap: 12 }}>
                    <Txt size={10} bold color={c.muted} style={{ flex: 1, letterSpacing: 0.6 }}>
                      ATTENDANCE IMAGE
                    </Txt>
                    <Capture record={record} learner={l} title={session.title} />
                  </Row>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, overflow: "hidden" }}>
            <Row
              style={{
                gap: 12,
                paddingHorizontal: 14,
                minHeight: 36,
                backgroundColor: c.primarySoft,
                borderBottomWidth: 1,
                borderColor: c.border,
              }}
            >
              {header("STUDENT")}
              {header("STATUS", COLUMNS.status)}
              {header("CHECK-IN", COLUMNS.checkIn)}
              {header("CONFIDENCE", COLUMNS.confidence)}
              {header("ATTENDANCE IMAGE", COLUMNS.capture)}
            </Row>
            {visible.map((l, i) => (
              <View
                key={l.uid}
                testID="class-attendance-row"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  minHeight: 72,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: c.border,
                }}
              >
                <Person learner={l} />
                <View style={{ width: COLUMNS.status, alignItems: "flex-start" }}>
                  <Badge label={LABEL[l.status]} tone={TONE[l.status]} />
                </View>
                <Txt size={13} style={{ width: COLUMNS.checkIn }}>
                  {l.checkIn}
                </Txt>
                <Txt size={13} style={{ width: COLUMNS.confidence }}>
                  {l.confidence}
                </Txt>
                <View style={{ width: COLUMNS.capture }}>
                  <Capture record={record} learner={l} title={session.title} />
                </View>
              </View>
            ))}
          </View>
        )}
        {rows.length > PAGE_SIZE && (
          <Row style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <Txt size={12} color={c.muted}>
              {`${current * PAGE_SIZE + 1}–${Math.min(rows.length, (current + 1) * PAGE_SIZE)} of ${rows.length}`}
            </Txt>
            <Row style={{ gap: 8 }}>
              <Button
                compact
                label="Previous"
                disabled={current === 0}
                onPress={() => setPageNo(current - 1)}
              />
              <Button
                compact
                label="Next"
                disabled={current >= pages - 1}
                onPress={() => setPageNo(current + 1)}
              />
            </Row>
          </Row>
        )}
      </View>
    </Card>
  );
}
