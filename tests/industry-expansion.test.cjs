const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../scripts/lib/ts-hooks.cjs");
const { industries } = require("../src/domain/contracts/registry.ts");

const expected = {
  construction: [
    "vizenta_admin",
    "customer_admin",
    "site_security_admin",
    "ehs_safety_manager",
    "project_site_manager",
    "workforce_contractor_admin",
    "logistics_materials_coordinator",
    "gate_guard_operator",
  ],
  healthcare: [
    "vizenta_admin",
    "customer_admin",
    "security_admin",
    "facilities_operations_manager",
    "clinical_operations_coordinator",
    "hr_workforce_admin",
    "reception_visitor_desk",
    "guard_response_operator",
  ],
};

for (const [industryId, roleIds] of Object.entries(expected))
  test(`${industryId}: every role opens a complete workspace`, () => {
    const industry = industries[industryId];
    assert.ok(industry);
    assert.deepEqual(Object.keys(industry.core.roles), roleIds);
    for (const roleId of roleIds) {
      const role = industry.core.roles[roleId];
      assert.ok(role.scopes.length, `${roleId}: scopes`);
      assert.ok(industry.pages[roleId].org[role.home], `${roleId}: home`);
      for (const product of role.products) {
        const tabs = industry.pages[roleId].product[product];
        assert.ok(tabs, `${roleId}: ${product}`);
        assert.ok(Object.keys(tabs).length, `${roleId}: ${product} tabs`);
        for (const page of Object.values(tabs)) {
          assert.ok(page.heading && page.description, `${roleId}: ${product}`);
          assert.ok(page.columns.length && page.records.length, `${roleId}: ${product} data`);
        }
      }
    }
  });

test("the industry selector uses customer-facing labels", () => {
  const source = require("node:fs").readFileSync(
    require("node:path").join(
      __dirname,
      "../src/features/workspace/components/WorkspacePicker.tsx",
    ),
    "utf8",
  );
  assert.match(source, /Choose an industry/);
  assert.doesNotMatch(source, /Setup template|Choose a solution/);
});
