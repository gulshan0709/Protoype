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
    for (const [product, tab, a, z] of [
      ["Class & Lab Attendance", "Sources", "Building", "Room number"],
      ["Gate", "Cameras", "Gate", "Lane"],
    ]) {
      await b(product).click();
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await b("Add").click();
      await b("Add camera").click();
      await page.getByText(a + " is required", { exact: true }).waitFor();
      await b("Campus: Choose campus").click();
      await b("Main Campus").click();
      for (const [name, value] of [
        [a + " *", "QA location"],
        [z + " *", "204"],
        ["Detection *", "0.6"],
        ["Recognition *", "0.8"],
        ["Display name *", "QA camera"],
        ["IP address *", "192.168.1.20"],
        ["Port *", "554"],
        ["Camera ID *", "QA-1"],
        ["User name *", "demo"],
        ["Password *", "test-only"],
      ])
        await page.getByLabel(name, { exact: true }).fill(value);
      await b("Camera brand: Choose brand").click();
      await b("Axis").click();
      await b("Add another camera").click();
      await b("Remove camera 2").click();
      await b("Add camera").click();
      const action = () => b("Actions for QA camera").filter({ visible: true });
      await action().click();
      await b("Edit").click();
      await page.getByLabel("Port *", { exact: true }).fill("8554");
      await b("Save changes").click();
      await action().click();
      await b("Delete").click();
      await b("Cancel").click();
      await action().click();
      await b("Delete").click();
      await b("Delete").click();
      assert.equal(await action().count(), 0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await b("Add").click();
    await page.getByLabel("Lane *", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Camera management passed for Class Sources and Gate Cameras, including mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
