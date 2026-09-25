const assert = require("node:assert/strict");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1512, height: 982 },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const b = (name) => page.getByRole("button", { name, exact: true });
    const tab = (name) => page.getByRole("tab", { name, exact: true });
    await page.goto("http://localhost:8083", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await b("Explore workspace").click();
    await b("Gate").click();
    for (const name of ["User Attendance", "In/Out"]) {
      await tab(name).click();
      await page
        .getByRole("button", { name: /^View capture for / })
        .filter({ visible: true })
        .first()
        .click();
      await page
        .getByTestId("dialog-transition")
        .filter({ visible: true })
        .getByRole("img")
        .first()
        .waitFor();
      await page.keyboard.press("Escape");
    }
    await b("Shield").click();
    await tab("Surveillance Dashboard").click();
    let video = page.locator("video").filter({ visible: true }).first();
    await video.waitFor();
    await video.evaluate(async (v) => {
      await v.play();
    });
    await page.waitForFunction(() =>
      [...document.querySelectorAll("video")].some((v) => v.currentTime > 0.2),
    );
    await video.evaluate((v) => v.pause());
    await tab("Surveillance Attendance").click();
    await page
      .getByRole("button", { name: /^View capture for / })
      .filter({ visible: true })
      .first()
      .click();
    await page.keyboard.press("Escape");
    await tab("Video Analytics").click();
    await page
      .getByRole("button", { name: /^Play recording for / })
      .filter({ visible: true })
      .first()
      .click();
    video = page
      .getByTestId("dialog-transition")
      .filter({ visible: true })
      .locator("video");
    await video.evaluate(async (v) => {
      await v.play();
    });
    await page.waitForFunction(() =>
      [...document.querySelectorAll("video")].some((v) => v.currentTime > 0.2),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator("video").filter({ visible: true }).count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "All five media views, photo previews, actual video playback, close and mobile passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
