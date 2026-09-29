// Checks the GitHub Pages build: dist-pages/ served below /Protoype like the
// static host (VIZENTA_PAGES_URL checks a deployment instead). Routes and
// refreshes, the login images and favicon, workspace entry and the phone
// layout, with no page errors or failed requests.
//
//   npm run build:pages && npm run test:pages
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  DESKTOP,
  PHONE,
  button,
  main,
  noOverflow,
  qaDir,
  shooter,
  waitForLogin,
  watch,
} = require("./lib/qa.cjs");
const { startStatic } = require("./lib/static-server.cjs");
const prefix = process.env.VIZENTA_WEB_BASE_URL ?? "/Protoype";
const deployed = process.env.VIZENTA_PAGES_URL?.replace(/\/$/, "");

main(async (browser) => {
  // Match static hosting: nested routes must have their own HTML entry point.
  const server = deployed
    ? undefined
    : await startStatic({
        root: path.resolve(__dirname, "../dist-pages"),
        prefix,
        spa: false,
      });
  try {
    const base = deployed || server.base;
    const shot = shooter(qaDir());
    const page = await browser.newPage({ viewport: DESKTOP });
    const errors = watch(page, [], { responses: base });
    // One image per login slide (src/features/workspace/model/authUseCases.ts).
    const artwork = () =>
      page.waitForFunction(() => {
        const images = [
          ...document.querySelectorAll(
            '[data-testid="auth-connected-spaces"] img',
          ),
        ];
        return (
          images.length === 2 &&
          images.every((img) => img.complete && img.naturalWidth > 0)
        );
      });
    assert.equal((await page.goto(base + "/")).status(), 200);
    await waitForLogin(page);
    await artwork();
    assert.equal(await page.title(), "Vizenta AI");
    const favicon = await page.locator('link[rel="icon"]').getAttribute("href");
    assert.equal(favicon, `${prefix}/favicon.svg`);
    assert.equal(
      (await page.request.get(new URL(favicon, base).href)).status(),
      200,
    );
    await shot(page, "pages-login-desktop");
    await button(page, "Signup here").click();
    await page.getByText("Create your account", { exact: true }).waitFor();
    assert.ok(page.url().startsWith(base + "/register"));
    assert.equal((await page.reload()).status(), 200);
    await page.getByText("Create your account", { exact: true }).waitFor();
    assert.equal((await page.goto(base + "/forgot-password/")).status(), 200);
    await button(page, "Continue").waitFor();
    assert.equal((await page.goto(base + "/login/")).status(), 200);
    await waitForLogin(page);
    await button(page, "Explore workspace").click();
    await page
      .getByText("Customer Readiness", { exact: true })
      .first()
      .waitFor();
    assert.ok(page.url().startsWith(base + "/"));
    assert.equal((await page.reload()).status(), 200);
    await waitForLogin(page);
    await page.setViewportSize(PHONE);
    await artwork();
    assert.equal(await noOverflow(page, { vertical: true }), true);
    await shot(page, "pages-login-mobile");
    assert.deepEqual(errors, []);
    console.log(
      `Pages checks passed: ${base}/ (routes, refresh, images, favicon, workspace entry, mobile layout).`,
    );
  } finally {
    await server?.close();
  }
});
