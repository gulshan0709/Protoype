// Checks the authentication screens: login and signup layouts, direct auth
// links, validation, password visibility, OTP entry, signup completion,
// password recovery, responsive widths, login on every fresh load, the title
// and favicon, and that passwords are never stored. Screenshots and
// auth-results.json are saved to qa/.
//
//   npm run test:auth
const assert = require("node:assert/strict");
const {
  DESKTOP,
  KEY,
  baseUrl,
  button,
  field,
  main,
  noOverflow,
  qaDir,
  shooter,
  waitForLogin,
  watch,
  writeResults,
} = require("./lib/qa.cjs");
const base = baseUrl("http://127.0.0.1:8082");

main(async (browser) => {
  const shot = shooter(qaDir());
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  const errors = watch(page);
  const b = (name) => button(page, name);
  const input = (label) => field(page, label);
  const welcome = () =>
    page.getByText("Welcome back", { exact: true }).waitFor();
  const fillCodes = async (kind) => {
    await input(`${kind} verification digit 1`).fill("123456");
    assert.equal(await input(`${kind} verification digit 6`).inputValue(), "6");
  };
  const saved = () =>
    page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key))?.session === false,
      KEY,
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
  await welcome();
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
  await welcome();
  await artworkVisible();
  await shot(page, "auth-login-desktop", { fullPage: true });
  await b("Sign in").click();
  await page
    .getByRole("alert")
    .getByText("Enter your user ID and password.")
    .waitFor();
  await input("User Id").fill("preview@example.com");
  await input("Password").fill("Preview123!");
  assert.equal(await input("Password").getAttribute("type"), "password");
  await b("Show password").click();
  assert.equal(await input("Password").evaluate((el) => el.type), "text");
  await b("Hide password").click();
  assert.equal(
    await page.getByRole("button", { name: /Google|Microsoft/ }).count(),
    0,
  );
  assert.equal(
    await b("Sign in").evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(8, 123, 168)",
    "Login uses a deeper theme cyan for readable white text",
  );
  await b("Signup here").click();
  await page.getByText("Create your account", { exact: true }).waitFor();
  assert.equal(
    await b("Continue").evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(8, 123, 168)",
    "Signup uses a deeper theme cyan for readable white text",
  );
  await b("Continue").click();
  await page.getByText("Enter your first name.", { exact: true }).waitFor();
  await input("First Name *").fill("Taylor");
  await input("Last Name").fill("Morgan");
  await input("Mobile Number *").fill("9876543210");
  await input("Email *").fill("invalid-email");
  await b("Continue").click();
  await page
    .getByText("Enter a valid email address.", { exact: true })
    .waitFor();
  await input("Email *").fill("taylor@example.com");
  await input("Password *").fill("Preview123!");
  await input("Confirm Password *").fill("Different123!");
  await b("Continue").click();
  await page.getByText("Passwords do not match.", { exact: true }).waitFor();
  await input("Confirm Password *").fill("Preview123!");
  await shot(page, "auth-signup-desktop", { fullPage: true });
  await b("Continue").click();
  await b("Create Account").click();
  await page
    .getByText("Enter code 123456 in each verification field.", { exact: true })
    .waitFor();
  await fillCodes("Mobile");
  await b("Resend mobile code").click();
  assert.equal(await input("Mobile verification digit 1").inputValue(), "");
  await fillCodes("Mobile");
  await fillCodes("Email");
  await shot(page, "auth-verification-desktop", { fullPage: true });
  await b("Create Account").click();
  await page.getByText("You're all set!", { exact: true }).waitFor();
  await b("Back to login").click();
  await b("Forgot Password?").click();
  await input("Mobile Number *").fill("9876543210");
  await b("Continue").click();
  await fillCodes("Mobile");
  await b("Verify code").click();
  await input("Password *").fill("ResetPreview123!");
  await input("Confirm Password *").fill("ResetPreview123!");
  await b("Reset Password").click();
  await page.getByText("You're all set!", { exact: true }).waitFor();
  await b("Back to login").click();
  for (const width of [320, 390, 768, 1024, 1512]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 982 });
    await page.goto(`${base}/login`);
    await welcome();
    assert.ok(await noOverflow(page), "No horizontal overflow");
    await artworkVisible();
    if (width === 768)
      await shot(page, "auth-login-tablet", { fullPage: true });
    if (width === 390)
      await shot(page, "auth-login-mobile", { fullPage: true });
    await b("Signup here").click();
    await page.getByText("Create your account", { exact: true }).waitFor();
    assert.ok(await noOverflow(page), "No horizontal overflow");
    if (width === 390)
      await shot(page, "auth-signup-mobile", { fullPage: true });
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
  const submitBounds = await b("Continue").boundingBox();
  assert.ok(
    submitBounds && submitBounds.y + submitBounds.height <= 768,
    "Signup action visible on a laptop",
  );
  await shot(page, "auth-signup-laptop", { fullPage: true });
  await page.goto(`${base}/login`);
  await waitForLogin(page);
  await input("User Id").fill("preview@example.com");
  await input("Password").fill("Preview123!");
  await page.getByRole("checkbox", { name: "Remember me" }).click();
  await b("Sign in").click();
  await b("Profile and settings").waitFor();
  await saved();
  await page.reload();
  await welcome();
  await b("Explore workspace").click();
  await b("Profile and settings").waitFor();
  await saved();
  await page.reload();
  await welcome();
  assert.equal(
    await b("Profile and settings").count(),
    0,
    "Remember me does not skip login on reload",
  );
  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    localStorage.setItem(
      key,
      JSON.stringify({ ...saved, session: true, rememberSession: true }),
    );
  }, KEY);
  await page.reload();
  await welcome();
  assert.equal(
    await b("Profile and settings").count(),
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
  writeResults(
    "auth-results.json",
    [
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
    errors,
  );
  console.log("Authentication UI checks passed");
});
