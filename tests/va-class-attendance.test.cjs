const { test } = require("node:test");
const assert = require("node:assert/strict");
// Loads src/**/*.ts the way Metro does (extensionless imports, JSON imports).
require("../scripts/lib/ts-hooks.cjs");
const {
  industries,
  getPage,
  visibleProducts,
} = require("../src/domain/contracts/registry.ts");
const { scopedRecords } = require("../src/domain/contracts/logic.ts");
const { setupKinds, classRecord, emptyClass } = require("../src/domain/classes/setup.ts");
const { learnerSetupEnabled } = require("../src/domain/learners/setup.ts");
const { cameraSetupVariant } = require("../src/domain/cameras/setup.ts");
const { classSession, sessionRows } = require("../src/domain/classes/attendance.ts");

const PRODUCT = "Class & Lab Attendance";
const education = industries.education;
const va = { industry: "education", role: "vizenta_admin", scope: "All customers" };
const ca = { industry: "education", role: "customer_admin", scope: "Across campuses" };
const tab = (w, name) => getPage(w, { type: "product", name: PRODUCT, tab: name });
const tabs = education.core.productTabs.customer_admin[PRODUCT];

test("Vizenta Admin has Customer Admin's Class & Lab Attendance tabs", () => {
  assert.equal(visibleProducts(va)[0], PRODUCT);
  assert.deepEqual(education.core.productTabs.vizenta_admin[PRODUCT], tabs);
  assert.deepEqual(tabs, ["Coverage", "Mappings", "Learners", "Sources", "Policies", "Reports"]);
  for (const name of tabs) {
    const mine = tab(va, name);
    const source = tab(ca, name);
    assert.equal(mine.id, source.id.replace(/^ca-/, "va-"), name);
    assert.notEqual(mine, source, name);
    // The same rows as the Customer Admin, after demo volume, and they do not grow again.
    assert.deepEqual(mine.records.map((r) => r.id), source.records.map((r) => r.id), name);
    assert.equal(tab(va, name).records.length, source.records.length, name);
    assert.ok(source.records.every((r) => r.scope.includes("Across campuses")), name);
  }
  assert.doesNotMatch(tab(va, "Reports").description, /Customer Admin/);
});

test("the rows belong to the education tenant only", () => {
  for (const name of tabs) {
    const page = tab(va, name);
    for (const r of page.records)
      assert.deepEqual(r.scope, ["All customers", "Northbridge Education"], name);
    assert.equal(scopedRecords(page, "All customers").length, page.records.length, name);
    assert.equal(scopedRecords(page, "Northbridge Education").length, page.records.length, name);
    assert.equal(scopedRecords(page, "Eastgate University").length, 0, name);
    assert.equal(scopedRecords(page, "Across campuses").length, 0, name);
  }
});

test("Vizenta Admin can set up classes, labs, learners and room cameras there", () => {
  assert.deepEqual(setupKinds(va, "va-class-coverage"), ["class", "lab"]);
  for (const id of ["va-class-mappings", "va-class-learners", "va-class-sources", "ca-class-coverage"])
    assert.deepEqual(setupKinds(va, id), [], id);
  assert.equal(learnerSetupEnabled(va, "va-class-learners"), true);
  assert.equal(learnerSetupEnabled(va, "ca-class-learners"), false);
  assert.equal(cameraSetupVariant(va, "va-class-sources"), "room");
  for (const id of ["ca-class-sources", "ca-gate-cameras", "va-gate-in-out"])
    assert.equal(cameraSetupVariant(va, id), undefined, id);
  // Customer Admin keeps its own pages.
  assert.equal(cameraSetupVariant(ca, "ca-class-sources"), "room");
  assert.equal(cameraSetupVariant(ca, "va-class-sources"), undefined);

  const created = classRecord(
    tab(va, "Coverage"),
    { ...emptyClass(), class_name: "Systems", faculty_email: "f@college.edu", Tag: "Lecture" },
    ["All customers", "Northbridge Education"],
    "QA",
    "Created",
  );
  assert.equal(created.cells.campus, "Northbridge Education");
});

test("a class opens the same session roster as for the Customer Admin", () => {
  const related = sessionRows(education);
  const mine = tab(va, "Coverage").records[0];
  const source = tab(ca, "Coverage").records[0];
  const a = classSession("va-class-coverage", mine, related);
  const b = classSession("ca-class-coverage", source, related);
  assert.ok(a && a.learners.length > 0);
  assert.deepEqual(a, b);
});
