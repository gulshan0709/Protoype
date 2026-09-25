import { userIdentity } from "../../../domain/contracts/userIdentity";
import { RecordMedia } from "./RecordMedia";
import { UserIdentity } from "./UserIdentity";
import React, { useState, useMemo, useEffect } from "react";
import { View, Pressable, ScrollView, useWindowDimensions } from "react-native";
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
                <Row style={{ justifyContent: "space-between" }}>
                  {userIdentity(row) ? (
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
                  ) : (
                    <Txt size={13} bold style={{ flex: 1 }}>
                      {cellText(row.cells[page.columns[0].id])}
                    </Txt>
                  )}
                  <Icon name="chevron" size={16} />
                </Row>
                {showStatus && (
                  <Badge label={row.state.label} tone={row.state.tone} />
                )}
                {columns.slice(1).map((col) => (
                  <Row key={col.id} style={{ alignItems: "flex-start" }}>
                    <Txt size={11} color={c.muted} style={{ flex: 1 }}>
                      {col.label}
                    </Txt>
                    {col.id === "capture" ? (
                      <RecordMedia record={row} />
                    ) : (
                      <Txt size={12} style={{ flex: 1, textAlign: "right" }}>
                        {cellText(row.cells[col.id])}
                      </Txt>
                    )}
                  </Row>
                ))}
              </Pressable>
              {renderRowActions && (
                <Row style={{ justifyContent: "flex-end" }}>
                  {renderRowActions(row)}
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
                  (showStatus ? 116 : 0) +
                  39 +
                  (renderRowActions ? 45 : 0),
              ),
            }}
          >
            <Row
              style={{
                paddingHorizontal: 12,
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
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${col.label}`}
                  onPress={() =>
                    setSort({
                      key: col.id,
                      asc: sort.key !== col.id || !sort.asc,
                    })
                  }
                  style={{ flex: i === 0 ? 1.35 : 1, paddingRight: 12 }}
                >
                  <Txt size={11} color={c.muted} bold>
                    {col.label.toUpperCase()}
                    {sort.key === col.id ? (sort.asc ? " ↑" : " ↓") : ""}
                  </Txt>
                </Pressable>
              ))}
              {showStatus && (
                <Txt size={11} color={c.muted} bold style={{ width: 116 }}>
                  Status
                </Txt>
              )}
              <View style={{ width: 15 }} />
              {renderRowActions && <View style={{ width: 35 }} />}
            </Row>
            {visible.map((row, i) => (
              <View
                key={row.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderBottomWidth: i < visible.length - 1 ? 1 : 0,
                  borderColor: c.border,
                }}
              >
                <Pressable
                  accessibilityRole={
                    columns.some((col) => col.id === "capture")
                      ? undefined
                      : "button"
                  }
                  accessibilityLabel={`Open ${row.detail.title}`}
                  onPress={() => onOpen(row)}
                  style={({ pressed, hovered }: any) => ({
                    flex: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 11,
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "center",
                    minHeight: 55,
                    backgroundColor:
                      pressed || hovered ? c.primarySoft : c.surface,
                  })}
                >
                  {columns.map((col, j) => (
                    <View
                      key={col.id}
                      style={{
                        flex: j === 0 ? 1.35 : 1,
                        paddingRight: 12,
                        gap: 4,
                      }}
                    >
                      {col.id === "capture" ? (
                        <RecordMedia record={row} />
                      ) : j === 0 &&
                        userIdentity(row) ? (
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
                    <View style={{ width: 116 }}>
                      <Badge label={row.state.label} tone={row.state.tone} />
                    </View>
                  )}
                  <Icon name="chevron" size={15} />
                </Pressable>
                {renderRowActions && (
                  <View style={{ paddingRight: 10 }}>
                    {renderRowActions(row)}
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
