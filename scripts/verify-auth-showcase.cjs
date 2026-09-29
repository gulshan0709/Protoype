// Checks the login showcase (src/features/workspace/model/authUseCases.ts):
// both slide images load, autoplay, desktop selectors, a manual choice holds,
// resume, keyboard selection, the logo inside the image panel, preserved
// fields, phone auto-only rotation and reduced motion. Screenshots are saved to
// qa/ (showcase-desktop-*.png, showcase-mobile-*.png).
//
//   npm run test:showcase
const assert = require("node:assert/strict");
const {
  PHONE,
  baseUrl,
  button,
  field,
  main,
  qaDir,
  shooter,
  waitForLogin,
  watch,
} = require("./lib/qa.cjs");
const base = baseUrl("http://127.0.0.1:8082");
// [id, selector label] in rotation order; the first one opens.
const slides = [
  ["enterprise", "Enterprise"],
  ["education", "Education"],
];
const [first] = slides[0];
const [last] = slides.at(-1);

main(async (browser) => {
  const shot = shooter(qaDir());
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "no-preference",
  });
  const errors = watch(page);
  await page.goto(base + "/login");
  await waitForLogin(page);
  await page.waitForFunction(
    (count) =>
      [...document.querySelectorAll('[data-testid^="auth-slide-"] img')].filter(
        (image) => image.complete && image.naturalWidth > 0,
      ).length === count,
    slides.length,
  );
  const preview = (label) => button(page, "Preview " + label);
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
  const waitForSlide = (id) =>
    page.waitForFunction((id) => {
      const image = document.querySelector(
        '[data-testid="auth-slide-' + id + '"]',
      );
      return (
        image &&
        image.getAttribute("aria-hidden") !== "true" &&
        Number(getComputedStyle(image).opacity) > 0.99
      );
    }, id);
  // Idle past one 4 s interval with the pointer and focus off the selectors.
  const idle = async () => {
    await field(page, "User Id").focus();
    await page.mouse.move(1300, 20);
    await page.waitForTimeout(4400);
  };
  await field(page, "User Id").fill("review@example.com");
  await field(page, "Password").fill("Preview123!");
  await page.mouse.move(1300, 20);
  await page.waitForTimeout(4400);
  assert.equal(
    await selected(),
    slides[1][0],
    "Auto rotation advances to the next slide",
  );
  for (const [id, label] of slides) {
    await preview(label).click();
    await waitForSlide(id);
    assert.equal(await selected(), id);
    assert.equal(await preview(label).getAttribute("aria-pressed"), "true");
    assert.equal(await button(page, "Play slideshow").count(), 1);
    await shot(page, "showcase-desktop-" + id);
  }
  await idle();
  assert.equal(await selected(), last, "Manual selection holds");
  await button(page, "Play slideshow").click();
  await idle();
  assert.equal(
    await selected(),
    first,
    "Resume cycles back to the first slide",
  );
  await button(page, "Pause slideshow").click();
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
  assert.equal(await field(page, "User Id").inputValue(), "review@example.com");
  assert.equal(await field(page, "Password").inputValue(), "Preview123!");
  await page.setViewportSize(PHONE);
  await page
    .getByRole("toolbar", { name: "Preview a solution" })
    .waitFor({ state: "detached" });
  assert.equal(
    await page
      .getByRole("button", { name: /^(Play|Pause) slideshow$/ })
      .count(),
    0,
  );
  // Phones rotate on their own, from the selected slide round to the one before it.
  await page.mouse.move(100, 100);
  const start = slides.findIndex(([id]) => id === "education");
  const cycle = [...slides.slice(start), ...slides.slice(0, start)];
  for (const [id] of cycle) {
    await waitForSlide(id);
    await shot(page, "showcase-mobile-" + id);
  }
  const [held] = cycle.at(-1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(100);
  await field(page, "User Id").focus();
  await page.waitForTimeout(4400);
  assert.equal(
    await selected(),
    held,
    "Reduced motion prevents automatic rotation",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Both slide images, desktop selectors, mobile auto-only slideshow, autoplay, manual hold, resume, keyboard, logo placement, preserved fields and reduced motion passed.",
  );
});
