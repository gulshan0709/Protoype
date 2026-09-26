const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  withDemoVolume,
  realisticContacts,
  targetRows,
} = require("../src/domain/contracts/demoVolume.ts");
const { cellText } = require("../src/domain/contracts/logic.ts");
const { validateClass } = require("../src/domain/classes/setup.ts");
const { validateLearner } = require("../src/domain/learners/setup.ts");
const {
  validateCamera,
  hasCameraErrors,
} = require("../src/domain/cameras/setup.ts");

function education() {
  const d = structuredClone(
    require("../src/domain/contracts/data/education.json"),
  );
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
function load(id) {
  const d =
    id === "education"
      ? education()
      : structuredClone(require("../src/domain/contracts/data/" + id + ".json"));
  realisticContacts(d);
  return d;
}
function* pages(d) {
  for (const [role, areas] of Object.entries(d.pages))
    for (const branches of Object.values(areas))
      for (const tabs of Object.values(branches))
        for (const [tab, base] of Object.entries(tabs))
          for (const [variant, page] of base.variants
            ? Object.entries(base.variants)
            : [[undefined, base]])
            yield { role, tab, variant, page };
}
const industries = ["education", "retail", "manufacturing"];
const expanded = Object.fromEntries(
  industries.map((id) => {
    const d = load(id);
    for (const { role, tab, variant, page } of pages(d))
      withDemoVolume(page, d, role, tab, variant);
    return [id, d];
  }),
);

test("operational pages are filled to a realistic list; catalogs stay short", () => {
  assert.equal(targetRows("Coverage", 3), 24);
  assert.equal(targetRows("Late Arrivals", 9), 30);
  assert.equal(targetRows("Reports", 3), 5);
  assert.equal(targetRows("Campuses", 3), 3);
  const e = expanded.education.pages.customer_admin;
  assert.equal(e.product["Class & Lab Attendance"].Coverage.records.length, 24);
  assert.ok(e.product["Class & Lab Attendance"].Learners.records.length >= 20);
  assert.ok(e.product.Gate["User Attendance"].records.length >= 20);
  assert.ok(e.product.Shield.Cases.records.length >= 20);
  // Linked setup pages and one person's timetable keep their authored rows.
  assert.equal(e.product.Warden.Hostels.records.length, 3);
  assert.equal(
    expanded.education.pages.faculty.product["Class & Lab Attendance"].Today
      .records.length,
    3,
  );
  let total = 0;
  for (const id of industries)
    for (const { page } of pages(expanded[id])) total += page.records.length;
  assert.ok(total > 6000, "total rows " + total);
});

test("derived rows are complete, scoped to the persona and unique", () => {
  for (const id of industries) {
    const d = expanded[id];
    for (const { role, page } of pages(d)) {
      const scopes = d.core.roles[role].scopes;
      const context = `${id}/${page.id}`;
      assert.equal(
        new Set(page.records.map((r) => r.id)).size,
        page.records.length,
        context + " duplicate IDs",
      );
      for (const r of page.records) {
        assert.ok(r.scope.length, context);
        for (const s of r.scope)
          assert.ok(scopes.includes(s), `${context}/${r.id} scope ${s}`);
        assert.ok(r.state.label && r.state.tone, context);
        assert.ok(r.detail.title, context);
        for (const c of page.columns)
          assert.notEqual(r.cells[c.id], undefined, `${context}/${r.id}/${c.id}`);
      }
    }
  }
});

test("derivation is deterministic across loads", () => {
  const again = load("education");
  const page = again.pages.customer_admin.product.Gate["User Attendance"];
  withDemoVolume(page, again, "customer_admin", "User Attendance");
  const first = expanded.education.pages.customer_admin.product.Gate["User Attendance"];
  assert.deepEqual(
    page.records.map((r) => [r.id, cellText(r.cells.user)]),
    first.records.map((r) => [r.id, cellText(r.cells.user)]),
  );
});

test("people, IDs and times change consistently inside a derived row", () => {
  const page =
    expanded.education.pages.customer_admin.product["Class & Lab Attendance"]
      .Coverage;
  const derived = page.records.slice(3);
  assert.ok(derived.length > 10);
  for (const r of derived) {
    const room = cellText(r.cells.space).match(/Room (\d+)/)?.[1];
    if (room) assert.match(r.id, new RegExp(room));
  }
  const learners =
    expanded.education.pages.customer_admin.product["Class & Lab Attendance"]
      .Learners.records;
  for (const r of learners.slice(3)) {
    if (!r.setup?.first_name) continue;
    const name = cellText(r.cells.learner);
    assert.ok(
      name.startsWith(r.setup.first_name + " " + r.setup.last_name),
      name + " vs setup",
    );
    assert.ok(r.setup.email.startsWith(r.setup.first_name.toLowerCase()));
  }
});

test("derived setup forms still validate", () => {
  for (const { page } of pages(expanded.education))
    for (const r of page.records) {
      if (r.setupKind === "class" || r.setupKind === "lab")
        assert.deepEqual(validateClass(r.setup, r.setupKind), {}, r.id);
      if (r.setupKind === "learner")
        assert.deepEqual(validateLearner(r.setup), {}, r.id);
      if (r.setupKind === "camera")
        assert.equal(
          hasCameraErrors(
            validateCamera(r.setup, page.id === "ca-gate-cameras" ? "gate" : "room"),
          ),
          false,
          r.id,
        );
    }
});

test("corporate and manufacturing need no contact cleanup at start-up", () => {
  for (const id of ["corporate", "manufacturing"]) {
    const text = JSON.stringify(require("../src/domain/contracts/data/" + id + ".json").pages);
    assert.doesNotMatch(text, /@example\.com|9876\d{6}|192\.0\.2\./, id);
    assert.doesNotMatch(text, /"eyebrow":"[^"]*· [a-z][a-z0-9_-]*\d[a-z0-9_-]*"/, id);
  }
  for (const i of [1, 2, 3, 4])
    assert.doesNotMatch(
      JSON.stringify(require("../src/domain/contracts/corporate/rows-" + i + ".json")),
      /@example\.com|9876\d{6}|192\.0\.2\./,
    );
});

test("no placeholder contacts or copied education wording remain", () => {
  for (const id of industries) {
    const text = JSON.stringify(
      [...pages(expanded[id])].map(({ page }) => page.records),
    );
    assert.doesNotMatch(text, /@example\.com/, id);
    assert.doesNotMatch(text, /"98765\d{5}"/, id);
    if (id === "retail") assert.doesNotMatch(text, /"Faculty"|vendor \d+ vendor/);
  }
});

test("corporate placeholders are replaced by authored rows inside each persona's scope", () => {
  const { applyCorporateRows } = require("../src/domain/contracts/corporateDemo.ts");
  const d = structuredClone(require("../src/domain/contracts/data/corporate.json"));
  const rows = {};
  for (const i of [1, 2, 3, 4])
    Object.assign(rows, require("../src/domain/contracts/corporate/rows-" + i + ".json"));
  applyCorporateRows(d, rows);
  realisticContacts(d);
  let total = 0;
  for (const { role, page } of pages(d)) {
    const scopes = d.core.roles[role].scopes;
    assert.ok(page.records.length, page.id + " is empty");
    total += page.records.length;
    assert.equal(new Set(page.records.map((r) => r.id)).size, page.records.length, page.id);
    for (const r of page.records) {
      assert.doesNotMatch(r.detail.summary, /decision record for/, page.id);
      for (const s of r.scope) assert.ok(scopes.includes(s), `${page.id} ${s}`);
      for (const c of page.columns) assert.equal(typeof r.cells[c.id], "string", page.id + c.id);
    }
  }
  assert.ok(total > 2000, "corporate rows " + total);
  const reception = d.pages.reception_lead.product.Visitor.Expected.records;
  assert.ok(reception.every((r) => r.scope[0] === "New York HQ"));
  const customers = d.pages.vizenta_admin.org["Customers & Deployments"].Customers.records;
  for (const r of customers)
    if (!/^(Asteron Group|Northstar Holdings)/.test(r.cells.customer))
      assert.deepEqual(r.scope, ["All customers"], r.cells.customer);
});
