// Checks surveillance user management for Customer Admin (People & Access →
// Users → Surveillance users; the Surveillance Users entry is gone for roles
// with that directory) and Vizenta Admin (Surveillance Users): required fields,
// create, edit, CSV upload, confirmed delete, and the phone form.
//
//   npm run test:surveillance-setup
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
  for (const role of ["customer_admin", "vizenta_admin"]) {
    const admin = role === "vizenta_admin";
    const { context, page, button, errors } = await open(browser, {
      state: {
        workspace: {
          industry: "education",
          role,
          scope: admin ? "All customers" : "Across campuses",
        },
        theme: "light",
      },
    });
    const user = /^Actions for Quality/;
    const scope = async () => {
      await button((admin ? "Customer" : "Campus") + ": Choose scope").click();
      await button(admin ? "Northbridge Education" : "Main Campus").click();
    };
    if (admin) await button("Surveillance Users").click();
    else {
      await button("People & Access").click();
      await tab(page, "Users").click();
      await button("User directory: Learners").click();
      await button("Surveillance users").click();
    }
    await button("Add").click();
    await button("Add user").click();
    await page.getByText("UID is required", { exact: true }).waitFor();
    await scope();
    await fillForm(page, {
      "UID *": "QA-USER",
      "First name *": "Quality",
      "Email *": "qa@example.com",
    });
    await button("Add user").click();
    await rowAction(page, user, "Edit");
    await field(page, "Phone").fill("9876543210");
    await button("Save changes").click();
    await button("Bulk upload").click();
    await scope();
    await uploadCsv(
      page,
      "users.csv",
      "uid,first_name,email,user_type\nB,Bulk,bulk@example.com,Identified",
    );
    await button("Save 1 users").click();
    await rowAction(page, user, "Delete");
    await button("Cancel").click();
    await rowAction(page, user, "Delete");
    await button("Delete").click();
    assert.equal(
      await page
        .getByRole("button", { name: user })
        .filter({ visible: true })
        .count(),
      0,
    );
    await page.setViewportSize(PHONE);
    await button("Add").click();
    await field(page, "UID *").waitFor();
    assert.ok(await noOverflow(page));
    assert.deepEqual(errors, []);
    console.log(role + ": surveillance CRUD, CSV and mobile passed");
    await context.close();
  }
});
