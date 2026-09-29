const { educationWithExtensions } = require("./helpers.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  residenceSetupEnabled,
  emptyWarden,
  validateWarden,
  wardenRecord,
  wardenFromRecord,
  emptyHostel,
  validateHostel,
  hostelFromRecord,
  hostelRecord,
  emptyLeave,
  validateLeave,
  leaveDays,
  leaveEditable,
  leaveFromRecord,
  leaveRecord,
  wardenMetrics,
} = require("../src/domain/residence/setup.ts");

const d = educationWithExtensions();
const warden = (role, tab) => d.pages[role].product.Warden[tab];

test("residence setup is limited to the two admins' Warden pages", () => {
  for (const role of ["customer_admin", "vizenta_admin"])
    for (const tab of ["Wardens", "Hostels", "Leave Management"])
      assert.ok(
        residenceSetupEnabled(
          { industry: "education", role },
          warden(role, tab).id,
        ),
        `${role} ${tab}`,
      );
  assert.equal(
    residenceSetupEnabled(
      { industry: "education", role: "warden" },
      "ca-warden-wardens",
    ),
    false,
  );
  assert.equal(
    residenceSetupEnabled(
      { industry: "corporate", role: "customer_admin" },
      "ca-warden-wardens",
    ),
    false,
  );
  assert.equal(
    residenceSetupEnabled(
      { industry: "education", role: "customer_admin" },
      undefined,
    ),
    false,
  );
});

test("warden validation: required fields, trimmed email, taken emails, 7–15 digit phones", () => {
  const w = {
    ...emptyWarden(),
    name: "QA Warden",
    email: " qa@example.com ",
    phone: "98765 43-210",
  };
  assert.deepEqual(validateWarden(w, []), {});
  assert.deepEqual(Object.keys(validateWarden(emptyWarden(), [])).sort(), [
    "email",
    "name",
    "phone",
  ]);
  assert.equal(
    validateWarden({ ...w, email: "not-an-email" }, []).email,
    "Enter a valid email",
  );
  assert.equal(
    validateWarden({ ...w, email: "QA@Example.com" }, ["qa@example.com"]).email,
    "Another warden uses this email",
  );
  assert.equal(
    validateWarden({ ...w, phone: "+1234567" }, []).phone,
    undefined,
  );
  assert.equal(
    validateWarden({ ...w, phone: "123456" }, []).phone,
    "Enter a valid phone number",
  );
});

test("hostel validation and the closing time read from a reference row", () => {
  const h = {
    ...emptyHostel(),
    hostel_name: "Hostel Z",
    closing_time: "22:30",
  };
  assert.deepEqual(validateHostel(h, []), {});
  assert.equal(
    validateHostel({ ...h, hostel_name: " " }, []).hostel_name,
    "Hostel name is required",
  );
  assert.equal(
    validateHostel({ ...h, hostel_name: " hostel z " }, ["hostel z"])
      .hostel_name,
    "A hostel with this name already exists",
  );
  assert.equal(
    validateHostel({ ...h, closing_time: "24:00" }, []).closing_time,
    "Use 24-hour HH:MM",
  );
  const row = warden("customer_admin", "Hostels").records[0];
  const from = (closing) =>
    hostelFromRecord({
      ...row,
      setup: undefined,
      cells: { ...row.cells, closing },
    }).closing_time;
  assert.equal(from("22:30 (weekdays)"), "22:30");
  assert.equal(from("9:30 pm"), "");
  assert.equal(from("—"), "");
});

test("leave validation needs real dates in order and counts both ends", () => {
  const l = {
    ...emptyLeave(),
    student: "Anaya Gupta · B-224",
    start_date: "2026-10-01",
    end_date: "2026-10-03",
    reason: "Family visit",
  };
  assert.deepEqual(validateLeave(l), {});
  assert.equal(leaveDays(l), 3);
  assert.equal(leaveDays({ ...l, end_date: l.start_date }), 1);
  assert.deepEqual(Object.keys(validateLeave(emptyLeave())).sort(), [
    "end_date",
    "reason",
    "start_date",
    "student",
  ]);
  assert.equal(
    validateLeave({ ...l, start_date: "2026-02-30" }).start_date,
    "Use YYYY-MM-DD",
  );
  assert.equal(
    validateLeave({ ...l, end_date: "2026-09-30" }).end_date,
    "End date is before start date",
  );
});

test("records follow the page columns, start a session timeline and keep id and scope on edit", () => {
  const page = warden("customer_admin", "Wardens");
  const w = {
    ...emptyWarden(),
    name: "QA Warden",
    email: "qa@example.com",
    phone: "9876543210",
    hostels: ["Hostel A"],
  };
  const scope = ["Across campuses", "Residential Campus"];
  const created = wardenRecord(page, w, scope, "Admin", "Record created");
  assert.match(created.id, /^NEW-WDN-/);
  assert.deepEqual(
    Object.keys(created.cells),
    page.columns.map((c) => c.id),
  );
  assert.equal(created.cells.hostels, "Hostel A");
  assert.deepEqual(created.scope, scope);
  assert.deepEqual(created.detail.timeline[0], {
    time: "Just now",
    event: "Record created",
    actor: "Admin",
  });
  assert.deepEqual(wardenFromRecord(created), w);
  const edited = wardenRecord(
    page,
    { ...w, designation: "Sub Admin" },
    ["Main Campus"],
    "Admin",
    "Configuration updated",
    created,
  );
  assert.equal(edited.id, created.id);
  assert.deepEqual(edited.scope, scope);
  assert.equal(edited.cells.hostels, "All (view only)");
  assert.equal(edited.detail.timeline.length, 2);

  // A reference hostel keeps its staffing text and state when edited.
  const hostels = warden("customer_admin", "Hostels");
  const source = hostels.records[0];
  const hostel = hostelRecord(
    hostels,
    { ...hostelFromRecord(source), rooms: "" },
    scope,
    "Admin",
    "Configuration updated",
    source,
  );
  assert.equal(hostel.cells.wardens, source.cells.wardens);
  assert.equal(hostel.cells.rooms, "—");
  assert.deepEqual(hostel.state, source.state);

  const leaves = warden("customer_admin", "Leave Management");
  const pending = leaves.records.find(leaveEditable);
  assert.ok(pending, "a pending leave row");
  const leave = leaveRecord(
    leaves,
    { ...leaveFromRecord(pending), status: "Approved" },
    scope,
    "Admin",
    "Configuration updated",
    pending,
  );
  assert.equal(leave.cells.status, "Approved");
  assert.equal(leave.state.tone, "complete");
  assert.equal(leaveEditable(leave), false);
});

test("warden metrics count designations and missing details", () => {
  const page = warden("customer_admin", "Wardens");
  const [wardens, subAdmins, missing] = wardenMetrics(page.records);
  assert.equal(
    Number(wardens.value) + Number(subAdmins.value),
    page.records.filter((r) =>
      ["Warden", "Sub Admin"].includes(r.cells.designation),
    ).length,
  );
  assert.equal(
    missing.value,
    String(
      page.records.filter((r) => r.cells.email === "—" || r.cells.phone === "—")
        .length,
    ),
  );
});
