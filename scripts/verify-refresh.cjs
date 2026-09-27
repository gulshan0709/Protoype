const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const prefix = process.env.VIZENTA_WEB_BASE_URL || "";
const root = path.resolve(__dirname, prefix ? "../dist-pages" : "../dist");
const currentVersion = JSON.parse(
  fs.readFileSync(path.join(root, "version.json")),
);
let version = currentVersion;
let versionRequests = 0;
const refreshRequests = [];
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

(async () => {
  let browser;
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (!url.pathname.startsWith(prefix + "/"))
      return response.writeHead(404).end();
    if (url.pathname === `${prefix}/version.json`) {
      versionRequests++;
      assert.ok(
        url.searchParams.has("t"),
        "Version check bypasses cached URLs",
      );
      response.writeHead(200, { "Content-Type": "application/json" });
      return response.end(JSON.stringify(version));
    }
    if (url.searchParams.has("_vizenta_refresh")) refreshRequests.push(url);
    let file = path.resolve(
      root,
      "." + decodeURIComponent(url.pathname.slice(prefix.length)),
    );
    if (file !== root && !file.startsWith(root + path.sep))
      return response.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file)) file = path.join(root, "index.html");
    response.setHeader(
      "Content-Type",
      types[path.extname(file)] || "application/octet-stream",
    );
    fs.createReadStream(file).pipe(response);
  });
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}${prefix}`;
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const ready = async () => {
      await page
        .getByRole("button", { name: "Sign in", exact: true })
        .waitFor();
      await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    };
    await page.goto(base + "/login/?keep=yes#test");
    await ready();
    await page.waitForFunction(
      () => !!document.querySelector('[data-testid="auth-connected-spaces"]'),
    );
    const banner = page.getByRole("button", {
      name: "New version available. Refresh app",
      exact: true,
    });
    assert.equal(await banner.count(), 0);
    await page.evaluate(() =>
      localStorage.setItem("refresh-test-preference", "retained"),
    );
    const cdp = await context.newCDPSession(page);
    const swipe = async (x, y, dx, dy, cancel = false) => {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      for (let step = 1; step <= 6; step++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: x + (dx * step) / 6, y: y + (dy * step) / 6 }],
        });
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: cancel ? "touchCancel" : "touchEnd",
        touchPoints: [],
      });
    };
    // Actual browser touch events, rather than calling the refresh callback.
    await swipe(190, 100, 100, 20);
    await swipe(190, 100, 0, 35);
    await swipe(190, 100, 0, 120, true);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 190, y: 100 }],
    });
    for (const y of [130, 180, 220, 180, 130, 105]) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 190, y }],
      });
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert.equal(
      refreshRequests.length,
      0,
      "Horizontal, short, cancelled and reversed gestures do not reload",
    );
    const loginUrl = new URL(page.url());
    await Promise.all([
      page.waitForEvent("framenavigated", {
        predicate: (frame) => frame === page.mainFrame(),
      }),
      swipe(190, 100, 0, 125),
    ]);
    await ready();
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

    await page
      .getByRole("button", { name: "Explore workspace", exact: true })
      .click();
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
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await page.getByTestId("dialog-transition").waitFor();
    await swipe(190, 100, 0, 125);
    assert.equal(refreshRequests.length, 1, "An open dialog blocks refresh");
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await page.getByTestId("dialog-transition").waitFor({ state: "detached" });
    await Promise.all([
      page.waitForEvent("framenavigated", {
        predicate: (frame) => frame === page.mainFrame(),
      }),
      swipe(x, y, 0, 125),
    ]);
    await ready();
    assert.equal(
      refreshRequests.length,
      2,
      "Workspace pull refreshes once and follows existing login-on-reload behavior",
    );

    version = { id: "new-deployment" };
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await banner.waitFor();
    version = currentVersion;
    await Promise.all([
      page.waitForEvent("framenavigated", {
        predicate: (frame) => frame === page.mainFrame(),
      }),
      banner.click(),
    ]);
    await ready();
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
    assert.equal(
      await page
        .getByRole("button", { name: "Sign in", exact: true })
        .isVisible(),
      true,
    );
    assert.ok(versionRequests >= 3);
    assert.deepEqual(errors, []);
    console.log(
      `Refresh checks passed at ${prefix || "/"}: real touch gestures, scroll/dialog guards, cached version detection, preserved preferences and URL, offline usability.`,
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
