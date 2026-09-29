const { test } = require("node:test");
const assert = require("node:assert/strict");
// Loads src/**/*.ts the way Metro does (extensionless imports, JSON imports).
require("../scripts/lib/ts-hooks.cjs");
const {
  captureHistory,
  latestCapture,
  personGalleryEnabled,
  rangeLabel,
  PAGE_DAYS,
  RETENTION_DAYS,
} = require("../src/domain/gate/captureHistory.ts");
const { industries, getPage } = require("../src/domain/contracts/registry.ts");

const inOut = (role, scope) =>
  getPage(
    { industry: "education", role, scope },
    { type: "product", name: "Gate", tab: "In/Out" },
  );
const rows = inOut("customer_admin", "Across campuses").records;
const row = (name) => rows.find((r) => String(r.cells.person).startsWith(name));
/** Every page of a person's history, as the gallery loads it. */
const pages = (record) => {
  const out = [captureHistory(record)];
  while (out.at(-1).hasMore)
    out.push(captureHistory(record, { before: out.at(-1).next }));
  return out;
};
const all = (record) =>
  pages(record).flatMap((p) => p.days.flatMap((d) => d.captures));

test("only In/Out opens the gallery for now", () => {
  assert.ok(personGalleryEnabled(inOut("customer_admin", "Across campuses")));
  const attendance = getPage(
    { industry: "education", role: "customer_admin", scope: "Across campuses" },
    { type: "product", name: "Gate", tab: "User Attendance" },
  );
  assert.equal(personGalleryEnabled(attendance), false);
  assert.equal(personGalleryEnabled(undefined), false);
});

test("the row's capture is read with the snapshot's date", () => {
  const meera = latestCapture(row("Meera Patel"));
  assert.equal(meera.direction, "Out");
  assert.equal(meera.gate, "Main Gate");
  // 18:42 is after the 09:45 snapshot, so it is the evening before.
  assert.equal(meera.day.getDate(), 14);
  const riya = latestCapture(row("Riya Sharma"));
  assert.equal(riya.day.getDate(), 14);
  assert.equal(riya.minutes, 4 * 60 + 15);
  assert.ok(riya.noReturn);
  const early = latestCapture({
    ...rows[0],
    cells: { ...rows[0].cells, captured: "09:10" },
  });
  assert.equal(early.day.getDate(), 15);
});

test("captures load three calendar days at a time, back to the retention limit", () => {
  const meera = row("Meera Patel");
  const first = captureHistory(meera);
  assert.equal(PAGE_DAYS, 3);
  assert.deepEqual(
    first.days.map((d) => d.day),
    ["2026-09-14", "2026-09-13", "2026-09-12"],
  );
  assert.equal(first.days[0].label, "Mon, 14 Sep");
  assert.ok(first.hasMore);
  assert.equal(first.next, "2026-09-12");
  const second = captureHistory(meera, { before: first.next });
  assert.equal(second.days[0].day, "2026-09-11");
  assert.equal(rangeLabel(first.days), "12–14 Sep");
  const list = pages(meera);
  const days = list.flatMap((p) => p.days.map((d) => d.day));
  assert.equal(days.length, RETENTION_DAYS);
  assert.equal(new Set(days).size, RETENTION_DAYS, "pages do not overlap");
  assert.equal(days.at(-1), "2026-08-16");
  assert.ok(list.slice(0, -1).every((p) => p.days.length === PAGE_DAYS));
  assert.equal(list.at(-1).hasMore, false);
  assert.equal(list.at(-1).next, undefined);
  assert.equal(rangeLabel(list.at(-1).days), "16–18 Aug");
  assert.equal(
    rangeLabel([{ day: "2026-09-01" }, { day: "2026-08-30" }]),
    "30 Aug – 1 Sep",
  );
  // A first page holds far fewer captures than the whole history.
  const firstCount = first.days.flatMap((d) => d.captures).length;
  assert.ok(firstCount > 0 && firstCount * 4 < all(meera).length);
});

test("every person's history alternates and ends with the row's own capture", () => {
  for (const r of rows) {
    const list = all(r);
    const context = String(r.cells.person);
    assert.ok(
      list.length >= 30 && list.length <= 130,
      `${context}: ${list.length}`,
    );
    assert.equal(new Set(list.map((x) => x.id)).size, list.length, context);
    // Newest first, the row's capture on top and exactly once.
    assert.equal(list.filter((x) => x.current).length, 1, context);
    assert.ok(list[0].current, context);
    const latest = latestCapture(r);
    assert.equal(list[0].direction, latest.direction, context);
    assert.equal(list[0].gate, latest.gate, context);
    assert.equal(list[0].time, String(r.cells.captured).slice(-5), context);
    assert.ok(new Set(list.map((x) => x.day)).size <= RETENTION_DAYS, context);
    // In time order the moves alternate: Out, In, Out, ...
    const ordered = [...list].reverse();
    for (let i = 1; i < ordered.length; i++) {
      assert.notEqual(
        ordered[i].direction,
        ordered[i - 1].direction,
        `${context} #${i}`,
      );
      assert.ok(
        `${ordered[i].day}T${ordered[i].time}` >
          `${ordered[i - 1].day}T${ordered[i - 1].time}`,
        context,
      );
    }
    assert.equal(
      ordered[0].direction,
      "Out",
      `${context} starts the history inside`,
    );
    for (const x of list) {
      assert.ok(x.confidence >= 0.88 && x.confidence <= 0.99, context);
      const room = (x.framing.scale - 1) / 2;
      assert.ok(
        Math.abs(x.framing.x) <= room + 1e-9 &&
          Math.abs(x.framing.y) <= room + 1e-9,
        context,
      );
      assert.match(x.camera, /^(Main Gate|Gate \d) · (entry|exit) camera$/);
      assert.equal(x.camera.includes("entry"), x.direction === "In");
    }
    // The row's own capture is framed like the table's face capture.
    assert.deepEqual(list[0].framing, { scale: 1, x: 0, y: 0 });
  }
});

test("a resident out with no return has nothing after that capture", () => {
  const list = all(row("Riya Sharma"));
  assert.equal(list[0].time, "04:15");
  assert.ok(list[0].lowLight);
  assert.equal(list.filter((x) => x.day === list[0].day).length, 1);
});

test("the same person gets the same captures on every page and role", () => {
  const meera = all(row("Meera Patel"));
  assert.deepEqual(all(structuredClone(row("Meera Patel"))), meera);
  for (const [role, scope] of [
    ["vizenta_admin", "All customers"],
    ["warden", "Residential Campus"],
  ]) {
    const other = inOut(role, scope).records.find((r) =>
      String(r.cells.person).startsWith("Meera Patel"),
    );
    assert.deepEqual(all(other), meera, role);
  }
  // Different people differ.
  assert.notDeepEqual(
    all(row("Tara Iyer")).map((x) => x.time),
    meera.map((x) => x.time),
  );
  assert.ok(industries.education.pages.customer_admin.product.Gate["In/Out"]);
});
