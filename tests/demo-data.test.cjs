const { test } = require("node:test");
const assert = require("node:assert/strict");
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
test("every table across all industries and variants has demo records", () => {
  let pages = 0,
    records = 0;
  for (const id of ["education", "corporate", "retail", "manufacturing"]) {
    const d =
      id === "education"
        ? education()
        : require("../src/domain/contracts/data/" + id + ".json");
    function check(p) {
      pages++;
      records += p.records.length;
      if (p.columns.length) assert.ok(p.records.length, p.id + " is empty");
      assert.equal(
        new Set(p.records.map((r) => r.id)).size,
        p.records.length,
        p.id + " duplicate IDs",
      );
      for (const r of p.records) {
        assert.ok(r.scope.length);
        assert.ok(r.detail.title);
      }
      for (const v of Object.values(p.variants ?? {})) check(v);
    }
    for (const areas of Object.values(d.pages))
      for (const branches of Object.values(areas))
        for (const tabs of Object.values(branches))
          for (const p of Object.values(tabs)) check(p);
  }
  console.log({ pages, records });
});
test("management fixture forms validate and assignment data stays consistent", () => {
  const d = education();
  for (const areas of Object.values(d.pages))
    for (const branches of Object.values(areas))
      for (const tabs of Object.values(branches))
        for (const p of Object.values(tabs))
          for (const r of p.records) {
            if (r.setupKind === "class" || r.setupKind === "lab")
              assert.deepEqual(validateClass(r.setup, r.setupKind), {}, r.id);
            if (r.setupKind === "learner")
              assert.deepEqual(validateLearner(r.setup), {}, r.id);
            if (r.setupKind === "camera")
              assert.equal(
                hasCameraErrors(
                  validateCamera(
                    r.setup,
                    p.id === "ca-gate-cameras" ? "gate" : "room",
                  ),
                ),
                false,
                r.id,
              );
            if (r.setupKind === "setupCamera")
              assert.ok(r.setup.ip && r.setup.camera_id);
          }
  for (const role of ["customer_admin", "vizenta_admin"]) {
    const residence = d.pages[role].product.Warden;
    for (const hostel of residence.Hostels.records) {
      for (const name of hostel.setup.wardens) {
        const warden = residence.Wardens.records.find(
          (r) => r.setup.name === name,
        );
        assert.ok(warden);
        assert.ok(warden.setup.hostels.includes(hostel.cells.hostel));
      }
    }
  }
  const branch = d.pages.customer_admin.org["Sources & Setup"];
  for (const camera of branch["Camera Setup"].records)
    assert.ok(
      branch["Surveillance Dashboard"].records.some(
        (r) => r.cells.camera === camera.cells.location,
      ),
    );
});
