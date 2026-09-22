import React, { useState } from "react";
import { Pressable, View } from "react-native";
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
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  icon?: string;
  compact?: boolean;
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
          minHeight: compact ? 34 : 40,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.actionSecondary,
          borderRadius: 9,
          paddingHorizontal: 12,
          justifyContent: "center",
        }}
      >
        <Row style={{ gap: 8 }}>
          {icon && <Icon name={icon} size={16} color={c.actionInk} />}
          <Txt
            size={compact ? 11 : 12}
            color={c.actionInk}
            style={{ flexShrink: 1 }}
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
