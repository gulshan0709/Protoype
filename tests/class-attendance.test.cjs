const { test } = require("node:test");
const assert = require("node:assert/strict");
const { classSession, sessionCsv } = require("../src/domain/classes/attendance.ts");

function education() {
  const d = structuredClone(require("../src/domain/contracts/data/education.json"));
  for (const [file, fn] of [
    ["learnerExtension", "customerAdminLearners"],
    ["gateExtension", "gateAttendance"],
    ["wardenExtension", "wardenProduct"],
    ["sourcesExtension", "sourcesAndSetup"],
    ["surveillanceExtension", "surveillanceUsers"],
  ])
    require("../src/domain/contracts/" + file + ".ts")[fn](
      fn === "customerAdminLearners" ? d.pages : d,
      require("../src/domain/surveillance/samples.json"),
    );
  require("../src/domain/contracts/demoData.ts").populateDemoData(d);
  return d;
}
const d = education();
const classes = (role) => d.pages[role].product["Class & Lab Attendance"];
const related = Object.values(d.pages).flatMap((areas) =>
  ["Classes", "Labs"].flatMap((tab) => areas.product["Class & Lab Attendance"]?.[tab]?.records ?? []),
);
const statuses = (s) => s.learners.map((l) => l.uid + ":" + l.status).join(",");

test("a class session lists every learner and agrees with its row", () => {
  const row = classes("dean").Classes.records[0];
  assert.match(String(row.cells.attendance), /^59 \/ 68/);
  const s = classSession("dean-classes", row, related);
  assert.equal(s.learners.length, 68);
  assert.equal(s.counts.attended, 59);
  assert.equal(s.counts.review, 3);
  assert.equal(s.counts.absent, 6);
  assert.equal(new Set(s.learners.map((l) => l.uid)).size, 68);
  for (const l of s.learners) {
    const captured = ["present", "late", "review"].includes(l.status);
    assert.equal(l.checkIn !== "—", captured, l.uid);
    if (l.status === "late") assert.ok(l.checkIn > "09:10", l.checkIn);
    if (l.status === "review") assert.ok(parseFloat(l.confidence) < 70);
  }
});

test("every view of one session shows the same learners present", () => {
  const dean = classSession("dean-classes", classes("dean").Classes.records[0], related);
  const faculty = classSession("faculty-attendance-today", classes("faculty").Today.records[0], related);
  const admin = classSession("ca-class-coverage", classes("customer_admin").Coverage.records[0], related);
  assert.equal(statuses(faculty), statuses(dean));
  assert.equal(statuses(admin), statuses(dean));
});

test("labs, upcoming sessions and non-session pages", () => {
  const lab = classSession("dean-labs", classes("dean").Labs.records[0], related);
  assert.equal(lab.mode, "Continuous");
  assert.equal(lab.counts.total, 30);
  assert.equal(lab.counts.attended, 28);
  const upcoming = classSession("dean-classes", classes("dean").Classes.records[2], related);
  assert.equal(upcoming.upcoming, true);
  assert.equal(upcoming.counts.scheduled, upcoming.counts.total);
  assert.match(upcoming.subtitle, /14:00–15:00/);
  assert.equal(classSession("ca-class-learners", classes("customer_admin").Learners.records[0]), undefined);
  assert.equal(classSession("dean-reports", classes("dean").Reports.records[0]), undefined);
});

test("session CSV escapes formula prefixes", () => {
  const s = classSession("dean-classes", classes("dean").Classes.records[0], related);
  const csv = sessionCsv({ ...s, learners: [{ ...s.learners[0], name: "=HYPERLINK(1)" }] });
  assert.match(csv, /"'=HYPERLINK\(1\)"/);
  assert.equal(csv.split("\r\n").length, 2);
});

test("legacy data points: capture times, duration, type, earlier dates, marks and report", () => {
  const { applyMarks, termSummary, sessionDates } = require("../src/domain/classes/attendance.ts");
  const row = classes("dean").Classes.records[0];
  const s = classSession("dean-classes", row, related);
  for (const l of s.learners)
    if (l.checkIn !== "—") {
      assert.ok(l.lastCapture >= l.checkIn, l.uid);
      assert.ok(l.lastCapture <= "09:45", "no capture after the 09:45 snapshot: " + l.lastCapture);
      assert.match(l.duration, /^\d+ min$/);
      assert.equal(l.type, "Auto");
    } else assert.equal(l.type, "—");
  const dates = sessionDates(s.today);
  assert.deepEqual(dates.map((d) => d.value), ["Sep 15", "Sep 14", "Sep 11", "Sep 10", "Sep 9"]);
  const earlier = classSession("dean-classes", row, related, "Sep 11");
  assert.equal(earlier.date, "Sep 11");
  assert.equal(earlier.counts.total, 68);
  assert.notEqual(statuses(earlier), statuses(s));
  assert.equal(statuses(classSession("dean-classes", row, related, "Sep 11")), statuses(earlier));
  const absent = s.learners.find((l) => l.status === "absent");
  const marked = applyMarks(s, { [absent.uid]: "present" });
  assert.equal(marked.counts.attended, s.counts.attended + 1);
  assert.equal(marked.learners.find((l) => l.uid === absent.uid).type, "Manual");
  const report = termSummary(s);
  assert.equal(report.rows.length, 68);
  assert.ok(report.rows.every((r, i, a) => !i || a[i - 1].rate <= r.rate));
  assert.match(sessionCsv(s).split("\r\n")[0], /"First Image Captured Time","Last Image Captured Time","Time Duration"/);
});
