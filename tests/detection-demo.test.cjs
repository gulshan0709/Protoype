const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  detectionKind,
  detectionStyles,
} = require("../src/domain/contracts/detectionDemo.ts");
const record = (cells = {}, setup) => ({
  cells,
  setup,
  detail: { title: "Sample person" },
  type: "person",
});
test("demo identity classifications use the requested colors", () => {
  for (const [name, color] of Object.entries({
    threat: "#FACC15",
    identified: "#22C55E",
    visitor: "#A855F7",
    unidentified: "#EF4444",
  })) {
    assert.equal(detectionStyles[name].color, color);
    assert.equal(
      detectionKind(record({ type: detectionStyles[name].label })),
      name,
    );
  }
});
test("unknown and watchlist identities never fall through to identified", () => {
  assert.equal(
    detectionKind(record({ user: "Unknown person" })),
    "unidentified",
  );
  assert.equal(detectionKind(record({}, { user_type: "Threat" })), "threat");
  assert.equal(detectionKind(record({ user: "Watchlist match" })), "threat");
  assert.equal(detectionKind(record({}, { user_type: "Visitor" })), "visitor");
  assert.equal(detectionKind(record({ state: "Critical" })), "identified");
});
