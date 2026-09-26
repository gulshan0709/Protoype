// Checks that every records table keeps its body cells under their headers.
//
//   npm run test:tables                  representative tables and viewports
//   npm run test:tables -- --all         also crawl every destination/tab of
//                                        each industry's Customer Admin
//   npm run test:tables -- --all --shots save a screenshot of every table
//
// VIZENTA_QA_URL overrides the default http://localhost:8083.
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const base = (process.env.VIZENTA_QA_URL || "http://localhost:8083").replace(
  /\/$/,
  "",
);
const crawl = process.argv.includes("--all");
const allShots = process.argv.includes("--shots");
const output = path.resolve(__dirname, "../qa/tables");
const allDir = path.join(output, "all");
fs.mkdirSync(allShots ? allDir : output, { recursive: true });
const TOLERANCE = 2;
const slug = (s) =>
  s
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const scopeOf = (industry, role) =>
  require(`../src/domain/contracts/data/${industry}.json`).core.roles[role]
    .scopes[0];
const workspace = (industry, role = "customer_admin") => ({
  industry,
  role,
  scope: scopeOf(industry, role),
});
const desktop = { width: 1512, height: 1300 };
const cases = [
  ["education", "product", "Gate", "User Attendance", [desktop, { width: 1280, height: 1100 }, { width: 1024, height: 1100 }, { width: 800, height: 1100 }, { width: 390, height: 844 }]],
  ["education", "product", "Gate", "In/Out", [desktop, { width: 390, height: 844 }]],
  ["education", "product", "Class & Lab Attendance", "Coverage", [desktop]],
  ["education", "product", "Warden", "Leave Management", [desktop, { width: 390, height: 844 }]],
  ["education", "org", "People & Access", "Users", [desktop]],
  ["corporate", "product", "Gate", "Live Presence", [desktop, { width: 390, height: 844 }]],
  ["retail", "product", "Workforce Attendance", "Shift", [desktop]],
  ["manufacturing", "product", "Workforce Attendance", "Coverage", [desktop, { width: 800, height: 1100 }]],
];

/** Runs in the page: measures the visible records table. */
function measureTable(tolerance) {
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const table = [
    ...document.querySelectorAll('[data-testid="records-table"]'),
  ].find(shown);
  const result = {
    found: !!table,
    mode: "none",
    rows: 0,
    issues: [],
    notes: [],
    docOverflow: document.documentElement.scrollWidth - innerWidth,
  };
  if (result.docOverflow > 1)
    result.issues.push(`page scrolls horizontally by ${result.docOverflow}px`);
  if (!table) return result;
  const box = (el) => el.getBoundingClientRect();
  const round = (n) => Math.round(n * 10) / 10;
  // Descendants that leave their container horizontally (or vertically).
  const escapes = (container, vertical) => {
    const outer = box(container);
    const out = [];
    for (const el of container.querySelectorAll("*")) {
      const r = box(el);
      if (!r.width || !r.height) continue;
      if (getComputedStyle(el).position === "fixed") continue;
      const dx = Math.max(outer.left - r.left, r.right - outer.right);
      const dy = vertical
        ? Math.max(outer.top - r.top, r.bottom - outer.bottom)
        : 0;
      if (dx > 1.5 || dy > 1.5)
        out.push(
          `${(el.innerText || el.getAttribute("aria-label") || el.tagName).slice(0, 30)} overflows by ${round(Math.max(dx, dy))}px`,
        );
    }
    return out;
  };
  const cards = [...table.querySelectorAll('[data-testid="records-card"]')];
  const header = table.querySelector('[data-testid="records-header"]');
  if (cards.length) {
    result.mode = "cards";
    result.rows = cards.length;
    cards.forEach((card, i) =>
      escapes(card, false)
        .slice(0, 3)
        .forEach((m) => result.issues.push(`card ${i + 1}: ${m}`)),
    );
    const tableBox = box(table);
    for (const card of cards) {
      const r = box(card);
      if (r.right > tableBox.right + 1 || r.left < tableBox.left - 1)
        result.issues.push("card extends past the table");
    }
    return result;
  }
  if (!header) {
    result.mode = "empty";
    return result;
  }
  result.mode = "table";
  // Empty cells (e.g. a row without an action) have width but no height.
  const cellsOf = (root, prefix) =>
    [...root.querySelectorAll(`[data-testid^="${prefix}"]`)].filter(
      (el) => el.getBoundingClientRect().width > 0,
    );
  const kind = (el, prefix) =>
    el.getAttribute("data-testid").slice(prefix.length) || "column";
  const head = [...header.querySelectorAll('[data-testid^="records-head-cell"]')];
  const headKinds = head.map((el) => kind(el, "records-head-cell"));
  // Header labels share one style and are uppercase.
  const labelled = head
    .map((el) => ({
      el,
      text: el.innerText.replace(/[↑↓]/g, "").trim(),
    }))
    .filter((x) => x.text);
  result.headers = labelled.map((x) => x.text);
  const styleOf = (el) => {
    let t = el;
    while (t.firstElementChild) t = t.firstElementChild;
    const s = getComputedStyle(t);
    return [s.fontFamily, s.fontSize, s.fontWeight, s.color, s.textTransform].join(
      " | ",
    );
  };
  const firstStyle = labelled[0] && styleOf(labelled[0].el);
  for (const { el, text } of labelled) {
    if (text !== text.toUpperCase())
      result.issues.push(`header "${text}" is not uppercase`);
    if (styleOf(el) !== firstStyle)
      result.issues.push(`header "${text}" style differs: ${styleOf(el)}`);
  }
  const rows = [...table.querySelectorAll('[data-testid="records-row"]')].filter(
    shown,
  );
  result.rows = rows.length;
  const heights = [];
  rows.forEach((row, index) => {
    const n = index + 1;
    const cells = cellsOf(row, "records-cell");
    const kinds = cells.map((el) => kind(el, "records-cell"));
    if (kinds.join() !== headKinds.join()) {
      result.issues.push(
        `row ${n}: cells [${kinds}] do not match header [${headKinds}]`,
      );
      return;
    }
    cells.forEach((cell, i) => {
      const a = box(cell);
      const h = box(head[i]);
      const dl = a.left - h.left;
      if (Math.abs(dl) > tolerance)
        result.issues.push(
          `row ${n} ${kinds[i]} cell ${i + 1} ("${(result.headers[i] ?? "").slice(0, 20)}"): left ${round(a.left)} vs header ${round(h.left)} (${round(dl)}px)`,
        );
      if (i === cells.length - 1 && Math.abs(a.right - h.right) > tolerance)
        result.issues.push(
          `row ${n}: last cell right ${round(a.right)} vs header ${round(h.right)}`,
        );
      escapes(cell, false)
        .slice(0, 2)
        .forEach((m) => result.issues.push(`row ${n} cell ${i + 1}: ${m}`));
    });
    escapes(row, true)
      .slice(0, 2)
      .forEach((m) => result.issues.push(`row ${n}: ${m}`));
    const status = row.querySelector('[data-testid="records-cell-status"]');
    if (status)
      for (const t of status.querySelectorAll("[dir]"))
        if (t.scrollWidth > t.clientWidth + 1)
          result.issues.push(`row ${n}: status "${t.innerText}" is truncated`);
    heights.push(Math.round(box(row).height));
  });
  if (new Set(heights).size > 1)
    result.notes.push(`row heights ${[...new Set(heights)].join("/")}`);
  const scroller = header.parentElement?.parentElement;
  if (scroller && scroller.scrollWidth > scroller.clientWidth + 1)
    result.notes.push(
      `scrolls horizontally (${scroller.scrollWidth}/${scroller.clientWidth})`,
    );
  return result;
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const failures = [];
  const report = [];
  const errors = [];
  let checked = 0;
  const open = async (ws, viewport, query = "") => {
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
      ws,
    );
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/" + query, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.getByTestId("launch-screen").waitFor({ state: "detached" });
    await page
      .getByRole("button", { name: "Explore workspace", exact: true })
      .click();
    return { context, page };
  };
  // Measure until two consecutive reads agree (columns size to their content).
  const settle = async (page) => {
    let last = "";
    let result;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(i ? 200 : 350);
      result = await page.evaluate(measureTable, TOLERANCE);
      const key = JSON.stringify(result);
      if (key === last) break;
      last = key;
    }
    return result;
  };
  // shot: folder for this table's screenshot; failures are always captured.
  const record = async (page, label, shot) => {
    const result = await settle(page);
    checked++;
    report.push({ label, ...result });
    const status = result.issues.length ? "FAIL" : "ok  ";
    console.log(
      `${status} ${label} · ${result.mode}${result.rows ? ` · ${result.rows} rows` : ""}${result.headers ? ` · [${result.headers.join(" | ")}]` : ""}${result.notes.length ? ` · ${result.notes.join("; ")}` : ""}`,
    );
    for (const issue of result.issues.slice(0, 8)) console.log("       " + issue);
    if (result.issues.length) failures.push({ label, issues: result.issues });
    if (shot || result.issues.length) {
      const table = page.getByTestId("records-table").filter({ visible: true });
      if (await table.count())
        await table
          .first()
          .evaluate((el) => el.scrollIntoView({ block: "start" }));
      const file = path.join(
        shot || path.join(output, "failures"),
        slug(label) + ".png",
      );
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await page.screenshot({ path: file });
      result.screenshot = path.relative(path.resolve(__dirname, ".."), file);
    }
    return result;
  };
  try {
    for (const [industry, type, name, tab, viewports] of cases) {
      for (const viewport of viewports) {
        const query =
          "?type=" +
          type +
          "&name=" +
          encodeURIComponent(name) +
          "&tab=" +
          encodeURIComponent(tab);
        const { context, page } = await open(workspace(industry), viewport, query);
        try {
          await page
            .getByRole("tab", { name: tab, exact: true, selected: true })
            .waitFor();
          await page
            .getByTestId("records-table")
            .filter({ visible: true })
            .first()
            .waitFor();
          await record(
            page,
            `${industry} ${name} ${tab} ${viewport.width}`,
            output,
          );
          // Absent people (with a trailing Mark attendance action) follow the
          // present ones; page forward to the rows that mix both.
          if (tab === "User Attendance" && viewport.width >= 768) {
            const mark = page
              .getByRole("button", { name: "Mark attendance", exact: true })
              .filter({ visible: true });
            for (let i = 0; i < 6 && !(await mark.count()); i++)
              await page
                .getByRole("button", { name: "Next", exact: true })
                .filter({ visible: true })
                .click();
            if (!(await mark.count()))
              throw new Error("No rows with Mark attendance found");
            await record(
              page,
              `${industry} ${name} ${tab} absent rows ${viewport.width}`,
              output,
            );
          }
        } catch (e) {
          failures.push({ label: `${industry} ${name} ${tab}`, issues: [e.message] });
          console.log(`FAIL ${industry} ${name} ${tab} ${viewport.width}: ${e.message}`);
        } finally {
          await context.close();
        }
      }
    }
    if (crawl)
      for (const industry of ["education", "corporate", "retail", "manufacturing"]) {
        const { context, page } = await open(workspace(industry), desktop);
        try {
          const sidebar = page.getByTestId("reference-sidebar");
          await sidebar.waitFor();
          const destinations = await sidebar.evaluate((el) =>
            [...el.querySelectorAll('[role="button"][aria-label]')]
              .map((b) => b.getAttribute("aria-label"))
              .filter(
                (n) =>
                  !/^(Switch workspace|Ask Vizenta|Settings and preferences|Collapse|Expand)/.test(
                    n,
                  ),
              ),
          );
          for (const name of destinations) {
            await sidebar.getByRole("button", { name, exact: true }).click();
            const tablist = page.getByRole("tablist", {
              name: `${name} views`,
              exact: true,
            });
            await tablist.waitFor();
            const tabs = await tablist
              .getByRole("tab")
              .evaluateAll((els) => els.map((t) => t.getAttribute("aria-label")));
            for (const tab of tabs) {
              await tablist.getByRole("tab", { name: tab, exact: true }).click();
              await page
                .getByRole("tab", { name: tab, exact: true, selected: true })
                .waitFor();
              await page.waitForTimeout(250);
              const hasTable = await page
                .getByTestId("records-table")
                .filter({ visible: true })
                .count();
              if (!hasTable) {
                console.log(`--   ${industry} ${name} ${tab} · custom view`);
                if (allShots)
                  await page.screenshot({
                    path: path.join(allDir, slug(`${industry} ${name} ${tab}`) + ".png"),
                  });
                continue;
              }
              await record(
                page,
                `${industry} ${name} ${tab}`,
                allShots ? allDir : undefined,
              );
            }
          }
        } finally {
          await context.close();
        }
      }
    if (errors.length) failures.push({ label: "page errors", issues: errors });
    fs.writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify({ checked, failures, report }, null, 2),
    );
    if (failures.length) {
      console.error(
        `\n${failures.length} of ${checked} table checks failed. See qa/tables/results.json.`,
      );
      process.exitCode = 1;
    } else
      console.log(
        `\nAll ${checked} table checks aligned within ${TOLERANCE}px. Screenshots in qa/tables/.`,
      );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
