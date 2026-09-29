import { Pressable, View } from "react-native";
import { useTheme } from "../theme/Theme";
import { Txt } from "./Primitives";

const RADIUS = 8;

/**
 * One choice out of a few, as joined segments (a radio group). Each segment
 * draws its own border, so the group rounds only its outer corners and the
 * segments share 1px dividers. `fill` stretches the segments to equal widths.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  fill = false,
}: {
  /** Accessible name of the group. */
  label: string;
  options: { value: T; label: string; accessibilityLabel?: string }[];
  value: T;
  onChange: (value: T) => void;
  fill?: boolean;
}) {
  const c = useTheme();
  const last = options.length - 1;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flexDirection: "row" }}
    >
      {options.map((option, i) => {
        const checked = option.value === value;
        const first = i === 0;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ checked }}
            aria-checked={checked}
            onPress={() => onChange(option.value)}
            style={{
              flex: fill ? 1 : undefined,
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderWidth: 1,
              borderLeftWidth: first ? 1 : 0,
              borderColor: c.border,
              borderTopLeftRadius: first ? RADIUS : 0,
              borderBottomLeftRadius: first ? RADIUS : 0,
              borderTopRightRadius: i === last ? RADIUS : 0,
              borderBottomRightRadius: i === last ? RADIUS : 0,
              backgroundColor: checked ? c.actionPrimary : c.surface,
            }}
          >
            <Txt
              size={12}
              bold={checked}
              color={checked ? c.actionInk : c.text}
            >
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
