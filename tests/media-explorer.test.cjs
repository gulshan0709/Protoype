const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
// Loads src/**/*.ts the way Metro does (extensionless imports, JSON imports).
require("../scripts/lib/ts-hooks.cjs");
const m = require("../src/domain/media/explorer.ts");
const {
  mediaExplorer,
  MEDIA_EXPLORER_PAGE,
} = require("../src/domain/contracts/mediaExtension.ts");
const pool = require("../src/domain/media/framePool.json");

// Monday 28 Sep 2026, 14:10 local time.
const now = new Date(2026, 8, 28, 14, 10, 0);
const ALL = "All customers";
const NB = "org_1042";
const camera = (name) => m.mediaCameras.find((c) => c.name === name);
const folder = (name) => m.cameraFolder(camera(name));

test("the tree follows processed_img / org / camera / date / slot", () => {
  assert.deepEqual(
    m.LEVELS.map((l) => l.key),
    ["org", "camera", "date", "slot"],
  );
  const selection = {
    org: NB,
    camera: folder("CAM-012"),
    date: "20260928",
    slot: "100000",
  };
  assert.equal(
    m.prefixFor(selection),
    `processed_img/${NB}/102430205541/20260928/100000/`,
  );
  assert.equal(
    m.prefixFor({ org: NB, date: "20260928" }),
    `processed_img/${NB}/`,
  );
  assert.equal(m.activeLevel({ org: NB }).key, "camera");
  assert.ok(m.isLeaf(selection));
});

test("customers are scoped; unknown scopes and foreign links see nothing", () => {
  assert.deepEqual(m.listFolders({}, ALL, now), ["org_1042", "org_1088"]);
  assert.deepEqual(m.listFolders({}, "Northbridge Education", now), [
    "org_1042",
  ]);
  assert.deepEqual(m.listFolders({}, "Eastgate University", now), ["org_1088"]);
  assert.deepEqual(m.listFolders({}, "Main Campus", now), []);
  assert.deepEqual(m.listFolders({}, undefined, now), []);
  // A deep link into another customer resolves to the root, not to its frames.
  const foreign = {
    org: "org_1088",
    camera: folder("EG-GATE-01"),
    date: "20260928",
    slot: "100000",
  };
  assert.deepEqual(
    m.resolveSelection(foreign, "Northbridge Education", now),
    {},
  );
  assert.equal(m.listFrames(foreign, "Northbridge Education", now).total, 0);
  assert.ok(m.listFrames(foreign, "Eastgate University", now).total > 0);
  // A gap or an unknown folder stops at the deepest valid prefix.
  assert.deepEqual(
    m.resolveSelection({ org: NB, date: "20260928" }, ALL, now),
    { org: NB },
  );
  assert.deepEqual(m.resolveSelection({ org: NB, camera: "999" }, ALL, now), {
    org: NB,
  });
});

test("camera folders are IP digits + port + channel and named from the registry", () => {
  const cam = camera("CAM-012");
  assert.equal(cam.ip, "10.24.30.20");
  assert.equal(m.cameraFolder(cam), "102430205541");
  assert.equal(
    m.describeCamera("102430205541", NB).label,
    "CAM-012 · Engineering Room 204",
  );
  assert.match(m.describeCamera("102430205541", NB).sub, /10\.24\.30\.20:554/);
  assert.equal(m.describeCamera("123", NB).label, "Camera 123");
  assert.equal(m.describeOrg(NB).label, "Northbridge Education");
  assert.equal(m.describeOrg("org_77").label, "Org 77");
  const names = m
    .listFolders({ org: NB }, ALL, now)
    .map((f) => m.describeCamera(f, NB).label);
  assert.ok(names.includes("CAM-007 · Management Room 302"));
  assert.equal(
    new Set(m.mediaCameras.map(m.cameraFolder)).size,
    m.mediaCameras.length,
  );
});

test("dates cover the retention window, skip inactive days and are labelled", () => {
  const gate = m.listFolders(
    { org: NB, camera: folder("CAM-MG-IN1") },
    ALL,
    now,
  );
  assert.equal(gate.length, m.RETENTION_DAYS);
  assert.deepEqual([gate[0], gate.at(-1)], ["20260922", "20260928"]);
  // Class cameras are off on Sundays (27 Sep).
  const room = m.listFolders({ org: NB, camera: folder("CAM-012") }, ALL, now);
  assert.ok(!room.includes("20260927"));
  assert.ok(room.includes("20260926"));
  assert.deepEqual(m.describeDate("20260928", now), {
    label: "28 Sep 2026",
    sub: "Monday",
    badge: "Today",
  });
  assert.equal(m.describeDate("20260927", now).badge, "Yesterday");
  assert.equal(m.describeDate("20260925", now).badge, undefined);
  assert.equal(m.describeSlot("133000").range, "1:30 PM – 2:00 PM");
  assert.equal(m.describeSlot("000000").label, "12:00 AM");
});

test("slots stay inside the camera window and never pass now or an outage", () => {
  const today = { org: NB, camera: folder("CAM-012"), date: "20260928" };
  const slots = m.listFolders(today, ALL, now);
  assert.equal(slots[0], "060000");
  assert.equal(slots.at(-1), "140000");
  const cam = camera("CAM-012");
  const current = m.slotFrameCount(cam, "20260928", "140000", now);
  const later = m.slotFrameCount(
    cam,
    "20260928",
    "140000",
    new Date(2026, 8, 28, 14, 29),
  );
  assert.ok(current > 0 && later > current, "the open slot grows with time");
  assert.equal(m.slotFrameCount(cam, "20260928", "143000", now), 0);
  assert.equal(
    m.slotFrameCount(cam, "20260921", "100000", now),
    0,
    "older than retention",
  );
  // North Gate lane 2 went offline at 08:47:09 today.
  const exit = m.listFolders(
    { org: NB, camera: folder("CAM-NG-OUT2"), date: "20260928" },
    ALL,
    now,
  );
  assert.equal(exit.at(-1), "083000");
  const last = m.listFrames(
    {
      org: NB,
      camera: folder("CAM-NG-OUT2"),
      date: "20260928",
      slot: "083000",
    },
    ALL,
    now,
    { pageSize: 5000 },
  );
  assert.ok(last.frames.at(-1).name.split("t")[1].slice(0, 6) <= "084709");
  // CAM-007 stopped two days ago, so its newest folder is 26 Sep.
  assert.equal(
    m.listFolders({ org: NB, camera: folder("CAM-007") }, ALL, now).at(-1),
    "20260926",
  );
  assert.match(
    m.folderStat({ org: NB }, "camera", folder("CAM-007"), now),
    /^Not active · last frames 26 Sep 2026/,
  );
});

test("frames are unique, in time order, named like the bucket and numbered through the day", () => {
  const cam = camera("CAM-MG-IN1");
  const at = (slot) => ({
    org: NB,
    camera: m.cameraFolder(cam),
    date: "20260927",
    slot,
  });
  const frames = m.slotFrames(cam, "20260927", "080000", now);
  assert.equal(frames.length, m.slotFrameCount(cam, "20260927", "080000", now));
  assert.equal(new Set(frames.map((f) => f.key)).size, frames.length);
  for (const [i, f] of frames.entries()) {
    assert.match(f.name, /^1042_102430115541_20260927t08[0-2]\d{9}_\d+\.jpg$/);
    assert.ok(f.key.startsWith(m.prefixFor(at("080000"))));
    if (i)
      assert.ok(
        f.name.split("t")[1] > frames[i - 1].name.split("t")[1],
        "time order",
      );
  }
  const meta = m.describeFrame(frames[0].name);
  assert.match(meta.timeShort, /^8:\d{2}:\d{2} AM$/);
  assert.match(meta.time, /^8:\d{2}:\d{2}\.\d{3} AM$/);
  // Numbering continues from the previous slots of the day.
  const before = m
    .listFolders({ ...at(), slot: undefined }, ALL, now)
    .filter((s) => s < "080000")
    .reduce((sum, s) => sum + m.slotFrameCount(cam, "20260927", s, now), 0);
  assert.equal(meta.sequence, `#${before + 1}`);
  // Clip frames replay a burst in order; frame sizes come from the pool.
  assert.deepEqual(
    frames.slice(0, 3).map((f) => f.file),
    ["clip1-01", "clip1-02", "clip1-03"],
  );
  assert.equal(frames[0].size, pool["corridor-a"].frames[0].size);
  assert.equal(frames[0].still, undefined);
});

test("stills carry a demo classification for the drawn box", () => {
  const cam = camera("CAM-012");
  const frames = m.slotFrames(cam, "20260925", "100000", now);
  assert.ok(frames.length > 0);
  for (const f of frames) {
    assert.ok(["m4", "m5", "m6"].includes(f.still));
    assert.ok(["identified", "visitor", "unidentified"].includes(f.kind));
  }
  assert.ok(new Set(frames.map((f) => f.kind)).size > 1);
});

test("frames page 250 at a time and recordings come with the first page", () => {
  const selection = {
    org: NB,
    camera: folder("CAM-MG-IN1"),
    date: "20260927",
    slot: "080000",
  };
  const first = m.listFrames(selection, ALL, now);
  assert.equal(first.frames.length, m.FRAME_PAGE_SIZE);
  assert.ok(first.hasMore && first.nextMarker === "250");
  const pages = [first];
  while (pages.at(-1).hasMore)
    pages.push(
      m.listFrames(selection, ALL, now, { marker: pages.at(-1).nextMarker }),
    );
  const all = pages.flatMap((p) => p.frames);
  assert.equal(all.length, first.total);
  assert.deepEqual(
    all,
    m.slotFrames(camera("CAM-MG-IN1"), "20260927", "080000", now),
  );
  assert.ok(pages.slice(1).every((p) => p.recordings.length === 0));
  const withClip = m
    .listFolders({ ...selection, slot: undefined }, ALL, now)
    .map((slot) => m.listFrames({ ...selection, slot }, ALL, now).recordings)
    .filter((r) => r.length);
  assert.ok(withClip.length > 0, "some gate slots keep a recording");
  assert.match(withClip[0][0].name, /^102430115541_20260927_\d{6}\.mp4$/);
  assert.equal(withClip[0][0].size, pool["corridor-a"].recording.size);
  // Non-leaf selections have no frames.
  assert.equal(m.listFrames({ org: NB }, ALL, now).total, 0);
});

test("the store is deterministic for the same time", () => {
  const selection = {
    org: "org_1088",
    camera: folder("EG-LOB-01"),
    date: "20260925",
    slot: "110000",
  };
  const a = m.listFrames(selection, ALL, now);
  const b = m.listFrames(selection, ALL, new Date(now));
  assert.deepEqual(a, b);
  assert.deepEqual(m.mediaSummary(ALL, now), {
    customers: 2,
    cameras: 11,
    active: 9,
    inactive: ["CAM-007", "CAM-NG-OUT2"],
  });
});

test("every pooled frame is bundled with a thumbnail", () => {
  const root = path.resolve(__dirname, "..");
  const sources = fs.readFileSync(
    path.join(root, "src/features/workspace/components/mediaFrameSources.ts"),
    "utf8",
  );
  for (const scene of Object.values(pool))
    for (const frame of scene.frames) {
      const full = frame.still
        ? `assets/media/${frame.file}.jpg`
        : `assets/media/frames/${frame.file}.jpg`;
      assert.equal(fs.statSync(path.join(root, full)).size, frame.size, full);
      assert.ok(
        fs.existsSync(
          path.join(root, `assets/media/frames/thumbs/${frame.file}.jpg`),
        ),
      );
      assert.ok(sources.includes(`"${frame.file}": {`), frame.file);
    }
  for (const cam of m.mediaCameras) assert.ok(pool[cam.scene], cam.name);
});

test("Media Explorer is a Vizenta Admin organization page after Estate Health", () => {
  const data = structuredClone(
    require("../src/domain/contracts/data/education.json"),
  );
  mediaExplorer(data, now);
  mediaExplorer(data, now);
  const org = data.core.roles.vizenta_admin.organization;
  assert.equal(org.filter((x) => x === "Media Explorer").length, 1);
  assert.equal(org[org.indexOf("Estate Health") + 1], "Media Explorer");
  const page = data.pages.vizenta_admin.org["Media Explorer"]["Camera Frames"];
  assert.equal(page.id, MEDIA_EXPLORER_PAGE);
  assert.ok(page.heading && page.description && page.sources.length);
  assert.deepEqual(page.records, []);
  const [cameras, recording] = page.metrics;
  assert.deepEqual(cameras.valuesByScope, {
    "All customers": "11",
    "Northbridge Education": "6",
    "Eastgate University": "5",
  });
  assert.equal(recording.valuesByScope["Northbridge Education"], "4 / 6");
  assert.equal(
    recording.contextsByScope["Eastgate University"],
    "All cameras active",
  );
  // No other persona gets the page.
  for (const [role, persona] of Object.entries(data.core.roles))
    if (role !== "vizenta_admin")
      assert.ok(!persona.organization.includes("Media Explorer"), role);
});
