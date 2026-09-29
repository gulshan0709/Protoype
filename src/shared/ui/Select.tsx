import { useState } from "react";
import { Pressable } from "react-native";
import { Dialog } from "./Dialog";
import { Row, Txt } from "./Primitives";
import { Icon } from "./Icon";
import { useTheme } from "../theme/Theme";
export function Select({
  label,
  value,
  options,
  onChange,
  icon,
  compact,
  height,
  fill = false,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  icon?: string;
  compact?: boolean;
  height?: number;
  /** Push the chevron to the trailing edge when the select is stretched. */
  fill?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const c = useTheme();
  const current = options.find((o) => o.value === value)?.label ?? value;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current}`}
        onPress={() => setOpen(true)}
        style={{
          flexShrink: 1,
          minHeight: height ?? (compact ? 34 : 40),
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.actionSecondary,
          borderRadius: 9,
          paddingHorizontal: 12,
          justifyContent: "center",
        }}
      >
        <Row style={{ gap: 8 }}>
          {!!icon && <Icon name={icon} size={16} color={c.actionInk} />}
          <Txt
            size={compact ? 11 : 12}
            color={c.actionInk}
            // Longhands in both cases: switching between `flex` and
            // `flexShrink` (the header's phone ↔ desktop resize) makes React
            // DOM warn about a conflicting style removal.
            style={
              fill
                ? { flexGrow: 1, flexShrink: 1, flexBasis: 0 }
                : { flexGrow: 0, flexShrink: 1, flexBasis: "auto" }
            }
            lines={1}
          >
            {current}
          </Txt>
          <Icon name="down" size={14} color={c.actionInk} />
        </Row>
      </Pressable>
      {open && (
        <Dialog title={label} onClose={() => setOpen(false)}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              aria-pressed={option.value === value}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={{
                padding: 13,
                borderRadius: 10,
                backgroundColor:
                  option.value === value ? c.actionPrimary : c.actionSecondary,
              }}
            >
              <Row>
                <Txt
                  color={c.actionInk}
                  style={{ flex: 1 }}
                  bold={option.value === value}
                >
                  {option.label}
                </Txt>
                {option.value === value && (
                  <Icon name="check" color={c.actionInk} />
                )}
              </Row>
            </Pressable>
          ))}
        </Dialog>
      )}
    </>
  );
}
