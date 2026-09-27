const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  scopedRecords,
  filterRecords,
  csvFor,
  canAct,
  actionKind,
  metricFacts,
} = require("../src/domain/contracts/logic.ts");
const { localRecord } = require("../src/domain/contracts/lifecycle.ts");
const ids = ["education", "corporate", "retail", "manufacturing"];
const contracts = Object.fromEntries(
  ids.map((id) => [
    id,
    require("../src/domain/contracts/data/" + id + ".json"),
  ]),
);
for (const id of ids)
  test(
    id + ": every persona destination and tab has a complete typed contract",
    () => {
      const data = contracts[id];
      for (const [roleId, role] of Object.entries(data.core.roles)) {
        assert.ok(data.pages[roleId].org[role.home], `${roleId} home`);
        for (const [type, names] of [
          ["org", role.organization],
          ["product", role.products],
        ])
          for (const name of names) {
            const branch = data.pages[roleId][type][name];
            assert.ok(branch, `${roleId}/${name}`);
            for (const [tab, base] of Object.entries(branch))
              for (const page of [
                base,
                ...Object.values(base.variants ?? {}),
              ]) {
                const context = `${id}/${roleId}/${name}/${tab}`;
                assert.ok(page.id && page.heading && page.description, context);
                assert.ok(
                  page.metrics.length &&
                    page.sources.length &&
                    page.sidePanels.length,
                  context,
                );
                if (page.primaryAction)
                  assert.ok(
                    page.primaryAction.id && page.primaryAction.label,
                    context + ": normalized page action",
                  );
                assert.equal(
                  new Set(page.records.map((r) => r.id)).size,
                  page.records.length,
                  context,
                );
                for (const record of page.records) {
                  assert.ok(record.scope?.length, context + ": explicit scope");
                  assert.ok(
                    record.state?.tone && record.state.label,
                    context + ": typed state",
                  );
                  assert.ok(
                    record.detail.title &&
                      Array.isArray(record.detail.permittedActions),
                    context + ": detail",
                  );
                  for (const column of page.columns)
                    assert.notEqual(
                      record.cells[column.id],
                      undefined,
                      context + ": " + column.id,
                    );
                }
              }
          }
      }
    },
  );
const page =
  contracts.education.pages.customer_admin.org["Customer Readiness"].Readiness;
test("scope filtering denies unknown or missing assignments", () => {
  assert.equal(scopedRecords(page, "not-an-assigned-campus").length, 0);
  const scoped = scopedRecords(page, "North Campus");
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0].detail.title, "North Campus");
  assert.equal(
    scopedRecords(
      { ...page, records: [{ ...page.records[0], scope: [] }] },
      "North Campus",
    ).length,
    0,
  );
});
test("search, typed state filter and empty results are scoped", () => {
  const rows = scopedRecords(page, "Across campuses");
  assert.equal(filterRecords(rows, "north", {}).length, 1);
  assert.equal(
    filterRecords(rows, "", { state: "Critical" })[0].detail.title,
    "North Campus",
  );
  assert.equal(filterRecords(rows, "missing-person", {}).length, 0);
  assert.equal(
    filterRecords(rows, "", { campus: "Residential Campus" }).length,
    1,
  );
});
test("mutations require a declared action on a scoped record", () => {
  const workspace = {
    industry: "education",
    role: "customer_admin",
    scope: "North Campus",
  };
  assert.ok(canAct(page, page.records[0].id, "export", workspace));
  assert.equal(
    canAct(page, page.records[1].id, "export", workspace),
    undefined,
  );
  assert.equal(
    canAct(page, page.records[0].id, "delete-everything", workspace),
    undefined,
  );
  assert.equal(
    actionKind({ id: "resolve", label: "Resolve", requiresReason: true }),
    "mutate",
  );
});
test("CSV exports exact filtered records and neutralizes spreadsheet formulas", () => {
  const row = {
    ...page.records[0],
    cells: { ...page.records[0].cells, campus: '=HYPERLINK("bad")' },
  };
  const csv = csvFor(page, [row]);
  assert.equal(csv.split("\r\n").length, 2);
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(!csv.includes("Residential Campus"));
});
test("lifecycle transitions persist only within the exact persona and scope", () => {
  const workspace = {
    industry: "education",
    role: "customer_admin",
    scope: "North Campus",
  };
  const record = {
    ...page.records[0],
    detail: {
      ...page.records[0].detail,
      permittedActions: [
        { id: "ack", label: "Acknowledge" },
        { id: "resolve", label: "Resolve" },
        { id: "export", label: "Export", kind: "export" },
      ],
    },
  };
  const event = {
    id: "1",
    recordId: record.id,
    pageId: page.id,
    workspace,
    action: "Resolve",
    actionId: "resolve",
    reason: "Verified in sample workflow",
    at: "2026-09-22",
    actor: "QA",
  };
  const resolved = localRecord(record, page.id, workspace, [event]);
  assert.equal(resolved.state.label, "Resolved");
  assert.equal(resolved.detail.permittedActions.length, 1);
  assert.equal(resolved.sourceState.label, "Blocked");
  assert.equal(
    localRecord(record, page.id, { ...workspace, scope: "Main Campus" }, [
      event,
    ]),
    record,
  );
  assert.equal(
    localRecord(record, page.id, { ...workspace, role: "dean" }, [event]),
    record,
  );
  const unknown = {
    ...record,
    state: { label: "Source unavailable", tone: "unavailable" },
  };
  assert.equal(
    localRecord(unknown, page.id, workspace, [event]).state.label,
    "Source unavailable",
  );
});

const {
  defaultColumnIds,
  visibleColumnIds,
  columnOptions,
  RECORD_STATUS_COLUMN,
} = require("../src/domain/contracts/columns.ts");
test("record tables default to three key fields and one status across industries", () => {
  for (const data of Object.values(contracts)) {
    for (const role of Object.values(data.pages)) {
      for (const branch of Object.values(role)) {
        for (const tabs of Object.values(branch)) {
          for (const page of Object.values(tabs)) {
            for (const variant of [
              page,
              ...Object.values(page.variants ?? {}),
            ]) {
              const ids = defaultColumnIds(variant);
              assert.ok(ids.length <= 4, variant.id);
              assert.ok(ids.includes(variant.columns[0].id), variant.id);
              assert.ok(ids.includes(RECORD_STATUS_COLUMN), variant.id);
            }
          }
        }
      }
    }
  }
});
test("coverage defaults keep identity, campus and camera coverage", () => {
  const page =
    contracts.education.pages.customer_admin.product["Class & Lab Attendance"]
      .Coverage;
  assert.deepEqual(defaultColumnIds(page), [
    "space",
    "campus",
    "camera",
    RECORD_STATUS_COLUMN,
  ]);
  assert.equal(
    columnOptions(page).find((column) => column.id === "state").label,
    "Source state",
  );
});
test("column preferences preserve identity, permit hiding status and ignore stale fields", () => {
  const page =
    contracts.education.pages.customer_admin.product["Class & Lab Attendance"]
      .Coverage;
  assert.deepEqual(visibleColumnIds(page, ["policy", "removed-field"]), [
    "space",
    "policy",
  ]);
  assert.deepEqual(visibleColumnIds(page, []), ["space"]);
  assert.deepEqual(visibleColumnIds(page, "invalid"), defaultColumnIds(page));
});

const pagesOf = (id) =>
  Object.values(contracts[id].pages).flatMap((branches) =>
    Object.values(branches).flatMap((destinations) =>
      Object.values(destinations).flatMap((tabs) => Object.values(tabs)),
    ),
  );
test("KPI details show the calculation and time window each contract supplies", () => {
  let checked = 0;
  for (const page of pagesOf("manufacturing"))
    for (const metric of page.metrics) {
      const facts = Object.fromEntries(
        metricFacts(metric, page, "Plant 1").map((f) => [f.label, f.value]),
      );
      assert.equal(facts["Time window"], page.window);
      assert.equal(facts.Calculation, metric.calculation);
      assert.ok(facts.Calculation && facts["Time window"], page.id);
      checked++;
    }
  assert.equal(checked, 672);
  const page = pagesOf("education")[0];
  assert.deepEqual(metricFacts(page.metrics[0], page, "North Campus"), [
    { label: "Scope", value: "North Campus" },
    { label: "Page", value: page.heading },
    { label: "Time window", value: "Current page window" },
    { label: "Calculation", value: "Defined by this page contract" },
  ]);
});
