// Types for corpora.cjs. The loaders return the raw JSON; registry.ts types it.
declare const corpora: Record<
  "education" | "corporate" | "retail" | "manufacturing" | "corporateRows",
  () => unknown
>;
export = corpora;
