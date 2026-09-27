// Checks that people render in the standard person format (portrait, bold
// name, muted UID line) across industries: identity columns, host / owner /
// visitor / resident columns, record cards and the record detail header.
//
//   npm run test:portraits
//
// VIZENTA_QA_URL overrides the default http://localhost:8083. Screenshots are
// saved to qa/person-portraits/.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const base = (process.env.VIZENTA_QA_URL || "http://localhost:8083").replace(
  /\/$/,
  "",
);
const output = path.resolve(__dirname, "../qa/person-portraits");
fs.mkdirSync(output, { recursive: true });
const slug = (s) =>
  s
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
const scopeOf = (industry, role) =>
  require(`../src/domain/contracts/data/${industry}.json`).core.roles[role]
    .scopes[0];
const desktop = { width: 1512, height: 1100 };
const mobile = { width: 390, height: 844 };
// [industry, role, type, destination, tab, person column headers, extra columns to show]
const cases = [
  ["education", "customer_admin", "org", "People & Access", "Users", ["USER"]],
  [
    "education",
    "customer_admin",
    "product",
    "Gate",
    "User Attendance",
    ["PERSON"],
  ],
  [
    "education",
    "warden",
    "product",
    "Visitor",
    "On Site",
    ["VISITOR / PARTY", "RESIDENT HOST"],
  ],
  [
    "corporate",
    "customer_admin",
    "org",
    "Corporate Structure",
    "Buildings",
    ["OWNER"],
    ["Owner"],
  ],
  [
    "retail",
    "vizenta_admin",
    "org",
    "Platform Overview",
    "Overview",
    ["OWNER"],
    ["Owner"],
  ],
  [
    "retail",
    "customer_admin",
    "product",
    "Workforce Attendance",
    "Shift",
    ["PERSON / UID"],
  ],
];

/** Runs in the page: avatars in the visible records table, per column. */
function measureAvatars(headers) {
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const table = [
    ...document.querySelectorAll('[data-testid="records-table"]'),
  ].find(shown);
  if (!table) return { found: false };
  const avatars = (root) =>
    [...root.querySelectorAll("img")].filter((img) =>
      / profile image$/.test(img.alt),
    );
  const all = avatars(table).map((img) => ({
    name: img.alt.replace(/ profile image$/, ""),
    src: img.currentSrc || img.src,
    loaded: img.complete && img.naturalWidth > 0,
    width: Math.round(img.parentElement.getBoundingClientRect().width),
  }));
  const head = [
    ...table.querySelectorAll('[data-testid="records-head-cell"]'),
  ].map((el) => el.innerText.replace(/[↑↓]/g, "").trim());
  const rows = [
    ...table.querySelectorAll('[data-testid="records-row"]'),
  ].filter(shown);
  const columns = {};
  for (const label of headers) {
    const index = head.indexOf(label);
    columns[label] =
      index < 0
        ? null
        : rows.filter((row) => {
            const cell = row.querySelectorAll('[data-testid="records-cell"]')[
              index
            ];
            return cell && avatars(cell).length > 0;
          }).length;
  }
  const cards = [...table.querySelectorAll('[data-testid="records-card"]')];
  return {
    found: true,
    head,
    rows: rows.length,
    cards: cards.length,
    cardsWithAvatar: cards.filter((card) => avatars(card).length).length,
    columns,
    avatars: all,
    overflow: document.documentElement.scrollWidth - innerWidth,
  };
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const failures = [];
  const open = async ([industry, role, type, name, tab], viewport) => {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    await context.addInitScript(
      (workspace) =>
        localStorage.setItem(
          "vizenta-ai-demo-v1",
          JSON.stringify({
            workspace,
            theme: "light",
            name: "QA User",
            audit: [],
            readNotifications: [],
          }),
        ),
      { industry, role, scope: scopeOf(industry, role) },
    );
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const query = new URLSearchParams({ type, name, tab }).toString();
    await page.goto(`${base}/?${query}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await signIn(page);
    await page
      .getByRole("tab", { name: tab, exact: true, selected: true })
      .waitFor();
    await page
      .getByTestId("records-table")
      .filter({ visible: true })
      .first()
      .waitFor();
    return { context, page };
  };
  // Every fresh load opens the login screen. Sign-in accepts any demo
  // credentials; a verification step, when shown, takes the demo code 123456.
  const signIn = async (page) => {
    const button = (name) =>
      page.getByRole("button", { name, exact: true }).filter({ visible: true });
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await page.getByLabel("User Id", { exact: true }).fill("qa@vizenta.ai");
    await page.getByLabel("Password", { exact: true }).fill("Preview123!");
    await button("Sign in").click();
    const code = page.getByLabel("Mobile verification digit 1", {
      exact: true,
    });
    if (
      await code.waitFor({ timeout: 1500 }).then(
        () => true,
        () => false,
      )
    ) {
      await code.fill("123456");
      await button("Verify code").click();
    }
    await button("Profile and settings").waitFor();
  };
  const columnsOn = async (page, labels) => {
    if (!labels?.length) return;
    await page
      .getByTestId("records-table")
      .filter({ visible: true })
      .getByRole("button", { name: "Columns", exact: true })
      .click();
    for (const label of labels) {
      const box = page.getByRole("checkbox", { name: label, exact: true });
      if (!(await box.isChecked())) await box.click();
    }
    await page.getByRole("button", { name: "Done", exact: true }).click();
  };
  // Measure once the table's portraits are present and loaded (a failed one
  // falls back to initials and drops out); a timeout is reported by the checks.
  const settle = async (page, headers) => {
    await page
      .waitForFunction(() => {
        const table = [
          ...document.querySelectorAll('[data-testid="records-table"]'),
        ].find((el) => el.getBoundingClientRect().width > 0);
        const imgs = [...(table?.querySelectorAll("img") ?? [])].filter((img) =>
          / profile image$/.test(img.alt),
        );
        return imgs.length > 0 && imgs.every((img) => img.complete);
      })
      .catch(() => {});
    await page.waitForTimeout(300);
    return page.evaluate(measureAvatars, headers);
  };
  const check = (label, fn) => {
    try {
      fn();
      console.log(`ok   ${label}`);
    } catch (e) {
      failures.push(`${label}: ${e.message}`);
      console.log(`FAIL ${label}: ${e.message}`);
    }
  };
  const portraitsOk = (label, result) => {
    check(`${label} · portraits load`, () => {
      const broken = result.avatars.filter((a) => !a.loaded).map((a) => a.name);
      assert.deepEqual(broken, [], "portraits that did not load");
    });
    check(`${label} · one distinct portrait per person`, () => {
      const bySrc = new Map();
      for (const a of result.avatars)
        bySrc.set(a.src, new Set([...(bySrc.get(a.src) ?? []), a.name]));
      const shared = [...bySrc.values()]
        .filter((names) => names.size > 1)
        .map((names) => [...names].join(" / "));
      assert.deepEqual(shared, [], "people sharing one portrait");
    });
  };
  try {
    for (const spec of cases) {
      const [industry, role, , name, tab, headers, extra] = spec;
      const label = `${industry} ${role} ${name} / ${tab}`;
      // Desktop table: each person column shows avatars with a profile image label.
      let { context, page } = await open(spec, desktop);
      try {
        await columnsOn(page, extra);
        const result = await settle(page, headers);
        assert.ok(result.found, "records table found");
        for (const header of headers)
          check(`${label} · ${header} column shows portraits`, () => {
            assert.notEqual(
              result.columns[header],
              null,
              `"${header}" header visible in [${result.head}]`,
            );
            assert.ok(
              result.columns[header] >= 1,
              `${result.columns[header]} of ${result.rows} rows have a portrait`,
            );
          });
        portraitsOk(label, result);
        await page.screenshot({
          path: path.join(output, slug(label) + "-desktop.png"),
        });
        console.log(
          `     ${result.rows} rows · ${result.avatars.length} portraits · ` +
            headers.map((h) => `${h}: ${result.columns[h]}`).join(", "),
        );
        // Record detail: the header uses the 72 dp portrait.
        if (name === "People & Access") {
          await page
            .getByTestId("records-table")
            .filter({ visible: true })
            .getByRole("button", { name: /^Open / })
            .first()
            .click();
          await page
            .getByRole("button", { name: "Back to records", exact: true })
            .waitFor();
          const header = await page.evaluate(
            () =>
              [...document.images]
                .filter((img) => / profile image$/.test(img.alt))
                .map((img) =>
                  Math.round(img.parentElement.getBoundingClientRect().width),
                )
                .sort((a, b) => b - a)[0],
          );
          check(`${label} · detail header portrait`, () =>
            assert.ok(header >= 70, `largest portrait is ${header}px`),
          );
          await page.screenshot({
            path: path.join(output, slug(label) + "-detail.png"),
          });
        }
      } catch (e) {
        failures.push(`${label} desktop: ${e.message}`);
        console.log(`FAIL ${label} desktop: ${e.message}`);
      } finally {
        await context.close();
      }
      // Mobile record cards (< 768 px) use the same format.
      ({ context, page } = await open(spec, mobile));
      try {
        await columnsOn(page, extra);
        const result = await settle(page, headers);
        check(`${label} · mobile cards show portraits`, () => {
          assert.ok(result.cards > 0, "record cards shown");
          assert.ok(
            result.cardsWithAvatar >= 1,
            `${result.cardsWithAvatar} of ${result.cards} cards have a portrait`,
          );
        });
        check(`${label} · mobile has no horizontal scroll`, () =>
          assert.ok(
            result.overflow <= 1,
            `page scrolls by ${result.overflow}px`,
          ),
        );
        portraitsOk(`${label} mobile`, result);
        await page.screenshot({
          path: path.join(output, slug(label) + "-mobile.png"),
        });
      } catch (e) {
        failures.push(`${label} mobile: ${e.message}`);
        console.log(`FAIL ${label} mobile: ${e.message}`);
      } finally {
        await context.close();
      }
    }
    if (errors.length) failures.push(...errors.map((e) => "page error: " + e));
    if (failures.length) {
      console.error(
        `\n${failures.length} person portrait checks failed:\n  ${failures.join("\n  ")}`,
      );
      process.exitCode = 1;
    } else
      console.log(
        "\nAll person portrait checks passed. Screenshots in qa/person-portraits/.",
      );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
