// Checks Customer Admin Warden residence setup: add and edit a warden, add a
// hostel assigned to that warden, leave date validation, confirmed hostel
// delete, and the phone form.
//
//   npm run test:residence-setup
const assert = require("node:assert/strict");
const {
  PHONE,
  dialog,
  field,
  fillForm,
  main,
  noOverflow,
  open,
  rowAction,
  tab,
} = require("./lib/qa.cjs");

main(async (browser) => {
  const { page, button, errors } = await open(browser);
  const add = async () => {
    await button("Add").click();
    await button("Scope: Choose scope").click();
    await button("Residential Campus").click();
  };
  await button("Warden").click();
  await add();
  await fillForm(page, {
    "Name *": "QA Warden",
    "Email *": "warden@example.com",
    "Phone *": "9876543210",
  });
  await button("Add warden").click();
  await rowAction(page, "QA Warden", "Edit");
  await field(page, "Phone *").fill("9876543211");
  await button("Save changes").click();
  await tab(page, "Hostels").click();
  await add();
  await field(page, "Hostel name *").fill("QA Hostel");
  await field(page, "Closing time").fill("22:00");
  await page.getByRole("checkbox", { name: "QA Warden", exact: true }).click();
  await button("Add hostel").click();
  await button("Actions for QA Hostel").waitFor();
  await tab(page, "Leave Management").click();
  await add();
  await button("Select student: Choose a student").click();
  const options = dialog(page).getByRole("button");
  const labels = await options.allTextContents();
  const chosen = labels.find((s) => /[ABC]-\d+/.test(s));
  if (!chosen) throw Error("No scoped student options: " + labels.join(","));
  await options.filter({ hasText: chosen }).click();
  await fillForm(page, {
    "Start date *": "2026-02-30",
    "End date *": "2026-10-02",
    "Reason *": "Family visit",
  });
  await button("Create leave").click();
  await page.getByText("Use YYYY-MM-DD", { exact: true }).waitFor();
  await field(page, "Start date *").fill("2026-10-01");
  await button("Create leave").click();
  await tab(page, "Hostels").click();
  await rowAction(page, "QA Hostel", "Delete");
  await button("Delete").click();
  assert.equal(await button("Actions for QA Hostel").count(), 0);
  await page.setViewportSize(PHONE);
  await button("Add").click();
  await field(page, "Hostel name *").waitFor();
  assert.ok(await noOverflow(page));
  assert.deepEqual(errors, []);
  console.log(
    "Residence create, edit, assignment, leave validation, delete and mobile passed.",
  );
});
