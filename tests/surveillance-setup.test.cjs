const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  emptyUser,
  validateUser,
  checkUserUpload,
  userRecord,
  userMetrics,
  surveillanceEnabled,
} = require("../src/domain/surveillance/setup.ts");
const {
  surveillanceUsers,
} = require("../src/domain/contracts/surveillanceExtension.ts");
test("surveillance roles and navigation are limited to the two admins", () => {
  const data = structuredClone(
    require("../src/domain/contracts/data/education.json"),
  );
  surveillanceUsers(data);
  surveillanceUsers(data);
  for (const role of ["customer_admin", "vizenta_admin"]) {
    assert.equal(
      data.core.roles[role].organization.filter(
        (x) => x === "Surveillance Users",
      ).length,
      1,
    );
    assert.ok(
      surveillanceEnabled(
        { industry: "education", role },
        data.pages[role].org["Surveillance Users"].Users.id,
      ),
    );
  }
  assert.equal(
    surveillanceEnabled(
      { industry: "education", role: "dean" },
      "ca-surveillance-users",
    ),
    false,
  );
});
test("surveillance CSV blocks duplicate identities and invalid visitor dates", () => {
  const form = {
    ...emptyUser(),
    uid: "A",
    first_name: "Test",
    email: "test@example.com",
  };
  assert.deepEqual(validateUser(form), {});
  assert.ok(
    validateUser({
      ...form,
      user_type: "Visitor",
      start_time: "2026-02-30 09:00",
      end_time: "2026-03-01 10:00",
    }).start_time,
  );
  const table = [
    ["uid", "first_name", "email", "user_type"],
    ["A", "Test", "test@example.com", "Identified"],
    ["B", "Other", "test@example.com", "Identified"],
    ["C", "Existing", "existing@example.com", "Identified"],
  ];
  assert.deepEqual(
    checkUserUpload(table, {
      uids: [],
      emails: ["existing@example.com"],
    }).rows.map((r) => r.status),
    ["Valid", "Duplicate", "Existing"],
  );
  assert.ok(checkUserUpload([["uid", "uid"]], { uids: [], emails: [] }).error);
});
test("surveillance edits retain identity and metrics reflect session rows", () => {
  const data = structuredClone(
    require("../src/domain/contracts/data/education.json"),
  );
  surveillanceUsers(data);
  const page = data.pages.customer_admin.org["Surveillance Users"].Users;
  const form = {
    ...emptyUser(),
    uid: "A",
    first_name: "Test",
    email: "test@example.com",
  };
  const row = userRecord(
    page,
    form,
    ["Across campuses", "Main Campus"],
    "Admin",
    "Created",
  );
  const edit = userRecord(
    page,
    { ...form, user_type: "Threat" },
    row.scope,
    "Admin",
    "Edited",
    row,
  );
  assert.equal(edit.id, row.id);
  assert.equal(
    userMetrics([edit]).find((m) => m.label === "Threat").value,
    "1",
  );
  assert.equal(edit.detail.timeline.length, 2);
});
