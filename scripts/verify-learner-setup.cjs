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
    await page.goto("http://localhost:8083", {waitUntil:"domcontentloaded",timeout:60000});
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await b("Explore workspace").click();
    await b("Class & Lab Attendance").click();
    await page.getByRole("tab", {name:"Learners",exact:true}).click();
    await b("Add").click();
    await b("Add learner").click();
    await page.getByText("UID is required", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Campus: Choose campus", exact: true })
      .click();
    await b("Main Campus").click();
    for (const [name, value] of [
      ["UID *", "QA-999"],
      ["First name *", "Quality"],
      ["Last name *", "Learner"],
    ])
      await page.getByRole("textbox", { name, exact: true }).fill(value);
    await b("Add learner").click();
    const action = () =>
      page
        .getByRole("button", { name: /^Actions for Quality Learner/ })
        .filter({ visible: true });
    await action().click();
    await b("Edit").click();
    await page
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("qa@example.com");
    await b("Save changes").click();
    await b("Bulk upload").click();
    await page
      .getByRole("button", { name: "Campus: Choose campus", exact: true })
      .click();
    await b("Main Campus").click();
    const chooser = page.waitForEvent("filechooser");
    await b("Choose CSV file").click();
    await (
      await chooser
    ).setFiles({
      name: "learners.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "uid,first_name,last_name,type\nQA-1000,Bulk,Learner,Learner",
      ),
    });
    await b("Save 1 learners").click();
    await page
      .getByRole("button", { name: /^Actions for Bulk Learner/ })
      .filter({ visible: true })
      .waitFor();
    await action().click();
    await b("Delete").click();
    await b("Cancel").click();
    await action().click();
    await b("Delete").click();
    await b("Delete").click();
    assert.equal(await action().count(), 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await b("Filters").waitFor();
    await b("Add").click();
    await page.getByRole("textbox", { name: "UID *", exact: true }).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Learner create, validation, edit, CSV upload, delete confirmation and mobile passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
