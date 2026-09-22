const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "../dist-pages");
const output = path.resolve(__dirname, "../qa");
const prefix = "/Protoype";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
};

(async () => {
  let server;
  let browser;
  try {
    let base = process.env.VIZENTA_PAGES_URL?.replace(/\/$/, "");
    if (!base) {
      // Match static hosting: nested routes must have their own HTML entry point.
      server = http.createServer((request, response) => {
        const pathname = new URL(request.url, "http://localhost").pathname;
        if (!pathname.startsWith(`${prefix}/`)) {
          response.writeHead(404).end();
          return;
        }
        let file = path.resolve(
          root,
          "." + decodeURIComponent(pathname.slice(prefix.length)),
        );
        if (file !== root && !file.startsWith(root + path.sep)) {
          response.writeHead(403).end();
          return;
        }
        if (fs.existsSync(file) && fs.statSync(file).isDirectory())
          file = path.join(file, "index.html");
        if (!fs.existsSync(file)) {
          response.writeHead(404, { "Content-Type": "text/html" });
          file = path.join(root, "404.html");
        } else
          response.setHeader(
            "Content-Type",
            types[path.extname(file)] ?? "application/octet-stream",
          );
        fs.createReadStream(file).pipe(response);
      });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      base = `http://127.0.0.1:${server.address().port}${prefix}`;
    }
    fs.mkdirSync(output, { recursive: true });
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const page = await browser.newPage({
      viewport: { width: 1512, height: 982 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (response) => {
      if (response.url().startsWith(base) && response.status() >= 400) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });
    const button = (name) => page.getByRole("button", { name, exact: true });
    const ready = async () => {
      await button("Sign in").waitFor();
      await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    };
    const artwork = async () =>
      page.waitForFunction(() => {
        const images = [
          ...document.querySelectorAll(
            '[data-testid="auth-connected-spaces"] img',
          ),
        ];
        return (
          images.length === 4 &&
          images.every((img) => img.complete && img.naturalWidth > 0)
        );
      });
    assert.equal((await page.goto(base + "/")).status(), 200);
    await ready();
    await artwork();
    assert.equal(await page.title(), "Vizenta AI");
    const favicon = await page.locator('link[rel="icon"]').getAttribute("href");
    assert.equal(favicon, `${prefix}/favicon.svg`);
    assert.equal(
      (await page.request.get(new URL(favicon, base).href)).status(),
      200,
    );
    await page.screenshot({
      path: path.join(output, "pages-login-desktop.png"),
    });
    await button("Signup here").click();
    await page.getByText("Create your account", { exact: true }).waitFor();
    assert.ok(page.url().startsWith(base + "/register"));
    assert.equal((await page.reload()).status(), 200);
    await page.getByText("Create your account", { exact: true }).waitFor();
    assert.equal((await page.goto(base + "/forgot-password/")).status(), 200);
    await button("Continue").waitFor();
    assert.equal((await page.goto(base + "/login/")).status(), 200);
    await ready();
    await button("Explore workspace").click();
    await page.getByText("Workspace overview", { exact: true }).waitFor();
    assert.ok(page.url().startsWith(base + "/"));
    assert.equal((await page.reload()).status(), 200);
    await ready();
    await page.setViewportSize({ width: 390, height: 844 });
    await artwork();
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
      true,
    );
    await page.screenshot({
      path: path.join(output, "pages-login-mobile.png"),
    });
    assert.deepEqual(errors, []);
    console.log(
      `Pages checks passed: ${base}/ (routes, refresh, images, favicon, workspace entry, mobile layout).`,
    );
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
