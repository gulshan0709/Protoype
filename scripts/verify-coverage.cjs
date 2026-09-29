// Traverses every destination and tab of every role in the four original
// industries (Retail as Store and Warehouse), as the registry defines them
// after its extensions: each view shows its heading, primary action and first
// scoped record (or the empty state). Results are saved to
// qa/coverage-results.json; the first failures to qa/coverage-failures.json.
//
//   npm run test:coverage
require("./lib/ts-hooks.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  baseUrl,
  button,
  demoState,
  enter,
  main,
  open,
  qaDir,
  seed,
  tab,
} = require("./lib/qa.cjs");
const { industries, getPage } = require("../src/domain/contracts/registry.ts");
const base = baseUrl("http://127.0.0.1:8082");
const ids = ["education", "corporate", "retail", "manufacturing"];
// Views drawn by their own component instead of the records list: the text
// that shows each one rendered.
const customViews = {
  "ca-setup-setup": "Enabled services",
  "ca-setup-criteria": "Camera acceptance criteria",
  "ca-setup-dashboard": "Camera activity",
  "va-media-explorer": "Pick an organization",
};
// Education's People & Access → Users opens its consolidated directory on the
// Learners list.
const directory = (industry, role, name, tab) =>
  industry === "education" &&
  name === "People & Access" &&
  tab === "Users" &&
  ["customer_admin", "vizenta_admin"].includes(role) &&
  !!industries.education.pages[role].product["Class & Lab Attendance"]
    ?.Learners;

main(async (browser) => {
  const output = qaDir();
  const failures = [];
  const coverage = [];
  let active = "";
  const { page } = await open(browser, {
    base,
    reducedMotion: "no-preference",
    timeout: 30000,
  });
  page.on("pageerror", (e) => failures.push({ active, error: e.message }));
  const shown = (text) =>
    page
      .getByText(text, { exact: true })
      .filter({ visible: true })
      .first()
      .waitFor({ timeout: 6000 });
  await page.getByText("Customer Readiness", { exact: true }).first().waitFor();
  for (const industry of ids) {
    const data = industries[industry];
    for (const variant of industry === "retail"
      ? ["store", "warehouse"]
      : ["default"])
      for (const [roleId, role] of Object.entries(data.core.roles)) {
        const scope =
          industry === "retail" && roleId === "location_manager"
            ? variant === "store"
              ? "Store 018"
              : "Warehouse DC-2"
            : role.scopes[0];
        const workspace = { industry, role: roleId, scope };
        await seed(page, demoState(workspace));
        await page.goto(base);
        await enter(page);
        await page.getByText(role.home, { exact: true }).first().waitFor();
        for (const type of ["org", "product"])
          for (const name of type === "org"
            ? role.organization
            : role.products) {
            if (
              industry === "retail" &&
              roleId === "location_manager" &&
              variant === "store" &&
              name === "Guard"
            )
              continue;
            await button(page, name).click();
            for (const view of Object.keys(data.pages[roleId][type][name])) {
              const contract = getPage(
                workspace,
                directory(industry, roleId, name, view)
                  ? {
                      type: "product",
                      name: "Class & Lab Attendance",
                      tab: "Learners",
                    }
                  : { type, name, tab: view },
              );
              active = [industry, variant, roleId, name, view].join("/");
              try {
                await tab(page, view).click();
                if (customViews[contract.id])
                  await shown(customViews[contract.id]);
                else {
                  // Records headings "Context · Title" show the title in bold.
                  await shown(
                    contract.heading.split(/ · (.*)/s)[1] ?? contract.heading,
                  );
                  // Pages with session setup offer Add in place of the primary action.
                  if (contract.primaryAction)
                    await button(page, contract.primaryAction.label)
                      .or(button(page, "Add"))
                      .first()
                      .waitFor({ timeout: 6000 });
                  const scoped = contract.records.filter((r) =>
                    r.scope.includes(scope),
                  );
                  // With a Capture column a row is a labelled, focusable row
                  // rather than a button (its capture is a control of its own).
                  if (scoped.length) {
                    const row = "Open " + scoped[0].detail.title;
                    await button(page, row)
                      .or(page.getByLabel(row, { exact: true }))
                      .filter({ visible: true })
                      .first()
                      .waitFor({ timeout: 6000 });
                  } else
                    await page
                      .getByText("No matching records", { exact: true })
                      .filter({ visible: true })
                      .waitFor({ timeout: 6000 });
                }
                coverage.push({
                  industry,
                  variant,
                  role: roleId,
                  name,
                  tab: view,
                  id: contract.id,
                  scopedRecords: contract.records.filter((r) =>
                    r.scope.includes(scope),
                  ).length,
                });
              } catch (e) {
                failures.push({ active, error: e.message });
                console.error("FAILED", active, e.message);
                fs.writeFileSync(
                  path.join(output, "coverage-failures.json"),
                  JSON.stringify(failures, null, 2),
                );
                if (failures.length >= 3) {
                  await page.screenshot({
                    path: path.join(output, "coverage-failure.png"),
                    fullPage: true,
                  });
                  throw e;
                }
              }
            }
          }
        console.log(
          industry,
          variant,
          roleId,
          coverage.length,
          "views checked",
        );
      }
  }
  fs.writeFileSync(
    path.join(output, "coverage-results.json"),
    JSON.stringify({ rendered: coverage.length, failures, coverage }, null, 2),
  );
  assert.equal(failures.length, 0, JSON.stringify(failures.slice(0, 5)));
  console.log(
    `All ${coverage.length} page configurations rendered successfully.`,
  );
});
