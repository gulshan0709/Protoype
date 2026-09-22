const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ids = ["education", "corporate", "retail", "manufacturing"];
const base = process.env.VIZENTA_QA_URL || "http://127.0.0.1:8082";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1512, height: 982 },
  });
  const page = await context.newPage();
  const enterWorkspace = async () => {
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await page
      .getByRole("button", { name: "Explore workspace", exact: true })
      .click();
  };
  const failures = [];
  const coverage = [];
  let active = "";
  page.on("pageerror", (e) => failures.push({ active, error: e.message }));
  await page.goto(base);
  await enterWorkspace();
  await page.getByText("Workspace overview", { exact: true }).waitFor();
  for (const industry of ids) {
    const data = require("../src/domain/contracts/data/" + industry + ".json");
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
        await page.evaluate(
          (saved) =>
            localStorage.setItem("vizenta-ai-demo-v1", JSON.stringify(saved)),
          {
            workspace: { industry, role: roleId, scope },
            theme: "light",
            session: true,
            name: "QA User",
            audit: [],
            readNotifications: [],
          },
        );
        await page.goto(base);
        await enterWorkspace();
        await page.getByText("Workspace overview", { exact: true }).waitFor();
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
            await page.getByRole("button", { name, exact: true }).click();
            const branch = data.pages[roleId][type][name];
            for (const [tab, basePage] of Object.entries(branch)) {
              const contract = basePage.variants?.[variant] ?? basePage;
              active = [industry, variant, roleId, name, tab].join("/");
              try {
                await page.getByRole("tab", { name: tab, exact: true }).click();
                await page
                  .getByText(contract.heading, { exact: true })
                  .filter({ visible: true })
                  .first()
                  .waitFor({ timeout: 6000 });
                if (contract.primaryAction)
                  await page
                    .getByRole("button", {
                      name: contract.primaryAction.label,
                      exact: true,
                    })
                    .first()
                    .waitFor({ timeout: 6000 });
                const scoped = contract.records.filter((r) =>
                  r.scope.includes(scope),
                );
                if (scoped.length)
                  await page
                    .getByRole("button", {
                      name: "Open " + scoped[0].detail.title,
                      exact: true,
                    })
                    .first()
                    .waitFor({ timeout: 6000 });
                else
                  await page
                    .getByText("No matching records", { exact: true })
                    .filter({ visible: true })
                    .waitFor({ timeout: 6000 });
                coverage.push({
                  industry,
                  variant,
                  role: roleId,
                  name,
                  tab,
                  id: contract.id,
                  scopedRecords: scoped.length,
                });
              } catch (e) {
                failures.push({ active, error: e.message });
                console.error("FAILED", active, e.message);
                fs.writeFileSync(
                  path.resolve(__dirname, "../qa/coverage-failures.json"),
                  JSON.stringify(failures, null, 2),
                );
                if (failures.length >= 3) {
                  await page.screenshot({
                    path: path.resolve(__dirname, "../qa/coverage-failure.png"),
                    fullPage: true,
                  });
                  await browser.close();
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
    path.resolve(__dirname, "../qa/coverage-results.json"),
    JSON.stringify({ rendered: coverage.length, failures, coverage }, null, 2),
  );
  await browser.close();
  assert.equal(failures.length, 0, JSON.stringify(failures.slice(0, 5)));
  assert.equal(coverage.length, 894);
  console.log("All 894 page configurations rendered successfully.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
