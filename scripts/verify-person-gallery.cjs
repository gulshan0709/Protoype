// Checks the per-person capture gallery on Gate → In/Out: opening a capture
// shows it with the person's other captures, thumbnails and ← → switch the
// viewer, In/Out filters narrow the grid, other pages keep the single preview,
// and the phone and dark layouts fit.
//
//   npm run test:person-gallery
//
// VIZENTA_QA_URL overrides the default http://localhost:8083. Screenshots are
// saved to qa/person-gallery/.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const base = (process.env.VIZENTA_QA_URL || "http://localhost:8083").replace(
  /\/$/,
  "",
);
const output = path.resolve(__dirname, "../qa/person-gallery");
fs.mkdirSync(output, { recursive: true });
const where = (tab) =>
  "/?" + new URLSearchParams({ type: "product", name: "Gate", tab });

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const open = async ({
    role = "customer_admin",
    scope = "Across campuses",
    theme = "light",
    viewport = { width: 1512, height: 982 },
    tab = "In/Out",
  } = {}) => {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    await context.addInitScript(
      (state) =>
        localStorage.setItem("vizenta-ai-demo-v1", JSON.stringify(state)),
      {
        workspace: { industry: "education", role, scope },
        theme,
        name: "QA User",
        audit: [],
        readNotifications: [],
      },
    );
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(base + where(tab), {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    // Every fresh load opens the login screen; the demo code is 123456.
    const button = (name) =>
      page.getByRole("button", { name, exact: true }).filter({ visible: true });
    await page
      .getByTestId("launch-screen")
      .waitFor({ state: "detached", timeout: 90000 });
    await page.getByLabel("User Id", { exact: true }).fill("qa@vizenta.ai");
    await page.getByLabel("Password", { exact: true }).fill("Preview123!");
    await button("Sign in").click();
    const code = page.getByLabel("Mobile verification digit 1", {
      exact: true,
    });
    if (
      await code.waitFor({ timeout: 1500 }).then(
        () => true,
        () => false,
      )
    ) {
      await code.fill("123456");
      await button("Verify code").click();
    }
    await page
      .getByTestId("records-table")
      .filter({ visible: true })
      .first()
      .waitFor();
    return { context, page, button };
  };
  const capture = (page, name) =>
    page
      .getByRole("button", { name: `View capture for ${name}`, exact: true })
      .filter({ visible: true })
      .first();
  const gallery = (page) => page.getByTestId("person-gallery");
  const thumbs = (page) => page.getByTestId("person-gallery-thumb");
  const selectedText = (page) =>
    page.getByTestId("person-gallery-selected").innerText();
  // Images in the dialog have loaded and been painted.
  const settle = async (page) => {
    await page.waitForFunction(
      () => {
        const box = document.querySelector('[data-testid="person-gallery"]');
        const imgs = box ? [...box.querySelectorAll("img")] : [];
        return (
          imgs.length > 0 &&
          imgs.every((img) => img.complete && img.naturalWidth > 0)
        );
      },
      null,
      { timeout: 30000 },
    );
    await page.evaluate(
      () =>
        new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(done)),
        ),
    );
  };
  const shot = (page, name) =>
    page.screenshot({ path: path.join(output, name + ".png") });
  const noOverflow = (page) =>
    page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  try {
    // --- Desktop: open, browse, filter --------------------------------------------
    {
      const { context, page, button } = await open();
      await capture(page, "Meera Patel · A-118").click();
      await gallery(page).waitFor();
      await page.getByText("Captures · Meera Patel", { exact: true }).waitFor();
      // Only the last 3 days load at first.
      const total = await thumbs(page).count();
      assert.ok(total >= 3 && total <= 20, `three days of captures (${total})`);
      await page
        .getByText("Showing 12–14 Sep · captures are kept for 30 days", {
          exact: true,
        })
        .waitFor();
      await page.getByText(/^\d+ captures · 12–14 Sep$/).waitFor();
      // It opens on the row's own capture: Out at Main Gate, 18:42.
      let text = await selectedText(page);
      assert.match(text, /This record/);
      assert.match(text, /18:42/);
      assert.match(text, /Main Gate · exit camera/);
      assert.equal(
        await thumbs(page).and(page.locator('[aria-selected="true"]')).count(),
        1,
      );
      await settle(page);
      await shot(page, "01-gallery");

      // A thumbnail switches the viewer.
      await thumbs(page).nth(3).click();
      text = await selectedText(page);
      assert.doesNotMatch(text, /This record/);
      const picked = await thumbs(page).nth(3).getAttribute("aria-label");
      assert.ok(
        text.includes(picked.split(", ")[1].split(" ")[0]),
        "viewer shows the picked time",
      );
      // ← → step through the captures.
      await page.keyboard.press("ArrowLeft");
      assert.notEqual(await selectedText(page), text);
      await page.keyboard.press("ArrowRight");
      assert.equal(await selectedText(page), text);
      await settle(page);
      await shot(page, "02-other-capture");

      // Filters keep only one direction.
      await page
        .getByRole("radio", { name: "In captures", exact: true })
        .click();
      const ins = await thumbs(page).count();
      assert.ok(ins > 0 && ins < total);
      for (const label of await thumbs(page).evaluateAll((all) =>
        all.map((t) => t.getAttribute("aria-label")),
      ))
        assert.match(label, /^In at /);
      await page
        .getByRole("radio", { name: "Out captures", exact: true })
        .click();
      assert.equal((await thumbs(page).count()) + ins, total);
      await shot(page, "03-out-only");

      // Earlier days load on request, three at a time.
      await page
        .getByRole("radio", { name: "All captures", exact: true })
        .click();
      await button("Load 3 earlier days").click();
      await page
        .getByText("Showing 9–14 Sep · captures are kept for 30 days", {
          exact: true,
        })
        .waitFor();
      const six = await thumbs(page).count();
      assert.ok(six > total, `more captures after loading (${six})`);
      // → past the oldest loaded capture reads the days before it.
      await thumbs(page).last().click();
      await page.keyboard.press("ArrowRight");
      await page
        .getByText("Showing 6–14 Sep · captures are kept for 30 days", {
          exact: true,
        })
        .waitFor();
      assert.match(await selectedText(page), /, 8 Sep$/m);
      // The grid scrolls to the newly selected capture.
      await page.waitForFunction(() => {
        const grid = document.querySelector(
          '[data-testid="person-gallery-grid"]',
        );
        const thumb = document.querySelector(
          '[data-testid="person-gallery-thumb"][aria-selected="true"]',
        );
        if (!grid || !thumb) return false;
        const g = grid.getBoundingClientRect();
        const t = thumb.getBoundingClientRect();
        return t.top >= g.top - 1 && t.bottom <= g.bottom + 1;
      });
      await settle(page);
      await shot(page, "03b-earlier-days");
      await page.keyboard.press("Escape");
      await gallery(page).waitFor({ state: "detached" });

      // The same person always gets the same captures.
      await capture(page, "Meera Patel · A-118").click();
      assert.equal(await thumbs(page).count(), total);
      await page.keyboard.press("Escape");

      // Other pages keep the single capture preview.
      await page
        .getByRole("tab", { name: "User Attendance", exact: true })
        .click();
      await page
        .getByRole("button", { name: /^View capture for / })
        .filter({ visible: true })
        .first()
        .click();
      await page.getByText("Face capture", { exact: true }).waitFor();
      assert.equal(await gallery(page).count(), 0);
      await page.keyboard.press("Escape");
      assert.ok(await noOverflow(page));
      await context.close();
    }
    // --- The same gallery for Warden and Vizenta Admin ----------------------------------
    for (const [role, scope] of [
      ["warden", "Residential Campus"],
      ["vizenta_admin", "All customers"],
    ]) {
      const { context, page } = await open({ role, scope });
      await capture(page, "Tara Iyer · A-104").click();
      await gallery(page).waitFor();
      assert.match(await selectedText(page), /This record[\s\S]*17:42/);
      await context.close();
    }
    // --- Phone and dark layouts --------------------------------------------------------
    for (const [name, options] of [
      ["04-phone", { viewport: { width: 390, height: 844 } }],
      ["05-dark", { theme: "dark" }],
    ]) {
      const { context, page } = await open(options);
      await capture(page, "Riya Sharma · C-214").click();
      await gallery(page).waitFor();
      assert.match(
        await selectedText(page),
        /Low-light capture/,
        "04:15 is a low-light capture",
      );
      await settle(page);
      assert.ok(await noOverflow(page), name + " has no horizontal overflow");
      await shot(page, name);
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log(
      "Person gallery: open, browse, keys, filters, other pages unchanged, roles, phone and dark layouts passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
