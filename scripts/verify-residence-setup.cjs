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
    const tab = (name) => page.getByRole("tab", { name, exact: true });
    await page.goto("http://localhost:8083", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await b("Explore workspace").click();
    await b("Warden").click();
    const add = async () => {
      await b("Add").click();
      await b("Scope: Choose scope").click();
      await b("Residential Campus").click();
    };
    await add();
    for (const [name, value] of [
      ["Name *", "QA Warden"],
      ["Email *", "warden@example.com"],
      ["Phone *", "9876543210"],
    ])
      await page.getByLabel(name, { exact: true }).fill(value);
    await b("Add warden").click();
    await b("Actions for QA Warden").filter({ visible: true }).click();
    await b("Edit").click();
    await page.getByLabel("Phone *", { exact: true }).fill("9876543211");
    await b("Save changes").click();
    await tab("Hostels").click();
    await add();
    await page.getByLabel("Hostel name *", { exact: true }).fill("QA Hostel");
    await page.getByLabel("Closing time", { exact: true }).fill("22:00");
    await page
      .getByRole("checkbox", { name: "QA Warden", exact: true })
      .click();
    await b("Add hostel").click();
    await b("Actions for QA Hostel").filter({ visible: true }).waitFor();
    await tab("Leave Management").click();
    await add();
    await b("Select student: Choose a student").click();
    const dialog = page
      .getByTestId("dialog-transition")
      .filter({ visible: true })
      .last();
    const options = dialog.getByRole("button");
    const labels = await options.allTextContents();
    const chosen = labels.find((s) => /[ABC]-\d+/.test(s));
    if (!chosen) throw Error("No scoped student options: " + labels.join(","));
    await options.filter({ hasText: chosen }).click();
    await page.getByLabel("Start date *", { exact: true }).fill("2026-02-30");
    await page.getByLabel("End date *", { exact: true }).fill("2026-10-02");
    await page.getByLabel("Reason *", { exact: true }).fill("Family visit");
    await b("Create leave").click();
    await page.getByText("Use YYYY-MM-DD", { exact: true }).waitFor();
    await page.getByLabel("Start date *", { exact: true }).fill("2026-10-01");
    await b("Create leave").click();
    await tab("Hostels").click();
    await b("Actions for QA Hostel").filter({ visible: true }).click();
    await b("Delete").click();
    await b("Delete").click();
    assert.equal(
      await b("Actions for QA Hostel").filter({ visible: true }).count(),
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await b("Add").click();
    await page.getByLabel("Hostel name *", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Residence create, edit, assignment, leave validation, delete and mobile passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
