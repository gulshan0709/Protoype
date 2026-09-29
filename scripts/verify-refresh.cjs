// Checks web refresh on a phone against the built app (dist/, or dist-pages/
// below VIZENTA_WEB_BASE_URL): real pull-to-refresh touch gestures on login and
// in the workspace, the scroll and dialog guards, the new-version prompt,
// preserved preferences and URL, and offline use.
//
//   npm run build:web && npm run test:refresh
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PHONE, button, main, waitForLogin, watch } = require("./lib/qa.cjs");
const { startStatic } = require("./lib/static-server.cjs");

const prefix = process.env.VIZENTA_WEB_BASE_URL || "";
const root = path.resolve(__dirname, prefix ? "../dist-pages" : "../dist");
const currentVersion = JSON.parse(
  fs.readFileSync(path.join(root, "version.json")),
);
let version = currentVersion;
let versionRequests = 0;
const refreshRequests = [];

main(async (browser) => {
  const server = await startStatic({
    root,
    prefix,
    onRequest(url, response) {
      if (!url.pathname.startsWith(prefix + "/")) return false;
      if (url.pathname === `${prefix}/version.json`) {
        versionRequests++;
        assert.ok(
          url.searchParams.has("t"),
          "Version check bypasses cached URLs",
        );
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify(version));
        return true;
      }
      if (url.searchParams.has("_vizenta_refresh")) refreshRequests.push(url);
      return false;
    },
  });
  try {
    const context = await browser.newContext({
      viewport: PHONE,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors = watch(page);
    const reloaded = (action) =>
      Promise.all([
        page.waitForEvent("framenavigated", {
          predicate: (frame) => frame === page.mainFrame(),
        }),
        action(),
      ]);
    await page.goto(server.base + "/login/?keep=yes#test");
    await waitForLogin(page);
    await page.waitForFunction(
      () => !!document.querySelector('[data-testid="auth-connected-spaces"]'),
    );
    const banner = button(page, "New version available. Refresh app");
    assert.equal(await banner.count(), 0);
    await page.evaluate(() =>
      localStorage.setItem("refresh-test-preference", "retained"),
    );
    const cdp = await context.newCDPSession(page);
    const touch = (type, touchPoints = []) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
    const swipe = async (x, y, dx, dy, cancel = false) => {
      await touch("touchStart", [{ x, y }]);
      for (let step = 1; step <= 6; step++) {
        await touch("touchMove", [
          { x: x + (dx * step) / 6, y: y + (dy * step) / 6 },
        ]);
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      await touch(cancel ? "touchCancel" : "touchEnd");
    };
    // Actual browser touch events, rather than calling the refresh callback.
    await swipe(190, 100, 100, 20);
    await swipe(190, 100, 0, 35);
    await swipe(190, 100, 0, 120, true);
    await touch("touchStart", [{ x: 190, y: 100 }]);
    for (const y of [130, 180, 220, 180, 130, 105]) {
      await touch("touchMove", [{ x: 190, y }]);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    await touch("touchEnd");
    assert.equal(
      refreshRequests.length,
      0,
      "Horizontal, short, cancelled and reversed gestures do not reload",
    );
    const loginUrl = new URL(page.url());
    await reloaded(() => swipe(190, 100, 0, 125));
    await waitForLogin(page);
    assert.equal(refreshRequests.length, 1, "Pulling on login refreshes once");
    assert.equal(refreshRequests[0].pathname, loginUrl.pathname);
    assert.equal(refreshRequests[0].searchParams.get("keep"), "yes");
    assert.equal(new URL(page.url()).hash, "#test");
    assert.equal(
      new URL(page.url()).searchParams.has("_vizenta_refresh"),
      false,
    );
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("refresh-test-preference"),
      ),
      "retained",
    );

    await button(page, "Explore workspace").click();
    const scroll = page.getByTestId("workspace-scroll");
    await scroll.waitFor();
    const bounds = await scroll.boundingBox();
    const x = bounds.x + 6,
      y = bounds.y + 80;
    await scroll.evaluate((element) => {
      element.scrollTop = 200;
    });
    await swipe(x, y, 0, 125);
    assert.equal(
      refreshRequests.length,
      1,
      "A gesture starting below the top does not refresh",
    );
    await scroll.evaluate((element) => {
      element.scrollTop = 0;
    });
    await button(page, "Explore").click();
    await page.getByTestId("dialog-transition").waitFor();
    await swipe(190, 100, 0, 125);
    assert.equal(refreshRequests.length, 1, "An open dialog blocks refresh");
    await button(page, "Close dialog").click();
    await page.getByTestId("dialog-transition").waitFor({ state: "detached" });
    await reloaded(() => swipe(x, y, 0, 125));
    await waitForLogin(page);
    assert.equal(
      refreshRequests.length,
      2,
      "Workspace pull refreshes once and follows existing login-on-reload behavior",
    );

    version = { id: "new-deployment" };
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await banner.waitFor();
    version = currentVersion;
    await reloaded(() => banner.click());
    await waitForLogin(page);
    assert.equal(
      refreshRequests.length,
      3,
      "Update prompt loads a fresh document URL",
    );
    assert.equal(
      await banner.count(),
      0,
      "Current deployment does not prompt repeatedly",
    );
    await page.route("**/version.json?*", (route) => route.abort());
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    assert.equal(await button(page, "Sign in").isVisible(), true);
    assert.ok(versionRequests >= 3);
    assert.deepEqual(errors, []);
    console.log(
      `Refresh checks passed at ${prefix || "/"}: real touch gestures, scroll/dialog guards, cached version detection, preserved preferences and URL, offline usability.`,
    );
  } finally {
    await server.close();
  }
});
