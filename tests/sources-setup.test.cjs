const { educationWithExtensions } = require("./helpers.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  sourcesSetupEnabled,
  emptySetupCamera,
  setupCameraFromRecord,
  validateSetupCamera,
  validateSetupCameras,
  setupCameraRecord,
  emptyShift,
  validateShift,
  shiftRecord,
  shiftFromRecord,
  atCamera,
} = require("../src/domain/sources/setup.ts");

const d = educationWithExtensions();
const sources = d.pages.customer_admin.org["Sources & Setup"];
const camera = {
  ...emptySetupCamera(1),
  display_name: "QA Setup Camera",
  brand: "Axis",
  ip: "192.168.1.22",
  port: "554",
  camera_id: "QA-CAM",
  user_name: "demo",
  password: "test-only",
};

test("sources setup is Customer Admin's Camera Setup and Shift pages", () => {
  const w = { industry: "education", role: "customer_admin" };
  assert.ok(sourcesSetupEnabled(w, sources["Camera Setup"].id));
  assert.ok(sourcesSetupEnabled(w, sources.Shift.id));
  assert.equal(sourcesSetupEnabled(w, sources["Camera Criteria"].id), false);
  assert.equal(
    sourcesSetupEnabled(
      { industry: "education", role: "vizenta_admin" },
      "ca-setup-cameras",
    ),
    false,
  );
});

test("setup camera validation keeps its own messages and the shared endpoint rules", () => {
  assert.deepEqual(validateSetupCamera(camera, []), {});
  const blank = validateSetupCamera(
    { ...emptySetupCamera(1), display_name: " " },
    [],
  );
  assert.equal(blank.display_name, "Please enter display name");
  assert.equal(blank.brand, "Please select camera brand");
  assert.equal(blank.ip, "Please enter IP address");
  assert.equal(blank.port, "Please enter port");
  assert.equal(blank.camera_id, "Please enter camera ID");
  assert.equal(blank.user_name, "Please enter user name");
  assert.equal(blank.password, "Please enter password");
  assert.equal(
    validateSetupCamera({ ...camera, ip: "999.1.1.1" }, []).ip,
    "Enter an IPv4 address or host name",
  );
  assert.equal(
    validateSetupCamera({ ...camera, ip: "cam-1.campus.local" }, []).ip,
    undefined,
  );
  assert.equal(
    validateSetupCamera({ ...camera, port: "65536" }, []).port,
    "Port must be 1–65535",
  );
  assert.equal(
    validateSetupCamera({ ...camera, start: "7:00", end: "23:59" }, []).start,
    "Use 24-hour HH:MM",
  );
  assert.equal(
    validateSetupCamera(camera, ["qa setup camera"]).display_name,
    "Another camera uses this name",
  );
});

test("each camera card needs a name the other cards do not use", () => {
  const [first, second] = validateSetupCameras(
    [camera, { ...camera, display_name: " qa setup CAMERA " }],
    [],
  );
  assert.equal(first.display_name, "Another camera uses this name");
  assert.equal(second.display_name, "Another camera uses this name");
  const next = emptySetupCamera(2, camera);
  assert.equal(next.display_name, "Camera-2");
  assert.equal(next.ip, camera.ip);
  assert.equal(next.camera_id, "");
  assert.deepEqual(
    validateSetupCameras(
      [camera, { ...next, brand: "Axis", camera_id: "2" }],
      [],
    ),
    [{}, {}],
  );
});

test("shift validation: required times, distinct start and end, whole-minute buffers", () => {
  const sh = {
    ...emptyShift(),
    name: "QA Shift",
    start: "22:00",
    end: "06:00",
  };
  assert.deepEqual(validateShift(sh, []), {});
  assert.deepEqual(Object.keys(validateShift(emptyShift(), [])).sort(), [
    "end",
    "name",
    "start",
  ]);
  assert.equal(
    validateShift({ ...sh, name: " qa shift " }, ["qa shift"]).name,
    "Shift with this name already exists",
  );
  assert.equal(
    validateShift({ ...sh, end: "22:00" }, []).end,
    "Start time and end time cannot be the same",
  );
  assert.equal(
    validateShift({ ...sh, start: "25:00" }, []).start,
    "Use 24-hour HH:MM",
  );
  assert.equal(
    validateShift({ ...sh, startBuffer: "1.5" }, []).startBuffer,
    "Use whole minutes (0 or more)",
  );
});

test("records follow the page columns; edits keep the camera's service status", () => {
  const cameras = sources["Camera Setup"];
  const scope = ["Across campuses", "Main Campus"];
  const created = setupCameraRecord(
    cameras,
    camera,
    scope,
    "Admin",
    "Camera created",
  );
  assert.match(created.id, /^NEW-CAM-/);
  assert.deepEqual(
    Object.keys(created.cells),
    cameras.columns.map((c) => c.id),
  );
  assert.equal(created.cells.status, "Not active");
  assert.equal(created.cells.days, "All Day");
  assert.deepEqual(created.detail.timeline[0], {
    time: "Just now",
    event: "Camera created",
    actor: "Admin",
  });
  const source = cameras.records[0];
  const edited = setupCameraRecord(
    cameras,
    { ...setupCameraFromRecord(source), port: "8554" },
    ["Main Campus"],
    "Admin",
    "Camera updated",
    source,
  );
  assert.equal(edited.id, source.id);
  assert.deepEqual(edited.scope, source.scope);
  assert.equal(edited.cells.port, "8554");
  assert.equal(edited.cells.status, source.cells.status);
  assert.deepEqual(edited.state, source.state);

  const shifts = sources.Shift;
  const shift = shiftRecord(
    shifts,
    {
      ...emptyShift(),
      name: " Night ",
      start: "22:00",
      end: "06:00",
      endBuffer: "",
    },
    scope,
    "Admin",
    "Shift created",
  );
  assert.match(shift.id, /^NEW-SHF-/);
  assert.equal(shift.cells.name, "Night");
  assert.equal(shift.cells.endBuffer, "0");
  assert.equal(shift.detail.summary, "22:00–06:00 (overnight)");
  assert.deepEqual(shiftFromRecord(shift).name, " Night ");
});

test("a detection belongs to the camera whose location names its place", () => {
  const cam = { cells: { display: "CAM-9", location: "Main Gate · Lane 2" } };
  const at = (place) => atCamera({ cells: { camera: place } }, cam);
  assert.equal(at("Main Gate"), true);
  assert.equal(at("main gate"), true);
  assert.equal(at("Service Gate"), false);
  assert.equal(at(""), false);
  assert.equal(
    atCamera({ cells: { camera: "CAM-9" } }, { cells: { display: "CAM-9" } }),
    true,
  );
});
