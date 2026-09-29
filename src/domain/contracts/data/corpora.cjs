// The industry corpora, loaded on first use. Metro bundles every require() below,
// but a JSON module is only evaluated when its loader is first called (node caches
// it the same way), so start-up parses only the industry being viewed.
// CommonJS, so require() works both in Metro and in node's ESM loading of the .ts sources.
module.exports = {
  education: () => require("./education.json"),
  corporate: () => require("./corporate.json"),
  retail: () => require("./retail.json"),
  manufacturing: () => require("./manufacturing.json"),
  corporateRows: () => ({
    ...require("../corporate/rows-1.json"),
    ...require("../corporate/rows-2.json"),
    ...require("../corporate/rows-3.json"),
    ...require("../corporate/rows-4.json"),
  }),
};
