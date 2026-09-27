import type { PageContract } from "./types";

// Pages added on top of the imported reference contracts
// (scripts/import-contracts.cjs regenerates data/*.json, so additions live
// here instead of in the JSON).

type Pages = Record<string, Record<string, Record<string, PageContract>>>;

/** Inserts `tab` into a product branch right after `after`, keeping order. */
function insertTab(
  branch: Record<string, PageContract>,
  after: string,
  tab: string,
  page: PageContract,
) {
  const entries = Object.entries(branch).filter(([k]) => k !== tab);
  const at = entries.findIndex(([k]) => k === after) + 1;
  entries.splice(at || entries.length, 0, [tab, page]);
  for (const key of Object.keys(branch)) delete branch[key];
  Object.assign(branch, Object.fromEntries(entries));
}

/**
 * Customer Admin → Class & Lab Attendance → Learners.
 * Built from the learner records the reference provides (Engineering
 * College, which the Academic Structure contract places on Main Campus).
 * Metrics count those records; they are not new measurements.
 */
export function customerAdminLearners(
  pages: Record<string, { product: Pages[string] }>,
) {
  const dean = pages.dean?.product["Class & Lab Attendance"]?.Learners;
  const branch = pages.customer_admin?.product["Class & Lab Attendance"];
  if (!dean || !branch || branch.Learners) return;
  const scope = ["Across campuses", "Main Campus"];
  const records = dean.records.map((r) => ({
    ...r,
    id: r.id.replace(/^dean-/, "ca-"),
    scope,
  }));
  const count = (test: (r: (typeof records)[number]) => boolean) =>
    String(records.filter(test).length);
  const page: PageContract = {
    ...dean,
    id: "ca-class-learners",
    heading: "Learners across campuses",
    description:
      "Learner identity, academic path and mapping status used by class and lab attendance.",
    metrics: [
      {
        label: "Learners listed",
        value: count(() => true),
        context: "Reference roster · Main Campus",
        tone: "healthy",
      },
      {
        label: "Mapping complete",
        value: count((r) => r.cells.mapping === "Complete"),
        context: "Ready for attendance",
        tone: "healthy",
      },
      {
        label: "Needs review",
        value: count((r) => r.state.tone === "attention"),
        context: "Open exceptions",
        tone: "attention",
      },
      {
        label: "Mapping blocked",
        value: count((r) => r.cells.mapping === "Blocked"),
        context: "Duplicate or missing UID",
        tone: "critical",
      },
    ],
    filters: dean.filters.filter((f) =>
      ["department", "program", "mapping", "state"].includes(f.id),
    ),
    // The dean's side panels describe the dean's college; only the shared
    // source list applies here.
    sidePanels: [],
    records,
  };
  insertTab(branch, "Mappings", "Learners", page);
}
