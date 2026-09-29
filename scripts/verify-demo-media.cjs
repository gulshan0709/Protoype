// Checks demo media: a person's record shows a whole 16:9 HD capture still
// with its "(DEMO)" label inside the frame, the still matches the gender of
// the person's portrait and people get varied stills, capture previews open
// on Gate, the Shield dashboard and video analytics play real recordings, the
// threat preview is labelled, and the phone layout fits. Screenshots are saved
// to qa/ (media-*.png).
//
//   npm run test:demo-media
const assert = require("node:assert/strict");
const {
  PHONE,
  dialog,
  main,
  noOverflow,
  open,
  qaDir,
  route,
  rows,
  shooter,
  tab,
} = require("./lib/qa.cjs");
const shot = shooter(qaDir());
// The pool portrait's id and the capture still's id both carry the gender:
// people/sa-w-12.jpg (w/m) and still-w3.jpg (w/m).
const genderOf = (src, pattern) => pattern.exec(decodeURIComponent(src))?.[1];
const PORTRAIT = /(?:sa|in)-([wm])-\d\d\b/;
const STILL = /still-([wm])\d+\./;

main(async (browser) => {
  // Reported record: Rohan Rao, a man, must get a man's still with the whole box and label.
  const { page, button, errors } = await open(browser, {
    url:
      route({ type: "product", name: "Gate", tab: "User Attendance" }) +
      "&record=ca-ATT-security_admin-gate-history-1-04",
    consoleErrors: true,
  });
  // The HD still is a whole 16:9 frame whose "(DEMO)" label lies inside it.
  const stillFrame = async (title, scope = page) => {
    const alt = "Capture for " + title;
    const img = scope
      .locator(`img[alt="${alt}"]`)
      .filter({ visible: true })
      .first();
    const frame = scope
      .locator(`[aria-label="${alt}"]`)
      .filter({ visible: true })
      .first();
    await frame.waitFor();
    await page.waitForFunction(
      (alt) =>
        [...document.images].some(
          (i) => i.alt === alt && i.naturalWidth >= 1280,
        ),
      alt,
    );
    const src = await img.evaluate((i) => i.src);
    const outer = await frame.boundingBox();
    assert.ok(
      Math.abs(outer.width / outer.height - 16 / 9) < 0.02,
      "16:9 frame for " + title,
    );
    const label = scope
      .getByText(/^(THREAT|IDENTIFIED|VISITOR|UNIDENTIFIED) \(DEMO\)$/)
      .filter({ visible: true })
      .first();
    const box = await label.boundingBox();
    assert.ok(
      box.x >= outer.x - 1 &&
        box.y >= outer.y - 1 &&
        box.x + box.width <= outer.x + outer.width + 1 &&
        box.y + box.height <= outer.y + outer.height + 1,
      "label inside the frame for " + title,
    );
    return {
      still: /still-(\w+)\./.exec(src)?.[1],
      gender: genderOf(src, STILL),
      label: await label.innerText(),
    };
  };
  // Gender of the person's pool portrait on the record, if they have one.
  const portraitGender = async (title) => {
    const img = page
      .locator(`img[alt="${title.split(" · ")[0]} profile image"]`)
      .filter({ visible: true });
    return (await img.count())
      ? genderOf(await img.first().evaluate((i) => i.src), PORTRAIT)
      : undefined;
  };
  const rohan = await stillFrame("Rohan Rao · VIS-9457");
  assert.equal(rohan.gender, "m", "Rohan Rao shows a man's capture");
  assert.equal(rohan.label, "VISITOR (DEMO)");
  await shot(page, "media-detail-man");
  await button("Back to records").click();
  // First 12 people on User Attendance: distinct stills, gender matches the portrait.
  const seen = new Map();
  let womanShot = false;
  for (let i = 0; i < 12; i++) {
    await tab(page, "User Attendance").click();
    if (i >= 10) await button("Next").last().click();
    const row = rows(page).nth(i % 10);
    const title = (await row.getAttribute("aria-label")).replace(/^Open /, "");
    await row.click();
    const capture = await stillFrame(title);
    const face = await portraitGender(title);
    if (face)
      assert.equal(capture.gender, face, title + " capture matches portrait");
    if (face === "w" && !womanShot) {
      womanShot = true;
      await shot(page, "media-detail-woman");
    }
    seen.set(title, capture.still);
    await button("Back to records").click();
  }
  console.log([...seen].map(([t, s]) => s + "  " + t).join("\n"));
  assert.ok(
    new Set(seen.values()).size >= 6,
    "at least 6 distinct stills across 12 people",
  );
  await tab(page, "User Attendance").click();
  await shot(page, "media-user-attendance");
  await button("Gate").click();
  // Capture previews open with their image (In/Out opens the person's gallery).
  for (const name of ["User Attendance", "In/Out"]) {
    await tab(page, name).click();
    await page
      .getByRole("button", { name: /^View capture for / })
      .filter({ visible: true })
      .first()
      .click();
    await dialog(page).getByRole("img").first().waitFor();
    await page.keyboard.press("Escape");
  }
  await button("Shield").click();
  await tab(page, "Surveillance Dashboard").click();
  let video = page.locator("video").filter({ visible: true }).first();
  await video.waitFor();
  await video.evaluate((v) => v.play());
  await page.waitForFunction(() =>
    [...document.querySelectorAll("video")].some((v) => v.currentTime > 0.2),
  );
  await video.evaluate((v) => v.pause());
  assert.deepEqual(
    await video.evaluate((v) => [v.videoWidth, v.videoHeight]),
    [1920, 1080],
  );
  for (const label of ["Threat", "Identified", "Visitor", "Unidentified"])
    assert.ok(
      await page.getByText(label, { exact: true }).count(),
      label + " legend",
    );
  // Threat preview: the whole frame with the yellow THREAT box and label visible.
  const threat = page
    .getByRole("button", { name: /^View capture for Potential match/ })
    .filter({ visible: true })
    .first();
  for (const camera of ["CAM-007", "CAM-041", "CAM-012"]) {
    if (await threat.count()) break;
    await page
      .getByText(camera, { exact: true })
      .filter({ visible: true })
      .first()
      .click();
  }
  const threatTitle = (await threat.getAttribute("aria-label")).replace(
    /^View capture for /,
    "",
  );
  await threat.click();
  const threatShot = await stillFrame(threatTitle, dialog(page));
  assert.equal(threatShot.label, "THREAT (DEMO)");
  await shot(page, "media-threat-preview");
  await page.keyboard.press("Escape");
  await tab(page, "Surveillance Attendance").click();
  await page
    .getByRole("button", { name: /^View capture for / })
    .filter({ visible: true })
    .first()
    .click();
  await page.keyboard.press("Escape");
  await tab(page, "Video Analytics").click();
  await page
    .getByRole("button", { name: /^Play recording for / })
    .filter({ visible: true })
    .first()
    .click();
  video = dialog(page).locator("video");
  await video.evaluate((v) => v.play());
  await page.waitForFunction(() =>
    [...document.querySelectorAll("video")].some((v) => v.currentTime > 0.2),
  );
  await page.setViewportSize(PHONE);
  await page.waitForTimeout(500);
  assert.ok(await noOverflow(page));
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("video").filter({ visible: true }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "All five media views, photo previews, actual video playback, close and mobile passed.",
  );
});
