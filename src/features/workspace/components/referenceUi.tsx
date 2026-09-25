import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { font, useTheme } from "../../../shared/theme/Theme";
import { Icon } from "../../../shared/ui/Icon";
import { Txt } from "../../../shared/ui/Primitives";

// Colors from the Education v2 reference console (dist/education-v2/styles.css).
export const REF = {
  cyan: "#2cb7e8",
  teal: "#2bc4aa",
  actionInk: "#061827",
  exportInk: "#071f26",
  activeText: "#087ba8",
  navActive: "rgba(255,255,255,0.16)",
  navAccent: "#34cef0",
  green: "#16886e",
  amber: "#d99011",
};

export function RefButton({
  label,
  onPress,
  kind = "plain",
  icon,
}: {
  label: string;
  onPress: () => void;
  kind?: "plain" | "primary" | "export";
  icon?: string;
}) {
  const c = useTheme();
  const bg =
    kind === "primary" ? REF.cyan : kind === "export" ? REF.teal : c.surface;
  const ink =
    kind === "primary"
      ? REF.actionInk
      : kind === "export"
        ? REF.exportInk
        : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ hovered, pressed }: any) => ({
        height: 34,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: kind === "plain" ? (hovered ? REF.cyan : c.border) : bg,
        backgroundColor: bg,
        opacity: pressed ? 0.85 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      })}
    >
      {icon && <Icon name={icon} size={15} color={ink} />}
      <Txt size={12} bold={kind !== "plain"} color={ink} lines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function RefInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
}) {
  const c = useTheme();
  return (
    <TextInput
      accessibilityLabel={placeholder}
      placeholder={placeholder}
      placeholderTextColor={c.muted}
      value={value}
      onChangeText={onChange}
      style={{
        height: 34,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 8,
        backgroundColor: c.surface,
        color: c.text,
        paddingHorizontal: 10,
        fontFamily: font.regular,
        fontSize: 12,
      }}
    />
  );
}

// A 76×48 header control with an icon over a short caption.
export function RefHeaderBox({
  icon,
  caption,
  label,
  onPress,
}: {
  icon: string;
  caption: string;
  label: string;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ hovered }: any) => ({
        width: 76,
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: hovered ? REF.cyan : c.border,
        backgroundColor: c.surface,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      })}
    >
      <Icon name={icon} size={15} color={c.text} />
      <View style={{ maxWidth: 68 }}>
        <Txt size={9} color={c.muted} lines={1}>
          {caption}
        </Txt>
      </View>
    </Pressable>
  );
}
