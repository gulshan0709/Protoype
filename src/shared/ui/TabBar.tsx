import {
  Pressable,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme/Theme";
import { Txt } from "./Primitives";

// md: a page's views above its content, on a hairline. sm: views inside a card.
const SIZES = {
  md: { gap: 24, padding: 13, text: 12 },
  sm: { gap: 20, padding: 12, text: 13 },
} as const;

/** Underlined tabs (a tablist named `label`); `scroll` lets a long row scroll sideways. */
export function TabBar({
  label,
  tabs,
  value,
  onChange,
  size = "md",
  scroll = false,
  style,
}: {
  label: string;
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  size?: "md" | "sm";
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const { gap, padding, text } = SIZES[size];
  const items = tabs.map((tab) => {
    const selected = tab.value === value;
    return (
      <Pressable
        key={tab.value}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected }}
        aria-selected={selected}
        onPress={() => onChange(tab.value)}
        style={{
          paddingVertical: padding,
          paddingHorizontal: 4,
          backgroundColor: "transparent",
          borderBottomWidth: 2,
          borderBottomColor: selected ? c.link : "transparent",
        }}
      >
        <Txt size={text} bold={selected} color={selected ? c.link : c.muted}>
          {tab.label}
        </Txt>
      </Pressable>
    );
  });
  const bar = scroll ? (
    <ScrollView
      horizontal
      accessibilityRole="tablist"
      accessibilityLabel={label}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap }}
      style={size === "md" ? undefined : style}
    >
      {items}
    </ScrollView>
  ) : (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={[{ flexDirection: "row", gap }, size === "md" ? undefined : style]}
    >
      {items}
    </View>
  );
  return size === "md" ? (
    <View style={[{ borderBottomWidth: 1, borderColor: c.border }, style]}>
      {bar}
    </View>
  ) : (
    bar
  );
}
