// Checks class and lab setup in Class & Lab Attendance: create, edit, learner
// mapping and export, confirmed delete, CSV upload with validation, a phone lab
// form, campus isolation, and Dean/Coordinator Classes and Labs in dark mode,
// without console errors. Screenshots are saved to qa/class-setup/.
//
//   npm run test:class-setup
const assert = require("node:assert/strict");
const {
  DESKTOP,
  PHONE,
  button,
  downloadText,
  main,
  open,
  qaDir,
  records,
  rowAction,
  shooter,
  tab,
  uploadCsv,
} = require("./lib/qa.cjs");

main(async (browser) => {
  const errors = [];
  const shot = shooter(qaDir("class-setup"));
  const product = "Class & Lab Attendance";
  const { context, page } = await open(browser, {
    timeout: 12000,
    errors,
    consoleErrors: true,
  });
  const b = (name) => button(page, name);
  const text = (value) =>
    page.getByRole("textbox", { name: value, exact: true });
  const opened = (title) => button(records(page), "Open " + title);
  const campus = async (name) => {
    await page
      .getByRole("button", { name: /^Campus: / })
      .last()
      .click();
    await b(name).click();
  };
  await b(product).click();
  await b("Add").click();
  await b("Class").click();
  await b("Add class").click();
  await page.getByText("Class name is required", { exact: true }).waitFor();
  await campus("Main Campus");
  await text("Class name *").fill("QA Systems Class");
  await text("Faculty email *").fill("faculty@college.edu");
  await text("Room number").fill("QA-204");
  await shot(page, "class-form-desktop");
  await b("Add class").click();
  await opened("QA Systems Class").waitFor();
  await rowAction(page, "QA Systems Class", "Edit");
  await text("Class name *").fill("QA Systems Updated");
  await b("Save changes").click();
  await opened("QA Systems Updated").waitFor();
  await rowAction(page, "QA Systems Updated", "Learners");
  await b("Map learner").click();
  await page.getByText("UID and name are required.", { exact: true }).waitFor();
  await text("UID *").fill("QA001");
  await text("Name *").fill("QA Learner");
  await text("Email").fill("learner@college.edu");
  await b("Map learner").click();
  // Mapped learners use the standard person chip: name over "UID: …".
  await page.getByText("UID: QA001", { exact: true }).waitFor();
  assert.ok((await downloadText(page, b("Download"))).includes("QA001"));
  await b("Back").click();
  await opened("QA Systems Updated").click();
  await page
    .getByText("Record overview", { exact: true })
    .filter({ visible: true })
    .waitFor();
  await b("Back to records").click();
  await rowAction(page, "QA Systems Updated", "Learners");
  await page.getByText("UID: QA001", { exact: true }).waitFor();
  await b("Remove QA Learner").click();
  await page.getByText("No learners mapped yet.", { exact: true }).waitFor();
  await b("Back").click();
  await rowAction(page, "QA Systems Updated", "Delete");
  await b("Cancel").click();
  assert.equal(await opened("QA Systems Updated").count(), 1);
  await rowAction(page, "QA Systems Updated", "Delete");
  await b("Delete").click();
  assert.equal(await opened("QA Systems Updated").count(), 0);
  console.log(
    "Create, edit, learner mapping/export, navigation and confirmed delete passed.",
  );

  await b("Bulk upload").click();
  await b("Class").click();
  await campus("Main Campus");
  assert.ok(
    (await downloadText(page, b("Download template"))).includes("class_name"),
  );
  await uploadCsv(
    page,
    "classes.csv",
    "class_name,faculty_email,Tag\r\nQA CSV,faculty@college.edu,Lecture\r\nQA CSV,faculty@college.edu,Lecture\r\nInvalid,wrong,Lecture",
  );
  assert.equal(await b("Save 1 classes").isDisabled(), true);
  await b("Remove row 4").click();
  assert.equal(await b("Save 1 classes").isEnabled(), true);
  await shot(page, "csv-preview");
  await b("Save 1 classes").click();
  assert.equal(await opened("QA CSV").count(), 1);
  await b("Bulk upload").click();
  await b("Class").click();
  await campus("Main Campus");
  await uploadCsv(
    page,
    "classes.csv",
    'class_name,faculty_email,Tag\n"unclosed',
  );
  await page
    .getByText("A quoted CSV field is not closed.", { exact: true })
    .waitFor();
  assert.equal(await b("Save 0 classes").isDisabled(), true);
  await b("Cancel").click();
  console.log(
    "CSV template, validation, duplicate skipping, removal and malformed file handling passed.",
  );

  await page.setViewportSize(PHONE);
  await b("Add").click();
  await b("Lab").click();
  await campus("North Campus");
  await text("Lab name *").fill("QA Mobile Lab");
  await text("Faculty email *").fill("faculty@college.edu");
  await text("Capacity").fill("30");
  assert.equal(await b("Attendance type: Continuous").count(), 1);
  await shot(page, "lab-form-mobile");
  await b("Add lab").click();
  await opened("QA Mobile Lab").waitFor();
  await page.setViewportSize(DESKTOP);
  await b("Assigned scope: Across campuses").click();
  await b("Main Campus").click();
  assert.equal(await opened("QA Mobile Lab").count(), 0);
  await opened("QA CSV").waitFor();
  await b("Assigned scope: Main Campus").click();
  await b("North Campus").click();
  await opened("QA Mobile Lab").waitFor();
  assert.equal(await opened("QA CSV").count(), 0);
  console.log("Mobile lab creation and campus isolation passed.");
  await context.close();

  for (const role of ["dean", "coordinator"]) {
    const { context, page } = await open(browser, {
      state: {
        workspace: {
          industry: "education",
          role,
          scope: "Engineering College",
        },
        theme: "dark",
      },
      timeout: 30000,
      errors,
      consoleErrors: true,
    });
    await button(page, product).click();
    for (const view of ["Classes", "Labs"]) {
      const kind = view === "Labs" ? "lab" : "class";
      await tab(page, view).click();
      await button(page, "Add").click();
      await page
        .getByRole("textbox", {
          name: `${kind === "lab" ? "Lab" : "Class"} name *`,
          exact: true,
        })
        .fill(`QA ${role} ${kind}`);
      await page
        .getByRole("textbox", { name: "Faculty email *", exact: true })
        .fill("faculty@college.edu");
      await button(page, `Add ${kind}`).click();
      await button(page, `Open QA ${role} ${kind}`).waitFor();
    }
    await shot(page, `${role}-dark`);
    await context.close();
    console.log(`${role}: Classes and Labs passed in dark mode.`);
  }
  assert.deepEqual(errors, []);
  console.log("Class/lab feature checks passed without console errors.");
});
