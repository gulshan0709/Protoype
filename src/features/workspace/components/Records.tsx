import { RecordMedia } from "./RecordMedia";
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
  Field,
} from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Select } from "../../../shared/ui/Select";
import { Dialog } from "../../../shared/ui/Dialog";
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
const CHEVRON_WIDTH = 16;
const STATUS_MIN = 116;
const STATUS_MAX = 220;
const ACTIONS_MIN = 35;
const CAPTURE_ROW_HEIGHT = 74;
const columnStyle = (index: number) => ({
  flex: index === 0 ? 1.35 : 1,
  minWidth: 0,
  paddingRight: 12,
});
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
  const selected = visibleColumnIds(page, app.columnPreferences[preferenceKey]);
  const columns = columnOptions(page).filter(
    (column) =>
      column.id !== RECORD_STATUS_COLUMN && selected.includes(column.id),
  );
  const showStatus = selected.includes(RECORD_STATUS_COLUMN);
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = Object.values(filters).filter(
    (value) => value && !/^(all\b|across\b|current$)/i.test(value),
  ).length;
  useEffect(() => {
    setFiltersOpen(false);
  }, [mobile, page.id, app.workspace.scope]);
  const [sort, setSort] = useState({ key: "", asc: true });
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [query, filters, page.id, app.workspace.scope]);
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
  const maxPage = Math.max(0, Math.ceil(sorted.length / 10) - 1);
  const current = Math.min(index, maxPage);
  const visible = sorted.slice(current * 10, current * 10 + 10);
  const actionFor = (row: DataRecord) => {
    const action = renderRowActions?.(row);
    return action === null || action === undefined || action === false
      ? undefined
      : action;
  };
  // One trailing actions column is reserved for the whole table as soon as
  // any row has an action; rows without one leave it empty.
  const firstAction = rows.find((row) => actionFor(row) !== undefined);
  const hasActions = !!firstAction;
  const [statusWidth, measureStatus] = useFitWidth(STATUS_MIN, STATUS_MAX);
  const [actionsWidth, measureActions] = useFitWidth(ACTIONS_MIN, 320);
  const hasCapture = columns.some((col) => col.id === "capture");
  // Person chips of the visible rows: the row's identity (or a first cell
  // naming a person) and every other cell naming someone else. Sorting,
  // filtering and search keep using the cell data.
  const people = new Map(
    visible.map((row) => {
      const identity = personIdentity(row);
      const lead = identity
        ? undefined
        : cellPerson(row.cells[page.columns[0].id]);
      const cells: Record<string, PersonChipProps | undefined> = {};
      columns.forEach((col, j) => {
        if (col.id !== "capture" && (j > 0 || !identity))
          cells[col.id] = cellPerson(
            row.cells[col.id],
            j > 0 ? (identity ?? lead) : undefined,
          );
      });
      return [row.id, { identity, lead, cells }] as const;
    }),
  );
  const filterFields = (
    <>
      {page.filters
        .filter((f) => f.id !== "state")
        .map((f) => (
          <View
            key={f.id}
            style={{
              flexGrow: mobile ? 0 : 1,
              flexBasis: mobile ? "100%" : 120,
              minWidth: 0,
              gap: 5,
            }}
          >
            <Txt size={11} color={c.muted}>
              {mobile ? f.label : f.label.toUpperCase()}
            </Txt>
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
          </View>
        ))}
      <View
        style={{
          flexGrow: mobile ? 0 : 1,
          flexBasis: mobile ? "100%" : 120,
          minWidth: 0,
          gap: 5,
        }}
      >
        <Txt size={11} color={c.muted}>
          {mobile ? "Status" : "STATUS"}
        </Txt>
        <Select
          height={44}
          label="Filter by state"
          value={filters.state ?? ""}
          options={[
            { label: "All statuses", value: "" },
            ...[
              "healthy",
              "attention",
              "critical",
              "pending",
              "unavailable",
              "complete",
              "neutral",
            ].map((tone) => ({
              label: {
                healthy: "Healthy",
                attention: "Needs attention",
                critical: "Critical",
                pending: "Pending",
                unavailable: "Source unavailable",
                complete: "Complete",
                neutral: "Open",
              }[tone]!,
              value: {
                healthy: "Healthy",
                attention: "Needs attention",
                critical: "Critical",
                pending: "Pending",
                unavailable: "Source unavailable",
                complete: "Complete",
                neutral: "Open",
              }[tone]!,
            })),
          ]}
          onChange={(value) => onFilter("state", value)}
          icon="filter"
        />
      </View>
    </>
  );
  return (
    <View
      testID="records-table"
      style={{
        backgroundColor: c.surface,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 12,
        boxShadow: c.panelShadow,
        overflow: "hidden",
      }}
    >
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
          <Txt size={15} bold>
            {page.heading}
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
              value={query}
              onChange={onQuery}
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
            {(query || Object.values(filters).some(Boolean)) && (
              <Button compact variant="ghost" label="Clear" onPress={onClear} />
            )}
          </Row>
          <Row style={{ flexShrink: 0, gap: 8 }}>
            <ColumnPicker
              page={page}
              selected={selected}
              onChange={(ids) => app.setColumnPreference(preferenceKey, ids)}
            />
            <Button compact label="Export" icon="download" onPress={onExport} />
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
          action={onClear}
        />
      ) : mobile ? (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {visible.map((row) => (
            <View key={row.id} style={{ gap: 6 }}>
              <Pressable
                testID="records-card"
                accessibilityRole={
                  columns.some((col) => col.id === "capture")
                    ? undefined
                    : "button"
                }
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
                  {people.get(row.id)?.identity ? (
                    <>
                      {columns.some((col) => col.id === "capture") ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${row.detail.title}`}
                          onPress={(event) => {
                            event.stopPropagation();
                            onOpen(row);
                          }}
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <UserIdentity record={row} />
                        </Pressable>
                      ) : (
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <UserIdentity record={row} />
                        </View>
                      )}
                    </>
                  ) : people.get(row.id)?.lead ? (
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <PersonChip {...people.get(row.id)!.lead!} />
                    </View>
                  ) : (
                    <Txt size={13} bold style={{ flex: 1 }}>
                      {cellText(row.cells[page.columns[0].id])}
                    </Txt>
                  )}
                  {showStatus && (
                    <Badge label={row.state.label} tone={row.state.tone} />
                  )}
                  <Icon name="chevron" size={16} />
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
                    {columns.slice(1).map((col) => (
                      <Row key={col.id} style={{ alignItems: "center", gap: 12 }}>
                        <Txt
                          size={10}
                          bold
                          color={c.muted}
                          style={{ flex: 1, letterSpacing: 0.6 }}
                        >
                          {col.label.toUpperCase()}
                        </Txt>
                        {col.id === "capture" ? (
                          <RecordMedia record={row} />
                        ) : people.get(row.id)?.cells[col.id] ? (
                          <View
                            style={{
                              flex: 1.4,
                              minWidth: 0,
                              alignItems: "flex-end",
                            }}
                          >
                            <PersonChip
                              {...people.get(row.id)!.cells[col.id]!}
                              align="end"
                            />
                          </View>
                        ) : (
                          <Txt size={12} style={{ flex: 1.4, textAlign: "right" }}>
                            {cellText(row.cells[col.id])}
                          </Txt>
                        )}
                      </Row>
                    ))}
                  </View>
                )}
              </Pressable>
              {actionFor(row) !== undefined && (
                <Row style={{ justifyContent: "flex-end" }}>
                  {actionFor(row)}
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
                  CHEVRON_WIDTH +
                  TABLE_PAD * 2 +
                  (hasActions ? actionsWidth + TABLE_GAP : 0),
              ),
            }}
          >
            {firstAction && (
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
                {actionFor(firstAction)}
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
                style={{ width: CHEVRON_WIDTH }}
              />
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
                  style={({ pressed, hovered }: any) => ({
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
                      {col.id === "capture" ? (
                        <RecordMedia record={row} />
                      ) : j === 0 && people.get(row.id)?.identity ? (
                        <>
                          {columns.some((col) => col.id === "capture") ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Open ${row.detail.title}`}
                              onPress={(event) => {
                                event.stopPropagation();
                                onOpen(row);
                              }}
                              style={{ flex: 1, minWidth: 0 }}
                            >
                              <UserIdentity record={row} />
                            </Pressable>
                          ) : (
                            <UserIdentity record={row} />
                          )}
                        </>
                      ) : people.get(row.id)?.cells[col.id] ? (
                        // Any other cell naming a person (host, owner, approver…).
                        <PersonChip {...people.get(row.id)!.cells[col.id]!} />
                      ) : (
                        <>
                          <Txt size={12} bold={j === 0}>
                            {cellText(row.cells[col.id])}
                          </Txt>
                          {!!cellSecondary(row.cells[col.id]) && (
                            <Txt size={11} color={c.muted}>
                              {cellSecondary(row.cells[col.id])}
                            </Txt>
                          )}
                          {j === 0 && row.type !== "surveillance_user" && (
                            <Txt size={11} color={c.subtle}>
                              {row.type
                                .replaceAll("-", " ")
                                .replaceAll("_", " ")}
                            </Txt>
                          )}
                        </>
                      )}
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
                    style={{ width: CHEVRON_WIDTH, alignItems: "center" }}
                  >
                    <Icon name="chevron" size={15} />
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
                    {actionFor(row) !== undefined && (
                      <View onLayout={measureActions} style={{ flexShrink: 0 }}>
                        {actionFor(row)}
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      <Row
        style={{
          padding: 17,
          borderTopWidth: 1,
          borderColor: c.border,
          marginTop: mobile ? 16 : 0,
          justifyContent: "space-between",
        }}
      >
        <Txt size={11} color={c.muted}>
          {rows.length
            ? `${current * 10 + 1}–${Math.min(current * 10 + 10, rows.length)} of ${rows.length}`
            : "0 records"}
        </Txt>
        <Row>
          <Button
            compact
            label="Previous"
            onPress={() => setIndex(current - 1)}
            disabled={current === 0}
          />
          <Button
            compact
            label="Next"
            onPress={() => setIndex(current + 1)}
            disabled={current >= maxPage}
          />
        </Row>
      </Row>
    </View>
  );
}
