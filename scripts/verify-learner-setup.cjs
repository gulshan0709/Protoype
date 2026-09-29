// Checks Customer Admin learner management in People & Access → Users (the
// Learners directory; Class & Lab Attendance → Learners has no Add): required
// fields, create, edit, CSV upload, confirmed delete, and the phone form.
//
//   npm run test:learner-setup
const assert = require("node:assert/strict");
const {
  PHONE,
  field,
  fillForm,
  main,
  noOverflow,
  open,
  rowAction,
  tab,
  uploadCsv,
} = require("./lib/qa.cjs");

main(async (browser) => {
  const { page, button, errors } = await open(browser);
  const learner = /^Actions for Quality Learner/;
  const actions = () =>
    page.getByRole("button", { name: learner }).filter({ visible: true });
  await button("People & Access").click();
  await tab(page, "Users").click();
  await button("Add").click();
  await button("Add learner").click();
  await page.getByText("UID is required", { exact: true }).waitFor();
  await button("Campus: Choose campus").click();
  await button("Main Campus").click();
  await fillForm(page, {
    "UID *": "QA-999",
    "First name *": "Quality",
    "Last name *": "Learner",
  });
  await button("Add learner").click();
  await rowAction(page, learner, "Edit");
  await field(page, "Email").fill("qa@example.com");
  await button("Save changes").click();
  await button("Bulk upload").click();
  await button("Campus: Choose campus").click();
  await button("Main Campus").click();
  await uploadCsv(
    page,
    "learners.csv",
    "uid,first_name,last_name,type\nQA-1000,Bulk,Learner,Learner",
  );
  await button("Save 1 learners").click();
  await page
    .getByRole("button", { name: /^Actions for Bulk Learner/ })
    .filter({ visible: true })
    .waitFor();
  await rowAction(page, learner, "Delete");
  await button("Cancel").click();
  await rowAction(page, learner, "Delete");
  await button("Delete").click();
  assert.equal(await actions().count(), 0);
  await page.setViewportSize(PHONE);
  await button("Filters").waitFor();
  await button("Add").click();
  await field(page, "UID *").waitFor();
  assert.ok(await noOverflow(page));
  assert.deepEqual(errors, []);
  console.log(
    "Learner create, validation, edit, CSV upload, delete confirmation and mobile passed.",
  );
});
