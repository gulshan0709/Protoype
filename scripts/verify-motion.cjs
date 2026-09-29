// Checks motion (src/shared/motion/README.md): the branded launch waits for
// fonts, auth steps, workspace pages, dialogs and phone sheets animate in,
// rapid navigation settles, and reduced motion (live or at launch) keeps
// everything static. Screenshots and motion-results.json are saved to qa/.
//
//   npm run test:motion
const assert = require("node:assert/strict");
const {
  PHONE,
  baseUrl,
  button,
  field,
  main,
  qaDir,
  shooter,
  watch,
  writeResults,
} = require("./lib/qa.cjs");
const base = baseUrl("http://127.0.0.1:8082");

// Clicks a button and samples the opacity and transform of `testID` for 500 ms.
async function sampleTransition(page, name, testID) {
  return button(page, name).evaluate(async (element, id) => {
    const frames = [];
    const started = performance.now();
    element.click();
    await new Promise((resolve) => {
      const frame = () => {
        const target = document.querySelector(`[data-testid="${id}"]`);
        if (target) {
          const style = getComputedStyle(target);
          frames.push({
            opacity: Number(style.opacity),
            transform: style.transform,
          });
        }
        if (performance.now() - started < 500) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    return frames;
  }, testID);
}
function entered(frames, label) {
  assert.ok(
    frames.some((f) => f.opacity < 0.99),
    `${label}: entrance animated`,
  );
  assert.equal(
    frames.at(-1).opacity,
    1,
    `${label}: fully visible after transition`,
  );
}
// Holds real font readiness briefly to exercise the actual startup state.
const slowFonts = (page, ms) =>
  page.route("**/*.otf", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });

main(async (browser) => {
  const shot = shooter(qaDir());
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const errors = watch(page);
  const launch = page.getByTestId("launch-screen");
  const dialogPanel = page.getByTestId("dialog-transition");
  await slowFonts(page, 700);
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await launch.waitFor();
  await shot(page, "launch-animation");
  await launch.waitFor({ state: "detached" });
  await page.unroute("**/*.otf");
  entered(
    await sampleTransition(page, "Signup here", "auth-page-transition"),
    "Login to signup",
  );
  await field(page, "First Name *").fill("Motion Preview");
  await field(page, "Mobile Number *").fill("9876543210");
  await field(page, "Email *").fill("motion@example.com");
  await field(page, "Password *").fill("Preview123!");
  await field(page, "Confirm Password *").fill("Preview123!");
  entered(
    await sampleTransition(page, "Continue", "auth-page-transition"),
    "Signup verification step",
  );
  entered(
    await sampleTransition(page, "Back to form", "auth-page-transition"),
    "Back to signup details",
  );
  assert.equal(
    await field(page, "First Name *").inputValue(),
    "Motion Preview",
    "Animation preserves form state",
  );
  await button(page, "Login here").click();
  await button(page, "Explore workspace").click();
  entered(
    await sampleTransition(
      page,
      "Open North Campus",
      "workspace-page-transition",
    ),
    "Workspace to record",
  );
  await button(page, "Back to records").click();
  entered(
    await sampleTransition(page, "Profile and settings", "dialog-transition"),
    "Dialog entrance",
  );
  await page.keyboard.press("Escape");
  await dialogPanel.waitFor({ state: "detached" });
  // Interrupt page entrances by going back as soon as the record mounts.
  for (let i = 0; i < 3; i++) {
    await button(page, "Open North Campus").evaluate((el) => el.click());
    await button(page, "Back to records").evaluate((el) => el.click());
  }
  await page.waitForFunction(
    () =>
      Number(
        getComputedStyle(
          document.querySelector('[data-testid="workspace-page-transition"]'),
        ).opacity,
      ) === 1,
  );
  assert.ok(
    await button(page, "Open North Campus").isVisible(),
    "Rapid navigation settles on the latest page",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedFrames = await sampleTransition(
    page,
    "Open North Campus",
    "workspace-page-transition",
  );
  assert.ok(
    reducedFrames.length && reducedFrames.every((f) => f.opacity === 1),
    "Live reduced-motion changes disable page animation",
  );
  assert.ok(
    reducedFrames.every(
      (f) =>
        f.transform === "none" || f.transform === "matrix(1, 0, 0, 1, 0, 0)",
    ),
    "Reduced motion has no translation",
  );
  await page.setViewportSize(PHONE);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  entered(
    await sampleTransition(page, "Profile and settings", "dialog-transition"),
    "Mobile sheet entrance",
  );
  await page.keyboard.press("Escape");
  await dialogPanel.waitFor({ state: "detached" });
  await page.goto(`${base}/login`);
  await launch.waitFor({ state: "detached" });
  const reducedContext = await browser.newContext({ reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  watch(reducedPage, errors);
  await slowFonts(reducedPage, 650);
  await reducedPage.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await reducedPage.getByTestId("launch-screen").waitFor();
  const transforms = await reducedPage
    .getByTestId("launch-screen")
    .getByTestId("launch-loading-light")
    .evaluate(async (el) => {
      const initial = getComputedStyle(el).transform;
      await new Promise((resolve) => setTimeout(resolve, 100));
      return [initial, getComputedStyle(el).transform];
    });
  assert.equal(
    transforms[0],
    transforms[1],
    "Reduced-motion launch indicator stays static",
  );
  await reducedPage.getByTestId("launch-screen").waitFor({ state: "detached" });
  const staticFrames = await sampleTransition(
    reducedPage,
    "Signup here",
    "auth-page-transition",
  );
  assert.ok(
    staticFrames.length && staticFrames.every((f) => f.opacity === 1),
    "Reduced-motion auth navigation stays static",
  );
  assert.deepEqual(errors, []);
  writeResults(
    "motion-results.json",
    [
      "branded launch waits for real font readiness",
      "launch overlay dismisses",
      "auth navigation and verification steps animate",
      "form state preserved",
      "rapid navigation interrupts and settles correctly",
      "workspace record navigation animates",
      "desktop dialog and mobile sheet animate",
      "Escape dismissal remains responsive",
      "live reduced-motion updates",
      "static reduced-motion launch and navigation",
    ],
    errors,
  );
  console.log("Motion checks passed");
});
