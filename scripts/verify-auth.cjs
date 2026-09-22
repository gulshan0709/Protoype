const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const base = process.env.VIZENTA_QA_URL || "http://127.0.0.1:8082";
const output = path.resolve(__dirname, "../qa");
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1512, height: 982 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const button = (name) => page.getByRole("button", { name, exact: true });
    const input = (name) => page.getByLabel(name, { exact: true });
    const fillCodes = async (kind) => {
      await input(`${kind} verification digit 1`).fill("123456");
      assert.equal(
        await input(`${kind} verification digit 6`).inputValue(),
        "6",
      );
    };
    const noOverflow = async () =>
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        "No horizontal overflow",
      );
    const artworkVisible = async () => {
      await page.getByTestId("launch-screen").waitFor({ state: "detached" });
      await page.waitForFunction(() => {
        const image = document.querySelector(
          '[data-testid="auth-connected-spaces"] img',
        );
        return image?.complete && image.naturalWidth > 0;
      });
      const bounds = await page
        .getByTestId("auth-connected-spaces")
        .boundingBox();
      assert.ok(
        bounds &&
          bounds.width >= 200 &&
          bounds.height >= 130 &&
          bounds.y >= 0 &&
          bounds.y + bounds.height <= page.viewportSize().height,
        "Login artwork is loaded and visible",
      );
    };
    await page.goto(base);
    await page.getByText("Welcome back", { exact: true }).waitFor();
    assert.equal(
      await page.getByTestId("reference-sidebar").count(),
      0,
      "Fresh app opens login",
    );
    assert.equal(await page.title(), "Vizenta AI");
    const favicon = page.locator('link[rel="icon"]');
    assert.equal(await favicon.getAttribute("type"), "image/svg+xml");
    const iconResponse = await page.request.get(
      new URL(await favicon.getAttribute("href"), base).href,
    );
    assert.equal(iconResponse.status(), 200);
    assert.match(iconResponse.headers()["content-type"], /image\/svg\+xml/);
    assert.match(await iconResponse.text(), /<title>Vizenta AI<\/title>/);
    await page.getByText("Welcome back", { exact: true }).waitFor();
    await artworkVisible();
    await page.screenshot({
      path: path.join(output, "auth-login-desktop.png"),
      fullPage: true,
    });
    await button("Sign in").click();
    await page
      .getByRole("alert")
      .getByText("Enter your user ID and password.")
      .waitFor();
    await input("User Id").fill("preview@example.com");
    await input("Password").fill("Preview123!");
    assert.equal(await input("Password").getAttribute("type"), "password");
    await button("Show password").click();
    assert.equal(await input("Password").evaluate((el) => el.type), "text");
    await button("Hide password").click();
    assert.equal(
      await page.getByRole("button", { name: /Google|Microsoft/ }).count(),
      0,
    );
    assert.equal(
      await button("Sign in").evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      ),
      "rgb(8, 123, 168)",
      "Login uses a deeper theme cyan for readable white text",
    );
    await button("Signup here").click();
    await page.getByText("Create your account", { exact: true }).waitFor();
    assert.equal(
      await button("Continue").evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      ),
      "rgb(8, 123, 168)",
      "Signup uses a deeper theme cyan for readable white text",
    );
    await button("Continue").click();
    await page.getByText("Enter your first name.", { exact: true }).waitFor();
    await input("First Name *").fill("Taylor");
    await input("Last Name").fill("Morgan");
    await input("Mobile Number *").fill("9876543210");
    await input("Email *").fill("invalid-email");
    await button("Continue").click();
    await page
      .getByText("Enter a valid email address.", { exact: true })
      .waitFor();
    await input("Email *").fill("taylor@example.com");
    await input("Password *").fill("Preview123!");
    await input("Confirm Password *").fill("Different123!");
    await button("Continue").click();
    await page.getByText("Passwords do not match.", { exact: true }).waitFor();
    await input("Confirm Password *").fill("Preview123!");
    await page.screenshot({
      path: path.join(output, "auth-signup-desktop.png"),
      fullPage: true,
    });
    await button("Continue").click();
    await button("Create Account").click();
    await page
      .getByText("Enter code 123456 in each verification field.", {
        exact: true,
      })
      .waitFor();
    await fillCodes("Mobile");
    await button("Resend mobile code").click();
    assert.equal(await input("Mobile verification digit 1").inputValue(), "");
    await fillCodes("Mobile");
    await fillCodes("Email");
    await page.screenshot({
      path: path.join(output, "auth-verification-desktop.png"),
      fullPage: true,
    });
    await button("Create Account").click();
    await page.getByText("You're all set!", { exact: true }).waitFor();
    await button("Back to login").click();
    await button("Forgot Password?").click();
    await input("Mobile Number *").fill("9876543210");
    await button("Continue").click();
    await fillCodes("Mobile");
    await button("Verify code").click();
    await input("Password *").fill("ResetPreview123!");
    await input("Confirm Password *").fill("ResetPreview123!");
    await button("Reset Password").click();
    await page.getByText("You're all set!", { exact: true }).waitFor();
    await button("Back to login").click();
    for (const width of [320, 390, 768, 1024, 1512]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 982 });
      await page.goto(`${base}/login`);
      await page.getByText("Welcome back", { exact: true }).waitFor();
      await noOverflow();
      await artworkVisible();
      if (width === 768)
        await page.screenshot({
          path: path.join(output, "auth-login-tablet.png"),
          fullPage: true,
        });
      if (width === 390)
        await page.screenshot({
          path: path.join(output, "auth-login-mobile.png"),
          fullPage: true,
        });
      await button("Signup here").click();
      await page.getByText("Create your account", { exact: true }).waitFor();
      await noOverflow();
      if (width === 390)
        await page.screenshot({
          path: path.join(output, "auth-signup-mobile.png"),
          fullPage: true,
        });
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`${base}/register`);
    await page.getByText("Create your account", { exact: true }).waitFor();
    for (const label of [
      "First Name *",
      "Middle Name",
      "Last Name",
      "Code",
      "Mobile Number *",
      "Email *",
      "Password *",
      "Confirm Password *",
    ]) {
      const bounds = await input(label).boundingBox();
      assert.ok(
        bounds && bounds.y >= 0 && bounds.y + bounds.height <= 768,
        `${label} visible on a laptop without scrolling`,
      );
    }
    const submitBounds = await button("Continue").boundingBox();
    assert.ok(
      submitBounds && submitBounds.y + submitBounds.height <= 768,
      "Signup action visible on a laptop",
    );
    await page.screenshot({
      path: path.join(output, "auth-signup-laptop.png"),
      fullPage: true,
    });
    await page.goto(`${base}/login`);
    await button("Sign in").waitFor();
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await input("User Id").fill("preview@example.com");
    await input("Password").fill("Preview123!");
    await page.getByRole("checkbox", { name: "Remember me" }).click();
    await button("Sign in").click();
    await button("Profile and settings").waitFor();
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("vizenta-ai-demo-v1"))?.session ===
        false,
    );
    await page.reload();
    await page.getByText("Welcome back", { exact: true }).waitFor();
    await button("Explore workspace").click();
    await button("Profile and settings").waitFor();
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("vizenta-ai-demo-v1"))?.session ===
        false,
    );
    await page.reload();
    await page.getByText("Welcome back", { exact: true }).waitFor();
    assert.equal(
      await button("Profile and settings").count(),
      0,
      "Remember me does not skip login on reload",
    );
    await page.evaluate(() => {
      const key = "vizenta-ai-demo-v1";
      const saved = JSON.parse(localStorage.getItem(key));
      localStorage.setItem(
        key,
        JSON.stringify({ ...saved, session: true, rememberSession: true }),
      );
    });
    await page.reload();
    await page.getByText("Welcome back", { exact: true }).waitFor();
    assert.equal(
      await button("Profile and settings").count(),
      0,
      "Previously saved sessions also open login",
    );
    assert.equal(
      await page.evaluate(() =>
        JSON.stringify(localStorage).includes("Preview123!"),
      ),
      false,
      "Passwords are never persisted",
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, "auth-results.json"),
      JSON.stringify(
        {
          status: "passed",
          checks: [
            "login and signup reference layouts",
            "direct auth links",
            "required fields and password confirmation",
            "password visibility",
            "Google and Microsoft sign-in removed",
            "cyan primary actions match workspace theme",
            "generated login artwork loaded and visible on desktop, tablet and mobile",
            "all signup fields and Continue visible at 1366x768",
            "OTP paste, validation and resend",
            "signup completion",
            "password recovery preview",
            "320/390/768/1024/1512 responsive widths",
            "login on fresh launch, reload, and previously remembered sessions",
            "Vizenta browser title and SVG favicon",
            "passwords never persisted",
          ],
          runtimeErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log("Authentication UI checks passed");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
