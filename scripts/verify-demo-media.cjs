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
    const qa = (name) => require("node:path").join(__dirname, "..", "qa", name);
    const base = process.env.BASE_URL || "http://localhost:8083";
    // The HD still is a whole 16:9 frame whose "(DEMO)" label lies inside it.
    async function stillFrame(title, scope = page) {
      const img = scope.locator(`img[alt="Capture for ${title}"]`).filter({ visible: true }).first();
      const frame = scope.locator(`[aria-label="Capture for ${title}"]`).filter({ visible: true }).first();
      await frame.waitFor();
      await page.waitForFunction(
        (alt) => [...document.images].some((i) => i.alt === alt && i.naturalWidth >= 1280),
        "Capture for " + title,
      );
      const src = await img.evaluate((i) => i.src);
      const outer = await frame.boundingBox();
      assert.ok(Math.abs(outer.width / outer.height - 16 / 9) < 0.02, "16:9 frame for " + title);
      const label = scope.getByText(/^(THREAT|IDENTIFIED|VISITOR|UNIDENTIFIED) \(DEMO\)$/).filter({ visible: true }).first();
      const box = await label.boundingBox();
      assert.ok(
        box.x >= outer.x - 1 && box.y >= outer.y - 1 &&
          box.x + box.width <= outer.x + outer.width + 1 &&
          box.y + box.height <= outer.y + outer.height + 1,
        "label inside the frame for " + title,
      );
      return { src, still: /still-(\w+)\./.exec(src)?.[1], label: await label.innerText() };
    }
    async function avatar(title) {
      const name = title.split(" · ")[0];
      const img = page.locator(`img[alt="${name} profile image"]`).filter({ visible: true });
      return (await img.count()) ? /demo-(man|woman)/.exec(await img.first().evaluate((i) => i.src))?.[1] : undefined;
    }
    // Reported record: Rohan Rao, a man, must get a man's still with the whole box and label.
    await page.goto(
      base + "/?type=product&name=Gate&tab=User%20Attendance&record=ca-ATT-security_admin-gate-history-1-04",
      { waitUntil: "domcontentloaded", timeout: 60000 },
    );
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await b("Explore workspace").click();
    const rohan = await stillFrame("Rohan Rao · VIS-9457");
    assert.match(rohan.still, /^m/, "Rohan Rao shows a man's capture");
    assert.equal(rohan.label, "VISITOR (DEMO)");
    await page.screenshot({ path: qa("media-detail-man.png") });
    await b("Back to records").click();
    // First 12 people on User Attendance: distinct stills, gender matches the avatar.
    const seen = new Map();
    let womanShot = false;
    for (let i = 0; i < 12; i++) {
      await tab("User Attendance").click();
      if (i >= 10) await page.getByRole("button", { name: "Next", exact: true }).last().click();
      const open = page.getByRole("button", { name: /^Open / }).filter({ visible: true }).nth(i % 10);
      const title = (await open.getAttribute("aria-label")).replace(/^Open /, "");
      await open.click();
      const shot = await stillFrame(title);
      const face = await avatar(title);
      if (face) assert.equal(shot.still[0], face[0], title + " capture matches avatar gender");
      if (face === "woman" && !womanShot) {
        womanShot = true;
        await page.screenshot({ path: qa("media-detail-woman.png") });
      }
      seen.set(title, shot.still);
      await b("Back to records").click();
    }
    console.log([...seen].map(([t, s]) => s + "  " + t).join("\n"));
    assert.ok(new Set(seen.values()).size >= 6, "at least 6 distinct stills across 12 people");
    await tab("User Attendance").click();
    await page.screenshot({ path: qa("media-user-attendance.png") });
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
      await page.waitForFunction(() => [...document.images].some(image =>
        /demo-(man|woman)/.test(image.src) && image.naturalWidth >= 1024));
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
    assert.deepEqual(await video.evaluate(v => [v.videoWidth, v.videoHeight]), [1920, 1080]);
    for (const label of ["Threat", "Identified", "Visitor", "Unidentified"])
      assert.ok(await page.getByText(label, { exact: true }).count(), label + " legend");
    // Threat preview: the whole frame with the yellow THREAT box and label visible.
    const threat = page.getByRole("button", { name: /^View capture for Potential match/ }).filter({ visible: true }).first();
    for (const camera of ["CAM-007", "CAM-041", "CAM-012"]) {
      if (await threat.count()) break;
      await page.getByText(camera, { exact: true }).filter({ visible: true }).first().click();
    }
    const threatTitle = (await threat.getAttribute("aria-label")).replace(/^View capture for /, "");
    await threat.click();
    const threatShot = await stillFrame(threatTitle, page.getByTestId("dialog-transition").filter({ visible: true }));
    assert.equal(threatShot.label, "THREAT (DEMO)");
    await page.screenshot({ path: qa("media-threat-preview.png") });
    await page.keyboard.press("Escape");
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
