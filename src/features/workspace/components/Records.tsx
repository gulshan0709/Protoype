import { RecordMedia } from "./RecordMedia";
import { PersonGalleryDialog } from "./PersonGallery";
import { personGalleryEnabled } from "../../../domain/gate/captureHistory";
import { UserIdentity } from "./UserIdentity";
import {
  PersonChip,
  cellPerson,
  personIdentity,
  type PersonChipProps,
} from "./PersonChip";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Pressable,
  ScrollView,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import type { PageContract, DataRecord } from "../../../domain/contracts/types";
import { cellText, cellSecondary } from "../../../domain/contracts/logic";
import { useTheme } from "../../../shared/theme/Theme";
import {
  Row,
  Txt,
  Badge,
  EmptyState,
  Button,
  Card,
  Field,
  Pager,
  usePaged,
} from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Select } from "../../../shared/ui/Select";
import { Dialog } from "../../../shared/ui/Dialog";
import { humanize } from "../../../shared/ui/format";
import { useApp } from "../../../application/AppProvider";
import {
  columnOptions,
  visibleColumnIds,
  RECORD_STATUS_COLUMN,
} from "../../../domain/contracts/columns";
import { ColumnPicker } from "./ColumnPicker";

// Desktop table geometry. The header and every body row are built from these
// same rules, so each cell starts exactly under its header whether or not the
// row has a trailing action.
const TABLE_PAD = 12;
const TABLE_GAP = 10;
const VIEW_WIDTH = 46;
const STATUS_MIN = 116;
const STATUS_MAX = 220;
const ACTIONS_MIN = 35;
const CAPTURE_ROW_HEIGHT = 74;
const PAGE_SIZE = 10;
/** Search reaches the table this long after the last keystroke. */
const QUERY_DELAY = 150;
const columnStyle = (index: number) => ({
  flex: index === 0 ? 1.35 : 1,
  minWidth: 0,
  paddingRight: 12,
});
/** The status filter: records by the label of their tone. */
const STATUS_FILTERS = [
  { label: "All statuses", value: "" },
  ...[
    "Healthy",
    "Needs attention",
    "Critical",
    "Pending",
    "Source unavailable",
    "Complete",
    "Open",
  ].map((label) => ({ label, value: label })),
];
// Phone card layout: the title fills the header row; values sit right of their label.
const CARD_TITLE = { flex: 1, minWidth: 0 } as const;
const CARD_VALUE = { flex: 1.4, minWidth: 0, alignItems: "flex-end" } as const;
type Column = ReturnType<typeof columnOptions>[number];
/** People a row names: its identity, else a first cell naming a person, and other cells' people. */
interface RowPeople {
  identity: ReturnType<typeof personIdentity>;
  lead?: PersonChipProps;
  cells: Record<string, PersonChipProps | undefined>;
}
/** A rendered row action, or undefined when the row has none. */
function actionOf(
  render: (row: DataRecord) => React.ReactNode,
  row: DataRecord,
) {
  const action = render(row);
  return action === null || action === undefined || action === false
    ? undefined
    : action;
}
/** Width that grows to the widest reported content, between min and max. */
function useFitWidth(min: number, max: number) {
  const [width, setWidth] = useState(min);
  const measure = useCallback(
    (event: LayoutChangeEvent) => {
      const next = Math.min(max, Math.ceil(event.nativeEvent.layout.width));
      setWidth((current) => (next > current ? next : current));
    },
    [max],
  );
  return [width, measure] as const;
}
function FilterField({
  label,
  mobile,
  children,
}: {
  label: string;
  mobile: boolean;
  children: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        flexGrow: mobile ? 0 : 1,
        flexBasis: mobile ? "100%" : 120,
        minWidth: 0,
        gap: 5,
      }}
    >
      <Txt size={11} color={c.muted}>
        {mobile ? label : label.toUpperCase()}
      </Txt>
      {children}
    </View>
  );
}
/**
 * One value of a record: a table cell under its header, or on a phone card
 * the card's title (first column) or a right-aligned value. The first column
 * shows the row's identity; other cells show a capture, a person or text.
 */
function RecordCell({
  row,
  col,
  index,
  people,
  hasCapture,
  layout,
  onOpen,
  onCapture,
}: {
  row: DataRecord;
  col: Column;
  index: number;
  people?: RowPeople;
  hasCapture: boolean;
  layout: "table" | "card";
  onOpen: (record: DataRecord) => void;
  /** Opens the person's capture gallery from the Capture column. */
  onCapture?: (record: DataRecord) => void;
}) {
  const c = useTheme();
  const card = layout === "card";
  const title = card && index === 0;
  if (col.id === "capture" && !title)
    return (
      <RecordMedia
        record={row}
        onOpen={onCapture ? () => onCapture(row) : undefined}
      />
    );
  if (index === 0 && people?.identity) {
    const identity = <UserIdentity record={row} />;
    // With a Capture column the row is not one button (the capture is its
    // own), so the identity opens the record.
    if (hasCapture)
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${row.detail.title}`}
          onPress={(event) => {
            event.stopPropagation();
            onOpen(row);
          }}
          style={CARD_TITLE}
        >
          {identity}
        </Pressable>
      );
    return card ? <View style={CARD_TITLE}>{identity}</View> : identity;
  }
  // Any other cell naming a person (host, owner, approver…).
  const person = title ? people?.lead : people?.cells[col.id];
  if (person) {
    const chip = (
      <PersonChip {...person} align={card && !title ? "end" : "start"} />
    );
    return card ? (
      <View style={title ? CARD_TITLE : CARD_VALUE}>{chip}</View>
    ) : (
      chip
    );
  }
  const text = cellText(row.cells[col.id]);
  if (card)
    return (
      <Txt
        size={title ? 13 : 12}
        bold={title}
        style={title ? { flex: 1 } : { flex: 1.4, textAlign: "right" }}
      >
        {text}
      </Txt>
    );
  const secondary = cellSecondary(row.cells[col.id]);
  return (
    <>
      <Txt size={12} bold={index === 0}>
        {text}
      </Txt>
      {!!secondary && (
        <Txt size={11} color={c.muted}>
          {secondary}
        </Txt>
      )}
      {index === 0 && row.type !== "surveillance_user" && (
        <Txt size={11} color={c.subtle}>
          {humanize(row.type)}
        </Txt>
      )}
    </>
  );
}
export function Records({
  page,
  rows,
  query,
  onQuery,
  filters,
  onFilter,
  onOpen,
  onClear,
  onExport,
  renderRowActions,
  headingActions,
  headingSubtitle,
}: {
  page: PageContract;
  rows: DataRecord[];
  query: string;
  onQuery: (q: string) => void;
  filters: Record<string, string>;
  onFilter: (id: string, value: string) => void;
  onOpen: (record: DataRecord) => void;
  onClear: () => void;
  onExport: () => void;
  renderRowActions?: (row: DataRecord) => React.ReactNode;
  headingActions?: React.ReactNode;
  headingSubtitle?: string;
}) {
  const c = useTheme();
  const app = useApp();
  const preferenceKey = JSON.stringify([
    app.workspace.industry,
    app.workspace.role,
    page.id,
    page.columns.map((column) => column.id),
  ]);
  const preference = app.columnPreferences[preferenceKey];
  const selected = useMemo(
    () => visibleColumnIds(page, preference),
    [page, preference],
  );
  const columns = useMemo(
    () =>
      columnOptions(page).filter(
        (column) =>
          column.id !== RECORD_STATUS_COLUMN && selected.includes(column.id),
      ),
    [page, selected],
  );
  const showStatus = selected.includes(RECORD_STATUS_COLUMN);
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Pages that open a person's capture gallery from the Capture column.
  const gallery = personGalleryEnabled(page);
  const [galleryFor, setGalleryFor] = useState<DataRecord>();
  // The search box answers every keystroke; the rows follow after a pause, so
  // typing does not re-filter and re-render the page for each letter.
  const [text, setText] = useState(query);
  useEffect(() => {
    if (!query) setText("");
  }, [query]);
  useEffect(() => {
    if (text === query) return;
    const timer = setTimeout(() => onQuery(text), QUERY_DELAY);
    return () => clearTimeout(timer);
  }, [text]);
  const clear = () => {
    setText("");
    onClear();
  };
  const activeFilterCount = Object.values(filters).filter(
    (value) => value && !/^(all\b|across\b|current$)/i.test(value),
  ).length;
  useEffect(() => {
    setFiltersOpen(false);
  }, [mobile, page.id, app.workspace.scope]);
  const [sort, setSort] = useState({ key: "", asc: true });
  const activeSortKey = columns.some((column) => column.id === sort.key)
    ? sort.key
    : "";
  useEffect(() => {
    if (sort.key && !activeSortKey) setSort({ key: "", asc: true });
  }, [sort.key, activeSortKey]);
  const sorted = useMemo(
    () =>
      activeSortKey
        ? [...rows].sort(
            (a, b) =>
              cellText(a.cells[activeSortKey]).localeCompare(
                cellText(b.cells[activeSortKey]),
                undefined,
                { numeric: true },
              ) * (sort.asc ? 1 : -1),
          )
        : rows,
    [rows, activeSortKey, sort.asc],
  );
  const { index, visible, setIndex } = usePaged(sorted, PAGE_SIZE);
  useEffect(() => {
    setIndex(0);
  }, [query, filters, page.id, app.workspace.scope]);
  // One trailing actions column is reserved for the whole table as soon as
  // any row has an action; rows without one leave it empty. Each action is
  // rendered once: the first one found, and those of the rows on this page.
  const firstAction = useMemo(() => {
    if (!renderRowActions) return undefined;
    for (const row of rows) {
      const action = actionOf(renderRowActions, row);
      if (action !== undefined) return action;
    }
    return undefined;
  }, [rows, renderRowActions]);
  const actions = useMemo(
    () =>
      new Map(
        visible.map((row) => [
          row.id,
          renderRowActions ? actionOf(renderRowActions, row) : undefined,
        ]),
      ),
    [visible, renderRowActions],
  );
  const hasActions = firstAction !== undefined;
  const [statusWidth, measureStatus] = useFitWidth(STATUS_MIN, STATUS_MAX);
  const [actionsWidth, measureActions] = useFitWidth(ACTIONS_MIN, 320);
  const hasCapture = columns.some((col) => col.id === "capture");
  const onCapture = gallery ? setGalleryFor : undefined;
  const [headingContext, headingTitle] = page.heading.includes(" · ")
    ? page.heading.split(/ · (.*)/s).slice(0, 2)
    : [undefined, page.heading];
  // Person chips of the visible rows: the row's identity (or a first cell
  // naming a person) and every other cell naming someone else. Sorting,
  // filtering and search keep using the cell data.
  const people = useMemo(
    () =>
      new Map(
        visible.map((row): [string, RowPeople] => {
          const identity = personIdentity(row);
          const lead = identity
            ? undefined
            : cellPerson(row.cells[page.columns[0].id]);
          const cells: RowPeople["cells"] = {};
          columns.forEach((col, j) => {
            if (col.id !== "capture" && (j > 0 || !identity))
              cells[col.id] = cellPerson(
                row.cells[col.id],
                j > 0 ? (identity ?? lead) : undefined,
              );
          });
          return [row.id, { identity, lead, cells }];
        }),
      ),
    [visible, columns, page],
  );
  // A row's value under its header, or on its phone card.
  const cell = (
    row: DataRecord,
    col: Column,
    index: number,
    layout: "table" | "card",
  ) => (
    <RecordCell
      row={row}
      col={col}
      index={index}
      people={people.get(row.id)}
      hasCapture={hasCapture}
      layout={layout}
      onOpen={onOpen}
      onCapture={onCapture}
    />
  );
  const filterFields = (
    <>
      {page.filters
        .filter((f) => f.id !== "state")
        .map((f) => (
          <FilterField key={f.id} label={f.label} mobile={mobile}>
            <Select
              height={44}
              label={f.label}
              value={filters[f.id] ?? ""}
              options={[
                { label: f.label, value: "" },
                ...f.options.map((o) =>
                  typeof o === "string" ? { label: o, value: o } : o,
                ),
              ]}
              onChange={(value) => onFilter(f.id, value)}
            />
          </FilterField>
        ))}
      <FilterField label="Status" mobile={mobile}>
        <Select
          height={44}
          label="Filter by state"
          value={filters.state ?? ""}
          options={STATUS_FILTERS}
          onChange={(value) => onFilter("state", value)}
          icon="filter"
        />
      </FilterField>
    </>
  );
  return (
    <Card testID="records-table" style={{ padding: 0, overflow: "hidden" }}>
      <Row
        style={{
          padding: mobile ? 12 : 16,
          gap: mobile ? 12 : 16,
          flexWrap: "wrap",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderColor: c.border,
        }}
      >
        <View
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: mobile ? "100%" : 280,
            minWidth: 0,
            gap: 4,
          }}
        >
          {!!headingContext && (
            <Txt size={10} bold color={c.link} style={{ letterSpacing: 1.1 }}>
              {headingContext.toUpperCase()}
            </Txt>
          )}
          <Txt size={17} bold>
            {headingTitle}
          </Txt>
          {!!headingSubtitle && (
            <Txt size={12} color={c.muted}>
              {headingSubtitle}
            </Txt>
          )}
        </View>
        {!!headingActions && (
          <View style={{ width: mobile ? "100%" : undefined }}>
            {headingActions}
          </View>
        )}
      </Row>
      <View style={{ padding: mobile ? 12 : 14, gap: 10 }}>
        <Row
          style={{
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: mobile ? "space-between" : undefined,
            columnGap: 8,
            rowGap: mobile ? 12 : 8,
          }}
        >
          <View
            style={{
              flexGrow: mobile ? 1 : 1.4,
              flexBasis: mobile ? 0 : 180,
              minWidth: 0,
              gap: 5,
            }}
          >
            {!mobile && (
              <Txt size={11} color={c.muted}>
                SEARCH RECORDS
              </Txt>
            )}
            <Field
              value={text}
              onChange={setText}
              placeholder="Search records…"
            />
          </View>
          {mobile ? (
            <Button
              label={
                activeFilterCount ? `Filters (${activeFilterCount})` : "Filters"
              }
              icon="filter"
              onPress={() => setFiltersOpen(true)}
            />
          ) : (
            filterFields
          )}
        </Row>
        <Row
          style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
        >
          <Row style={{ flexGrow: 1, gap: 7 }}>
            <Txt size={11} color={c.muted}>
              {rows.length} records
            </Txt>
            {(text || query || Object.values(filters).some(Boolean)) && (
              <Button compact variant="ghost" label="Clear" onPress={clear} />
            )}
          </Row>
          <Row style={{ flexShrink: 0, gap: 8 }}>
            <ColumnPicker
              page={page}
              selected={selected}
              onChange={(ids) => app.setColumnPreference(preferenceKey, ids)}
            />
            <Button
              compact
              iconOnly
              label="Export"
              tooltip="Download report"
              icon="download"
              onPress={onExport}
            />
          </Row>
        </Row>
      </View>
      {mobile && filtersOpen && (
        <Dialog title="Filter records" onClose={() => setFiltersOpen(false)}>
          <Row style={{ flexWrap: "wrap", rowGap: 12 }}>{filterFields}</Row>
          <Row style={{ justifyContent: "space-between", gap: 8 }}>
            <Button
              label="Reset filters"
              variant="ghost"
              onPress={() =>
                Object.keys(filters).forEach((id) => onFilter(id, ""))
              }
            />
            <Button
              label="Show results"
              variant="primary"
              onPress={() => setFiltersOpen(false)}
            />
          </Row>
        </Dialog>
      )}
      {!rows.length ? (
        <EmptyState
          title="No matching records"
          description={page.states.empty}
          action={clear}
        />
      ) : mobile ? (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {visible.map((row) => (
            <View key={row.id} style={{ gap: 6 }}>
              <Pressable
                testID="records-card"
                accessibilityRole={hasCapture ? undefined : "button"}
                accessibilityLabel={`Open ${row.detail.title}`}
                onPress={() => onOpen(row)}
                style={{
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 10,
                  padding: 15,
                  gap: 12,
                }}
              >
                <Row style={{ alignItems: "center", gap: 10 }}>
                  {cell(row, page.columns[0], 0, "card")}
                  {showStatus && (
                    <Badge label={row.state.label} tone={row.state.tone} />
                  )}
                  <Icon name="eye" size={18} color={c.link} />
                </Row>
                {columns.length > 1 && (
                  // Label and value share one centred row, so media thumbnails
                  // line up with their label like plain text values do.
                  <View
                    style={{
                      gap: 10,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: c.border,
                    }}
                  >
                    {columns.slice(1).map((col, j) => (
                      <Row
                        key={col.id}
                        style={{ alignItems: "center", gap: 12 }}
                      >
                        <Txt
                          size={10}
                          bold
                          color={c.muted}
                          style={{ flex: 1, letterSpacing: 0.6 }}
                        >
                          {col.label.toUpperCase()}
                        </Txt>
                        {cell(row, col, j + 1, "card")}
                      </Row>
                    ))}
                  </View>
                )}
              </Pressable>
              {actions.get(row.id) !== undefined && (
                <Row style={{ justifyContent: "flex-end" }}>
                  {actions.get(row.id)}
                </Row>
              )}
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View
            style={{
              flex: 1,
              minWidth: Math.max(
                360,
                columns.length * 140 +
                  (showStatus ? statusWidth + TABLE_GAP : 0) +
                  VIEW_WIDTH +
                  TABLE_PAD * 2 +
                  (hasActions ? actionsWidth + TABLE_GAP : 0),
              ),
            }}
          >
            {hasActions && (
              // Hidden copy of the table's first action, measured so the
              // actions column has its width even on pages without actions.
              <View
                aria-hidden
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                onLayout={measureActions}
                style={
                  {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    opacity: 0,
                    visibility: "hidden",
                  } as object
                }
              >
                {firstAction}
              </View>
            )}
            <View
              testID="records-header"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: TABLE_GAP,
                paddingHorizontal: TABLE_PAD,
                minHeight: 35,
                backgroundColor: c.primarySoft,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: c.border,
              }}
            >
              {columns.map((col, i) => (
                <Pressable
                  key={col.id}
                  testID="records-head-cell"
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${col.label}`}
                  onPress={() =>
                    setSort({
                      key: col.id,
                      asc: sort.key !== col.id || !sort.asc,
                    })
                  }
                  style={columnStyle(i)}
                >
                  <Txt size={11} color={c.muted} bold>
                    {col.label.toUpperCase()}
                    {sort.key === col.id ? (sort.asc ? " ↑" : " ↓") : ""}
                  </Txt>
                </Pressable>
              ))}
              {showStatus && (
                <View
                  testID="records-head-cell-status"
                  style={{ width: statusWidth }}
                >
                  <Txt size={11} color={c.muted} bold>
                    STATUS
                  </Txt>
                </View>
              )}
              <View
                testID="records-head-cell-chevron"
                style={{ width: VIEW_WIDTH, alignItems: "center" }}
              >
                <Txt size={11} bold color={c.muted}>
                  VIEW
                </Txt>
              </View>
              {hasActions && (
                <View
                  testID="records-head-cell-actions"
                  style={{ width: actionsWidth }}
                />
              )}
            </View>
            {visible.map((row, i) => (
              <View
                key={row.id}
                testID="records-row"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: TABLE_GAP,
                  paddingRight: hasActions ? TABLE_PAD : 0,
                  borderBottomWidth: i < visible.length - 1 ? 1 : 0,
                  borderColor: c.border,
                }}
              >
                <Pressable
                  accessibilityRole={hasCapture ? undefined : "button"}
                  accessibilityLabel={`Open ${row.detail.title}`}
                  onPress={() => onOpen(row)}
                  style={({ pressed, hovered }) => ({
                    flex: 1,
                    minWidth: 0,
                    paddingLeft: TABLE_PAD,
                    paddingRight: hasActions ? 0 : TABLE_PAD,
                    paddingVertical: 11,
                    flexDirection: "row",
                    gap: TABLE_GAP,
                    alignItems: "center",
                    minHeight: hasCapture ? CAPTURE_ROW_HEIGHT : 55,
                    backgroundColor:
                      pressed || hovered ? c.primarySoft : c.surface,
                  })}
                >
                  {columns.map((col, j) => (
                    <View
                      key={col.id}
                      testID="records-cell"
                      style={[columnStyle(j), { gap: 4 }]}
                    >
                      {cell(row, col, j, "table")}
                    </View>
                  ))}
                  {showStatus && (
                    <View
                      testID="records-cell-status"
                      style={{ width: statusWidth, flexDirection: "row" }}
                    >
                      {/* Sized by content so the column can fit the widest pill. */}
                      <View
                        onLayout={measureStatus}
                        style={{ flexShrink: 0, maxWidth: STATUS_MAX }}
                      >
                        <Badge label={row.state.label} tone={row.state.tone} />
                      </View>
                    </View>
                  )}
                  <View
                    testID="records-cell-chevron"
                    style={{ width: VIEW_WIDTH, alignItems: "center" }}
                  >
                    <Icon name="eye" size={17} color={c.link} />
                  </View>
                </Pressable>
                {hasActions && (
                  <View
                    testID="records-cell-actions"
                    style={{
                      width: actionsWidth,
                      flexDirection: "row",
                      justifyContent: "flex-end",
                    }}
                  >
                    {actions.get(row.id) !== undefined && (
                      <View onLayout={measureActions} style={{ flexShrink: 0 }}>
                        {actions.get(row.id)}
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      <Pager
        index={index}
        pageSize={PAGE_SIZE}
        total={rows.length}
        onChange={setIndex}
        style={{
          padding: 17,
          borderTopWidth: 1,
          borderColor: c.border,
          marginTop: mobile ? 16 : 0,
        }}
      />
      {galleryFor && (
        <PersonGalleryDialog
          record={galleryFor}
          onClose={() => setGalleryFor(undefined)}
        />
      )}
    </Card>
  );
}
