// Checks Customer Admin Sources & Setup: the setup tabs, shift and camera
// create/edit/delete, camera criteria, the Shield views that moved there, and
// the phone and desktop layouts (without console errors). Screenshots are
// saved to qa/sources-polish/.
//
//   npm run test:sources-setup
const assert = require("node:assert/strict");
const {
  PHONE,
  DESKTOP,
  field,
  fillForm,
  main,
  noOverflow,
  open,
  qaDir,
  records,
  rowAction,
  shooter,
  tab,
} = require("./lib/qa.cjs");

main(async (browser) => {
  const { page, button, errors } = await open(browser, { consoleErrors: true });
  const shot = shooter(qaDir("sources-polish"));
  await button("Sources & Setup").click();
  await page
    .getByText("Enabled services", { exact: true })
    .filter({ visible: true })
    .waitFor();
  for (const name of ["Setup", "Camera Setup", "Shift", "Camera Criteria"])
    await tab(page, name).waitFor();
  await tab(page, "Shift").click();
  await button("Add").click();
  await button("Campus: Choose campus").click();
  await button("Main Campus").click();
  await fillForm(page, {
    "Shift name *": "QA Shift",
    "Start time *": "09:00",
    "End time *": "17:00",
  });
  await button("Create").click();
  await rowAction(page, "QA Shift", "Edit");
  await field(page, "End time *").fill("18:00");
  await button("Update").click();
  await tab(page, "Camera Setup").click();
  await button("Add").click();
  await button("Campus: Choose campus").click();
  await button("Main Campus").click();
  await fillForm(page, {
    "Display name *": "QA Setup Camera",
    "IP address *": "192.168.1.22",
    "Port *": "554",
    "Camera ID *": "QA-CAM",
    "User name *": "demo",
    "Password *": "test-only",
  });
  await page.getByRole("button", { name: /^Camera brand:/ }).click();
  await button("Axis").click();
  await button("Save").click();
  await rowAction(page, "QA Setup Camera", "Edit");
  await field(page, "Port *").fill("8554");
  await button("Save").click();
  await tab(page, "Camera Criteria").click();
  await field(page, "Min std-dev").fill("10");
  await field(page, "Min dynamic range").fill("40");
  await button("Save").click();
  await button("Shield").click();
  await tab(page, "Surveillance Dashboard").click();
  await button("Refresh").waitFor();
  await tab(page, "Surveillance Attendance").click();
  await records(page).waitFor();
  await tab(page, "Video Analytics").click();
  await records(page).waitFor();
  await button("Sources & Setup").click();
  await tab(page, "Camera Setup").click();
  await rowAction(page, "QA Setup Camera", "Delete");
  await button("Delete").click();
  assert.equal(await button("Actions for QA Setup Camera").count(), 0);
  await page.setViewportSize(PHONE);
  await tab(page, "Setup").click();
  assert.ok(await noOverflow(page));
  await shot(page, "mobile", { fullPage: true });
  await page.setViewportSize(DESKTOP);
  await shot(page, "desktop", { fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "All seven tabs, camera and shift CRUD, criteria save and mobile passed.",
  );
});
