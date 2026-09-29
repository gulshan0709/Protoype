// Checks the core workspace flows: overview colours, record detail with a
// review note that survives reload, search empty state, CSV export, the
// assistant, dark theme, industry switch, phone navigation, nested dialog
// Escape, responsive widths, a required resolution reason with local lifecycle
// persistence, the unauthorized preview, and sign-out. Screenshots and
// ui-results.json are saved to qa/.
//
//   npm run test:ui
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  PHONE,
  baseUrl,
  button,
  demoState,
  enter,
  main,
  noOverflow,
  open,
  qaDir,
  records,
  route,
  rows,
  seed,
  shooter,
  writeResults,
} = require("./lib/qa.cjs");
const base = baseUrl("http://127.0.0.1:8082");

main(async (browser) => {
  const output = qaDir();
  const shot = shooter(output);
  const { page, errors } = await open(browser, {
    base,
    reducedMotion: "no-preference",
    timeout: 30000,
  });
  const b = (name) => button(page, name);
  await page.getByText("Customer Readiness", { exact: true }).first().waitFor();
  assert.equal(
    await page
      .getByTestId("reference-sidebar")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(13, 56, 93)",
    "Reference navy sidebar",
  );
  assert.equal(
    await b("Export").evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(8, 127, 112)",
    "Deeper theme teal export action supports white labels",
  );
  await shot(page, "desktop-overview", { fullPage: true });
  console.log("Desktop overview rendered");
  await b("Open North Campus").click();
  await page.getByText("Record overview", { exact: true }).waitFor();
  await b("Open record").click();
  await page
    .getByRole("textbox", { name: "Decision or review note" })
    .fill("Contact the campus owner to verify the notification fallback.");
  await b("Save review").click();
  await b("Back to workspace").click();
  await page.getByText(/Contact the campus owner/).waitFor();
  await page.reload();
  await enter(page);
  await page.getByText(/Contact the campus owner/).waitFor();
  await shot(page, "record-detail", { fullPage: true });
  await b("Back to records").click();
  await page
    .getByRole("textbox", { name: "Search records…" })
    .fill("no such campus");
  await page.getByText("No matching records", { exact: true }).waitFor();
  await b("Clear filters").click();
  await b("Export").click();
  const download = page.waitForEvent("download");
  await b("Export CSV").click();
  await (await download).saveAs(path.join(output, "export.csv"));
  assert.ok(
    fs
      .readFileSync(path.join(output, "export.csv"), "utf8")
      .includes("North Campus"),
  );
  await b("Ask Vizenta").first().click();
  await b("What needs attention?").click();
  await page.getByText(/records need your attention/).waitFor();
  await page.keyboard.press("Escape");
  await b("Profile and settings").click();
  await b("Appearance: Light").click();
  await b("Dark").click();
  await b("Save preferences").click();
  await shot(page, "desktop-dark", { fullPage: true });
  await b("Switch workspace").click();
  await b("Manufacturing industry").click();
  await b("Open workspace").click();
  await b("Explore Blocking issues").waitFor();
  await shot(page, "manufacturing-dark", { fullPage: true });
  await page.setViewportSize(PHONE);
  await shot(page, "mobile-overview", { fullPage: true });
  assert.ok(await noOverflow(page), "No page-level horizontal overflow");
  await b("Explore").click();
  await b("Gate").click();
  // A record card of the Gate page (the header's "Open …" buttons don't count).
  await rows(page)
    .filter({ has: page.locator("svg") })
    .first()
    .waitFor();
  await shot(page, "mobile-gate", { fullPage: true });
  await b("Profile and settings").click();
  await b("Appearance: Dark").click();
  await page.keyboard.press("Escape");
  await b("Save preferences").waitFor();
  await b("Appearance: Dark").click();
  await b("Light").click();
  await b("Save preferences").click();
  for (const width of [320, 375, 390, 768, 1024, 1512]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await noOverflow(page), "No overflow at " + width);
    if (width === 390 || width === 768)
      await shot(page, width === 390 ? "mobile-light" : "tablet-light", {
        fullPage: true,
      });
  }
  const workspace = {
    industry: "corporate",
    role: "corporate_security_admin",
    scope: "Across sites",
  };
  await seed(page, demoState(workspace));
  const contract = require("../src/domain/contracts/data/corporate.json").pages[
    workspace.role
  ].product.Shield.Command;
  await page.goto(
    base + route({ type: "product", name: "Shield", tab: "Command" }),
  );
  await enter(page);
  await records(page)
    .getByTestId("records-row")
    .filter({ hasText: "Action required" })
    .first()
    .getByRole("button", { name: /^Open / })
    .click();
  await b("Resolve issue").click();
  await b("Confirm resolve issue").click();
  await page
    .getByText("Add at least 5 characters explaining your decision.", {
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("textbox", { name: "Reason (required)", exact: true })
    .fill("Resolved in the local QA workflow with an accountable review.");
  await b("Confirm resolve issue").click();
  await b("Back to workspace").click();
  await page.getByText(/Workflow: Resolved/).waitFor();
  assert.equal(await b("Resolve issue").count(), 0);
  await page.reload();
  await enter(page);
  await page.getByText(/Workflow: Resolved/).waitFor();
  await shot(page, "lifecycle-resolved", { fullPage: true });
  await b("Profile and settings").click();
  await b("Preview data state: Populated").click();
  await b("Unauthorized").click();
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
  await b("Show records").first().click();
  await b("Profile and settings").click();
  await b("Sign out").click();
  await page
    .getByText("Welcome back", { exact: true })
    .filter({ visible: true })
    .waitFor();
  await b("Explore workspace").click();
  await b("Profile and settings").waitFor();
  assert.deepEqual(errors, []);
  writeResults(
    "ui-results.json",
    [
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
    errors,
  );
  console.log("UI checks passed");
});
