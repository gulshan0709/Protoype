const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  missions,
  missionFor,
  familyOrder,
  orderByFamily,
  primaryMetricIndex,
  sourceHealth,
  isEvidencePanel,
  evidenceStartsCollapsed,
  queueItems,
  decisionOwner,
  actionQueue,
  needsAction,
} = require("../src/domain/contracts/priority.ts");
const { cellText } = require("../src/domain/contracts/logic.ts");
const ids = ["education", "corporate", "retail", "manufacturing"];
const data = Object.fromEntries(
  ids.map((id) => [id, require(`../src/domain/contracts/data/${id}.json`)]),
);

test("every persona has its own mission profile (29 in total)", () => {
  let count = 0;
  for (const id of ids)
    for (const role of Object.keys(data[id].core.roles)) {
      assert.ok(missions[id][role], `${id}/${role} has a profile`);
      count++;
    }
  assert.equal(count, 29);
  const labels = new Set(
    ids.flatMap((id) => Object.values(missions[id]).map((m) => m.label)),
  );
  assert.deepEqual([...labels].sort(), [
    "Combined Operations",
    "Governance & Evidence",
    "Platform Administration",
    "Presence & Automation",
    "Security Response",
  ]);
  assert.equal(missionFor("education", "unknown").queue, "Priority queue");
});

test("security personas lead with Safety; the warden and others keep Presence", () => {
  const safetyFirst = [];
  for (const id of ids)
    for (const role of Object.keys(data[id].core.roles))
      if (familyOrder(id, role)[0] === "Safety")
        safetyFirst.push(`${id}:${role}`);
  assert.deepEqual(safetyFirst.sort(), [
    "corporate:corporate_security_admin",
    "corporate:infosec_audit",
    "education:security_admin",
    "manufacturing:ehs_incident_commander",
    "manufacturing:plant_security_admin",
    "retail:loss_prevention",
  ]);
  assert.equal(familyOrder("education", "warden")[0], "Presence");
  const { products } = data.education.core.roles.security_admin;
  assert.deepEqual(
    orderByFamily(
      products,
      data.education.core.productFamilies,
      familyOrder("education", "security_admin"),
    ),
    ["Shield", "Guard", "Visitor", "Gate", "Hostel", "AI Analytics"],
  );
});

test("family ordering is stable and keeps unknown products last", () => {
  const families = {
    A: { family: "Presence" },
    B: { family: "Safety" },
    C: { family: "Presence" },
    D: { family: "Safety" },
  };
  assert.deepEqual(
    orderByFamily(["A", "B", "X", "C", "D"], families, [
      "Safety",
      "Presence",
      "Insights",
    ]),
    ["B", "D", "A", "C", "X"],
  );
});

test("one KPI is emphasized: critical, then attention, then the first", () => {
  assert.equal(
    primaryMetricIndex([{ tone: "healthy" }, { tone: "critical" }]),
    1,
  );
  assert.equal(
    primaryMetricIndex([{ tone: "attention" }, { tone: "critical" }]),
    1,
  );
  assert.equal(
    primaryMetricIndex([{ tone: "healthy" }, { tone: "pending" }]),
    1,
  );
  assert.equal(
    primaryMetricIndex([{ tone: "healthy" }, { tone: "neutral" }]),
    0,
  );
  assert.equal(primaryMetricIndex([]), 0);
});

test("source health and evidence panels follow the page sources", () => {
  assert.deepEqual(sourceHealth([{ tone: "healthy" }]), {
    tone: "healthy",
    affected: 0,
    label: "Supporting sources current",
  });
  assert.equal(
    sourceHealth([{ tone: "attention" }, { tone: "healthy" }]).label,
    "1 source affects this page",
  );
  assert.equal(
    sourceHealth([{ tone: "critical" }, { tone: "unavailable" }]).label,
    "2 sources affect this page",
  );
  assert.equal(isEvidencePanel("Data and decision coverage"), true);
  assert.equal(isEvidencePanel("Launch blockers"), false);
  const healthy = [{ tone: "healthy" }];
  assert.equal(evidenceStartsCollapsed("security_admin", healthy), true);
  assert.equal(
    evidenceStartsCollapsed("security_admin", [{ tone: "attention" }]),
    false,
  );
  assert.equal(evidenceStartsCollapsed("customer_admin", healthy), false);
  assert.equal(evidenceStartsCollapsed("vizenta_admin", healthy), false);
});

test("the action queue takes the first rows, titled by the first column", () => {
  const row = (id, cells) => ({
    id,
    cells,
    state: { label: "Needs action", tone: "attention" },
    detail: { title: `Record ${id}` },
  });
  const items = queueItems(
    [
      row("a", {
        subject: { primary: "North Gate" },
        site: "Main",
        owner: "Priya",
      }),
      row("b", { site: "East" }),
      row("c", {}),
      row("d", {}),
    ],
    ["subject", "site", "owner", "status"],
    cellText,
  );
  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((i) => [i.title, i.context]),
    [
      ["North Gate", "Main · Priya"],
      ["Record b", "East"],
      ["Record c", ""],
    ],
  );
  assert.equal(items[0].state, "Needs action");
  assert.equal(items[0].tone, "attention");
});

test("the focus bar queue holds only records needing action, critical first", () => {
  const r = (id, tone) => ({ id, state: { label: tone, tone } });
  const rows = [
    r("a", "healthy"),
    r("b", "attention"),
    r("c", "critical"),
    r("d", "pending"),
    r("e", "complete"),
    r("f", "critical"),
  ];
  assert.deepEqual(
    actionQueue(rows).map((x) => x.id),
    ["c", "f", "b", "d"],
  );
  assert.equal(needsAction("unavailable"), false);
  assert.deepEqual(actionQueue([r("a", "healthy")]), []);
});

test("the decision bar names the owner, else the assigned scope", () => {
  assert.deepEqual(
    decisionOwner(
      [
        { label: "Assigned scope", value: "North Campus" },
        { label: "Owner / confidence", value: "Unassigned · 6/6 cameras" },
      ],
      cellText,
      "All campuses",
    ),
    { label: "Owner", value: "Unassigned · 6/6 cameras" },
  );
  assert.deepEqual(
    decisionOwner(
      [{ label: "Assigned scope", value: "North Campus" }],
      cellText,
      "All campuses",
    ),
    { label: "Scope", value: "North Campus" },
  );
  assert.deepEqual(decisionOwner([], cellText, "All campuses"), {
    label: "Scope",
    value: "All campuses",
  });
});
