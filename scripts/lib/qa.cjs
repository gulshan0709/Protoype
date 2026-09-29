// Shared Playwright helpers for scripts/verify-*.cjs: the browser run, workspace
// pages that are already past the login screen, common locators and the qa/
// output folder.
//
//   const { main, open } = require("./lib/qa.cjs");
//   main(async (browser) => {
//     const { page, button, errors } = await open(browser, { login: "password" });
//     await button("Gate").click();
//   });
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

/** localStorage key of the app's saved preferences (see AppProvider). */
const KEY = "vizenta-ai-demo-v1";
const DESKTOP = { width: 1512, height: 982 };
const PHONE = { width: 390, height: 844 };
const root = path.resolve(__dirname, "../..");

/** The origin under test: VIZENTA_QA_URL, else `fallback`, without a trailing slash. */
const baseUrl = (fallback = "http://localhost:8083") =>
  (process.env.VIZENTA_QA_URL || fallback).replace(/\/$/, "");

/** qa/<name> in the repository, created if needed. */
function qaDir(name = "") {
  const dir = path.join(root, "qa", name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** A workspace deep link: route({ type, name, tab }) → "/?type=…&name=…&tab=…". */
const route = (params) => "/?" + new URLSearchParams(params);

/** The first scope a role is assigned in an industry's contracts. */
const scopeOf = (industry, role) =>
  require(`../../src/domain/contracts/data/${industry}.json`).core.roles[role]
    .scopes[0];

const slug = (text) =>
  text
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

/** Saved app state for a workspace (the role's first scope unless given). */
const demoState = ({
  industry = "education",
  role = "customer_admin",
  scope = scopeOf(industry, role),
  theme = "light",
  name = "QA User",
} = {}) => ({
  workspace: { industry, role, scope },
  theme,
  name,
  audit: [],
  readNotifications: [],
});

/** Runs `run(browser)` in headless Chrome; any error fails the process. */
function main(run) {
  (async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      await run(browser);
    } finally {
      await browser.close();
    }
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

/**
 * Collects page errors into `errors`, plus console errors with `consoleErrors`
 * and HTTP ≥ 400 responses under the `responses` URL prefix.
 */
function watch(page, errors = [], { consoleErrors = false, responses } = {}) {
  page.on("pageerror", (error) => errors.push(error.message));
  if (consoleErrors)
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  if (responses)
    page.on("response", (r) => {
      if (r.url().startsWith(responses) && r.status() >= 400)
        errors.push(`${r.status()} ${r.url()}`);
    });
  return errors;
}

/** An exact-name button; `visible` skips hidden matches. */
const button = (scope, name, { visible = false } = {}) => {
  const locator = scope.getByRole("button", { name, exact: true });
  return visible ? locator.filter({ visible: true }) : locator;
};
const tab = (scope, name) => scope.getByRole("tab", { name, exact: true });
const field = (scope, label) => scope.getByLabel(label, { exact: true });
/** The visible records table (Expo Router keeps earlier screens mounted, hidden). */
const records = (page) =>
  page.getByTestId("records-table").filter({ visible: true });
/** "Open …" buttons of the records table's rows (or phone cards). */
const rows = (page) => records(page).getByRole("button", { name: /^Open / });
/** The top-most open dialog panel. */
const dialog = (page) =>
  page.getByTestId("dialog-transition").filter({ visible: true }).last();

/** The login form is ready: "Sign in" shown and the launch screen gone. */
async function waitForLogin(page) {
  await button(page, "Sign in").waitFor();
  await page.getByTestId("launch-screen").waitFor({ state: "detached" });
}

/**
 * Gets past the login screen that every fresh load shows: "explore" uses
 * Explore workspace (the saved display name stays), "password" signs in with
 * User Id and Password (the name then derives from the email). The dev server
 * can reset the form just after it mounts; `fillRetries` refills until it sticks.
 */
async function enter(
  page,
  {
    login = "explore",
    user = "qa@vizenta.ai",
    password = "Preview123!",
    fillRetries = 1,
    timeout,
  } = {},
) {
  await page
    .getByTestId("launch-screen")
    .waitFor({ state: "detached", timeout });
  if (login === "explore") await button(page, "Explore workspace").click();
  else {
    for (let attempt = 1; attempt <= fillRetries; attempt++) {
      await field(page, "User Id").fill(user);
      await field(page, "Password").fill(password);
      if (attempt === fillRetries) break;
      await page.waitForTimeout(300);
      if ((await field(page, "User Id").inputValue()) === user) break;
    }
    await button(page, "Sign in", { visible: true }).click();
  }
  await button(page, "Profile and settings", { visible: true }).waitFor({
    timeout,
  });
}

/**
 * A new context and page at `url` (relative to `base`), past the login screen
 * unless `login` is false. `state` seeds localStorage before every load,
 * `timeout` is the page's default timeout and `loadTimeout` bounds the page
 * load, the launch screen and entering the workspace. Resolves to
 * { context, page, errors, button(name) }, where button finds visible buttons.
 */
async function open(
  browser,
  {
    url = "/",
    base = baseUrl(),
    viewport = DESKTOP,
    reducedMotion = "reduce",
    state,
    timeout = 15000,
    loadTimeout = 60000,
    login = "explore",
    user,
    password,
    fillRetries,
    errors = [],
    consoleErrors = false,
  } = {},
) {
  const context = await browser.newContext({ viewport, reducedMotion });
  if (state)
    await context.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [KEY, JSON.stringify(state)],
    );
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  watch(page, errors, { consoleErrors });
  await page.goto(base + url, {
    waitUntil: "domcontentloaded",
    timeout: loadTimeout,
  });
  if (login)
    await enter(page, {
      login,
      user,
      password,
      fillRetries,
      timeout: loadTimeout,
    });
  return {
    context,
    page,
    errors,
    button: (name) => button(page, name, { visible: true }),
  };
}

/** Replaces the saved app state; it applies from the next load. */
const seed = (page, state) =>
  page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [KEY, JSON.stringify(state)],
  );

/** Fills labelled inputs in order: fillForm(dialog, { "Name *": "QA" }). */
async function fillForm(scope, fields) {
  for (const [label, value] of Object.entries(fields))
    await field(scope, label).fill(value);
}

/**
 * Picks `action` from a row's "Actions for <title>" menu; a RegExp `title`
 * matches the whole button name instead.
 */
async function rowAction(page, title, action) {
  await page
    .getByRole(
      "button",
      title instanceof RegExp
        ? { name: title }
        : { name: `Actions for ${title}`, exact: true },
    )
    .filter({ visible: true })
    .click();
  await button(page, action).click();
}

/** Uploads a CSV file through the form's "Choose CSV file" button. */
async function uploadCsv(page, name, csv) {
  const chooser = page.waitForEvent("filechooser");
  await button(page, "Choose CSV file").click();
  await (
    await chooser
  ).setFiles({ name, mimeType: "text/csv", buffer: Buffer.from(csv) });
}

/** Clicks `trigger` and returns the text of the file it downloads. */
async function downloadText(page, trigger) {
  const download = page.waitForEvent("download");
  await trigger.click();
  return fs.readFileSync(await (await download).path(), "utf8");
}

/** The page does not scroll horizontally (nor vertically, with `vertical`). */
const noOverflow = (page, { vertical = false } = {}) =>
  page.evaluate(
    (vertical) =>
      document.documentElement.scrollWidth <= innerWidth &&
      (!vertical || document.documentElement.scrollHeight <= innerHeight),
    vertical,
  );

/** shooter(dir)(page, name, options) saves <dir>/<name>.png. */
const shooter =
  (dir) =>
  (page, name, options = {}) =>
    page.screenshot({ path: path.join(dir, name + ".png"), ...options });

/**
 * Waits until every visible [data-testid=testId] holds a loaded image (all of
 * its images with `every`), then two frames so they are painted.
 */
async function imagesPainted(
  page,
  testId,
  { every = false, timeout = 30000 } = {},
) {
  await page.waitForFunction(
    ([id, every]) => {
      const holders = [
        ...document.querySelectorAll(`[data-testid="${id}"]`),
      ].filter((el) => el.checkVisibility());
      const loaded = (img) => img.complete && img.naturalWidth > 0;
      return (
        holders.length > 0 &&
        holders.every((el) => {
          const images = [...el.querySelectorAll("img")];
          return every
            ? images.length > 0 && images.every(loaded)
            : images.some(loaded);
        })
      );
    },
    [testId, every],
    { timeout },
  );
  await page.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      ),
  );
}

/** Writes qa/<file>: the passed checks and any runtime errors. */
const writeResults = (file, checks, runtimeErrors) =>
  fs.writeFileSync(
    path.join(qaDir(), file),
    JSON.stringify({ status: "passed", checks, runtimeErrors }, null, 2),
  );

module.exports = {
  KEY,
  DESKTOP,
  PHONE,
  baseUrl,
  qaDir,
  route,
  scopeOf,
  slug,
  demoState,
  main,
  watch,
  button,
  tab,
  field,
  records,
  rows,
  dialog,
  waitForLogin,
  enter,
  open,
  seed,
  fillForm,
  rowAction,
  uploadCsv,
  downloadText,
  noOverflow,
  shooter,
  imagesPainted,
  writeResults,
};
