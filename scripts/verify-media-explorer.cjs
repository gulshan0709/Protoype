// Checks Vizenta Admin → Media Explorer (Education): drill from customer to
// camera, date and time slot; frame paging, the virtualised grid, lightbox,
// density, slot rail, breadcrumb and Back; scope denial; phone and dark layouts.
//
//   npm run test:media-explorer
//
// VIZENTA_QA_URL overrides the default http://localhost:8083. Screenshots are
// saved to qa/media-explorer/.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const base = (process.env.VIZENTA_QA_URL || "http://localhost:8083").replace(
  /\/$/,
  "",
);
const output = path.resolve(__dirname, "../qa/media-explorer");
fs.mkdirSync(output, { recursive: true });
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const dayLabel = (d) =>
  `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const yesterday = new Date(Date.now() - 86400000);
const where =
  "/?" +
  new URLSearchParams({
    type: "org",
    name: "Media Explorer",
    tab: "Camera Frames",
  });

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const open = async ({
    scope = "All customers",
    role = "vizenta_admin",
    theme = "light",
    viewport = { width: 1512, height: 982 },
    url = where,
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
    await page.goto(base + url, {
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
    await button("Profile and settings").waitFor();
    return { context, page, button };
  };
  const shot = (page, name) =>
    page.screenshot({ path: path.join(output, name + ".png") });
  // Stack screens stay mounted while hidden, so only visible matches count.
  const text = (page, value) =>
    page
      .getByText(value, { exact: typeof value === "string" })
      .filter({ visible: true })
      .first();
  const cards = (page) =>
    page.getByTestId("media-folder").filter({ visible: true });
  const tiles = (page) =>
    page.getByTestId("media-frame-tile").filter({ visible: true });
  // Every visible frame image under a test id has loaded and been painted.
  const imagesLoaded = async (page, testId) => {
    await page.waitForFunction(
      (id) => {
        const holders = [
          ...document.querySelectorAll(`[data-testid="${id}"]`),
        ].filter((el) => el.checkVisibility());
        const loaded = (el) =>
          [...el.querySelectorAll("img")].some(
            (img) => img.complete && img.naturalWidth > 0,
          );
        return holders.length > 0 && holders.every(loaded);
      },
      testId,
      { timeout: 30000 },
    );
    await page.evaluate(
      () =>
        new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(done)),
        ),
    );
  };
  const noOverflow = (page) =>
    page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  try {
    // --- Desktop walk-through --------------------------------------------------
    {
      const { context, page, button } = await open();
      await page.getByTestId("media-explorer").waitFor();
      assert.equal(await button("Media Explorer").count(), 1, "sidebar entry");
      assert.equal(await cards(page).count(), 2);
      await text(page, "Pick an organization").waitFor();
      await shot(page, "01-customers");

      await button("Open organization Northbridge Education").click();
      await text(page, "Pick a camera").waitFor();
      assert.equal(await cards(page).count(), 6);
      await text(page, /^Not active · last frames/)
        .first()
        .waitFor();
      await page.getByLabel("Search cameras", { exact: true }).fill("gate");
      await page.waitForTimeout(200);
      assert.equal(await cards(page).count(), 2, "search narrows the cameras");
      await page.getByLabel("Search cameras", { exact: true }).fill("");
      await shot(page, "02-cameras");

      await button(
        "Open camera CAM-MG-IN1 · Main Gate · Lane 1 (Entry)",
      ).click();
      await text(page, "Pick a date").waitFor();
      assert.equal(await cards(page).count(), 7);
      // Newest first: today leads.
      assert.match(await cards(page).first().innerText(), /Today/);
      await button("Newest first").waitFor();
      await shot(page, "03-dates");

      await button(`Open date ${dayLabel(yesterday)}`).click();
      await text(page, "Pick a time slot").waitFor();
      assert.ok(
        (await cards(page).count()) > 30,
        "a 24-hour gate camera has most slots",
      );
      await button("Open time slot 8:00 AM – 8:30 AM").click();

      // --- Leaf: frames -------------------------------------------------------------
      await tiles(page).first().waitFor();
      assert.match(page.url(), /slot=080000/);
      await text(page, "250 frames loaded").waitFor();
      await text(page, "More available").waitFor();
      const mounted = await tiles(page).count();
      assert.ok(
        mounted > 8 && mounted < 120,
        `only visible rows are mounted (${mounted})`,
      );
      await text(page, "250+ loaded").waitFor();
      await page.getByTestId("media-slot-rail").waitFor();
      await imagesLoaded(page, "media-frame-tile");
      await shot(page, "04-frames");

      // Recordings appear on some slots; when present they play in a dialog.
      const recording = page
        .getByTestId("media-recording")
        .filter({ visible: true });
      if (await recording.count()) {
        await recording.first().click();
        await page.locator("video").first().waitFor();
        await page.keyboard.press("Escape");
      }

      await tiles(page).first().click();
      const box = page.getByTestId("media-lightbox");
      await box.waitFor();
      await box.getByText("1 of 250+ loaded", { exact: true }).waitFor();
      await page.keyboard.press("ArrowRight");
      await box.getByText("2 of 250+ loaded", { exact: true }).waitFor();
      await box.getByText(/Northbridge Education\s+·\s+CAM-MG-IN1/).waitFor();
      await imagesLoaded(page, "media-lightbox");
      await shot(page, "05-lightbox");
      await page.keyboard.press("Escape");
      await box.waitFor({ state: "detached" });

      await button("Load next 250 frames").click();
      await text(page, /^(500|[2-4]\d\d) frames loaded$/).waitFor();

      const width = async () => (await tiles(page).first().boundingBox()).width;
      const medium = await width();
      await page
        .getByRole("radio", { name: "Small tiles", exact: true })
        .click();
      await page.waitForTimeout(200);
      assert.ok((await width()) < medium, "small density shrinks tiles");
      await imagesLoaded(page, "media-frame-tile");
      await shot(page, "06-small-tiles");

      // Slot rail walks the day without going back up.
      await button("Time slot 8:30 AM – 9:00 AM").click();
      await page.waitForURL(/slot=083000/);
      await text(page, "250 frames loaded").waitFor();
      await page.goBack();
      await page.waitForURL(/slot=080000/);
      await tiles(page).first().waitFor();

      // Breadcrumb: the camera crumb goes back to choosing a camera.
      await button("Camera: CAM-MG-IN1 · Main Gate · Lane 1 (Entry)").click();
      await text(page, "Pick a camera").waitFor();
      assert.ok(await noOverflow(page));
      await context.close();
    }
    // --- Scope: another customer's link resolves to what the scope allows -----------
    {
      const leaf =
        where +
        "&" +
        new URLSearchParams({
          org: "org_1042",
          camera: "102430115541",
          date: "20260101",
          slot: "080000",
        });
      const { context, page } = await open({
        scope: "Eastgate University",
        url: leaf,
      });
      await text(page, "Pick an organization").waitFor();
      assert.equal(await cards(page).count(), 1);
      assert.match(
        await cards(page).first().innerText(),
        /Eastgate University/,
      );
      await context.close();
    }
    // --- Other roles do not get the page ------------------------------------------
    {
      const { context, page, button } = await open({
        role: "customer_admin",
        scope: "Across campuses",
      });
      assert.equal(await button("Media Explorer").count(), 0);
      await text(page, "This view isn't available").waitFor();
      await context.close();
    }
    // --- Phone and dark layouts ----------------------------------------------------
    // The lobby camera is off on Sundays: use the latest Monday–Saturday before today.
    const d = new Date(yesterday);
    if (d.getDay() === 0) d.setDate(d.getDate() - 1);
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const leaf =
      where +
      "&" +
      new URLSearchParams({
        org: "org_1088",
        camera: "1031113185541",
        date,
        slot: "100000",
      });
    for (const [name, options] of [
      ["07-phone-frames", { viewport: { width: 390, height: 844 }, url: leaf }],
      [
        "08-phone-cameras",
        { viewport: { width: 390, height: 844 }, url: where + "&org=org_1088" },
      ],
      ["09-dark-frames", { theme: "dark", url: leaf }],
    ]) {
      const { context, page } = await open(options);
      await page.getByTestId("media-explorer").waitFor();
      if (name.includes("frames")) {
        await tiles(page).first().waitFor();
        await imagesLoaded(page, "media-frame-tile");
      } else await cards(page).first().waitFor();
      assert.ok(await noOverflow(page), name + " has no horizontal overflow");
      await shot(page, name);
      if (name === "07-phone-frames") {
        await tiles(page).first().click();
        await page.getByTestId("media-lightbox").waitFor();
        await imagesLoaded(page, "media-lightbox");
        await shot(page, "10-phone-lightbox");
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log(
      "Media Explorer: drill-down, scope, paging, lightbox, density, slot rail, Back, phone and dark layouts passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
