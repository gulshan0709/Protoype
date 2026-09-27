import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { authUseCases, type AuthUseCaseId } from "../model/authUseCases";
import type { AuthShowcaseState } from "../hooks/useAuthShowcase";
import { light as theme } from "../../../shared/theme/Theme";
export function AuthUseCaseSelector({
  showcase,
  narrow,
  compact,
}: {
  showcase: AuthShowcaseState;
  narrow: boolean;
  compact: boolean;
}) {
  const [focused, setFocused] = useState<AuthUseCaseId | null>(null);
  const [hovered, setHovered] = useState<AuthUseCaseId | null>(null);
  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel="Preview an industry"
      style={s.row}
    >
      {authUseCases.map((slide) => {
        const selected = showcase.selected === slide.id;
        return (
          <Pressable
            key={slide.id}
            accessibilityRole="button"
            accessibilityLabel={`Preview ${slide.label}`}
            accessibilityState={{ selected }}
            aria-pressed={selected}
            onPress={() => showcase.select(slide.id)}
            onHoverIn={() => setHovered(slide.id)}
            onHoverOut={() => setHovered(null)}
            onFocus={() => {
              setFocused(slide.id);
              showcase.setFocused(true);
            }}
            onBlur={() => {
              setFocused(null);
              showcase.setFocused(false);
            }}
            style={({ pressed }) => [
              s.button,
              {
                minHeight: compact ? 30 : 36,
                width: narrow ? "48%" : undefined,
                backgroundColor: pressed
                  ? theme.actionPrimaryPressed
                  : selected
                    ? hovered === slide.id
                      ? theme.actionPrimaryHover
                      : theme.actionPrimary
                    : hovered === slide.id
                      ? theme.actionSecondaryHover
                      : theme.actionSecondary,
                borderColor: selected ? theme.primary : "#d3f3ff66",
              },
              focused === slide.id && s.focus,
            ]}
          >
            <Text
              style={[
                s.label,
                {
                  fontSize: compact ? 10 : 11,
                  color: theme.actionInk,
                },
              ]}
            >
              {slide.shortLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d3f3ff66",
  },
  label: { fontFamily: "InterMedium" },
  focus: { borderColor: "#78dcef", borderWidth: 2 },
});
