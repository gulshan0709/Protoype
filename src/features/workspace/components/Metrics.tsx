import { memo } from "react";
import {
  View,
  Pressable,
  useWindowDimensions,
  type DimensionValue,
} from "react-native";
import type { Metric } from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { Card, Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { primaryMetricIndex } from "../../../domain/contracts/priority";

export const Metrics = memo(function Metrics({
  metrics,
  scope,
  narrow,
  onPress,
  accent,
  labelFor,
}: {
  metrics: Metric[];
  scope: string;
  narrow: boolean;
  onPress: (metric: Metric) => void;
  /** Mission color; when set, one priority KPI leads the supporting ones. */
  accent?: string;
  /** Optional display label; the original metric label remains the route key. */
  labelFor?: (metric: Metric) => string;
}) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const columns = width < 420 ? 1 : narrow ? 2 : metrics.length;
  const primary = accent ? primaryMetricIndex(metrics) : -1;
  const ordered =
    primary > 0
      ? [metrics[primary], ...metrics.filter((_, i) => i !== primary)]
      : metrics;
  // On two-column layouts the priority KPI takes the whole first row.
  const span = primary >= 0 && columns === 2 && metrics.length > 1;
  const cell = (
    k: number,
  ): { basis: DimensionValue; right: boolean; bottom: boolean } => {
    const n = ordered.length;
    if (columns === 1)
      return { basis: "100%", right: false, bottom: k < n - 1 };
    if (span && k === 0) return { basis: "100%", right: false, bottom: true };
    if (columns === 2) {
      const j = span ? k - 1 : k;
      const m = span ? n - 1 : n;
      return {
        basis: "50%",
        right: j % 2 === 0 && j + 1 < m,
        bottom: j < m - (m % 2 || 2),
      };
    }
    return { basis: 0, right: k < n - 1, bottom: false };
  };
  return (
    <Card
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        padding: 0,
        overflow: "hidden",
      }}
    >
      {ordered.map((metric, i) => {
        const label = labelFor?.(metric) ?? metric.label;
        const lead = primary >= 0 && i === 0;
        const layout = cell(i);
        const valueColor =
          metric.tone === "critical"
            ? c.critical
            : ["attention", "pending", "unavailable"].includes(metric.tone)
              ? c.attention
              : c.text;
        return (
          <Pressable
            key={metric.label}
            accessibilityRole="button"
            accessibilityLabel={"Explore " + label}
            onPress={() => onPress(metric)}
            style={({ pressed, hovered }) => ({
              flexGrow: 1,
              flexBasis: layout.basis,
              minWidth: 0,
              minHeight: 98,
              paddingVertical: 14,
              paddingHorizontal: 16,
              paddingRight: 32,
              borderRightWidth: layout.right ? 1 : 0,
              borderBottomWidth: layout.bottom ? 1 : 0,
              borderColor: c.border,
              backgroundColor:
                pressed || hovered
                  ? lead
                    ? c.background
                    : c.primarySoft
                  : lead
                    ? c.primarySoft
                    : c.surface,
              ...(lead && { borderTopWidth: 3, borderTopColor: accent }),
            })}
          >
            <Txt size={12} color={c.muted}>
              {lead && (
                <Txt size={12} bold color={accent}>
                  {"Priority · "}
                </Txt>
              )}
              {label}
            </Txt>
            <Txt
              size={lead ? (narrow ? 26 : 30) : narrow ? 22 : 26}
              bold
              color={valueColor}
              style={{
                lineHeight: lead ? (narrow ? 30 : 35) : narrow ? 26 : 30,
                marginTop: 5,
                marginBottom: 3,
              }}
            >
              {metric.valuesByScope?.[scope] ?? metric.value}
            </Txt>
            <Txt size={11} color={c.muted}>
              {metric.contextsByScope?.[scope] ?? metric.context}
            </Txt>
            <View style={{ position: "absolute", right: 10, top: "45%" }}>
              <Icon name="chevron" size={18} color={c.link} />
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
});
