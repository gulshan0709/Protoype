import type { ReactNode } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import { useTheme } from "../theme/Theme";
import { Icon } from "./Icon";
import { Row, Txt } from "./Primitives";

/**
 * A pill. Three looks follow from the props: with `check`, a picked chip keeps
 * a soft fill and leads with a tick (multi-select); without it, a selected
 * chip fills with the primary action colour (filters, one-of choices); a chip
 * with no `selected` state is an action and reads as a link.
 */
export function Chip({
  label,
  selected,
  onPress,
  role = "button",
  accessibilityLabel,
  leading,
  check = false,
  compact = false,
  disabled,
  testID,
  onLayout,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** checkbox and radio report `checked`; button reports `selected`. */
  role?: "button" | "checkbox" | "radio";
  /** Accessible name; defaults to `label`. */
  accessibilityLabel?: string;
  /** Shown before the label, e.g. a person's avatar (22px fits the pill). */
  leading?: ReactNode;
  check?: boolean;
  compact?: boolean;
  disabled?: boolean;
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const c = useTheme();
  const on = !!selected;
  const filled = on && !check;
  const vertical = compact ? 5 : 6;
  return (
    <Pressable
      testID={testID}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={
        role === "button" ? { selected, disabled } : { checked: on, disabled }
      }
      aria-checked={role === "button" ? undefined : on}
      disabled={disabled}
      onPress={onPress}
      onLayout={onLayout}
      style={({ pressed, hovered }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: leading ? 6 : 5,
        paddingVertical: leading ? vertical - 2 : vertical,
        paddingLeft: leading ? 4 : 10,
        paddingRight: 10,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: on ? c.actionPrimary : hovered ? c.link : c.border,
        backgroundColor: filled
          ? c.actionPrimary
          : on || pressed
            ? c.primarySoft
            : c.surface,
      })}
    >
      {leading}
      {check && on && <Icon name="check" size={13} color={c.link} />}
      <Txt
        size={12}
        bold={filled}
        color={filled ? c.actionInk : selected === undefined ? c.link : c.text}
      >
        {label}
      </Txt>
    </Pressable>
  );
}

/**
 * Multi-select as toggle chips under a form label. Picking `exclusive` (e.g.
 * "All Day") clears the other options; picking another option clears it.
 */
export function ChipSelect({
  label,
  options,
  value,
  onChange,
  exclusive,
  empty,
  leading,
  optionLabel,
  compact,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  exclusive?: string;
  /** Shown instead of the chips when there are no options. */
  empty?: string;
  leading?: (option: string) => ReactNode;
  /** Accessible name of an option; defaults to the option itself. */
  optionLabel?: (option: string) => string;
  compact?: boolean;
}) {
  const c = useTheme();
  const toggle = (option: string, on: boolean) => {
    if (exclusive !== undefined && option === exclusive)
      return onChange(on ? [] : [exclusive]);
    const rest = value.filter((x) => x !== exclusive);
    onChange(on ? rest.filter((x) => x !== option) : [...rest, option]);
  };
  return (
    <View style={{ gap: 7 }}>
      <Txt size={12} bold>
        {label}
      </Txt>
      {options.length ? (
        <Row style={{ flexWrap: "wrap", gap: 8 }}>
          {options.map((option) => {
            const on = value.includes(option);
            return (
              <Chip
                key={option}
                role="checkbox"
                check
                compact={compact}
                label={option}
                accessibilityLabel={optionLabel?.(option) ?? option}
                leading={leading?.(option)}
                selected={on}
                onPress={() => toggle(option, on)}
              />
            );
          })}
        </Row>
      ) : (
        !!empty && (
          <Txt size={12} color={c.muted}>
            {empty}
          </Txt>
        )
      )}
    </View>
  );
}
