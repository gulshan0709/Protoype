const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const base = process.env.VIZENTA_QA_URL || "http://localhost:8083";
const output = path.resolve(__dirname, "../qa/class-setup");
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const context = await browser.newContext({
    viewport: { width: 1512, height: 982 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const watch = (page) => {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
  };
  watch(page);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const table = () =>
    page.getByTestId("records-table").filter({ visible: true });
  const enter = async (page) => {
    await page.goto(base);
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await page
      .getByRole("button", { name: "Explore workspace", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Class & Lab Attendance", exact: true })
      .click();
  };
  const campus = async (name) => {
    await page
      .getByRole("button", { name: /^Campus: / })
      .last()
      .click();
    await button(name).click();
  };
  const rowAction = async (title, action) => {
    await table()
      .getByRole("button", { name: `Actions for ${title}`, exact: true })
      .click();
    await button(action).click();
  };
  const upload = async (csv) => {
    const chooser = page.waitForEvent("filechooser");
    await button("Choose CSV file").click();
    await (
      await chooser
    ).setFiles({
      name: "classes.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
  };
  try {
    await enter(page);
    await button("Add").click();
    await button("Class").click();
    await button("Add class").click();
    await page.getByText("Class name is required", { exact: true }).waitFor();
    await campus("Main Campus");
    await page
      .getByRole("textbox", { name: "Class name *", exact: true })
      .fill("QA Systems Class");
    await page
      .getByRole("textbox", { name: "Faculty email *", exact: true })
      .fill("faculty@college.edu");
    await page
      .getByRole("textbox", { name: "Room number", exact: true })
      .fill("QA-204");
    await page.screenshot({
      path: path.join(output, "class-form-desktop.png"),
    });
    await button("Add class").click();
    await table()
      .getByRole("button", { name: "Open QA Systems Class", exact: true })
      .waitFor();
    await rowAction("QA Systems Class", "Edit");
    await page
      .getByRole("textbox", { name: "Class name *", exact: true })
      .fill("QA Systems Updated");
    await button("Save changes").click();
    await table()
      .getByRole("button", { name: "Open QA Systems Updated", exact: true })
      .waitFor();
    await rowAction("QA Systems Updated", "Learners");
    await button("Map learner").click();
    await page
      .getByText("UID and name are required.", { exact: true })
      .waitFor();
    await page
      .getByRole("textbox", { name: "UID *", exact: true })
      .fill("QA001");
    await page
      .getByRole("textbox", { name: "Name *", exact: true })
      .fill("QA Learner");
    await page
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("learner@college.edu");
    await button("Map learner").click();
    await page.getByText("QA001", { exact: true }).waitFor();
    const download = page.waitForEvent("download");
    await button("Download").click();
    const downloaded = await download;
    assert.ok(
      fs.readFileSync(await downloaded.path(), "utf8").includes("QA001"),
    );
    await button("Back").click();
    await table()
      .getByRole("button", { name: "Open QA Systems Updated", exact: true })
      .click();
    await page
      .getByText("Record overview", { exact: true })
      .filter({ visible: true })
      .waitFor();
    await button("Back to records").click();
    await rowAction("QA Systems Updated", "Learners");
    await page.getByText("QA001", { exact: true }).waitFor();
    await button("Remove QA Learner").click();
    await page.getByText("No learners mapped yet.", { exact: true }).waitFor();
    await button("Back").click();
    await rowAction("QA Systems Updated", "Delete");
    await button("Cancel").click();
    assert.equal(
      await table()
        .getByRole("button", { name: "Open QA Systems Updated", exact: true })
        .count(),
      1,
    );
    await rowAction("QA Systems Updated", "Delete");
    await button("Delete").click();
    assert.equal(
      await table()
        .getByRole("button", { name: "Open QA Systems Updated", exact: true })
        .count(),
      0,
    );
    console.log(
      "Create, edit, learner mapping/export, navigation and confirmed delete passed.",
    );

    await button("Bulk upload").click();
    await button("Class").click();
    await campus("Main Campus");
    const templateDownload = page.waitForEvent("download");
    await button("Download template").click();
    assert.ok(
      fs
        .readFileSync(await (await templateDownload).path(), "utf8")
        .includes("class_name"),
    );
    await upload(
      "class_name,faculty_email,Tag\r\nQA CSV,faculty@college.edu,Lecture\r\nQA CSV,faculty@college.edu,Lecture\r\nInvalid,wrong,Lecture",
    );
    await page
      .getByText("Invalid: Enter a valid email", { exact: false })
      .count();
    assert.equal(await button("Save 1 classes").isDisabled(), true);
    await button("Remove row 4").click();
    assert.equal(await button("Save 1 classes").isEnabled(), true);
    await page.screenshot({ path: path.join(output, "csv-preview.png") });
    await button("Save 1 classes").click();
    assert.equal(
      await table()
        .getByRole("button", { name: "Open QA CSV", exact: true })
        .count(),
      1,
    );
    await button("Bulk upload").click();
    await button("Class").click();
    await campus("Main Campus");
    await upload('class_name,faculty_email,Tag\n"unclosed');
    await page
      .getByText("A quoted CSV field is not closed.", { exact: true })
      .waitFor();
    assert.equal(await button("Save 0 classes").isDisabled(), true);
    await button("Cancel").click();
    console.log(
      "CSV template, validation, duplicate skipping, removal and malformed file handling passed.",
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await button("Add").click();
    await button("Lab").click();
    await campus("North Campus");
    await page
      .getByRole("textbox", { name: "Lab name *", exact: true })
      .fill("QA Mobile Lab");
    await page
      .getByRole("textbox", { name: "Faculty email *", exact: true })
      .fill("faculty@college.edu");
    await page
      .getByRole("textbox", { name: "Capacity", exact: true })
      .fill("30");
    assert.equal(await button("Attendance type: Continuous").count(), 1);
    await page.screenshot({ path: path.join(output, "lab-form-mobile.png") });
    await button("Add lab").click();
    await table()
      .getByRole("button", { name: "Open QA Mobile Lab", exact: true })
      .waitFor();
    await page.setViewportSize({ width: 1512, height: 982 });
    await button("Assigned scope: Across campuses").click();
    await button("Main Campus").click();
    assert.equal(
      await table()
        .getByRole("button", { name: "Open QA Mobile Lab", exact: true })
        .count(),
      0,
    );
    await table()
      .getByRole("button", { name: "Open QA CSV", exact: true })
      .waitFor();
    await button("Assigned scope: Main Campus").click();
    await button("North Campus").click();
    await table()
      .getByRole("button", { name: "Open QA Mobile Lab", exact: true })
      .waitFor();
    assert.equal(
      await table()
        .getByRole("button", { name: "Open QA CSV", exact: true })
        .count(),
      0,
    );
    console.log("Mobile lab creation and campus isolation passed.");
    await context.close();

    for (const role of ["dean", "coordinator"]) {
      const ctx = await browser.newContext({
        viewport: { width: 1512, height: 982 },
        reducedMotion: "reduce",
      });
      const p = await ctx.newPage();
      watch(p);
      await p.addInitScript(
        (role) =>
          localStorage.setItem(
            "vizenta-ai-demo-v1",
            JSON.stringify({
              workspace: {
                industry: "education",
                role,
                scope: "Engineering College",
              },
              theme: "dark",
            }),
          ),
        role,
      );
      await enter(p);
      for (const tab of ["Classes", "Labs"]) {
        await p.getByRole("tab", { name: tab, exact: true }).click();
        await p.getByRole("button", { name: "Add", exact: true }).click();
        const kind = tab === "Labs" ? "lab" : "class";
        await p
          .getByRole("textbox", {
            name: `${kind === "lab" ? "Lab" : "Class"} name *`,
            exact: true,
          })
          .fill(`QA ${role} ${kind}`);
        await p
          .getByRole("textbox", { name: "Faculty email *", exact: true })
          .fill("faculty@college.edu");
        await p
          .getByRole("button", { name: `Add ${kind}`, exact: true })
          .click();
        await p
          .getByRole("button", { name: `Open QA ${role} ${kind}`, exact: true })
          .waitFor();
      }
      await p.screenshot({ path: path.join(output, `${role}-dark.png`) });
      await ctx.close();
      console.log(`${role}: Classes and Labs passed in dark mode.`);
    }
    assert.deepEqual(errors, []);
    console.log("Class/lab feature checks passed without console errors.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
