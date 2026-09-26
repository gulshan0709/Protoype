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
