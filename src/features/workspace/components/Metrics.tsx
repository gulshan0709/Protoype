import React from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import { Metric } from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";

export function Metrics({
  metrics,
  scope,
  narrow,
  onPress,
}: {
  metrics: Metric[];
  scope: string;
  narrow: boolean;
  onPress: (metric: Metric) => void;
}) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const columns = width < 420 ? 1 : narrow ? 2 : metrics.length;
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 12,
        backgroundColor: c.surface,
        overflow: "hidden",
        boxShadow: c.panelShadow,
      }}
    >
      {metrics.map((metric, i) => {
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
            accessibilityLabel={"Explore " + metric.label}
            onPress={() => onPress(metric)}
            style={({ pressed, hovered }: any) => ({
              flexGrow: 1,
              flexBasis: columns === 1 ? "100%" : columns === 2 ? "50%" : 0,
              minWidth: 0,
              minHeight: 98,
              paddingVertical: 14,
              paddingHorizontal: 16,
              paddingRight: 32,
              borderRightWidth: (i + 1) % columns === 0 ? 0 : 1,
              borderBottomWidth: i < metrics.length - columns ? 1 : 0,
              borderColor: c.border,
              backgroundColor: pressed || hovered ? c.primarySoft : c.surface,
            })}
          >
            <Txt size={12} color={c.muted}>
              {metric.label}
            </Txt>
            <Txt
              size={narrow ? 22 : 26}
              bold
              color={valueColor}
              style={{
                lineHeight: narrow ? 26 : 30,
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
    </View>
  );
}
