// Building blocks for the table records the setup forms create or edit during a
// session (learners, users, cameras, classes, wardens, hostels, leaves, shifts).
import type {
  Cell,
  DataRecord,
  Item,
  PageContract,
  RecordDetail,
} from "./types";

export type TimelineEvent = RecordDetail["timeline"][number];
export type DetailSection = RecordDetail["sections"][number];

/** Id for a record added in this session: "NEW-LRN-…". Nothing parses it. */
export const sessionId = (prefix?: string) =>
  `NEW-${prefix ? prefix + "-" : ""}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** A row's cells in the page's column order; columns the form doesn't fill show "—". */
export const cellsFor = (
  page: Pick<PageContract, "columns">,
  byColumn: Record<string, Cell>,
): Record<string, Cell> =>
  Object.fromEntries(
    page.columns.map((col) => [col.id, byColumn[col.id] ?? "—"]),
  );

/** The timeline entry for a change made in this session. */
export const sessionEvent = (source: string, actor: string): TimelineEvent => ({
  time: "Just now",
  event: source,
  actor,
});

/**
 * Editing a source row: the form owns only some columns and its own detail
 * sections. Status, measurements and the rest of the detail stay as the source
 * services reported them.
 */
export function editSourceRecord(
  previous: DataRecord,
  edit: {
    page: Pick<PageContract, "columns">;
    setup: unknown;
    setupKind: string;
    /** The cells a new record would have; only `owned` columns are taken. */
    cells: Record<string, Cell>;
    owned: readonly string[];
    title: string;
    /** The form's sections; earlier sections with these titles are replaced. */
    sections: DetailSection[];
    sectionsFirst?: boolean;
    facts?: Item[];
    event: TimelineEvent;
  },
): DataRecord {
  const owned = new Set(edit.owned);
  const replaced = new Set(edit.sections.map((section) => section.title));
  const kept = previous.detail.sections.filter(
    (section) => !replaced.has(section.title),
  );
  return {
    ...previous,
    setup: edit.setup,
    setupKind: edit.setupKind,
    cells: Object.fromEntries(
      edit.page.columns.map((col) => [
        col.id,
        owned.has(col.id) ? edit.cells[col.id] : previous.cells[col.id],
      ]),
    ),
    detail: {
      ...previous.detail,
      title: edit.title,
      ...(edit.facts ? { facts: edit.facts } : {}),
      sections: edit.sectionsFirst
        ? [...edit.sections, ...kept]
        : [...kept, ...edit.sections],
      timeline: [edit.event, ...previous.detail.timeline],
    },
  };
}
