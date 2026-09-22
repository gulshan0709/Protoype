const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.VIZENTA_QA_URL || "http://127.0.0.1:8082";
const slides = [
  ["corporate", "Corporate"],
  ["education", "Education"],
  ["retail", "Retail"],
  ["manufacturing", "Warehouse & Manufacturing"],
];
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
      reducedMotion: "no-preference",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/login");
    await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await page.waitForFunction(
      () =>
        [
          ...document.querySelectorAll('[data-testid^="auth-slide-"] img'),
        ].filter((image) => image.complete && image.naturalWidth > 0).length ===
        4,
    );
    const preview = (label) =>
      page.getByRole("button", { name: "Preview " + label, exact: true });
    const selected = async () => {
      for (const [id] of slides)
        if (
          await page
            .getByTestId("auth-slide-" + id)
            .evaluate(
              (el) =>
                Number(getComputedStyle(el).opacity) > 0.99 &&
                el.getAttribute("aria-hidden") !== "true",
            )
        )
          return id;
    };
    const waitForSlide = async (id) => {
      await page.waitForFunction((id) => {
        const image = document.querySelector(
          '[data-testid="auth-slide-' + id + '"]',
        );
        return (
          image &&
          image.getAttribute("aria-hidden") !== "true" &&
          Number(getComputedStyle(image).opacity) > 0.99
        );
      }, id);
    };
    await page
      .getByLabel("User Id", { exact: true })
      .fill("review@example.com");
    await page.getByLabel("Password", { exact: true }).fill("Preview123!");
    await page.mouse.move(1300, 20);
    await page.waitForTimeout(4400);
    assert.equal(
      await selected(),
      "education",
      "Auto rotation advances to education",
    );
    for (const [id, label] of slides) {
      await preview(label).click();
      await waitForSlide(id);
      assert.equal(await selected(), id);
      assert.equal(await preview(label).getAttribute("aria-pressed"), "true");
      assert.equal(
        await page
          .getByRole("button", { name: "Play slideshow", exact: true })
          .count(),
        1,
      );
      await page.screenshot({ path: "qa/showcase-desktop-" + id + ".png" });
    }
    await page.getByLabel("User Id", { exact: true }).focus();
    await page.mouse.move(1300, 20);
    await page.waitForTimeout(4400);
    assert.equal(await selected(), "manufacturing", "Manual selection holds");
    await page
      .getByRole("button", { name: "Play slideshow", exact: true })
      .click();
    await page.getByLabel("User Id", { exact: true }).focus();
    await page.mouse.move(1300, 20);
    await page.waitForTimeout(4400);
    assert.equal(
      await selected(),
      "corporate",
      "Resume cycles back to corporate",
    );
    await page
      .getByRole("button", { name: "Pause slideshow", exact: true })
      .click();
    await preview("Education").focus();
    await page.keyboard.press("Enter");
    await waitForSlide("education");
    assert.equal(await selected(), "education", "Keyboard selection works");
    const logo = await page.getByTestId("auth-image-logo").boundingBox();
    const panel = await page.getByTestId("auth-brand-panel").boundingBox();
    assert.ok(
      logo.x >= panel.x && logo.x + logo.width <= panel.x + panel.width,
      "Logo stays inside image panel",
    );
    assert.equal(
      await page.getByLabel("User Id", { exact: true }).inputValue(),
      "review@example.com",
    );
    assert.equal(
      await page.getByLabel("Password", { exact: true }).inputValue(),
      "Preview123!",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("toolbar", { name: "Preview an industry" })
      .waitFor({ state: "detached" });
    assert.equal(
      await page
        .getByRole("button", { name: /^(Play|Pause) slideshow$/ })
        .count(),
      0,
    );
    await page.mouse.move(100, 100);
    for (const id of ["education", "retail", "manufacturing", "corporate"]) {
      await waitForSlide(id);
      await page.screenshot({ path: "qa/showcase-mobile-" + id + ".png" });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(100);
    await page.getByLabel("User Id", { exact: true }).focus();
    await page.waitForTimeout(4400);
    assert.equal(
      await selected(),
      "corporate",
      "Reduced motion prevents automatic rotation",
    );
    assert.deepEqual(errors, []);
    console.log(
      "All four images, desktop selectors, mobile auto-only slideshow, autoplay, manual hold, resume, keyboard, logo placement, preserved fields and reduced motion passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
