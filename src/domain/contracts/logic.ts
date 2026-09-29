import type {
  Cell,
  DataRecord,
  Metric,
  PageContract,
  Action,
  Workspace,
} from "./types";
import { toCsv } from "../common/csv";
/** A cell as display text; `empty` when it has none. */
export function cellTextOr(value: Cell | undefined, empty: string): string {
  if (value == null) return empty;
  return typeof value === "object"
    ? String(value.primary ?? value.label ?? value.value ?? empty)
    : String(value);
}
/** A cell as display text, "—" when it has none. */
export const cellText = (value: Cell | undefined): string =>
  cellTextOr(value, "—");
/** KPI detail facts; contracts without a window or calculation fall back. */
export function metricFacts(metric: Metric, page: PageContract, scope: string) {
  return [
    { label: "Scope", value: scope },
    { label: "Page", value: page.heading },
    {
      label: "Time window",
      value: metric.window ?? page.window ?? "Current page window",
    },
    {
      label: "Calculation",
      value: metric.calculation ?? "Defined by this page contract",
    },
  ];
}
export function cellSecondary(value: Cell): string {
  return typeof value === "object" ? (value.secondary ?? value.meta ?? "") : "";
}
/** Scopes that cover every campus or customer rather than one place. */
export const AGGREGATE_SCOPES: readonly string[] = [
  "Across campuses",
  "All customers",
];
export const isAggregateScope = (scope: string) =>
  AGGREGATE_SCOPES.includes(scope);
/** Scopes every record shares (the page-wide ones); a template's others are its own. */
export const commonScopes = (records: readonly DataRecord[]) =>
  records.map((r) => r.scope).reduce((a, b) => a.filter((s) => b.includes(s)));
export function scopedRecords(page: PageContract, scope: string) {
  // Missing scope is denied, never interpreted as global access.
  return page.records.filter((record) => record.scope?.includes(scope));
}
// Status filter labels → the state tones they also match.
const STATE_ALIASES: Record<string, string[]> = {
  "Needs action": ["attention", "critical"],
  "Needs review": ["attention"],
  Review: ["attention"],
  "Needs attention": ["attention"],
  Current: ["healthy", "complete"],
  Verified: ["healthy", "complete"],
  Healthy: ["healthy"],
  Ready: ["healthy"],
  "Action required": ["critical"],
  Critical: ["critical"],
  Pending: ["pending"],
  Complete: ["complete"],
  "Source unavailable": ["unavailable"],
  "Not configured": ["unavailable"],
  "Coverage unknown": ["unavailable"],
};
export function filterRecords(
  records: DataRecord[],
  query: string,
  filters: Record<string, string>,
) {
  return records.filter((record) => {
    const text = [
      record.id,
      record.state.label,
      ...Object.values(record.cells).map(cellText),
    ]
      .join(" ")
      .toLowerCase();
    if (query && !text.includes(query.trim().toLowerCase())) return false;
    return Object.entries(filters).every(([key, value]) => {
      if (!value || /^(all\b|across\b|current$)/i.test(value)) return true;
      if (key === "state")
        return (
          record.state.label.toLowerCase() === value.toLowerCase() ||
          (STATE_ALIASES[value]?.includes(record.state.tone) ?? false)
        );
      const cell = record.cells[key];
      return cell !== undefined
        ? cellText(cell).toLowerCase().includes(value.toLowerCase())
        : text.includes(value.toLowerCase()) || record.scope.includes(value);
    });
  });
}
export function actionKind(action: Action): "export" | "inspect" | "mutate" {
  if (action.kind === "export" || /export|download/i.test(action.id))
    return "export";
  if (
    /^(open|view|inspect|review-record|continue)/i.test(action.id) &&
    !action.requiresReason
  )
    return "inspect";
  return "mutate";
}
export function canAct(
  page: PageContract,
  recordId: string,
  actionId: string,
  workspace: Workspace,
) {
  const record = scopedRecords(page, workspace.scope).find(
    (r) => r.id === recordId,
  );
  return record?.detail.permittedActions.find((a) => a.id === actionId);
}
export function csvFor(page: PageContract, rows: DataRecord[]) {
  return toCsv([
    ["Record ID", ...page.columns.map((c) => c.label), "Status"],
    ...rows.map((row) => [
      row.id,
      ...page.columns.map((c) => cellText(row.cells[c.id])),
      row.state.label,
    ]),
  ]);
}
