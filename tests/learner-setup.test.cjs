const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  emptyLearner,
  validateLearner,
  checkLearnerUpload,
  learnerRecord,
  learnerFromRecord,
  listedUids,
} = require("../src/domain/learners/setup.ts");
const page = require("../src/domain/contracts/data/education.json").pages.dean
  .product["Class & Lab Attendance"].Learners;
const form = {
  ...emptyLearner(),
  uid: "QA-123",
  first_name: "Test",
  last_name: "Learner",
};
test("learner validation rejects malformed dates and CSV duplicate headers and UIDs", () => {
  assert.deepEqual(validateLearner(form), {});
  assert.ok(validateLearner({ ...form, dob: "2005-02-30" }).dob);
  assert.ok(checkLearnerUpload([["uid", "uid"]], []).error);
  const result = checkLearnerUpload(
    [
      ["uid", "first_name", "last_name", "type"],
      ["A", "Test", "One", "Learner"],
      ["A", "Test", "Two", "Learner"],
      ["B", "Test", "Three", "Learner"],
      ["C", "Test"],
    ],
    ["B"],
  );
  assert.deepEqual(
    result.rows.map((r) => r.status),
    ["Valid", "Duplicate", "Existing", "Invalid"],
  );
});
test("repeated learner edits preserve source identity, scope and attendance", () => {
  const source = page.records[0];
  const input = learnerFromRecord(source);
  assert.ok(listedUids([source])[0]);
  const edit = learnerRecord(
    page,
    { ...input, email: "new@example.com" },
    source.scope,
    "Admin",
    "Edited",
    source,
  );
  const twice = learnerRecord(
    page,
    { ...input, email: "next@example.com" },
    source.scope,
    "Admin",
    "Edited",
    edit,
  );
  assert.equal(twice.id, source.id);
  assert.deepEqual(twice.state, source.state);
  assert.equal(twice.cells.mapping, source.cells.mapping);
  assert.deepEqual(twice.scope, source.scope);
  assert.equal(
    twice.detail.sections.filter((s) => s.title === "Learner configuration")
      .length,
    1,
  );
  const created = learnerRecord(
    page,
    form,
    ["Main Campus"],
    "Admin",
    "Created",
  );
  assert.equal(created.state.label, "Pending");
  assert.equal(learnerFromRecord(created).uid, "QA-123");
});
