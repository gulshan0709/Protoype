import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { industries } from "../../../domain/contracts/registry";
import type { Workspace, IndustryId } from "../../../domain/contracts/types";
import { useApp } from "../../../application/AppProvider";
import { useTheme } from "../../../shared/theme/Theme";
import { Txt, Button } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Select } from "../../../shared/ui/Select";
import { missionFor } from "../../../domain/contracts/priority";
import { MissionLabel } from "./Priority";
export function WorkspacePicker({
  onSave,
}: {
  onSave: (workspace: Workspace) => void;
}) {
  const { workspace } = useApp();
  const [draft, setDraft] = useState(workspace);
  const c = useTheme();
  const industry = industries[draft.industry];
  const role = industry.core.roles[draft.role];
  return (
    <>
      <Txt size={13} color={c.muted}>
        Choose your industry, role, and assigned scope.
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {Object.values(industries).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} industry`}
            aria-pressed={item.id === draft.industry}
            onPress={() =>
              setDraft({
                industry: item.id,
                role: "customer_admin",
                scope: item.core.roles.customer_admin.scopes[0],
              })
            }
            style={{
              flexBasis: "46%",
              flexGrow: 1,
              padding: 17,
              borderWidth: 1,
              borderColor: item.id === draft.industry ? c.primary : c.border,
              backgroundColor:
                item.id === draft.industry
                  ? c.actionPrimary
                  : c.actionSecondary,
              borderRadius: 11,
              gap: 12,
            }}
          >
            <Icon
              name={
                item.id === "education"
                  ? "class"
                  : item.id === "manufacturing"
                    ? "settings"
                    : item.id === "retail"
                      ? "gate"
                      : "building"
              }
              color={c.actionInk}
            />
            <Txt size={12} bold color={c.actionInk}>
              {item.label}
            </Txt>
          </Pressable>
        ))}
      </View>
      <Txt size={12} bold>
        Role preview
      </Txt>
      <Txt size={11} color={c.muted}>
        For design review. Production users see their assigned role.
      </Txt>
      <Select
        label="Choose a role"
        value={draft.role}
        options={Object.entries(industry.core.roles).map(([value, r]) => ({
          value,
          label: r.label,
        }))}
        onChange={(value) =>
          setDraft({
            ...draft,
            role: value,
            scope: industry.core.roles[value].scopes[0],
          })
        }
      />
      <MissionLabel mission={missionFor(draft.industry, draft.role)} />
      <Txt size={12} bold>
        Assigned scope
      </Txt>
      <Select
        label="Choose assigned scope"
        value={draft.scope}
        options={role.scopes.map((value) => ({ value, label: value }))}
        onChange={(scope) => setDraft({ ...draft, scope })}
      />
      <Button
        label="Open workspace"
        icon="arrow"
        variant="primary"
        onPress={() => onSave(draft)}
      />
    </>
  );
}
