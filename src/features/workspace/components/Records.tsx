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
  SectionTitle,
} from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Select } from "../../../shared/ui/Select";
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
  const [sort, setSort] = useState({ key: "", asc: true });
  const [index, setIndex] = useState(0);
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
      <View style={{ padding: mobile ? 12 : 14, gap: 10 }}>
        <SectionTitle
          title={
            page.recordLabel
              ? page.recordLabel.charAt(0).toUpperCase() +
                page.recordLabel.slice(1)
              : "Workspace records"
          }
          subtitle={`${rows.length} records · assigned scope`}
        />
        <Row style={{ flexWrap: "wrap" }}>
          <View style={{ flexGrow: 1, flexBasis: 160 }}>
            <Field
              value={query}
              onChange={onQuery}
              placeholder="Search records…"
            />
          </View>
          <Select
            compact
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
        </Row>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, alignItems: "center", gap: 12 }}
        >
          <Row style={{ flexGrow: 1, flexShrink: 0, gap: 7 }}>
            {page.filters
              .filter((f) => f.id !== "state")
              .map((f) => (
                <Select
                  key={f.id}
                  compact
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
              ))}
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
        </ScrollView>
      </View>
      {!rows.length ? (
        <EmptyState
          title="No matching records"
          description={page.states.empty}
          action={onClear}
        />
      ) : mobile ? (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {visible.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
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
                <Txt size={13} bold style={{ flex: 1 }}>
                  {cellText(row.cells[page.columns[0].id])}
                </Txt>
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
                  <Txt size={12} style={{ flex: 1, textAlign: "right" }}>
                    {cellText(row.cells[col.id])}
                  </Txt>
                </Row>
              ))}
            </Pressable>
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
                columns.length * 140 + (showStatus ? 116 : 0) + 39,
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
            </Row>
            {visible.map((row, i) => (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${row.detail.title}`}
                onPress={() => onOpen(row)}
                style={({ pressed, hovered }: any) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "center",
                  minHeight: 55,
                  backgroundColor:
                    pressed || hovered ? c.primarySoft : c.surface,
                  borderBottomWidth: i < visible.length - 1 ? 1 : 0,
                  borderColor: c.border,
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
                    <Txt size={12} bold={j === 0}>
                      {cellText(row.cells[col.id])}
                    </Txt>
                    {!!cellSecondary(row.cells[col.id]) && (
                      <Txt size={11} color={c.muted}>
                        {cellSecondary(row.cells[col.id])}
                      </Txt>
                    )}
                    {j === 0 && (
                      <Txt size={11} color={c.subtle}>
                        {row.type.replaceAll("-", " ").replaceAll("_", " ")}
                      </Txt>
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
