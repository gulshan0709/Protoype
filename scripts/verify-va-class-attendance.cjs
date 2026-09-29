// Checks Vizenta Admin → Class & Lab Attendance (Education): the product in the
// navigation, every tab with rows, adding a class for a chosen customer, a class
// session roster, room cameras in Sources, the empty Eastgate University scope,
// and phone and dark layouts.
//
//   npm run test:va-class-attendance
//
// VIZENTA_QA_URL overrides the default http://localhost:8083. Screenshots are
// saved to qa/va-class-attendance/.
const assert = require("node:assert/strict");
const {
  PHONE,
  demoState,
  main,
  open,
  qaDir,
  records,
  route,
  rows,
  shooter,
} = require("./lib/qa.cjs");
const output = qaDir("va-class-attendance");
const shot = shooter(output);
const PRODUCT = "Class & Lab Attendance";
const TABS = [
  "Coverage",
  "Mappings",
  "Learners",
  "Sources",
  "Policies",
  "Reports",
];
const at = (tab) => route({ type: "product", name: PRODUCT, tab });

main(async (browser) => {
  const errors = [];
  // Every fresh load opens the login screen; this signs in with a password.
  const openAdmin = ({
    scope = "All customers",
    theme = "light",
    viewport,
    url = "/",
  } = {}) =>
    open(browser, {
      url,
      viewport,
      state: demoState({ role: "vizenta_admin", scope, theme }),
      timeout: 20000,
      loadTimeout: 90000,
      login: "password",
      fillRetries: 10,
      errors,
      consoleErrors: true,
    });
  const text = (page, name) => page.getByRole("textbox", { name, exact: true });

  // --- The product is in the navigation and every tab lists rows -----------
  {
    const { context, page, button } = await openAdmin();
    await button(PRODUCT).first().click();
    await rows(page).first().waitFor();
    await shot(page, "coverage-desktop");
    await context.close();
  }
  // A reload opens login again, so each tab gets its own signed-in context.
  for (const tab of TABS) {
    const { context, page } = await openAdmin({ url: at(tab) });
    await rows(page).first().waitFor();
    const count = await rows(page).count();
    assert.ok(count > 0, `${tab} lists rows`);
    console.log(`${tab}: ${count} rows visible`);
    await context.close();
  }

  // --- Add a class for a chosen customer, then open a class session --------
  {
    const { context, page, button } = await openAdmin({ url: at("Coverage") });
    await rows(page).first().waitFor();
    await button("Add").click();
    await button("Class").click();
    await button("Add class").click();
    await page.getByText("Class name is required", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: /^Customer: / })
      .last()
      .click();
    await button("Northbridge Education").click();
    await text(page, "Class name *").fill("QA VA Class");
    await text(page, "Faculty email *").fill("faculty@college.edu");
    await text(page, "Room number").fill("QA-310");
    await shot(page, "add-class-customer");
    await button("Add class").click();
    await records(page)
      .getByRole("button", { name: "Open QA VA Class", exact: true })
      .waitFor();
    console.log("Added a class for Northbridge Education from All customers.");

    const first = rows(page).first();
    const title = ((await first.getAttribute("aria-label")) ?? "").replace(
      /^Open /,
      "",
    );
    await first.click();
    await page
      .getByTestId("class-attendance")
      .filter({ visible: true })
      .waitFor();
    await shot(page, "class-session");
    console.log(`Opened the session roster for ${title}.`);
    await context.close();
  }

  // --- Room cameras in Sources ask for the customer ------------------------
  {
    const { context, page, button } = await openAdmin({ url: at("Sources") });
    await rows(page).first().waitFor();
    await button("Add").click();
    await page
      .getByRole("button", { name: /^Customer: / })
      .last()
      .waitFor();
    await shot(page, "sources-add-camera");
    console.log("Sources opens room camera setup with a customer choice.");
    await context.close();
  }

  // --- Eastgate University has no class data --------------------------------
  {
    const { context, page } = await openAdmin({
      scope: "Eastgate University",
      url: at("Coverage"),
    });
    await page.waitForTimeout(1500);
    assert.equal(
      await rows(page).count(),
      0,
      "Eastgate University lists no classes",
    );
    await shot(page, "eastgate-empty");
    console.log("Eastgate University scope lists no classes.");
    await context.close();
  }

  // --- Phone and dark layouts ------------------------------------------------
  {
    const { context, page } = await openAdmin({
      url: at("Coverage"),
      viewport: PHONE,
    });
    // Phones show record cards instead of the table (header "Open …" buttons
    // are not rows).
    await rows(page).first().waitFor();
    await shot(page, "coverage-phone");
    await context.close();
  }
  {
    const { context, page } = await openAdmin({
      url: at("Learners"),
      theme: "dark",
    });
    await rows(page).first().waitFor();
    await shot(page, "learners-dark");
    await context.close();
  }

  const unexpected = errors.filter(
    (e) => !/Download the React DevTools/.test(e),
  );
  assert.deepEqual(unexpected, [], "no page errors");
  console.log(
    "Vizenta Admin Class & Lab Attendance checks passed. Screenshots in " +
      output,
  );
});
