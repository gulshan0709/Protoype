// Checks the records column picker: compact defaults without horizontal
// scrolling, hiding and showing columns, saved choices surviving a reload,
// Show all and Reset defaults, phone cards following the selection, and the
// compact defaults in the other three industries (dark), without console
// errors. Screenshots are saved to qa/columns/.
//
//   npm run test:columns
const assert = require("node:assert/strict");
const {
  KEY,
  PHONE,
  button,
  demoState,
  enter,
  main,
  open,
  qaDir,
  records,
  shooter,
} = require("./lib/qa.cjs");

main(async (browser) => {
  const errors = [];
  const shot = shooter(qaDir("columns"));
  const { context, page } = await open(browser, {
    timeout: 12000,
    errors,
    consoleErrors: true,
  });
  const sortBy = (name) => button(records(page), "Sort by " + name);
  const sorts = () => records(page).getByRole("button", { name: /^Sort by / });
  const box = (name) => page.getByRole("checkbox", { name, exact: true });
  const picker = () => button(records(page), "Columns").click();
  const done = () => button(page, "Done").click();
  await button(page, "Class & Lab Attendance").click();
  assert.equal(await sorts().count(), 3);
  assert.equal(await sortBy("Policy").count(), 0);
  assert.equal(await sortBy("Source state").count(), 0);
  assert.equal(
    await records(page).evaluate((el) =>
      [...el.querySelectorAll("div")].some(
        (x) =>
          /auto|scroll/.test(getComputedStyle(x).overflowX) &&
          x.scrollWidth > x.clientWidth + 1,
      ),
    ),
    false,
    "Default table does not scroll horizontally",
  );
  await shot(page, "default-desktop");
  await picker();
  assert.equal(await box("Class / lab").isDisabled(), true);
  await box("Policy").click();
  await box("Campus").click();
  await done();
  await sortBy("Policy").waitFor();
  assert.equal(await sortBy("Campus").count(), 0);
  await page.waitForFunction(
    (key) =>
      Object.values(
        JSON.parse(localStorage.getItem(key)).columnPreferences,
      ).some((ids) => ids.includes("policy") && !ids.includes("campus")),
    KEY,
  );
  await page.reload();
  await enter(page);
  await button(page, "Class & Lab Attendance").click();
  await sortBy("Policy").waitFor();
  assert.equal(
    await sortBy("Campus").count(),
    0,
    "Saved columns survive reload",
  );
  await sortBy("Policy").click();
  await picker();
  await box("Policy").click();
  await box("Status").click();
  await done();
  assert.equal(
    await records(page).getByText("Status", { exact: true }).count(),
    0,
  );
  await picker();
  await button(page, "Show all").click();
  await done();
  await sortBy("Source state").waitFor();
  assert.ok((await sorts().count()) > 3);
  await picker();
  await shot(page, "column-picker");
  await button(page, "Reset defaults").click();
  await done();
  assert.equal(await sorts().count(), 3);
  // Phone cards label each selected column in capitals.
  await page.setViewportSize(PHONE);
  const first = records(page)
    .getByRole("button", { name: /^Open / })
    .first();
  assert.equal(await first.getByText("POLICY", { exact: true }).count(), 0);
  await picker();
  await box("Policy").click();
  await done();
  await first.getByText("POLICY", { exact: true }).waitFor();
  await first.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await shot(page, "mobile-selected-columns");
  await context.close();

  for (const industry of ["corporate", "retail", "manufacturing"]) {
    const data = require(`../src/domain/contracts/data/${industry}.json`);
    const role = data.core.roles.customer_admin
      ? "customer_admin"
      : Object.keys(data.core.roles)[0];
    const { context, page } = await open(browser, {
      state: demoState({ industry, role, theme: "dark", name: "Review" }),
      timeout: 12000,
      errors,
      consoleErrors: true,
    });
    const table = records(page);
    const sorts = () => table.getByRole("button", { name: /^Sort by / });
    await table.waitFor();
    assert.ok((await sorts().count()) <= 3);
    await button(table, "Columns").click();
    await button(page, "Show all").click();
    await button(page, "Done").click();
    assert.ok((await sorts().count()) >= 3);
    await context.close();
    console.log(
      `${industry}: compact defaults and column picker passed in dark mode`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "Column visibility, persistence, reset, mobile cards and all four industries passed.",
  );
});
