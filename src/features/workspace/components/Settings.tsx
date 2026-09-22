import React, { useState } from "react";
import { View } from "react-native";
import { useApp } from "../../../application/AppProvider";
import { useTheme } from "../../../shared/theme/Theme";
import { Txt, Button, Field } from "../../../shared/ui/Primitives";
import { Select } from "../../../shared/ui/Select";
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
