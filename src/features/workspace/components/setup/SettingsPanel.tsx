import React from "react";
import { Switch, View } from "react-native";
import { useTheme } from "../../../../shared/theme/Theme";
import { Row, Txt } from "../../../../shared/ui/Primitives";

/** A Sources & Setup section: a titled header (with an optional action) over its content. */
export function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const c = useTheme();
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
      <Row
        style={{
          padding: 20,
          gap: 12,
          flexWrap: "wrap",
          borderBottomWidth: 1,
          borderColor: c.border,
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1, minWidth: 180, gap: 6 }}>
          <Txt size={18} bold>
            {title}
          </Txt>
          {!!subtitle && (
            <Txt size={13} color={c.muted}>
              {subtitle}
            </Txt>
          )}
        </View>
        {action}
      </Row>
      <View style={{ padding: 20, gap: 16 }}>{children}</View>
    </View>
  );
}

/** A labelled switch row with an optional hint. */
export function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  const c = useTheme();
  return (
    <Row
      style={{
        justifyContent: "space-between",
        gap: 16,
        minHeight: 62,
        paddingVertical: 10,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={14} bold>
          {label}
        </Txt>
        {!!hint && (
          <Txt size={12} color={c.muted}>
            {hint}
          </Txt>
        )}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.actionPrimary, false: c.border }}
      />
    </Row>
  );
}
