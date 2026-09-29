// Checks that the login screen fits eleven phone, tablet, desktop and
// landscape viewports without scrolling, with and without validation errors.
// Screenshots are saved to qa/login-fit-*.png.
//
//   npm run test:login-fit
const assert = require("node:assert/strict");
const {
  baseUrl,
  button,
  field,
  main,
  qaDir,
  shooter,
  waitForLogin,
} = require("./lib/qa.cjs");
const base = baseUrl("http://127.0.0.1:8082");

main(async (browser) => {
  const shot = shooter(qaDir());
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const failures = [];
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [390, 844],
    [768, 1024],
    [889, 810],
    [890, 810],
    [1024, 600],
    [1366, 768],
    [1512, 982],
    [844, 390],
    [667, 375],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + "/login");
    await waitForLogin(page);
    for (const invalid of [false, true]) {
      if (invalid) await button(page, "Sign in").click();
      await page.waitForTimeout(100);
      for (const label of ["User Id", "Password"]) {
        const input = field(page, label);
        await input.click({ trial: true });
        assert.ok(
          (await input.boundingBox()).height >= 40,
          "Credentials retain usable input height",
        );
      }
      const report = await page.evaluate(() => {
        const outside = [
          ...document.querySelectorAll(
            'input, [role="button"], [role="checkbox"], [role="alert"], [data-testid="auth-connected-spaces"]',
          ),
        ]
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              name: el.getAttribute("aria-label") || el.textContent,
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
            };
          })
          .filter(
            (r) =>
              r.width &&
              r.height &&
              (r.y < -1 ||
                r.y + r.height > innerHeight + 1 ||
                r.x < -1 ||
                r.x + r.width > innerWidth + 1),
          );
        const scrolling = [...document.querySelectorAll("*")]
          .filter(
            (el) =>
              /auto|scroll/.test(getComputedStyle(el).overflowY) &&
              el.scrollHeight > el.clientHeight + 1,
          )
          .map((el) => el.tagName);
        const fields = [...document.querySelectorAll("input")].map((el) =>
          el.getBoundingClientRect(),
        );
        const overlap =
          fields.length === 2 &&
          fields[0].left < fields[1].right &&
          fields[0].right > fields[1].left &&
          fields[0].top < fields[1].bottom &&
          fields[0].bottom > fields[1].top;
        return {
          outside,
          scrolling,
          overlap,
          bodyHeight: document.documentElement.scrollHeight,
          viewport: innerHeight,
        };
      });
      if (
        report.outside.length ||
        report.scrolling.length ||
        report.overlap ||
        report.bodyHeight > height
      )
        failures.push({ width, height, invalid, ...report });
      await shot(
        page,
        `login-fit-${width}x${height}${invalid ? "-error" : ""}`,
      );
    }
    await page.mouse.wheel(0, 800);
    assert.equal(await page.evaluate(() => scrollY), 0);
  }
  console.log(JSON.stringify(failures, null, 2));
  assert.equal(
    failures.length,
    0,
    "All login controls must fit without scrolling, including validation errors.",
  );
  console.log(
    "Login fits eleven phone, tablet, desktop and landscape viewports, including the 890px split breakpoint, with and without validation errors.",
  );
});
