// Build-time migration only: the application never executes the legacy applications.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = path.resolve(
  __dirname,
  "../../Vizenta_Four_Industry_Interactive_UI_Dev_Package_2026-09-21/dist",
);
const output = path.resolve(__dirname, "../src/domain/contracts/data");
fs.mkdirSync(output, { recursive: true });
const specs = [
  ["education", "education-v2", "EDU", "Education", "Northbridge Education"],
  ["corporate", "corporate-v2", "CORP", "Corporate", "Northstar Corporate"],
  [
    "retail",
    "retail-warehouse-v2",
    "RW",
    "Retail & Warehouse",
    "Northstar Retail Group",
  ],
  [
    "manufacturing",
    "manufacturing-v2",
    "MFG",
    "Manufacturing",
    "Meridian Manufacturing",
  ],
];
const coverage = [];
for (const [id, folder, prefix, label, tenant] of specs) {
  const context = vm.createContext({ window: {} });
  const files =
    prefix === "RW"
      ? ["data-core.js", "data.js"]
      : [
          "data-core.js",
          "data-org.js",
          "data-presence.js",
          "data-safety-insights.js",
        ];
  for (const file of files)
    vm.runInContext(
      fs.readFileSync(path.join(source, folder, file), "utf8"),
      context,
      { filename: file, timeout: 10000 },
    );
  const w = context.window;
  const core = w[`${prefix}_V2_CORE`];
  const pages = {};
  for (const role of Object.keys(core.roles)) {
    pages[role] =
      prefix === "RW"
        ? w.RW_V2_DATA[role]
        : {
            org: w[`${prefix}_V2_ORG`][role],
            product: {
              ...w[`${prefix}_V2_PRESENCE`][role],
              ...w[`${prefix}_V2_SAFETY_INSIGHTS`][role],
            },
          };
  }
  function normalizePage(page) {
    if (
      !page.primaryAction ||
      (typeof page.primaryAction === "string" && !page.primaryAction.trim())
    ) {
      delete page.primaryAction;
    }
    // Some reference registries use a label string while Education also uses
    // explicit action objects. Normalize this wire-format difference once.
    if (typeof page.primaryAction === "string") {
      const label = page.primaryAction;
      page.primaryAction = {
        id: `${page.id}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        label,
      };
    }
    for (const variant of Object.values(page.variants ?? {}))
      normalizePage(variant);
  }
  for (const branches of Object.values(pages))
    for (const destinations of Object.values(branches))
      for (const tabs of Object.values(destinations))
        for (const page of Object.values(tabs)) normalizePage(page);
  const data = { id, label, tenant, core, pages };
  fs.writeFileSync(path.join(output, `${id}.json`), JSON.stringify(data));
  const count = Object.values(pages).reduce(
    (total, branches) =>
      total +
      Object.values(branches).reduce(
        (n, destinations) =>
          n +
          Object.values(destinations).reduce(
            (a, tabs) => a + Object.keys(tabs).length,
            0,
          ),
        0,
      ),
    0,
  );
  coverage.push({
    industry: id,
    roles: Object.keys(core.roles).length,
    pages: count,
  });
}
fs.writeFileSync(
  path.join(output, "coverage.json"),
  JSON.stringify(coverage, null, 2),
);
console.table(coverage);
