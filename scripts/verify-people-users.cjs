// Checks People & Access → Users: no separate Surveillance Users entry, the
// Learners and Surveillance users directories each offer Add (with image
// controls) and Bulk upload, portraits open the record, and the phone layout fits.
//
//   npm run test:people-users
const assert = require("node:assert/strict");
const { PHONE, main, noOverflow, open, tab } = require("./lib/qa.cjs");

main(async (browser) => {
  const { page, button, errors } = await open(browser, {
    reducedMotion: "no-preference",
    timeout: 30000,
  });
  const portrait = () =>
    page
      .getByRole("img", { name: /profile image$/ })
      .filter({ visible: true })
      .first();
  await button("People & Access").click();
  await tab(page, "Users").click();
  assert.equal(await button("Surveillance Users").count(), 0);
  await page
    .getByText(/^UID: /)
    .filter({ visible: true })
    .first()
    .waitFor();
  for (const group of ["Learners", "Surveillance users"]) {
    if (group === "Surveillance users") {
      await button("User directory: Learners").click();
      await button(group).click();
    }
    await button("Add").click();
    await button("Choose image").waitFor();
    await page.keyboard.press("Escape");
    await button("Bulk upload").click();
    await button("Download template").waitFor();
    await page.keyboard.press("Escape");
  }
  await portrait().waitFor();
  await portrait().click();
  await button("Back to records").waitFor();
  await portrait().waitFor();
  await button("Back to records").click();
  await page.setViewportSize(PHONE);
  await page.waitForTimeout(600);
  assert.ok(await noOverflow(page));
  assert.deepEqual(errors, []);
  console.log(
    "People & Access: learner/surveillance add, image controls, CSV upload, and mobile layout passed.",
  );
});
