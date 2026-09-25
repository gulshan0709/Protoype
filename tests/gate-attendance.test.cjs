const { test } = require("node:test");
const assert = require("node:assert/strict");
const { gateAttendance } = require("../src/domain/contracts/gateExtension.ts");
const {
  absentRowsFromUsers,
  markedRecord,
  attendanceMetrics,
  inOutMetrics,
} = require("../src/domain/gate/attendance.ts");
const samples = require("../src/domain/surveillance/samples.json");
test("Gate tabs are scoped and marking updates attendance without changing In/Out", () => {
  const data = structuredClone(
    require("../src/domain/contracts/data/education.json"),
  );
  gateAttendance(data);
  gateAttendance(data);
  for (const role of ["customer_admin", "vizenta_admin", "warden"]) {
    assert.ok(data.core.productTabs[role].Gate.includes("User Attendance"));
    assert.ok(data.core.productTabs[role].Gate.includes("In/Out"));
  }
  const page = data.pages.customer_admin.product.Gate["User Attendance"];
  const absent = absentRowsFromUsers(page, samples.customer_admin);
  assert.equal(absent.length, 7);
  const row = markedRecord(
    absent[0],
    { checkIn: "09:00", checkOut: "17:30", reason: "Verified with guard" },
    "Admin",
  );
  assert.equal(row.cells.log, "8h 30m");
  assert.equal(attendanceMetrics([row])[0].value, "1");
  assert.ok(row.detail.timeline[0].event.includes("Verified with guard"));
  assert.deepEqual(row.scope, absent[0].scope);
  assert.ok(data.pages.customer_admin.product.Gate["In/Out"].records.length);
  assert.ok(
    inOutMetrics(data.pages.customer_admin.product.Gate["In/Out"].records)
      .length,
  );
});
