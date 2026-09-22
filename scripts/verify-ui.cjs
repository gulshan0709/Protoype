const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const output = path.resolve(__dirname, "../qa");
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1512, height: 982 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const enterWorkspace = async () => {
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await page
      .getByRole("button", { name: "Explore workspace", exact: true })
      .click();
  };
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.VIZENTA_QA_URL || "http://127.0.0.1:8082");
  await enterWorkspace();
  await page.getByText("Workspace overview", { exact: true }).waitFor();
  await page.getByTestId("launch-screen").waitFor({ state: "detached" });
  assert.equal(
    await page
      .getByTestId("reference-sidebar")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(13, 56, 93)",
    "Reference navy sidebar",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Export", exact: true })
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(8, 127, 112)",
    "Deeper theme teal export action supports white labels",
  );
  await page.screenshot({
    path: path.join(output, "desktop-overview.png"),
    fullPage: true,
  });
  console.log("Desktop overview rendered");
  await page
    .getByRole("button", { name: "Open North Campus", exact: true })
    .click();
  await page.getByText("Record overview", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Open record", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Decision or review note" })
    .fill("Contact the campus owner to verify the notification fallback.");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await page
    .getByRole("button", { name: "Back to workspace", exact: true })
    .click();
  await page.getByText(/Contact the campus owner/).waitFor();
  await page.reload();
  await enterWorkspace();
  await page.getByText(/Contact the campus owner/).waitFor();
  await page.screenshot({
    path: path.join(output, "record-detail.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Back to records", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search records…" })
    .fill("no such campus");
  await page.getByText("No matching records", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const file = await download;
  await file.saveAs(path.join(output, "export.csv"));
  assert.ok(
    fs
      .readFileSync(path.join(output, "export.csv"), "utf8")
      .includes("North Campus"),
  );
  await page
    .getByRole("button", { name: "Ask Vizenta", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "What needs attention?", exact: true })
    .click();
  await page.getByText(/records need your attention/).waitFor();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Profile and settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Appearance: Light", exact: true })
    .click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await page.screenshot({
    path: path.join(output, "desktop-dark.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Switch workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Manufacturing industry", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open workspace", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Explore Plant readiness requiring action",
      exact: true,
    })
    .waitFor();
  await page.screenshot({
    path: path.join(output, "manufacturing-dark.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "mobile-overview.png"),
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(overflow, false, "No page-level horizontal overflow");
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await page.getByRole("button", { name: "Gate", exact: true }).click();
  await page
    .getByRole("button", { name: /^Open / })
    .filter({ has: page.locator("svg") })
    .first()
    .waitFor();
  await page.screenshot({
    path: path.join(output, "mobile-gate.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Profile and settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Appearance: Dark", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Appearance: Dark", exact: true })
    .click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  for (const width of [320, 375, 390, 768, 1024, 1512]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "No overflow at " + width,
    );
    if (width === 390 || width === 768)
      await page.screenshot({
        path: path.join(
          output,
          width === 390 ? "mobile-light.png" : "tablet-light.png",
        ),
        fullPage: true,
      });
  }
  const workspace = {
    industry: "corporate",
    role: "corporate_security_admin",
    scope: "Across sites",
  };
  await page.evaluate(
    (workspace) =>
      localStorage.setItem(
        "vizenta-ai-demo-v1",
        JSON.stringify({
          workspace,
          theme: "light",
          session: true,
          name: "QA User",
          audit: [],
          readNotifications: [],
        }),
      ),
    workspace,
  );
  const data = require("../src/domain/contracts/data/corporate.json");
  const contract = data.pages[workspace.role].product.Shield.Command;
  const rec = contract.records.find((r) =>
    r.detail.permittedActions.some((a) => a.id === "resolve"),
  );
  await page.goto(
    (process.env.VIZENTA_QA_URL || "http://127.0.0.1:8082") +
      "/?" +
      new URLSearchParams({
        type: "product",
        name: "Shield",
        tab: "Command",
        record: rec.id,
      }),
  );
  await enterWorkspace();
  await page
    .getByRole("button", { name: "Resolve issue", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm resolve issue", exact: true })
    .click();
  await page
    .getByText("Add at least 5 characters explaining your decision.", {
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("textbox", { name: "Reason (required)", exact: true })
    .fill("Resolved in the local QA workflow with an accountable review.");
  await page
    .getByRole("button", { name: "Confirm resolve issue", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Back to workspace", exact: true })
    .click();
  await page.getByText(/Workflow: Resolved/).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Resolve issue", exact: true })
      .count(),
    0,
  );
  await page.reload();
  await enterWorkspace();
  await page.getByText(/Workflow: Resolved/).waitFor();
  await page.screenshot({
    path: path.join(output, "lifecycle-resolved.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Profile and settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preview data state: Populated", exact: true })
    .click();
  await page.getByRole("button", { name: "Unauthorized", exact: true }).click();
  await page
    .getByText("Access restricted", { exact: true })
    .filter({ visible: true })
    .waitFor();
  assert.equal(
    await page
      .getByText("—", { exact: true })
      .filter({ visible: true })
      .count(),
    contract.metrics.length,
    "Unauthorized preview must suppress every metric value",
  );
  await page
    .getByRole("button", { name: "Show records", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Profile and settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByText("Welcome back", { exact: true })
    .filter({ visible: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Explore workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Profile and settings", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(output, "ui-results.json"),
    JSON.stringify(
      {
        status: "passed",
        checks: [
          "desktop overview",
          "record detail",
          "review validation and persistence",
          "search empty state",
          "CSV download",
          "scoped assistant",
          "dark theme",
          "industry switch",
          "mobile navigation",
          "nested dialog Escape",
          "320/375/390/768/1024/1512 widths",
          "required resolution reason",
          "local lifecycle persistence",
          "completed workflow action removal",
          "unauthorized data-state preview suppresses metrics",
          "sign-out and demo re-entry",
        ],
        runtimeErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log("UI checks passed");
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
