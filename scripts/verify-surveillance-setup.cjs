const assert = require("node:assert/strict");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const role of ["customer_admin", "vizenta_admin"]) {
      const context = await browser.newContext({
        viewport: { width: 1512, height: 982 },
        reducedMotion: "reduce",
      });
      await context.addInitScript(
        (role) =>
          localStorage.setItem(
            "vizenta-ai-demo-v1",
            JSON.stringify({
              workspace: {
                industry: "education",
                role,
                scope:
                  role === "vizenta_admin"
                    ? "All customers"
                    : "Across campuses",
              },
              theme: "light",
            }),
          ),
        role,
      );
      const page = await context.newPage();
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
      await b("Surveillance Users").click();
      await b("Add").click();
      await b("Add user").click();
      await page.getByText("UID is required", { exact: true }).waitFor();
      await b(
        (role === "vizenta_admin" ? "Customer" : "Campus") + ": Choose scope",
      ).click();
      await b(
        role === "vizenta_admin" ? "Northbridge Education" : "Main Campus",
      ).click();
      for (const [name, value] of [
        ["UID *", "QA-USER"],
        ["First name *", "Quality"],
        ["Email *", "qa@example.com"],
      ])
        await page.getByLabel(name, { exact: true }).fill(value);
      await b("Add user").click();
      const action = () =>
        page
          .getByRole("button", { name: /^Actions for Quality/ })
          .filter({ visible: true });
      await action().click();
      await b("Edit").click();
      await page.getByLabel("Phone", { exact: true }).fill("9876543210");
      await b("Save changes").click();
      await b("Bulk upload").click();
      await b(
        (role === "vizenta_admin" ? "Customer" : "Campus") + ": Choose scope",
      ).click();
      await b(
        role === "vizenta_admin" ? "Northbridge Education" : "Main Campus",
      ).click();
      const chooser = page.waitForEvent("filechooser");
      await b("Choose CSV file").click();
      await (
        await chooser
      ).setFiles({
        name: "users.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
          "uid,first_name,email,user_type\nB,Bulk,bulk@example.com,Identified",
        ),
      });
      await b("Save 1 users").click();
      await action().click();
      await b("Delete").click();
      await b("Cancel").click();
      await action().click();
      await b("Delete").click();
      await b("Delete").click();
      assert.equal(await action().count(), 0);
      await page.setViewportSize({ width: 390, height: 844 });
      await b("Add").click();
      await page.getByLabel("UID *", { exact: true }).waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      console.log(role + ": surveillance CRUD, CSV and mobile passed");
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
