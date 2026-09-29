// Checks Gate → User Attendance manual marking for an absent person (absent
// rows follow the present ones, so it pages forward to them): required reason,
// check-out after check-in, the saved duration, In/Out, and the phone form.
//
//   npm run test:gate-attendance
const assert = require("node:assert/strict");
const {
  PHONE,
  dialog,
  field,
  main,
  noOverflow,
  open,
  records,
  rows,
  tab,
} = require("./lib/qa.cjs");

main(async (browser) => {
  const { page, button, errors } = await open(browser);
  const mark = () => button("Mark attendance").first();
  const absentRows = async () => {
    await rows(page).first().waitFor();
    for (let i = 0; i < 6 && !(await mark().count()); i++)
      await button("Next").click();
    await mark().click();
  };
  await button("Gate").click();
  await tab(page, "User Attendance").click();
  await absentRows();
  await dialog(page)
    .getByRole("button", { name: "Mark attendance", exact: true })
    .click();
  await page
    .getByText("A reason is required for the audit trail", { exact: true })
    .waitFor();
  await field(page, "Check-in time *").fill("09:00");
  await field(page, "Check-out time").fill("08:00");
  await field(page, "Reason *").fill("Verified by gate guard");
  await dialog(page)
    .getByRole("button", { name: "Mark attendance", exact: true })
    .click();
  await page
    .getByText("Check-out must be after check-in", { exact: true })
    .waitFor();
  await field(page, "Check-out time").fill("17:30");
  await dialog(page)
    .getByRole("button", { name: "Mark attendance", exact: true })
    .click();
  await button("Columns").click();
  await button("Show all").click();
  await page.keyboard.press("Escape");
  await page
    .getByText("8h 30m", { exact: true })
    .filter({ visible: true })
    .waitFor();
  await tab(page, "In/Out").click();
  await records(page).waitFor();
  await page.setViewportSize(PHONE);
  await tab(page, "User Attendance").click();
  await absentRows();
  await field(page, "Reason *").waitFor();
  assert.ok(await noOverflow(page));
  assert.deepEqual(errors, []);
  console.log(
    "Gate tabs, manual validation, saved attendance and mobile passed.",
  );
});
