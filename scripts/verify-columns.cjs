const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const base = process.env.VIZENTA_QA_URL || "http://localhost:8083";
const output = path.resolve(__dirname, "../qa/columns");
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const watch = (page) => {
    page.setDefaultTimeout(12000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
  };
  const enter = async (page) => {
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await page
      .getByRole("button", { name: "Explore workspace", exact: true })
      .click();
  };
  try {
    const context = await browser.newContext({
      viewport: { width: 1512, height: 982 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    watch(page);
    await page.goto(base);
    await enter(page);
    await page
      .getByRole("button", { name: "Class & Lab Attendance", exact: true })
      .click();
    const table = () =>
      page.getByTestId("records-table").filter({ visible: true });
    const picker = () =>
      table().getByRole("button", { name: "Columns", exact: true }).click();
    const done = () =>
      page.getByRole("button", { name: "Done", exact: true }).click();
    assert.equal(
      await table()
        .getByRole("button", { name: /^Sort by / })
        .count(),
      3,
    );
    assert.equal(
      await table()
        .getByRole("button", { name: "Sort by Policy", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await table()
        .getByRole("button", { name: "Sort by Source state", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await table().evaluate((el) =>
        [...el.querySelectorAll("div")].some(
          (x) =>
            /auto|scroll/.test(getComputedStyle(x).overflowX) &&
            x.scrollWidth > x.clientWidth + 1,
        ),
      ),
      false,
      "Default table does not scroll horizontally",
    );
    await page.screenshot({ path: path.join(output, "default-desktop.png") });
    await picker();
    assert.equal(
      await page
        .getByRole("checkbox", { name: "Class / lab", exact: true })
        .isDisabled(),
      true,
    );
    await page.getByRole("checkbox", { name: "Policy", exact: true }).click();
    await page.getByRole("checkbox", { name: "Campus", exact: true }).click();
    await done();
    await table()
      .getByRole("button", { name: "Sort by Policy", exact: true })
      .waitFor();
    assert.equal(
      await table()
        .getByRole("button", { name: "Sort by Campus", exact: true })
        .count(),
      0,
    );
    await page.waitForFunction(() =>
      Object.values(
        JSON.parse(localStorage.getItem("vizenta-ai-demo-v1"))
          .columnPreferences,
      ).some((ids) => ids.includes("policy") && !ids.includes("campus")),
    );
    await page.reload();
    await enter(page);
    await page
      .getByRole("button", { name: "Class & Lab Attendance", exact: true })
      .click();
    await table()
      .getByRole("button", { name: "Sort by Policy", exact: true })
      .waitFor();
    assert.equal(
      await table()
        .getByRole("button", { name: "Sort by Campus", exact: true })
        .count(),
      0,
      "Saved columns survive reload",
    );
    await table()
      .getByRole("button", { name: "Sort by Policy", exact: true })
      .click();
    await picker();
    await page.getByRole("checkbox", { name: "Policy", exact: true }).click();
    await page.getByRole("checkbox", { name: "Status", exact: true }).click();
    await done();
    assert.equal(await table().getByText("Status", { exact: true }).count(), 0);
    await picker();
    await page.getByRole("button", { name: "Show all", exact: true }).click();
    await done();
    await table()
      .getByRole("button", { name: "Sort by Source state", exact: true })
      .waitFor();
    assert.ok(
      (await table()
        .getByRole("button", { name: /^Sort by / })
        .count()) > 3,
    );
    await picker();
    await page.screenshot({ path: path.join(output, "column-picker.png") });
    await page
      .getByRole("button", { name: "Reset defaults", exact: true })
      .click();
    await done();
    assert.equal(
      await table()
        .getByRole("button", { name: /^Sort by / })
        .count(),
      3,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    const first = table()
      .getByRole("button", { name: /^Open / })
      .first();
    assert.equal(await first.getByText("Policy", { exact: true }).count(), 0);
    await picker();
    await page.getByRole("checkbox", { name: "Policy", exact: true }).click();
    await done();
    await first.getByText("Policy", { exact: true }).waitFor();
    await first.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.screenshot({
      path: path.join(output, "mobile-selected-columns.png"),
    });
    await context.close();

    for (const industry of ["corporate", "retail", "manufacturing"]) {
      const data = require(`../src/domain/contracts/data/${industry}.json`);
      const role = data.core.roles.customer_admin
        ? "customer_admin"
        : Object.keys(data.core.roles)[0];
      const scope = data.core.roles[role].scopes[0];
      const context = await browser.newContext({
        viewport: { width: 1512, height: 982 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      watch(page);
      await page.addInitScript(
        (workspace) =>
          localStorage.setItem(
            "vizenta-ai-demo-v1",
            JSON.stringify({
              workspace,
              theme: "dark",
              name: "Review",
              audit: [],
              readNotifications: [],
            }),
          ),
        { industry, role, scope },
      );
      await page.goto(base);
      await enter(page);
      const table = page.getByTestId("records-table").filter({ visible: true });
      await table.waitFor();
      assert.ok(
        (await table.getByRole("button", { name: /^Sort by / }).count()) <= 3,
      );
      await table.getByRole("button", { name: "Columns", exact: true }).click();
      await page.getByRole("button", { name: "Show all", exact: true }).click();
      await page.getByRole("button", { name: "Done", exact: true }).click();
      assert.ok(
        (await table.getByRole("button", { name: /^Sort by / }).count()) >= 3,
      );
      await context.close();
      console.log(
        `${industry}: compact defaults and column picker passed in dark mode`,
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "Column visibility, persistence, reset, mobile cards and all four industries passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
