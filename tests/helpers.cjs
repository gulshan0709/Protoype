// Shared loaders and walkers for the node tests. Requiring it also loads the TS
// hooks, so src/**/*.ts resolves the way Metro does.
require("../scripts/lib/ts-hooks.cjs");

const INDUSTRY_IDS = ["education", "corporate", "retail", "manufacturing"];

/** An industry's contract JSON as authored (shared, so clone before mutating). */
const contract = (id) => require(`../src/domain/contracts/data/${id}.json`);

/**
 * Education with the product extensions and demo data the setup tests rely on:
 * learners, gate attendance, warden, sources and surveillance users. A fresh
 * copy each call. (A subset of registry.ts, so expected counts stay fixed.)
 */
function educationWithExtensions() {
  const d = structuredClone(contract("education"));
  const samples = require("../src/domain/surveillance/samples.json");
  for (const [file, fn] of [
    ["learnerExtension", "customerAdminLearners"],
    ["gateExtension", "gateAttendance"],
    ["wardenExtension", "wardenProduct"],
    ["sourcesExtension", "sourcesAndSetup"],
    ["surveillanceExtension", "surveillanceUsers"],
  ])
    require(`../src/domain/contracts/${file}.ts`)[fn](
      fn === "customerAdminLearners" ? d.pages : d,
      samples,
    );
  require("../src/domain/contracts/demoData.ts").populateDemoData(d);
  return d;
}

/**
 * Every page of an industry: the base page and its variants ("with"), only the
 * variants when a page has them ("instead"), or base pages only ("none").
 */
function* eachPage(data, { variants = "with" } = {}) {
  for (const [role, areas] of Object.entries(data.pages))
    for (const [type, branches] of Object.entries(areas))
      for (const [name, tabs] of Object.entries(branches))
        for (const [tab, base] of Object.entries(tabs)) {
          const extra = Object.entries(base.variants ?? {});
          if (variants !== "instead" || !extra.length)
            yield {
              role,
              type,
              name,
              tab,
              base,
              page: base,
              variant: undefined,
            };
          if (variants !== "none")
            for (const [variant, page] of extra)
              yield { role, type, name, tab, base, page, variant };
        }
}

module.exports = { INDUSTRY_IDS, contract, educationWithExtensions, eachPage };
