// Helpers for the pages the *Extension.ts files add on top of the imported
// reference contracts (scripts/import-contracts.cjs regenerates data/*.json).
import type { Industry, Metric, PageContract } from "./types";

/** Every campus and customer of the education tenant, for Vizenta Admin rows. */
export const EDUCATION_TENANT_SCOPE: readonly string[] = [
  "All customers",
  "Northbridge Education",
];

/** Text columns from [id, label] pairs. */
export const textColumns = (columns: readonly (readonly [string, string])[]) =>
  columns.map(([id, label]) => ({ id, label, type: "text" }));

/** Header metrics the workspace replaces with live counts of the rows in scope. */
export const placeholderMetrics = (labels: readonly string[]): Metric[] =>
  labels.map((label) => ({ label, value: "0", context: "", tone: "healthy" }));

/** A page's empty and error texts; "empty" and "unauthorized" read the same everywhere. */
export const pageStates = (
  subject: string,
  texts: {
    degraded: string;
    notConfigured: string;
    insufficientHistory?: string;
  },
) => ({
  empty: `No ${subject} match this scope and filter set.`,
  degraded: texts.degraded,
  notConfigured: texts.notConfigured,
  unauthorized: "Your role does not permit this view.",
  insufficientHistory:
    texts.insufficientHistory ?? "There is not enough history yet.",
});

/** "Across campuses" first, then the record's own campuses (optionally without hostels). */
export const acrossCampuses = (
  scope: readonly string[],
  dropHostels = false,
) => [
  "Across campuses",
  ...scope.filter(
    (x) => x !== "Across campuses" && !(dropHostels && x.startsWith("Hostel")),
  ),
];

/** Replaces an object's entries in place (branches are shared by reference). */
export function replaceEntries<T>(
  target: Record<string, T>,
  entries: Record<string, T>,
) {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, entries);
}

/** Inserts `tab` into a branch right after `after` (at the end when missing), keeping order. */
export function insertTab(
  branch: Record<string, PageContract>,
  after: string,
  tab: string,
  page: PageContract,
) {
  const entries = Object.entries(branch).filter(([k]) => k !== tab);
  const at = entries.findIndex(([k]) => k === after) + 1;
  entries.splice(at || entries.length, 0, [tab, page]);
  replaceEntries(branch, Object.fromEntries(entries));
}

/** Records a product's tabs, in the branch's order, for a role's navigation. */
export function syncProductTabs(
  industry: Industry,
  role: string,
  product: string,
) {
  const branch = industry.pages[role]?.product[product];
  if (!branch) return;
  industry.core.productTabs[role] ??= {};
  industry.core.productTabs[role][product] = Object.keys(branch);
}
