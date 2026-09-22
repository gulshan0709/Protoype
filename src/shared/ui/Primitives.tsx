import React, { useState } from "react";
import {
  Text,
  View,
  Pressable,
  TextInput,
  StyleSheet,
  type TextStyle,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { font, useTheme, toneColors } from "../theme/Theme";
import { Icon } from "./Icon";
export function Txt({
  children,
  size = 14,
  bold = false,
  color,
  style,
  lines,
}: {
  children: React.ReactNode;
  size?: number;
  bold?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  lines?: number;
}) {
  const c = useTheme();
  return (
    <Text
      numberOfLines={lines}
      style={[
        {
          color: color ?? c.text,
          fontFamily: bold ? font.bold : font.regular,
          fontSize: size,
          lineHeight: size * 1.5,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.row, style]}>{children}</View>;
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          boxShadow: c.panelShadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  icon,
  variant = "secondary",
  disabled,
  compact = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  compact?: boolean;
  testID?: string;
}) {
  const c = useTheme();
  const [hovered, setHovered] = useState(false);
  const filled = variant !== "ghost" || icon === "download";
  const action =
    icon === "download"
      ? "actionExport"
      : icon === "sparkle"
        ? "actionAssistant"
        : variant === "primary"
          ? "actionPrimary"
          : "actionSecondary";
  const color = filled ? c.actionInk : disabled ? c.muted : c.link;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        s.button,
        {
          minHeight: compact ? 34 : 40,
          paddingHorizontal: 12,
          backgroundColor: filled
            ? disabled
              ? c.actionDisabled
              : pressed
                ? c[`${action}Pressed`]
                : hovered
                  ? c[`${action}Hover`]
                  : c[action]
            : pressed || hovered
              ? c.primarySoft
              : "transparent",
          borderColor: filled
            ? disabled
              ? c.actionDisabled
              : c[action]
            : "transparent",
        },
      ]}
    >
      {icon && <Icon name={icon} size={17} color={color} />}
      <Txt size={12} bold color={color}>
        {label}
      </Txt>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  active = false,
}: {
  name: string;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        s.iconButton,
        {
          backgroundColor: active
            ? pressed
              ? c.actionPrimaryPressed
              : c.actionPrimary
            : pressed
              ? c.background
              : c.surface,
          borderWidth: 1,
          borderColor: c.border,
        },
      ]}
    >
      <Icon name={name} color={active ? c.actionInk : c.link} />
    </Pressable>
  );
}
export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: string;
}) {
  const c = useTheme();
  const colors = toneColors(c, tone);
  return (
    <View style={[s.badge, { backgroundColor: c.primarySoft }]}>
      <View style={[s.dot, { backgroundColor: colors.color }]} />
      <Txt
        size={10}
        color={
          ["healthy", "complete", "neutral"].includes(tone)
            ? c.text
            : colors.color
        }
      >
        {label}
      </Txt>
    </View>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  secure,
  error,
  onSubmit,
}: {
  label?: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secure?: boolean;
  error?: string;
  onSubmit?: () => void;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 7, flexShrink: 1 }}>
      {label && (
        <Txt size={12} bold>
          {label}
        </Txt>
      )}
      <TextInput
        accessibilityLabel={label ?? placeholder}
        placeholder={placeholder}
        placeholderTextColor={c.subtle}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        secureTextEntry={secure}
        onSubmitEditing={onSubmit}
        style={[
          s.input,
          {
            color: c.text,
            backgroundColor: c.surface,
            borderColor: error ? c.critical : c.border,
            minHeight: multiline ? 100 : 44,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
      {error && (
        <Txt size={12} color={c.critical}>
          {error}
        </Txt>
      )}
    </View>
  );
}
export function EmptyState({
  title,
  description,
  action,
  label = "Clear filters",
  icon = "search",
}: {
  title: string;
  description: string;
  action?: () => void;
  label?: string;
  icon?: string;
}) {
  const c = useTheme();
  return (
    <View style={{ padding: 36, alignItems: "center", gap: 12 }}>
      <Icon name={icon} size={32} color={c.primary} />
      <Txt size={17} bold>
        {title}
      </Txt>
      <Txt
        size={13}
        color={c.muted}
        style={{ textAlign: "center", maxWidth: 470 }}
      >
        {description}
      </Txt>
      {action && <Button label={label} onPress={action} />}
    </View>
  );
}
export function SectionTitle({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <Row
      style={{
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Txt size={15} bold>
          {title}
        </Txt>
        {subtitle && (
          <Txt size={11} color={c.muted}>
            {subtitle}
          </Txt>
        )}
      </View>
      {trailing}
    </Row>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  iconButton: {
    width: 35,
    height: 35,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontFamily: font.regular,
    fontSize: 12,
  },
});
