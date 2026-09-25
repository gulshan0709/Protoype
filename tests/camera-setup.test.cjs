const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  emptyCamera,
  validateCamera,
  hasCameraErrors,
  cameraRecord,
  cameraSetupVariant,
} = require("../src/domain/cameras/setup.ts");
const data = require("../src/domain/contracts/data/education.json");
const form = {
  ...emptyCamera("room"),
  building: "Block A",
  room_number: "204",
  detection: "0.6",
  recognition: "0.8",
  cameras: [
    {
      display_name: "QA camera",
      camera_brand: "Axis",
      ip: "192.168.1.20",
      port: "554",
      camera_id: "QA-1",
      user_name: "demo",
      password: "test-only",
    },
  ],
};
test("camera validation checks required devices, network settings and duplicate IDs", () => {
  assert.equal(hasCameraErrors(validateCamera(form, "room")), false);
  assert.ok(hasCameraErrors(validateCamera({ ...form, cameras: [] }, "room")));
  assert.ok(
    validateCamera(
      {
        ...form,
        cameras: [{ ...form.cameras[0], ip: "999.1.1.1", port: "65536" }],
      },
      "room",
    ).cameras[0].ip,
  );
  assert.ok(
    validateCamera(
      {
        ...form,
        cameras: [
          form.cameras[0],
          { ...form.cameras[0], display_name: "Other" },
        ],
      },
      "room",
    ).cameras[1].camera_id,
  );
});
test("camera source edits preserve health on repeated edits and exclude credentials from details", () => {
  for (const [product, tab, variant] of [
    ["Class & Lab Attendance", "Sources", "room"],
    ["Gate", "Cameras", "gate"],
  ]) {
    const page = data.pages.customer_admin.product[product][tab];
    const source = page.records[0];
    const config = {
      ...form,
      attendance_type: variant === "gate" ? "Entry" : "Periodic Snapshot",
    };
    const edit = cameraRecord(
      page,
      config,
      variant,
      source.scope,
      "Admin",
      "Edited",
      source,
    );
    const twice = cameraRecord(
      page,
      config,
      variant,
      source.scope,
      "Admin",
      "Edited",
      edit,
    );
    assert.deepEqual(twice.state, source.state);
    assert.equal(twice.id, source.id);
    assert.equal(twice.detail.title, "QA camera");
    assert.equal(JSON.stringify(twice.detail).includes("test-only"), false);
    const created = cameraRecord(
      page,
      config,
      variant,
      ["Main Campus"],
      "Admin",
      "Created",
    );
    assert.equal(created.state.label, "Pending");
  }
});
test("camera management is restricted to customer admin camera pages", () => {
  assert.equal(
    cameraSetupVariant(
      { industry: "education", role: "customer_admin" },
      "ca-gate-cameras",
    ),
    "gate",
  );
  assert.equal(
    cameraSetupVariant(
      { industry: "education", role: "dean" },
      "ca-gate-cameras",
    ),
    undefined,
  );
});
