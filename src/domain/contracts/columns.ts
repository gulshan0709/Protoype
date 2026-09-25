import type { PageContract } from "./types";

export const RECORD_STATUS_COLUMN = "$record-status";

export function columnOptions(page: Pick<PageContract, "columns">) {
  return [
    ...page.columns.map((column) => ({
      ...column,
      label: /^(state|status)$/i.test(column.label)
        ? `Source ${column.label.toLowerCase()}`
        : column.label,
    })),
    { id: RECORD_STATUS_COLUMN, label: "Status", type: "status" },
  ];
}

export function defaultColumnIds(page: Pick<PageContract, "id" | "columns">) {
  const candidates = page.columns.filter(
    (column, index) => index === 0 || !/^(state|status)$/i.test(column.id),
  );
  const preferred =
    page.id === "ca-class-coverage"
      ? ["space", "campus", "camera"]
      : candidates.slice(0, 3).map((column) => column.id);
  return [
    ...candidates
      .filter((column, index) => index === 0 || preferred.includes(column.id))
      .map((column) => column.id),
    RECORD_STATUS_COLUMN,
  ];
}

export function visibleColumnIds(
  page: Pick<PageContract, "id" | "columns">,
  saved: unknown,
) {
  if (!Array.isArray(saved)) return defaultColumnIds(page);
  // Keep the identifying column available even after the schema changes.
  return columnOptions(page)
    .filter(
      (column) =>
        column.id === page.columns[0]?.id || saved.includes(column.id),
    )
    .map((column) => column.id);
}
