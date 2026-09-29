import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Text,
  View,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  type TextStyle,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { font, useTheme, toneColors } from "../theme/Theme";
import { Icon } from "./Icon";
// Web: a truncated Txt shows its full text as a hover title while it is
// clipped. One observer serves every truncated text on the page.
const fullTexts = new WeakMap<Element, string>();
let clipObserver: ResizeObserver | undefined;
function syncTitle(element: Element) {
  const full = fullTexts.get(element);
  if (full === undefined) return;
  const clipped =
    element.scrollWidth > element.clientWidth + 1 ||
    element.scrollHeight > element.clientHeight + 1;
  if (clipped) element.setAttribute("title", full);
  else element.removeAttribute("title");
}
function titleWhenClipped(element: HTMLElement, full: string) {
  fullTexts.set(element, full);
  clipObserver ??= new ResizeObserver((entries) =>
    entries.forEach((entry) => syncTitle(entry.target)),
  );
  syncTitle(element);
  clipObserver.observe(element);
  return () => {
    clipObserver?.unobserve(element);
    fullTexts.delete(element);
    element.removeAttribute("title");
  };
}
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
  const textRef = useRef<Text>(null);
  const fullText =
    typeof children === "string" || typeof children === "number"
      ? String(children)
      : undefined;
  useEffect(() => {
    if (Platform.OS !== "web" || !lines || fullText === undefined) return;
    const element = textRef.current as unknown as HTMLElement | null;
    if (!element) return;
    return titleWhenClipped(element, fullText);
  }, [fullText, lines]);
  return (
    <Text
      ref={textRef}
      numberOfLines={lines}
      ellipsizeMode="tail"
      style={[
        {
          color: color ?? c.text,
          fontFamily: bold ? font.bold : font.regular,
          fontSize: size,
          lineHeight: size * 1.5,
        },
        lines ? { minWidth: 0, flexShrink: 1 } : undefined,
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
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const c = useTheme();
  return (
    <View
      testID={testID}
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
  iconOnly = false,
  tooltip,
  testID,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  compact?: boolean;
  /** Square icon button; `label` stays the accessible name. */
  iconOnly?: boolean;
  /** Hover/focus hint for icon-only buttons (defaults to `label`). */
  tooltip?: string;
  testID?: string;
}) {
  const c = useTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const size = compact ? 34 : 40;
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
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        s.button,
        {
          minHeight: size,
          paddingHorizontal: iconOnly ? 0 : 12,
          width: iconOnly ? size : undefined,
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
      {!!icon && <Icon name={icon} size={17} color={color} />}
      {!iconOnly && (
        <Txt size={12} bold color={color}>
          {label}
        </Txt>
      )}
      {iconOnly && Platform.OS === "web" && (hovered || focused) && (
        // Sits above the button: later siblings in RN Web paint over
        // anything that drops below into the next section.
        <View
          pointerEvents="none"
          style={[s.tooltip, { backgroundColor: c.text }]}
        >
          {/* nowrap: an absolute box right-aligned to a 34px button would
              otherwise wrap the hint word by word. */}
          <Txt
            size={11}
            bold
            color={c.surface}
            style={{ whiteSpace: "nowrap" } as TextStyle}
          >
            {tooltip ?? label}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}
/**
 * Icon-only button; `label` is its accessible name. outline: bordered surface
 * (headers, dialogs, tables). filled: navy action. overlay: dark glass over
 * media. ghost: bare, on the navy navigation rail.
 */
export function IconButton({
  name,
  label,
  onPress,
  size = 35,
  iconSize = 20,
  shape = "square",
  variant = "outline",
  color,
  disabled,
  expanded,
}: {
  name: string;
  label: string;
  onPress: () => void;
  /** Side (or diameter) in dp. */
  size?: number;
  iconSize?: number;
  shape?: "square" | "round";
  variant?: "outline" | "filled" | "overlay" | "ghost";
  /** Icon colour; each variant has its own default. */
  color?: string;
  disabled?: boolean;
  /** Disclosure toggles: whether the part they control is open. */
  expanded?: boolean;
}) {
  const c = useTheme();
  const ink =
    color ??
    {
      outline: c.link,
      filled: disabled ? c.muted : c.actionInk,
      overlay: "#FFFFFF",
      ghost: c.sidebarIcon,
    }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, expanded }}
      aria-expanded={expanded}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        s.iconButton,
        {
          width: size,
          height: size,
          borderRadius: shape === "round" ? size / 2 : size < 35 ? 8 : 9,
        },
        variant === "outline"
          ? {
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: pressed ? c.background : c.surface,
            }
          : variant === "filled"
            ? {
                backgroundColor: disabled ? c.primarySoft : c.actionSecondary,
                opacity: disabled ? 0.5 : 1,
              }
            : variant === "overlay"
              ? {
                  backgroundColor: pressed
                    ? "rgba(0,0,0,0.7)"
                    : "rgba(0,0,0,0.45)",
                  opacity: disabled ? 0.35 : 1,
                }
              : {
                  backgroundColor:
                    pressed || hovered ? c.sidebarHover : "transparent",
                },
      ]}
    >
      <Icon name={name} size={iconSize} color={ink} />
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
        size={11}
        lines={1}
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
      {!!label && (
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
      {!!error && (
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
  truncate = false,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  truncate?: boolean;
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
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Txt size={15} bold lines={truncate ? 1 : undefined}>
          {title}
        </Txt>
        {!!subtitle && (
          <Txt size={12} color={c.muted} lines={truncate ? 1 : undefined}>
            {subtitle}
          </Txt>
        )}
      </View>
      {trailing}
    </Row>
  );
}
/** A card with a titled header row and edge-to-edge rows below it. */
export function PanelCard({
  title,
  subtitle,
  truncate,
  trailing,
  children,
}: {
  title: string;
  subtitle?: string;
  truncate?: boolean;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <View style={{ paddingVertical: 11, paddingHorizontal: 14 }}>
        <SectionTitle
          title={title}
          subtitle={subtitle}
          truncate={truncate}
          trailing={trailing}
        />
      </View>
      {children}
    </Card>
  );
}
/** A muted label over its value; text values use the standard 13 bold. */
export function LabeledValue({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View style={[{ gap: 5 }, style]}>
      <Txt size={11} color={c.muted}>
        {label}
      </Txt>
      {typeof children === "string" || typeof children === "number" ? (
        <Txt size={13} bold>
          {children}
        </Txt>
      ) : (
        children
      )}
    </View>
  );
}
/** Hairline between sections. */
export function Divider({ spacing }: { spacing?: number }) {
  const c = useTheme();
  return (
    <View
      style={{ height: 1, backgroundColor: c.border, marginVertical: spacing }}
    />
  );
}
/** The square mark of a checkbox; `color` fills it when checked. */
export function CheckboxBox({
  checked,
  size = 19,
  color,
  border,
  background,
}: {
  checked: boolean;
  size?: number;
  color?: string;
  /** Unchecked border and fill (default: the theme's border and surface). */
  border?: string;
  background?: string;
}) {
  const c = useTheme();
  const on = color ?? c.actionPrimary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size / 5),
        borderWidth: 1,
        borderColor: checked ? on : (border ?? c.border),
        backgroundColor: checked ? on : (background ?? c.surface),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked && <Icon name="check" size={13} color={c.actionInk} />}
    </View>
  );
}
/** One page of `rows`; the index clamps when the rows shrink. */
export function usePaged<T>(rows: T[], size: number) {
  const [index, setIndex] = useState(0);
  const last = Math.max(0, Math.ceil(rows.length / size) - 1);
  const current = Math.min(index, last);
  const visible = useMemo(
    () => rows.slice(current * size, current * size + size),
    [rows, current, size],
  );
  return { index: current, last, visible, setIndex };
}
/** "11–20 of 42" with Previous and Next. */
export function Pager({
  index,
  pageSize,
  total,
  onChange,
  style,
}: {
  index: number;
  pageSize: number;
  total: number;
  onChange: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const last = Math.max(0, Math.ceil(total / pageSize) - 1);
  return (
    <Row style={[{ justifyContent: "space-between" }, style]}>
      <Txt size={11} color={c.muted}>
        {total
          ? `${index * pageSize + 1}–${Math.min(index * pageSize + pageSize, total)} of ${total}`
          : "0 records"}
      </Txt>
      <Row>
        <Button
          compact
          label="Previous"
          onPress={() => onChange(index - 1)}
          disabled={index === 0}
        />
        <Button
          compact
          label="Next"
          onPress={() => onChange(index + 1)}
          disabled={index >= last}
        />
      </Row>
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
  tooltip: {
    position: "absolute",
    bottom: "100%",
    right: 0,
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 20,
  },
  iconButton: { alignItems: "center", justifyContent: "center" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
    minWidth: 0,
    flexShrink: 1,
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
  },
  dot: { width: 5, height: 5, borderRadius: 3, flexShrink: 0 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontFamily: font.regular,
    fontSize: 12,
  },
});
