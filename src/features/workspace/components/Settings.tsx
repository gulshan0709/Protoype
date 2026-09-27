import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useApp } from "../../../application/AppProvider";
import {
  useTheme,
  type ThemeStyle,
} from "../../../shared/theme/Theme";
import { Txt, Button, Field } from "../../../shared/ui/Primitives";
import { Select } from "../../../shared/ui/Select";
import { AppLockSettings } from "../../lock/AppLockSettings";
export function Settings({
  onClose,
  onState,
}: {
  onClose: () => void;
  onState: (value: string) => void;
}) {
  const app = useApp();
  const c = useTheme();
  const [name, setName] = useState(app.name);
  const [error, setError] = useState("");
  return (
    <>
      <Field
        label="Display name"
        value={name}
        onChange={setName}
        error={error}
      />
      <Txt size={12} bold>
        Appearance
      </Txt>
      <Select
        label="Appearance"
        value={app.theme}
        options={["light", "dark", "system"].map((value) => ({
          value,
          label: value[0].toUpperCase() + value.slice(1),
        }))}
        onChange={(value) =>
          app.update({ theme: value as "light" | "dark" | "system" })
        }
      />
      <Txt size={12} bold>
        Theme style
      </Txt>
      <Txt size={11} color={c.muted}>
        Applies instantly. Light uses a white canvas; dark uses a black canvas.
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {(
          [
            {
              value: "signature",
              label: "Vizenta Signature",
              description: "Cyan and navy",
              colors: ["#087BA8", "#0D385D", "#8F82FF"],
            },
            {
              value: "cobalt",
              label: "Electric Cobalt",
              description: "Sharper and technical",
              colors: ["#175CD3", "#0B1F3A", "#53B1FD"],
            },
            {
              value: "teal",
              label: "Signal Teal",
              description: "Calm and operational",
              colors: ["#087F70", "#0A383A", "#5FE3D1"],
            },
          ] as const
        ).map((style) => {
          const selected = app.themeStyle === style.value;
          return (
            <Pressable
              key={style.value}
              accessibilityRole="button"
              accessibilityLabel={`Theme style: ${style.label}`}
              accessibilityState={{ selected }}
              onPress={() =>
                app.update({ themeStyle: style.value as ThemeStyle })
              }
              style={({ pressed }) => ({
                width: 152,
                minHeight: 104,
                padding: 12,
                gap: 7,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? c.actionPrimary : c.border,
                borderRadius: 12,
                backgroundColor: pressed ? c.primarySoft : c.surface,
                boxShadow: selected
                  ? `0 8px 22px ${style.colors[0]}22`
                  : "none",
              })}
            >
              <View style={{ flexDirection: "row", gap: 5 }}>
                {style.colors.map((color) => (
                  <View
                    key={color}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: color,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  />
                ))}
              </View>
              <Txt size={12} bold>
                {style.label}
              </Txt>
              <Txt size={10} color={c.muted}>
                {style.description}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Button
        label="Save preferences"
        variant="primary"
        onPress={() => {
          if (name.trim().length < 2) {
            setError("Enter at least two characters.");
            return;
          }
          app.update({ name: name.trim() });
          app.notify("Preferences saved.");
          onClose();
        }}
      />
      <AppLockSettings />
      <View
        style={{ height: 1, backgroundColor: c.border, marginVertical: 6 }}
      />
      <Txt size={14} bold>
        Review tools
      </Txt>
      <Txt size={12} color={c.muted}>
        Choose which data state to display.
      </Txt>
      <Select
        label="Preview data state"
        value="populated"
        options={[
          "populated",
          "empty",
          "degraded",
          "unavailable",
          "notConfigured",
          "unauthorized",
          "insufficientHistory",
        ].map((value) => ({
          value,
          label: {
            populated: "Populated",
            empty: "Empty",
            degraded: "Degraded source",
            unavailable: "Unavailable",
            notConfigured: "Not configured",
            unauthorized: "Unauthorized",
            insufficientHistory: "Insufficient history",
          }[value]!,
        }))}
        onChange={(value) => {
          onState(value);
          onClose();
        }}
      />
      <Txt size={14} bold>
        Recent activity
      </Txt>
      {app.audit
        .filter(
          (e) =>
            e.workspace.industry === app.workspace.industry &&
            e.workspace.role === app.workspace.role &&
            e.workspace.scope === app.workspace.scope,
        )
        .slice(0, 8)
        .map((e) => (
          <View
            key={e.id}
            style={{
              padding: 12,
              backgroundColor: c.background,
              borderRadius: 9,
              gap: 5,
            }}
          >
            <Txt size={12} bold>
              {e.action}
            </Txt>
            <Txt size={11} color={c.muted}>
              {e.reason}
            </Txt>
            <Txt size={10} color={c.subtle}>
              {new Date(e.at).toLocaleString()}
            </Txt>
          </View>
        ))}
      <Button
        label="Sign out"
        icon="logout"
        onPress={() => {
          app.update({ session: false });
          onClose();
        }}
      />
    </>
  );
}
