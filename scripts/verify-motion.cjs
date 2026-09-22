const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const base = process.env.VIZENTA_QA_URL || "http://127.0.0.1:8082";
const output = path.resolve(__dirname, "../qa");
fs.mkdirSync(output, { recursive: true });

async function sampleTransition(page, button, testID) {
  return page
    .getByRole("button", { name: button, exact: true })
    .evaluate(async (element, id) => {
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
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // Hold real font readiness briefly to exercise the actual startup state.
    await page.route("**/*.otf", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.continue();
    });
    await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("launch-screen").waitFor();
    await page.screenshot({ path: path.join(output, "launch-animation.png") });
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await page.unroute("**/*.otf");
    entered(
      await sampleTransition(page, "Signup here", "auth-page-transition"),
      "Login to signup",
    );
    await page
      .getByLabel("First Name *", { exact: true })
      .fill("Motion Preview");
    await page
      .getByLabel("Mobile Number *", { exact: true })
      .fill("9876543210");
    await page
      .getByLabel("Email *", { exact: true })
      .fill("motion@example.com");
    await page.getByLabel("Password *", { exact: true }).fill("Preview123!");
    await page
      .getByLabel("Confirm Password *", { exact: true })
      .fill("Preview123!");
    entered(
      await sampleTransition(page, "Continue", "auth-page-transition"),
      "Signup verification step",
    );
    entered(
      await sampleTransition(page, "Back to form", "auth-page-transition"),
      "Back to signup details",
    );
    assert.equal(
      await page.getByLabel("First Name *", { exact: true }).inputValue(),
      "Motion Preview",
      "Animation preserves form state",
    );
    await page.getByRole("button", { name: "Login here", exact: true }).click();
    await page
      .getByRole("button", { name: "Explore workspace", exact: true })
      .click();
    entered(
      await sampleTransition(
        page,
        "Open North Campus",
        "workspace-page-transition",
      ),
      "Workspace to record",
    );
    await page
      .getByRole("button", { name: "Back to records", exact: true })
      .click();
    entered(
      await sampleTransition(page, "Profile and settings", "dialog-transition"),
      "Dialog entrance",
    );
    await page.keyboard.press("Escape");
    await page.getByTestId("dialog-transition").waitFor({ state: "detached" });
    // Interrupt page entrances by going back as soon as the record mounts.
    for (let i = 0; i < 3; i++) {
      await page
        .getByRole("button", { name: "Open North Campus", exact: true })
        .evaluate((el) => el.click());
      await page
        .getByRole("button", { name: "Back to records", exact: true })
        .evaluate((el) => el.click());
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
      await page
        .getByRole("button", { name: "Open North Campus", exact: true })
        .isVisible(),
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
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    entered(
      await sampleTransition(page, "Profile and settings", "dialog-transition"),
      "Mobile sheet entrance",
    );
    await page.keyboard.press("Escape");
    await page.getByTestId("dialog-transition").waitFor({ state: "detached" });
    await page.goto(`${base}/login`);
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    const reducedContext = await browser.newContext({
      reducedMotion: "reduce",
    });
    const reducedPage = await reducedContext.newPage();
    reducedPage.on("pageerror", (error) => errors.push(error.message));
    await reducedPage.route("**/*.otf", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 650));
      await route.continue();
    });
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
    await reducedPage
      .getByTestId("launch-screen")
      .waitFor({ state: "detached" });
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
    fs.writeFileSync(
      path.join(output, "motion-results.json"),
      JSON.stringify(
        {
          status: "passed",
          checks: [
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
          runtimeErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log("Motion checks passed");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
