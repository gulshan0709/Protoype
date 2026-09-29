// Checks that people render in the standard person format (portrait, bold
// name, muted UID line) across industries: identity columns, host / owner /
// visitor / resident columns, record cards and the record detail header.
//
//   npm run test:portraits
//
// VIZENTA_QA_URL overrides the default http://localhost:8083. Screenshots are
// saved to qa/person-portraits/.
const assert = require("node:assert/strict");
const {
  PHONE,
  button,
  demoState,
  main,
  open,
  qaDir,
  records,
  route,
  rows,
  shooter,
  slug,
} = require("./lib/qa.cjs");
const shot = shooter(qaDir("person-portraits"));
const desktop = { width: 1512, height: 1100 };
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

main(async (browser) => {
  const errors = [];
  const failures = [];
  // Every fresh load opens the login screen; these sign in with a password.
  const openCase = async ([industry, role, type, name, view], viewport) => {
    const { context, page } = await open(browser, {
      url: route({ type, name, tab: view }),
      viewport,
      state: demoState({ industry, role }),
      login: "password",
      errors,
      consoleErrors: true,
    });
    await page
      .getByRole("tab", { name: view, exact: true, selected: true })
      .waitFor();
    await records(page).first().waitFor();
    return { context, page };
  };
  const columnsOn = async (page, labels) => {
    if (!labels?.length) return;
    await button(records(page), "Columns").click();
    for (const label of labels) {
      const box = page.getByRole("checkbox", { name: label, exact: true });
      if (!(await box.isChecked())) await box.click();
    }
    await button(page, "Done").click();
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
  for (const spec of cases) {
    const [industry, role, , name, view, headers, extra] = spec;
    const label = `${industry} ${role} ${name} / ${view}`;
    // Desktop table: each person column shows avatars with a profile image label.
    let { context, page } = await openCase(spec, desktop);
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
      await shot(page, slug(label) + "-desktop");
      console.log(
        `     ${result.rows} rows · ${result.avatars.length} portraits · ` +
          headers.map((h) => `${h}: ${result.columns[h]}`).join(", "),
      );
      // Record detail: the header uses the 72 dp portrait.
      if (name === "People & Access") {
        await rows(page).first().click();
        await button(page, "Back to records").waitFor();
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
        await shot(page, slug(label) + "-detail");
      }
    } catch (e) {
      failures.push(`${label} desktop: ${e.message}`);
      console.log(`FAIL ${label} desktop: ${e.message}`);
    } finally {
      await context.close();
    }
    // Mobile record cards (< 768 px) use the same format.
    ({ context, page } = await openCase(spec, PHONE));
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
        assert.ok(result.overflow <= 1, `page scrolls by ${result.overflow}px`),
      );
      portraitsOk(`${label} mobile`, result);
      await shot(page, slug(label) + "-mobile");
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
});
