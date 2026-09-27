const assert = require("node:assert/strict");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1512, height: 982 },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const b = (name) => page.getByRole("button", { name, exact: true });
    await page.goto("http://localhost:8083", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await b("Explore workspace").click();
    await b("Gate").click();
    await page
      .getByRole("tab", { name: "User Attendance", exact: true })
      .click();
    await b("Mark attendance").filter({ visible: true }).first().click();
    const dialog = page
      .getByTestId("dialog-transition")
      .filter({ visible: true });
    await dialog
      .getByRole("button", { name: "Mark attendance", exact: true })
      .click();
    await page
      .getByText("A reason is required for the audit trail", { exact: true })
      .waitFor();
    await page.getByLabel("Check-in time *", { exact: true }).fill("09:00");
    await page.getByLabel("Check-out time", { exact: true }).fill("08:00");
    await page
      .getByLabel("Reason *", { exact: true })
      .fill("Verified by gate guard");
    await dialog
      .getByRole("button", { name: "Mark attendance", exact: true })
      .click();
    await page
      .getByText("Check-out must be after check-in", { exact: true })
      .waitFor();
    await page.getByLabel("Check-out time", { exact: true }).fill("17:30");
    await dialog
      .getByRole("button", { name: "Mark attendance", exact: true })
      .click();
    await b("Columns").click();
    await b("Show all").click();
    await page.keyboard.press("Escape");
    await page
      .getByText("8h 30m", { exact: true })
      .filter({ visible: true })
      .waitFor();
    await page.getByRole("tab", { name: "In/Out", exact: true }).click();
    await page.getByTestId("records-table").filter({ visible: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("tab", { name: "User Attendance", exact: true })
      .click();
    await b("Mark attendance").filter({ visible: true }).first().click();
    await page.getByLabel("Reason *", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Gate tabs, manual validation, saved attendance and mobile passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
