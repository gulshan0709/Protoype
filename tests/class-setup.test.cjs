const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  emptyClass,
  validateClass,
  parseCsv,
  checkUpload,
  classRecord,
  formFromRecord,
  setupKinds,
} = require("../src/domain/classes/setup.ts");
const { applySetup } = require("../src/application/classSetupStore.ts");
const data = require("../src/domain/contracts/data/education.json");
const page =
  data.pages.customer_admin.product["Class & Lab Attendance"].Coverage;
const form = (patch = {}) => ({
  ...emptyClass(),
  class_name: "Systems",
  faculty_email: "faculty@college.edu",
  Tag: "Lecture",
  ...patch,
});

test("class/lab setup is restricted to the five intended education pages", () => {
  assert.deepEqual(
    setupKinds({ industry: "education", role: "customer_admin" }, page.id),
    ["class", "lab"],
  );
  for (const role of ["dean", "coordinator"]) {
    assert.deepEqual(
      setupKinds({ industry: "education", role }, `${role}-classes`),
      ["class"],
    );
    assert.deepEqual(
      setupKinds({ industry: "education", role }, `${role}-labs`),
      ["lab"],
    );
    assert.deepEqual(
      setupKinds({ industry: "education", role }, `${role}-learners`),
      [],
    );
  }
  assert.deepEqual(
    setupKinds({ industry: "corporate", role: "customer_admin" }, page.id),
    [],
  );
  assert.deepEqual(
    setupKinds({ industry: "education", role: "faculty" }, page.id),
    [],
  );
});

test("class forms validate required fields, email, real dates, times and capacity", () => {
  assert.deepEqual(validateClass(form()), {});
  for (const patch of [
    { class_name: " " },
    { faculty_email: "invalid" },
    { capacity: "-1" },
    { Tag: "Unknown" },
    { start_date: "2026-02-30" },
    { start_date: "2026-10-10", end_date: "2026-10-09" },
    { start_time: "14:00", end_time: "13:00" },
    { day: "Someday" },
  ]) {
    assert.ok(
      Object.keys(validateClass(form(patch))).length,
      JSON.stringify(patch),
    );
  }
});

test("CSV handles BOM, quotes, embedded newlines and rejects incomplete quoting", () => {
  assert.deepEqual(
    parseCsv(
      '\uFEFFname,email\r\n"Systems, \"\"II\"\"",test@example.com\r\n"Line\none",another@example.com',
    ),
    [
      ["name", "email"],
      ['Systems, "II"', "test@example.com"],
      ["Line\none", "another@example.com"],
    ],
  );
  assert.throws(() => parseCsv('name\n"unterminated'), /not closed/);
});

test("CSV identifies invalid, duplicate, existing, lab and malformed rows", () => {
  const header = ["class_name", "faculty_email", "Tag"];
  const valid = ["Systems", "faculty@college.edu", "Lecture"];
  const result = checkUpload(
    [
      header,
      valid,
      valid,
      ["Bad", "invalid", "Lecture"],
      ["Existing", "faculty@college.edu", "Lab"],
    ],
    ["Existing"],
  );
  assert.deepEqual(
    result.rows.map((row) => row.status),
    ["Valid", "Duplicate", "Invalid", "Existing"],
  );
  assert.equal(
    checkUpload([header, [...valid, "extra"]], []).rows[0].status,
    "Invalid",
  );
  assert.ok(checkUpload([["class_name"]], []).error);
  assert.ok(checkUpload([header], []).error);
  assert.equal(
    checkUpload(
      [
        ["lab_name", "faculty_email", "Tag"],
        ["Lab 3", "faculty@college.edu", "Lab"],
      ],
      [],
      "lab",
    ).rows[0].status,
    "Valid",
  );
  assert.equal(checkUpload([header, valid], []).rows[0].status, "Valid");
});

test("new classes use campus scope, and repeated source edits preserve attendance", () => {
  const created = classRecord(
    page,
    form({ building: "Engineering Block" }),
    ["Across campuses", "North Campus"],
    "QA",
    "Created",
  );
  assert.equal(created.cells.campus, "North Campus");
  const original = page.records[0];
  const edited = classRecord(
    page,
    form({ class_name: "Renamed" }),
    original.scope,
    "QA",
    "Edited",
    "class",
    original,
  );
  const again = classRecord(
    page,
    form({ class_name: "Renamed again" }),
    original.scope,
    "QA",
    "Edited twice",
    "class",
    edited,
  );
  assert.equal(again.id, original.id);
  assert.deepEqual(again.scope, original.scope);
  assert.deepEqual(again.state, original.state);
  assert.equal(again.cells.roster, original.cells.roster);
  assert.equal(again.cells.camera, original.cells.camera);
  assert.equal(again.detail.title, "Renamed again");
  assert.equal(formFromRecord(again, "class").class_name, "Renamed again");
  assert.equal(
    again.detail.timeline.length,
    original.detail.timeline.length + 2,
  );
});

test("session rows stay isolated by scope and store key, including edits and deletes", () => {
  const added = classRecord(
    page,
    form(),
    ["Across campuses", "Main Campus"],
    "QA",
    "Created",
  );
  const source = page.records[0];
  const state = {
    added: { customer: [added] },
    edited: { customer: { [source.id]: { ...source, action: "Edited" } } },
    deleted: { customer: [page.records[1].id] },
    learners: {},
  };
  assert.equal(
    applySetup(state, "customer", "Main Campus", [source])[0].id,
    added.id,
  );
  assert.equal(applySetup(state, "customer", "North Campus", []).length, 0);
  assert.equal(applySetup(state, "other-role", "Main Campus", []).length, 0);
  const result = applySetup(state, "customer", "Across campuses", page.records);
  assert.equal(result.find((row) => row.id === source.id).action, "Edited");
  assert.ok(!result.some((row) => row.id === page.records[1].id));
});
