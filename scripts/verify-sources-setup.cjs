const fs = require("node:fs");
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
    page.on("console", (m) => {
      if (m.type() === "error") {
        errors.push(m.text());
        console.log(m.text());
      }
    });
    const b = (name) => page.getByRole("button", { name, exact: true });
    const tab = (name) => page.getByRole("tab", { name, exact: true });
    await page.goto("http://localhost:8083", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await b("Explore workspace").click();
    await b("Sources & Setup").click();
    await page
      .getByText("Enabled services", { exact: true })
      .filter({ visible: true })
      .waitFor();
    for (const name of ["Setup", "Camera Setup", "Shift", "Camera Criteria"])
      await tab(name).waitFor();
    await tab("Shift").click();
    await b("Add").click();
    await b("Campus: Choose campus").click();
    await b("Main Campus").click();
    for (const [name, value] of [
      ["Shift name *", "QA Shift"],
      ["Start time *", "09:00"],
      ["End time *", "17:00"],
    ])
      await page.getByLabel(name, { exact: true }).fill(value);
    await b("Create").click();
    await b("Actions for QA Shift").filter({ visible: true }).click();
    await b("Edit").click();
    await page.getByLabel("End time *", { exact: true }).fill("18:00");
    await b("Update").click();
    await tab("Camera Setup").click();
    await b("Add").click();
    await b("Campus: Choose campus").click();
    await b("Main Campus").click();
    for (const [name, value] of [
      ["Display name *", "QA Setup Camera"],
      ["IP address *", "192.168.1.22"],
      ["Port *", "554"],
      ["Camera ID *", "QA-CAM"],
      ["User name *", "demo"],
      ["Password *", "test-only"],
    ])
      await page.getByLabel(name, { exact: true }).fill(value);
    await page.getByRole("button", { name: /^Camera brand:/ }).click();
    await b("Axis").click();
    await b("Save").click();
    await b("Actions for QA Setup Camera").filter({ visible: true }).click();
    await b("Edit").click();
    await page.getByLabel("Port *", { exact: true }).fill("8554");
    await b("Save").click();
    await tab("Camera Criteria").click();
    await page.getByLabel("Min std-dev", { exact: true }).fill("10");
    await page.getByLabel("Min dynamic range", { exact: true }).fill("40");
    await b("Save").click();
    await b("Shield").click();
    await tab("Surveillance Dashboard").click();
    await b("Refresh").filter({ visible: true }).waitFor();
    await tab("Surveillance Attendance").click();
    await page.getByTestId("records-table").filter({ visible: true }).waitFor();
    await tab("Video Analytics").click();
    await page.getByTestId("records-table").filter({ visible: true }).waitFor();
    await b("Sources & Setup").click();
    await tab("Camera Setup").click();
    await b("Actions for QA Setup Camera").filter({ visible: true }).click();
    await b("Delete").click();
    await b("Delete").click();
    assert.equal(
      await b("Actions for QA Setup Camera").filter({ visible: true }).count(),
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await tab("Setup").click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    fs.mkdirSync("qa/sources-polish", { recursive: true });
    await page.screenshot({
      path: "qa/sources-polish/mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1512, height: 982 });
    await page.screenshot({
      path: "qa/sources-polish/desktop.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "All seven tabs, camera and shift CRUD, criteria save and mobile passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
