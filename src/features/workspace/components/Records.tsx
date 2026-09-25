import React, { useState, useMemo } from "react";
import { View, Pressable, ScrollView, useWindowDimensions } from "react-native";
import type {
  PageContract,
  DataRecord,
  Action,
} from "../../../domain/contracts/types";
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
import { REF, RefButton, RefInput } from "./referenceUi";
function ToolbarFrame({
  wrap,
  children,
}: {
  wrap: boolean;
  children: React.ReactNode;
}) {
  const c = useTheme();
  const layout = {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
  };
  return wrap ? (
    <View
      style={{
        ...layout,
        flexWrap: "wrap",
        borderTopWidth: 1,
        borderColor: c.border,
      }}
    >
      {children}
    </View>
  ) : (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ borderTopWidth: 1, borderColor: c.border }}
      contentContainerStyle={{ ...layout, flexGrow: 1 }}
    >
      {children}
    </ScrollView>
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
  reference,
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
  // Education v2 reference layout: the panel owns the page heading, labelled
  // filters, page actions and a scoped record count.
  reference?: {
    scope: string;
    onPrimary: (action: Action) => void;
    kpiFilter?: string;
    onClearKpi: () => void;
    // Class / lab setup for roles that may create them on this page.
    setup?: {
      kind: string;
      label: string;
      onAdd: () => void;
      onBulk?: () => void;
    }[];
    // Row "⋮" menu (Learners / Edit / Delete) where the role may manage rows.
    rowMenu?: (row: DataRecord) => React.ReactNode;
  };
}) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  // Reference layout breakpoints: below 1400px the toolbar wraps instead of
  // hiding its actions; below 1100px rows render as cards so state and
  // actions stay visible on tablets and phones.
  const wrapToolbar = width < 1400;
  const cards = reference ? width < 1100 : mobile;
  const [sort, setSort] = useState({ key: "", asc: true });
  const [index, setIndex] = useState(0);
  const sorted = useMemo(
    () =>
      sort.key
        ? [...rows].sort(
            (a, b) =>
              cellText(a.cells[sort.key]).localeCompare(
                cellText(b.cells[sort.key]),
                undefined,
                { numeric: true },
              ) * (sort.asc ? 1 : -1),
          )
        : rows,
    [rows, sort],
  );
  const maxPage = Math.max(0, Math.ceil(sorted.length / 10) - 1);
  const current = Math.min(index, maxPage);
  const visible = sorted.slice(current * 10, current * 10 + 10);
  const columns = page.columns;
  const recordLabel = page.recordLabel ?? "record";
  const eyebrow = (page.recordLabel ?? page.detailType)
    .replaceAll("_", "-")
    .toUpperCase();
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 12,
        boxShadow: c.panelShadow,
        overflow: "hidden",
      }}
    >
      {reference ? (
        <>
          <Row
            style={{
              padding: mobile ? 12 : 14,
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <View
              style={{ flexGrow: 1, flexShrink: 1, flexBasis: 260, gap: 3 }}
            >
              <Txt size={9} bold color="#0781ae" style={{ letterSpacing: 1.1 }}>
                {eyebrow}
              </Txt>
              <Txt size={15} bold>
                {page.heading}
              </Txt>
              <Txt size={11} color={c.muted}>
                {page.description}
              </Txt>
            </View>
            {reference.setup?.map((item) => (
              <React.Fragment key={item.kind}>
                <RefButton
                  label={item.label}
                  icon="plus"
                  kind="primary"
                  onPress={item.onAdd}
                />
                {item.onBulk && (
                  <RefButton
                    label={`Bulk Upload ${item.label}`}
                    icon="folder"
                    onPress={item.onBulk}
                  />
                )}
              </React.Fragment>
            ))}
            <View
              style={{
                paddingVertical: 5,
                paddingHorizontal: 8,
                borderRadius: 99,
                backgroundColor: c.primarySoft,
              }}
            >
              <Txt size={10} color={c.muted}>
                Updated now
              </Txt>
            </View>
          </Row>
          <ToolbarFrame wrap={wrapToolbar}>
            <View
              style={
                wrapToolbar
                  ? { flexGrow: 2, flexBasis: 200, gap: 4 }
                  : { flex: 1, minWidth: 140, gap: 4 }
              }
            >
              <Txt size={9} color={c.muted} style={{ letterSpacing: 0.8 }}>
                SEARCH{" "}
                {(page.recordLabel
                  ? `${page.recordLabel}s`
                  : "records"
                ).toUpperCase()}
              </Txt>
              <RefInput
                value={query}
                onChange={onQuery}
                placeholder="Search this page"
              />
            </View>
            {page.filters.map((f) => {
              // The first authored option is the unfiltered default.
              const [first, ...rest] = f.options.map((o) =>
                typeof o === "string" ? { label: o, value: o } : o,
              );
              return (
                <View
                  key={f.id}
                  style={
                    wrapToolbar
                      ? { flexGrow: 1, flexBasis: 140, gap: 4 }
                      : { minWidth: 125, gap: 4 }
                  }
                >
                  <Txt size={9} color={c.muted} style={{ letterSpacing: 0.8 }}>
                    {f.label.toUpperCase()}
                  </Txt>
                  <Select
                    field
                    compact
                    label={f.label}
                    value={filters[f.id] ?? ""}
                    options={[
                      { label: first?.label ?? "All", value: "" },
                      ...rest,
                    ]}
                    onChange={(value) => onFilter(f.id, value)}
                  />
                </View>
              );
            })}
            <RefButton label="Export" kind="export" onPress={onExport} />
            {page.primaryAction && (
              <RefButton
                label={page.primaryAction.label}
                kind="primary"
                onPress={() => reference.onPrimary(page.primaryAction!)}
              />
            )}
          </ToolbarFrame>
          {!!reference.kpiFilter && (
            <Row
              style={{
                marginHorizontal: mobile ? 12 : 14,
                marginBottom: 12,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: c.primarySoft,
                justifyContent: "space-between",
              }}
            >
              <Txt size={11}>
                KPI drilldown:{" "}
                <Txt size={11} bold>
                  {reference.kpiFilter}
                </Txt>
              </Txt>
              <Button
                compact
                variant="ghost"
                label="Clear"
                onPress={reference.onClearKpi}
              />
            </Row>
          )}
        </>
      ) : (
        <View style={{ padding: mobile ? 12 : 14, gap: 10 }}>
          <SectionTitle
            title={
              page.recordLabel
                ? page.recordLabel.charAt(0).toUpperCase() +
                  page.recordLabel.slice(1)
                : "Workspace records"
            }
            subtitle={`${rows.length} records · assigned scope`}
            trailing={
              <Button
                compact
                label="Export"
                icon="download"
                onPress={onExport}
              />
            }
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
            contentContainerStyle={{ gap: 7 }}
          >
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
          </ScrollView>
        </View>
      )}
      {!rows.length ? (
        <EmptyState
          title="No matching records"
          description={
            reference?.kpiFilter
              ? "The selected KPI has no matching records in this scope."
              : page.states.empty
          }
          action={
            reference
              ? // Only offer "Clear filters" when something is filtered.
                query ||
                Object.values(filters).some(Boolean) ||
                reference.kpiFilter
                ? () => {
                    onClear();
                    reference.onClearKpi();
                  }
                : undefined
              : onClear
          }
        />
      ) : cards ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: reference ? 12 : 0,
            gap: 12,
            flexDirection: "row",
            flexWrap: "wrap",
          }}
        >
          {visible.map((row) => (
            <View
              key={row.id}
              style={{
                // One column on phones, two on tablets.
                flexGrow: 1,
                flexBasis: mobile ? "100%" : "45%",
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 10,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${row.detail.title}`}
                onPress={() => onOpen(row)}
                style={{ padding: 15, gap: 12 }}
              >
                <Row style={{ justifyContent: "space-between" }}>
                  <Txt
                    size={13}
                    bold
                    style={{
                      flex: 1,
                      marginRight: reference?.rowMenu ? 32 : 0,
                    }}
                  >
                    {cellText(row.cells[page.columns[0].id])}
                  </Txt>
                  <Icon name="chevron" size={16} />
                </Row>
                <Badge label={row.state.label} tone={row.state.tone} />
                {columns.slice(1).map((col) => (
                  <Row key={col.id} style={{ alignItems: "flex-start" }}>
                    <Txt size={10} color={c.muted} style={{ flex: 1 }}>
                      {col.label}
                    </Txt>
                    <Txt size={11} style={{ flex: 1, textAlign: "right" }}>
                      {cellText(row.cells[col.id])}
                    </Txt>
                  </Row>
                ))}
              </Pressable>
              {reference?.rowMenu && (
                <View style={{ position: "absolute", top: 9, right: 38 }}>
                  {reference.rowMenu(row)}
                </View>
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
              // The reference table shrinks to fit its panel; only narrow screens scroll.
              minWidth: reference
                ? 760
                : Math.max(610, columns.length * 135 + 150),
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
                  <Txt size={10} color={c.muted} bold>
                    {col.label.toUpperCase()}
                    {sort.key === col.id ? (sort.asc ? " ↑" : " ↓") : ""}
                  </Txt>
                </Pressable>
              ))}
              <Txt size={10} color={c.muted} bold style={{ width: 116 }}>
                {reference ? "STATE" : "Status"}
              </Txt>
              {reference ? (
                <Txt
                  size={10}
                  color={c.muted}
                  bold
                  style={{
                    width: reference.rowMenu ? 84 : 52,
                    textAlign: "center",
                  }}
                >
                  ACTION
                </Txt>
              ) : (
                <View style={{ width: 15 }} />
              )}
            </Row>
            {visible.map((row, i) => (
              <View
                key={row.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: c.surface,
                  borderBottomWidth: i < visible.length - 1 ? 1 : 0,
                  borderColor: c.border,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${row.detail.title}`}
                  onPress={() => onOpen(row)}
                  style={({ pressed, hovered }: any) => ({
                    flex: 1,
                    paddingLeft: 12,
                    paddingRight: reference?.rowMenu ? 0 : 12,
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
                      <Txt size={11} bold={j === 0}>
                        {cellText(row.cells[col.id])}
                      </Txt>
                      {!!cellSecondary(row.cells[col.id]) && (
                        <Txt size={10} color={c.muted}>
                          {cellSecondary(row.cells[col.id])}
                        </Txt>
                      )}
                      {j === 0 && !reference && (
                        <Txt size={9} color={c.subtle}>
                          {row.type.replaceAll("-", " ").replaceAll("_", " ")}
                        </Txt>
                      )}
                    </View>
                  ))}
                  <View style={{ width: 116 }}>
                    <Badge label={row.state.label} tone={row.state.tone} />
                  </View>
                  {reference ? (
                    <View
                      style={{
                        width: 52,
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: REF.cyan,
                          backgroundColor: c.surface,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name="eye" size={16} color="#0b7eac" />
                      </View>
                    </View>
                  ) : (
                    <Icon name="chevron" size={15} />
                  )}
                </Pressable>
                {reference?.rowMenu && (
                  <View
                    style={{ width: 32, marginRight: 12, alignItems: "center" }}
                  >
                    {reference.rowMenu(row)}
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
          marginTop: cards ? 16 : 0,
          justifyContent: "space-between",
        }}
      >
        <Txt size={10} color={c.muted}>
          {reference
            ? `${rows.length} ${recordLabel}${rows.length === 1 ? "" : "s"} · ${reference.scope}`
            : rows.length
              ? `${current * 10 + 1}–${Math.min(current * 10 + 10, rows.length)} of ${rows.length}`
              : "0 records"}
        </Txt>
        {reference ? (
          <Row style={{ gap: 6 }}>
            {[
              ["‹", "Previous page", current - 1, current === 0],
              [String(current + 1), "Current page", current, false],
              ["›", "Next page", current + 1, current >= maxPage],
            ].map(([label, name, target, disabled], i) => (
              <Pressable
                key={name as string}
                accessibilityRole="button"
                accessibilityLabel={name as string}
                disabled={disabled as boolean}
                onPress={() => setIndex(target as number)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: i === 1 ? REF.cyan : c.border,
                  backgroundColor: i === 1 ? REF.cyan : c.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                <Txt
                  size={11}
                  bold={i === 1}
                  color={i === 1 ? REF.actionInk : c.text}
                >
                  {label as string}
                </Txt>
              </Pressable>
            ))}
          </Row>
        ) : (
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
        )}
      </Row>
    </View>
  );
}
