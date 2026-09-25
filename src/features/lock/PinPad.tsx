import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { light, useTheme } from "../../shared/theme/Theme";
import { Txt } from "../../shared/ui/Primitives";
import { Icon } from "../../shared/ui/Icon";
import { PIN_LENGTH } from "../../application/appLock";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "del"];

/** Numeric keypad with PIN dots. Submits automatically at PIN_LENGTH digits. */
export function PinPad({
  title,
  subtitle,
  error,
  disabled = false,
  onComplete,
  biometric,
  brand = false,
  resetKey,
}: {
  title: string;
  subtitle?: string;
  error?: string;
  disabled?: boolean;
  onComplete: (pin: string) => void;
  biometric?: { label: string; icon: string; onPress: () => void };
  /** Navy lock-screen styling instead of the current surface theme. */
  brand?: boolean;
  resetKey?: unknown;
}) {
  const c = useTheme();
  const [pin, setPin] = useState("");
  useEffect(() => setPin(""), [resetKey]);
  const ink = brand ? light.sidebarText : c.text;
  const muted = brand ? light.sidebarMuted : c.muted;
  const keyBg = brand ? "rgba(255,255,255,0.1)" : c.primarySoft;
  const keyPressed = brand ? "rgba(255,255,255,0.22)" : c.border;
  const press = (key: string) => {
    if (disabled) return;
    if (key === "del") return setPin((p) => p.slice(0, -1));
    if (key === "bio") return biometric?.onPress();
    const next = (pin + key).slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length === PIN_LENGTH) {
      // Let the last dot render before verification clears the entry.
      setTimeout(() => {
        setPin("");
        onComplete(next);
      }, 90);
    }
  };
  return (
    <View style={{ alignItems: "center", gap: 18, width: "100%" }}>
      <View style={{ alignItems: "center", gap: 4 }}>
        <Txt size={18} bold color={ink} style={{ textAlign: "center" }}>
          {title}
        </Txt>
        {!!subtitle && (
          <Txt size={13} color={muted} style={{ textAlign: "center" }}>
            {subtitle}
          </Txt>
        )}
      </View>
      <View
        accessible
        style={{ flexDirection: "row", gap: 16, justifyContent: "center" }}
        accessibilityLabel={`${pin.length} of ${PIN_LENGTH} digits entered`}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              borderWidth: 1.5,
              borderColor: error ? (brand ? "#ff9aa6" : c.critical) : ink,
              backgroundColor: i < pin.length ? ink : "transparent",
            }}
          />
        ))}
      </View>
      <Txt
        size={12}
        color={brand ? "#ff9aa6" : c.critical}
        style={{ minHeight: 18, textAlign: "center" }}
      >
        {error ?? ""}
      </Txt>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          width: 3 * 68 + 2 * 22,
          gap: 14,
          columnGap: 22,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {keys.map((key) => {
          if (key === "bio" && !biometric)
            return <View key={key} style={{ width: 68, height: 68 }} />;
          const label =
            key === "del"
              ? "Delete digit"
              : key === "bio"
                ? `Unlock with ${biometric!.label}`
                : key;
          return (
            <Pressable
              key={key}
              testID={`pin-key-${key}`}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ disabled }}
              disabled={disabled || (key === "del" && !pin)}
              onPress={() => press(key)}
              style={({ pressed }) => ({
                width: 68,
                height: 68,
                borderRadius: 34,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  key === "del" || key === "bio"
                    ? pressed
                      ? keyBg
                      : "transparent"
                    : pressed
                      ? keyPressed
                      : keyBg,
              })}
            >
              {key === "del" ? (
                <Icon name="backspace" size={24} color={ink} />
              ) : key === "bio" ? (
                <Icon name={biometric!.icon} size={30} color={ink} />
              ) : (
                <Txt size={24} color={ink}>
                  {key}
                </Txt>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
