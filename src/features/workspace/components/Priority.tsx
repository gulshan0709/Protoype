import React from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import type {
  DataRecord,
  Metric,
  PageContract,
} from "../../../domain/contracts/types";
import { cellText } from "../../../domain/contracts/logic";
import {
  decisionOwner,
  sourceHealth,
  type Mission,
  type QueueItem,
} from "../../../domain/contracts/priority";
import {
  missionColor,
  toneColors,
  useTheme,
} from "../../../shared/theme/Theme";
import { Badge, Card, Row, Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";

/** Quiet orientation label shown above the page title. */
export function MissionLabel({ mission }: { mission: Mission }) {
  const c = useTheme();
  const color = missionColor(c, mission.family);
  return (
    <Row style={{ gap: 6 }}>
      <View
        style={{
          width: 16,
          height: 3,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <Txt size={10} bold color={color} style={{ letterSpacing: 1.4 }}>
        {mission.label.toUpperCase()}
      </Txt>
    </Row>
  );
}

/** Compact pressable used for the next item and the readiness lanes. */
function Pill({
  label,
  caption,
  value,
  accent,
  onPress,
}: {
  label: string;
  caption: string;
  value: string;
  accent: string;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed, hovered }: any) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        maxWidth: 300,
        flexShrink: 1,
        paddingVertical: 7,
        paddingLeft: 12,
        paddingRight: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: pressed || hovered ? accent : c.border,
        backgroundColor: c.surface,
      })}
    >
      <View style={{ flexShrink: 1, minWidth: 0 }}>
        <Txt size={10} color={c.muted}>
          {caption}
        </Txt>
        <Txt size={13} bold lines={1}>
          {value}
        </Txt>
      </View>
      <Icon name="chevron" size={16} color={c.link} />
    </Pressable>
  );
}

const lanes = ["Security readiness", "Presence & integration"];

/**
 * First-level focus bar above the KPIs: the persona's mission and its next
 * action. Customer Admin sees its two readiness lanes instead.
 */
export function MissionBoard({
  mission,
  scope,
  count,
  critical,
  next,
  lanesFor,
  metrics,
  readinessLanes,
  onOpenRecord,
}: {
  mission: Mission;
  scope: string;
  /** Records in the current view that need action. */
  count: number;
  critical: boolean;
  next?: QueueItem<DataRecord>;
  /** Records the readiness lanes open, most severe first. */
  lanesFor: DataRecord[];
  metrics: Metric[];
  readinessLanes: boolean;
  onOpenRecord: (record: DataRecord) => void;
}) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const color = missionColor(c, mission.family);
  const compact = width < 900;
  const value = (m?: Metric) =>
    m ? (m.valuesByScope?.[scope] ?? m.value) : "Review";
  return (
    <Card
      style={{
        flexDirection: compact ? "column" : "row",
        alignItems: compact ? "stretch" : "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderLeftWidth: 3,
        borderLeftColor: color,
      }}
    >
      <View style={{ flex: compact ? undefined : 1, minWidth: 0, gap: 2 }}>
        <Txt size={14} bold>
          {mission.headline}
        </Txt>
        <Txt size={12} color={c.muted} lines={compact ? 3 : 2}>
          {mission.description}
        </Txt>
      </View>
      <Row style={{ gap: 8, flexWrap: "wrap" }}>
        {readinessLanes ? (
          lanes.map((lane, i) => {
            const target = lanesFor[i] ?? lanesFor[0];
            return (
              <Pill
                key={lane}
                label={`${lane}: review highest blocker`}
                caption={lane}
                value={value(metrics[i])}
                accent={color}
                onPress={() => target && onOpenRecord(target)}
              />
            );
          })
        ) : (
          <>
            <View style={{ gap: 3, justifyContent: "center" }}>
              <Txt size={10} color={c.muted}>
                {mission.queue}
              </Txt>
              <Badge
                label={count ? `${count} need action` : "All clear"}
                tone={count ? (critical ? "critical" : "attention") : "healthy"}
              />
            </View>
            {!!next && (
              <Pill
                label={`Open next: ${next.title}`}
                caption="Next"
                value={next.title}
                accent={color}
                onPress={() => onOpenRecord(next.record)}
              />
            )}
          </>
        )}
      </Row>
    </Card>
  );
}

/**
 * Standard top of a record detail: current state, who acts and how reliable
 * the sources are, next to the record's actions.
 */
export function DecisionBar({
  mission,
  record,
  page,
  scope,
  children,
}: {
  mission: Mission;
  record: DataRecord;
  page: PageContract;
  scope: string;
  children?: React.ReactNode;
}) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 1050;
  const health = sourceHealth(page.sources);
  const owner = decisionOwner(record.detail.facts, cellText, scope);
  const facts = [
    {
      label: "Current state",
      value: record.state.label,
      color: toneColors(c, record.state.tone).color,
    },
    { label: owner.label, value: owner.value },
    {
      label: "Source confidence",
      value: health.label,
      color: toneColors(c, health.tone).color,
    },
  ];
  return (
    <Card
      style={{
        flexDirection: wide ? "row" : "column",
        alignItems: wide ? "center" : "stretch",
        gap: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderLeftWidth: 3,
        borderLeftColor: missionColor(c, mission.family),
      }}
    >
      <View
        accessibilityLabel="Decision summary"
        style={{
          flex: wide ? 1 : undefined,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 22,
          rowGap: 10,
        }}
      >
        {facts.map((fact) => (
          <View key={fact.label} style={{ minWidth: 110, gap: 3 }}>
            <Txt size={11} color={c.muted}>
              {fact.label}
            </Txt>
            <Txt size={13} bold color={fact.color} lines={2}>
              {fact.value}
            </Txt>
          </View>
        ))}
      </View>
      {!!children && <Row style={{ flexWrap: "wrap", gap: 8 }}>{children}</Row>}
    </Card>
  );
}
