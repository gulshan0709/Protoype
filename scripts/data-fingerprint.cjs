// Fingerprints the demo data, so a refactor under src/domain can show it
// changes nothing. It prints one hash of every industry as built, and one after
// getPage has opened every tab for every role and scope (demo volume fills
// pages then). Run it before and after the change; both hashes must match.
//
//   npm run data:fingerprint
require("./lib/ts-hooks.cjs");
const { createHash } = require("node:crypto");
const { industries, getPage } = require("../src/domain/contracts/registry.ts");

const started = Date.now();
// Media Explorer lists frames up to the current time, so it is left out of both.
const built = Object.fromEntries(Object.entries(industries));
for (const industry of Object.values(built))
  for (const areas of Object.values(industry.pages))
    delete areas.org?.["Media Explorer"];
const hash = () =>
  createHash("sha256").update(JSON.stringify(built)).digest("hex").slice(0, 16);

const imported = hash();
let pages = 0;
for (const [id, industry] of Object.entries(built))
  for (const [role, persona] of Object.entries(industry.core.roles))
    for (const scope of persona.scopes)
      for (const type of ["org", "product"])
        for (const [name, tabs] of Object.entries(
          industry.pages[role]?.[type] ?? {},
        ))
          for (const tab of Object.keys(tabs)) {
            getPage({ industry: id, role, scope }, { type, name, tab });
            pages++;
          }
console.log(`after import:   ${imported}`);
console.log(`after getPage:  ${hash()}  (${pages} page opens)`);
console.log(`${((Date.now() - started) / 1000).toFixed(1)} s`);
