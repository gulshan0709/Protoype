import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import type { DataRecord, Tone } from "../../../domain/contracts/types";
import {
  applyMarks,
  classSession,
  sessionCsv,
  sessionDates,
  termSummary,
  STATUS_LABEL,
  type AttendanceMarks,
  type AttendanceStatus,
  type ClassSession,
  type SessionLearner,
} from "../../../domain/classes/attendance";
import { industries } from "../../../domain/contracts/registry";
import { useTheme } from "../../../shared/theme/Theme";
import { Badge, Button, Card, Field, Row, SectionTitle, Txt } from "../../../shared/ui/Primitives";
import { Select } from "../../../shared/ui/Select";
import { Dialog } from "../../../shared/ui/Dialog";
import { Icon } from "../../../shared/ui/Icon";
import { portraitFor } from "../../../shared/ui/demoPortrait";
import { saveCsv } from "../../../shared/files/classCsv";
import { MediaPlayer, RecordMedia } from "./RecordMedia";

const TONE: Record<AttendanceStatus, Tone> = {
  present: "healthy",
  late: "attention",
  review: "pending",
  absent: "critical",
  scheduled: "neutral",
};
const PAGE_SIZE = 12;
// Desktop columns follow skillatracker-ui-demo's class attendance grid.
const COLUMNS = {
  student: 220,
  email: 210,
  status: 124,
  type: 70,
  first: 104,
  last: 100,
  duration: 76,
  image: 84,
  video: 56,
  mark: 56,
};
const TABLE_WIDTH = Object.values(COLUMNS).reduce((a, b) => a + b, 0) + 12 * (Object.keys(COLUMNS).length - 1) + 28;

/** Staff marks survive navigation for the session, like other demo edits. */
const marksStore = new Map<string, AttendanceMarks>();

/** Session rows of every persona, so views without their own count can borrow one. */
function sessionRows(): DataRecord[] {
  return Object.values(industries.education.pages).flatMap((areas) =>
    ["Classes", "Labs"].flatMap(
      (tab) => areas.product["Class & Lab Attendance"]?.[tab]?.records ?? [],
    ),
  );
}
/** Session attendance for a class or lab row, if the page lists sessions. */
export function classSessionFor(pageId: string, record: DataRecord, date?: string) {
  return classSession(pageId, record, sessionRows(), date);
}

/** A record for the shared media components (per-person HD still, box by status). */
function mediaRecord(record: DataRecord, learner: SessionLearner, title: string, video = false): DataRecord {
  const name = `${learner.name} · ${learner.uid}`;
  // Clips carry burned-in labels (0 identified/visitor, 1 threat/identified,
  // 2 unidentified/visitor): verified learners get the identified clip.
  const clip = learner.status === "review" ? 2 : 0;
  return {
    id: `${record.id}:${learner.uid}${video ? ":video" : ""}`,
    type: "class_attendance",
    scope: record.scope,
    cells: { person: name, type: "Learner" },
    person: { name: learner.name, uid: learner.uid },
    captureAsset: video ? clip : 0,
    ...(video ? { videoAsset: clip } : {}),
    demoDetection: learner.status === "review" ? "unidentified" : "identified",
    state: { label: STATUS_LABEL[learner.status], tone: TONE[learner.status] },
    action: "",
    detail: {
      title: video ? `${name} · ${learner.checkIn}–${learner.lastCapture}` : name,
      eyebrow: "CLASS ATTENDANCE",
      summary: `${title} · captured ${learner.checkIn}–${learner.lastCapture}`,
      facts: [],
      sections: [],
      timeline: [],
      permittedActions: [],
    },
  };
}
const captured = (l: SessionLearner) => l.checkIn !== "—";

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
        <Image source={source} accessibilityLabel={name + " profile image"} style={{ width: size, height: size }} />
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

function IconAction({ icon, label, onPress, disabled }: { icon: string; label: string; onPress: () => void; disabled?: boolean }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: disabled ? c.primarySoft : c.actionSecondary,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon name={icon} size={15} color={disabled ? c.muted : c.actionInk} />
    </Pressable>
  );
}

/**
 * Attendance of one class or lab session: every mapped learner with profile
 * photo, status, capture times and duration, match confidence, attendance
 * image and recording, plus manual marking, earlier sessions, an image
 * gallery and the consolidated term report.
 */
export function ClassAttendance({ pageId, record }: { pageId: string; record: DataRecord }) {
  const c = useTheme();
  const mobile = useWindowDimensions().width < 768;
  const [date, setDate] = useState<string>();
  const [filter, setFilter] = useState<AttendanceStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [pageNo, setPageNo] = useState(0);
  const [, setVersion] = useState(0);
  const [marking, setMarking] = useState<SessionLearner>();
  const [reason, setReason] = useState("");
  const [playing, setPlaying] = useState<SessionLearner>();
  const [gallery, setGallery] = useState(false);
  const [report, setReport] = useState(false);
  const base = useMemo(() => classSessionFor(pageId, record, date), [pageId, record, date]);
  if (!base) return null;
  const storeKey = `${record.id}|${base.date}`;
  const session = applyMarks(base, marksStore.get(storeKey) ?? {});
  const dates = sessionDates(base.today);
  const { counts } = session;
  const q = query.trim().toLowerCase();
  const rows = session.learners.filter(
    (l) => (filter === "all" || l.status === filter) && (!q || `${l.name} ${l.uid}`.toLowerCase().includes(q)),
  );
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(pageNo, pages - 1);
  const visible = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const rate = counts.total ? Math.round((counts.attended / counts.total) * 1000) / 10 : 0;
  const chips = (
    session.upcoming
      ? [["all", "All learners", counts.total]]
      : [
          ["all", "All", counts.total],
          ["present", "Present", counts.present],
          ["late", "Late", counts.late],
          ["review", "Needs review", counts.review],
          ["absent", "Absent", counts.absent],
        ]
  ).filter(([key, , n]) => key === "all" || (n as number) > 0) as [AttendanceStatus | "all", string, number][];
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
  const slug = session.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const exportCsv = () =>
    saveCsv(`${slug}_${base.date.replace(" ", "_").toLowerCase()}_attendance.csv`, `${session.title} attendance`, sessionCsv(session));
  const nextMark = (l: SessionLearner) => (l.status === "absent" || l.status === "review" ? "present" : "absent");
  const confirmMark = () => {
    if (!marking) return;
    marksStore.set(storeKey, { ...(marksStore.get(storeKey) ?? {}), [marking.uid]: nextMark(marking) });
    setMarking(undefined);
    setReason("");
    setVersion((v) => v + 1);
  };
  const summary = report ? termSummary(session) : undefined;
  const header = (label: string, width: number) => (
    <Txt size={11} bold color={c.muted} style={{ width }} lines={1}>
      {label}
    </Txt>
  );
  const cell = (value: string, width: number) => (
    <Txt size={13} style={{ width }} lines={1}>
      {value}
    </Txt>
  );
  const image = (l: SessionLearner) =>
    captured(l) ? (
      <RecordMedia record={mediaRecord(record, l, session.title)} />
    ) : (
      <Txt size={12} color={c.muted}>
        {l.status === "scheduled" ? "After start" : "Not captured"}
      </Txt>
    );
  return (
    <Card>
      <View testID="class-attendance" style={{ gap: 18 }}>
        <SectionTitle title={`Session attendance · ${session.title}`} subtitle={session.subtitle} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <View style={{ minWidth: 190 }}>
            <Select
              label="Session date"
              value={base.date}
              options={dates}
              onChange={(v) => {
                setDate(v === base.today ? undefined : v);
                setPageNo(0);
              }}
              icon="clock"
              compact
            />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginLeft: mobile ? 0 : "auto" }}>
            <Button compact label="View images" icon="camera" disabled={!counts.attended && !counts.review} onPress={() => setGallery(true)} />
            <Button compact label="Consolidated report" icon="chart" onPress={() => setReport(true)} />
            <Button compact label="Export" icon="download" onPress={exportCsv} />
          </View>
        </View>
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
                  <Badge label={STATUS_LABEL[l.status]} tone={TONE[l.status]} />
                </Row>
                <View style={{ gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
                  {(
                    [
                      ["EMAIL", l.email],
                      ["TYPE", l.type],
                      ["FIRST CAPTURE", l.checkIn],
                      ["LAST CAPTURE", l.lastCapture],
                      ["DURATION", l.duration],
                      ["CONFIDENCE", l.confidence],
                    ] as const
                  ).map(([label, value]) => (
                    <Row key={label} style={{ gap: 12 }}>
                      <Txt size={10} bold color={c.muted} style={{ flex: 1, letterSpacing: 0.6 }}>
                        {label}
                      </Txt>
                      <Txt size={12} lines={1} style={{ flex: 1.6, textAlign: "right" }}>
                        {value}
                      </Txt>
                    </Row>
                  ))}
                  <Row style={{ gap: 12 }}>
                    <Txt size={10} bold color={c.muted} style={{ flex: 1, letterSpacing: 0.6 }}>
                      IMAGE
                    </Txt>
                    {image(l)}
                  </Row>
                </View>
                {!session.upcoming && (
                  <Row style={{ gap: 8, justifyContent: "flex-end" }}>
                    <Button compact label="Video" icon="play" disabled={!captured(l)} onPress={() => setPlaying(l)} />
                    <Button
                      compact
                      label={`Mark ${nextMark(l)}`}
                      icon="check"
                      variant="primary"
                      onPress={() => setMarking(l)}
                    />
                  </Row>
                )}
              </View>
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexGrow: 1 }}>
            <View
              style={{ flex: 1, minWidth: TABLE_WIDTH, borderWidth: 1, borderColor: c.border, borderRadius: 10, overflow: "hidden" }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 14,
                  minHeight: 36,
                  backgroundColor: c.primarySoft,
                  borderBottomWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Txt size={11} bold color={c.muted} style={{ flex: 1, minWidth: COLUMNS.student }}>
                  STUDENT
                </Txt>
                {header("EMAIL", COLUMNS.email)}
                {header("STATUS", COLUMNS.status)}
                {header("TYPE", COLUMNS.type)}
                {header("FIRST CAPTURE", COLUMNS.first)}
                {header("LAST CAPTURE", COLUMNS.last)}
                {header("DURATION", COLUMNS.duration)}
                {header("IMAGE", COLUMNS.image)}
                {header("VIDEO", COLUMNS.video)}
                {header("MARK", COLUMNS.mark)}
              </View>
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
                  <View style={{ flex: 1, minWidth: COLUMNS.student }}>
                    <Person learner={l} />
                  </View>
                  <Txt size={12} color={c.muted} lines={1} style={{ width: COLUMNS.email }}>
                    {l.email}
                  </Txt>
                  <View style={{ width: COLUMNS.status, alignItems: "flex-start" }}>
                    <Badge label={STATUS_LABEL[l.status]} tone={TONE[l.status]} />
                  </View>
                  {cell(l.type, COLUMNS.type)}
                  {cell(l.checkIn, COLUMNS.first)}
                  {cell(l.lastCapture, COLUMNS.last)}
                  {cell(l.duration, COLUMNS.duration)}
                  <View style={{ width: COLUMNS.image }}>{image(l)}</View>
                  <View style={{ width: COLUMNS.video }}>
                    <IconAction
                      icon="play"
                      label={`Play recording for ${l.name}`}
                      disabled={!captured(l)}
                      onPress={() => setPlaying(l)}
                    />
                  </View>
                  <View style={{ width: COLUMNS.mark }}>
                    <IconAction
                      icon="check"
                      label={`Mark ${l.name} ${nextMark(l)}`}
                      disabled={session.upcoming}
                      onPress={() => setMarking(l)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
        {rows.length > PAGE_SIZE && (
          <Row style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <Txt size={12} color={c.muted}>
              {`${current * PAGE_SIZE + 1}–${Math.min(rows.length, (current + 1) * PAGE_SIZE)} of ${rows.length}`}
            </Txt>
            <Row style={{ gap: 8 }}>
              <Button compact label="Previous" disabled={current === 0} onPress={() => setPageNo(current - 1)} />
              <Button compact label="Next" disabled={current >= pages - 1} onPress={() => setPageNo(current + 1)} />
            </Row>
          </Row>
        )}
        <Txt size={11} color={c.muted}>
          Manual marks are kept for this session and shown as Type · Manual.
        </Txt>
      </View>
      {marking && (
        <Dialog title="Mark attendance" onClose={() => setMarking(undefined)}>
          <View style={{ gap: 14 }}>
            <Row style={{ gap: 10 }}>
              <Person learner={marking} />
              <Badge label={STATUS_LABEL[marking.status]} tone={TONE[marking.status]} />
            </Row>
            <Txt size={13}>
              {`Mark ${marking.name} as ${nextMark(marking) === "present" ? "Present" : "Absent"} for ${session.title} on ${base.date}?`}
            </Txt>
            <Field label="Reason (for the audit trail)" value={reason} onChange={setReason} placeholder="e.g. Verified by faculty in class" />
            <Row style={{ justifyContent: "flex-end", gap: 8 }}>
              <Button label="Cancel" variant="ghost" onPress={() => setMarking(undefined)} />
              <Button
                label={nextMark(marking) === "present" ? "Mark present" : "Mark absent"}
                variant="primary"
                onPress={confirmMark}
              />
            </Row>
          </View>
        </Dialog>
      )}
      {playing && (
        <Dialog title={`Recording · ${playing.name}`} onClose={() => setPlaying(undefined)} wide>
          <MediaPlayer record={mediaRecord(record, playing, session.title, true)} />
        </Dialog>
      )}
      {gallery && (
        <Dialog title={`Captured images · ${session.title}`} onClose={() => setGallery(false)} wide>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
            {session.learners.filter(captured).map((l) => (
              <View key={l.uid} style={{ width: 110, gap: 6 }}>
                <RecordMedia record={mediaRecord(record, l, session.title)} />
                <Txt size={12} bold lines={1}>
                  {l.name}
                </Txt>
                <Txt size={11} color={c.muted} lines={1}>
                  {`${l.checkIn} · ${STATUS_LABEL[l.status]}`}
                </Txt>
              </View>
            ))}
          </View>
        </Dialog>
      )}
      {summary && (
        <Dialog title={`Consolidated attendance report · ${session.title}`} onClose={() => setReport(false)} wide>
          <View style={{ gap: 14 }}>
            <Txt size={13} color={c.muted}>
              {`${summary.held} sessions held this term · average ${summary.average}% · ${summary.atRisk} learner${
                summary.atRisk === 1 ? "" : "s"
              } below 75%`}
            </Txt>
            <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, overflow: "hidden" }}>
              <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: c.primarySoft }}>
                <Txt size={11} bold color={c.muted} style={{ flex: 1 }}>
                  STUDENT
                </Txt>
                <Txt size={11} bold color={c.muted} style={{ width: 90 }}>
                  ATTENDED
                </Txt>
                <Txt size={11} bold color={c.muted} style={{ width: 70 }}>
                  RATE
                </Txt>
              </View>
              {summary.rows.map((r, i) => (
                <View
                  key={r.uid}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderTopWidth: i ? 1 : 0,
                    borderColor: c.border,
                  }}
                >
                  <Txt size={13} lines={1} style={{ flex: 1 }}>
                    {`${r.name} · ${r.uid}`}
                  </Txt>
                  <Txt size={13} style={{ width: 90 }}>
                    {`${r.attended} / ${r.held}`}
                  </Txt>
                  <Txt size={13} bold color={r.rate < 75 ? c.critical : r.rate < 85 ? c.attention : c.healthy} style={{ width: 70 }}>
                    {`${r.rate}%`}
                  </Txt>
                </View>
              ))}
            </View>
          </View>
        </Dialog>
      )}
    </Card>
  );
}
