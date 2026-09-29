// Checks the initials avatar for people without a photo: the header shows the
// signed-in user's initials (the email "gulshan.kumar@…" signs in as "Gulshan
// Kumar" → GK), Settings previews the avatar while the display name is typed,
// the Add learner form shows a silhouette, then initials as the name is typed,
// Warden → Wardens gives every warden an avatar ("Warden Rao" → R) and a new
// warden's initials, Hostels shows the wardens' avatars and stacks them for a
// hostel with several wardens, and the dark and phone layouts fit.
//
//   npm run test:person-initials
//
// VIZENTA_QA_URL overrides the default http://localhost:8083. Screenshots are
// saved to qa/person-initials/.
const assert = require("node:assert/strict");
const {
  PHONE,
  demoState,
  field,
  main,
  noOverflow,
  open,
  qaDir,
  records,
  route,
  shooter,
  tab,
} = require("./lib/qa.cjs");
const shot = shooter(qaDir("person-initials"));
const initialsIn = (locator) =>
  locator
    .getByTestId("person-initials")
    .filter({ visible: true })
    .first()
    .innerText();
const form = (page) =>
  page.getByRole("dialog").filter({ visible: true }).last();

main(async (browser) => {
  const errors = [];
  // Every fresh load opens the login screen; this signs in with an email.
  const signedIn = ({ theme = "light", viewport, url } = {}) =>
    open(browser, {
      url,
      viewport,
      state: demoState({ theme, name: "Alex Morgan" }),
      timeout: 20000,
      loadTimeout: 90000,
      login: "password",
      user: "gulshan.kumar@reslt.ai",
      errors,
      consoleErrors: true,
    });

  // --- Header and Settings --------------------------------------------------
  {
    const { context, page, button } = await signedIn();
    const profile = button("Profile and settings");
    assert.equal(await initialsIn(profile), "GK", "header initials");
    const box = await profile.boundingBox();
    await shot(page, "header", {
      clip: {
        x: Math.max(0, box.x - 260),
        y: 0,
        width: 320,
        height: box.y + box.height + 14,
      },
    });
    await profile.click();
    const preview = page.getByTestId("settings-profile-preview");
    await preview.waitFor();
    assert.equal(await initialsIn(preview), "GK", "settings preview");
    assert.match(await preview.innerText(), /Gulshan Kumar/);
    await shot(page, "settings");
    await field(page, "Display name").fill("Zeynep Kaya");
    assert.equal(await initialsIn(preview), "ZK", "preview follows typing");
    await button("Close dialog").last().click();
    await preview.waitFor({ state: "detached" });

    // --- Add learner: silhouette, then initials; demo people keep portraits ---
    await button("People & Access").click();
    await tab(page, "Users").click();
    await page
      .getByRole("img", { name: /profile image$/ })
      .filter({ visible: true })
      .first()
      .waitFor();
    await button("Add").click();
    await button("Choose image").waitFor();
    const learner = form(page);
    const avatar = learner.getByTestId("person-initials").first();
    assert.equal((await avatar.innerText()).trim(), "", "silhouette");
    await field(learner, "First name *").fill("Gulshan");
    await field(learner, "Last name *").fill("Kumar");
    assert.equal(await initialsIn(learner), "GK", "form initials");
    await shot(page, "add-learner");
    // A known first name outside the demo data gets initials, not a stock face.
    await field(learner, "First name *").fill("Priyanka");
    await field(learner, "Last name *").fill("Zaveri");
    assert.equal(await initialsIn(learner), "PZ", "new person initials");
    await button("Close dialog").last().click();
    await context.close();
  }

  // --- Warden: every warden has an avatar; hostels show and stack them ------
  {
    const { context, page, button } = await signedIn({
      url: route({ type: "product", name: "Warden", tab: "Wardens" }),
    });
    // Session setup forms ask for a campus scope first.
    const chooseScope = async (dialog) => {
      await dialog
        .getByRole("button", { name: "Scope: Choose scope", exact: true })
        .click();
      await button("Residential Campus").last().click();
    };
    const table = records(page).first();
    await table.getByText("Warden Rao", { exact: true }).waitFor();
    const initials = await table.getByTestId("person-initials").allInnerTexts();
    assert.ok(
      initials.includes("R") && initials.includes("I"),
      initials.join(),
    );
    // Every row's Name cell leads with an avatar (initials or a portrait).
    const rows = await table.evaluate((el) => {
      const names = [
        ...el.querySelectorAll("[data-testid='person-initials'], img"),
      ];
      return names.length;
    });
    assert.ok(rows >= 3, "warden avatars: " + rows);
    await shot(page, "wardens");
    // A new warden shows a silhouette, then their initials, in the form and the list.
    await button("Add").click();
    const warden = form(page);
    await field(warden, "Name *").waitFor();
    assert.equal(
      (await warden.getByTestId("person-initials").first().innerText()).trim(),
      "",
    );
    await chooseScope(warden);
    await field(warden, "Name *").fill("Gulshan Kumar");
    await field(warden, "Email *").fill("gulshan.kumar@northbridge.edu");
    await field(warden, "Phone *").fill("9876543210");
    assert.equal(await initialsIn(warden), "GK", "warden form initials");
    await shot(page, "add-warden");
    await button("Add warden").click();
    await table.getByText("Gulshan Kumar", { exact: true }).waitFor();
    assert.ok(
      (await table.getByTestId("person-initials").allInnerTexts()).includes(
        "GK",
      ),
      "new warden row initials",
    );
    // Hostels: the Wardens column shows avatars; two wardens stack.
    await tab(page, "Hostels").click();
    await table.getByText("Hostel A", { exact: true }).waitFor();
    assert.ok(
      (await table.getByTestId("person-initials").allInnerTexts()).includes(
        "R",
      ),
      "hostel warden avatar",
    );
    await button("Add").click();
    const hostel = form(page);
    await chooseScope(hostel);
    await field(hostel, "Hostel name *").fill("Hostel Z");
    await field(hostel, "Closing time").fill("22:00");
    for (const name of ["Warden Rao", "Gulshan Kumar"])
      await hostel.getByRole("checkbox", { name, exact: true }).click();
    assert.ok(
      (await hostel.getByTestId("person-initials").count()) >= 2,
      "warden chips show avatars",
    );
    await shot(page, "add-hostel");
    await button("Add hostel").click();
    await table.getByText("Hostel Z", { exact: true }).waitFor();
    await table.getByTestId("person-avatar-stack").first().waitFor();
    await table
      .getByText("Warden Rao, Gulshan Kumar", { exact: true })
      .waitFor();
    await shot(page, "hostels");
    // Leave: the selected resident shows in the person format.
    await tab(page, "Leave Management").click();
    await button("Add").click();
    const leave = form(page);
    await leave
      .getByRole("button", { name: "Select student: Choose a student" })
      .click();
    await page
      .getByRole("button", { name: /^\p{Lu}\p{Ll}+ \p{Lu}\p{Ll}+ · /u })
      .filter({ visible: true })
      .first()
      .click();
    await leave
      .getByRole("img", { name: / (profile image|initials)$/ })
      .first()
      .waitFor();
    await shot(page, "add-leave");
    await button("Close dialog").last().click();
    await context.close();
  }

  // --- Dark theme and phone --------------------------------------------------
  {
    const { context, page, button } = await signedIn({
      theme: "dark",
      viewport: PHONE,
    });
    assert.equal(await initialsIn(button("Profile and settings")), "GK");
    await button("Profile and settings").click();
    await page.getByTestId("settings-profile-preview").waitFor();
    await shot(page, "settings-dark-phone");
    assert.ok(await noOverflow(page), "phone overflow");
    await context.close();
  }

  assert.deepEqual(errors, []);
  console.log(
    "Person initials: header, settings preview, add-learner form, wardens, hostels, dark and phone layouts passed.",
  );
});
