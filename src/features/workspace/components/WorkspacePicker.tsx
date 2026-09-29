import React, { useMemo, useState } from "react";
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
import {
  templateLabel,
  workspaceRoleLabel,
} from "../../../domain/contracts/experience";
const industryIds = [
  "education",
  "corporate",
  "retail",
  "manufacturing",
  "construction",
  "healthcare",
] as IndustryId[];
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
  const roleOptions = useMemo(
    () =>
      Object.entries(industry.core.roles).map(([value, r]) => ({
        value,
        label: workspaceRoleLabel(value, r.label),
      })),
    [industry],
  );
  const chooseIndustry = (nextIndustry: IndustryId) => {
    const nextContract = industries[nextIndustry];
    setDraft({
      industry: nextIndustry,
      role: "customer_admin",
      scope: nextContract.core.roles.customer_admin.scopes[0],
    });
  };
  return (
    <>
      <Txt size={13} color={c.muted}>
        Choose an industry, access profile, and assigned scope.
      </Txt>
      <Txt size={12} bold>
        Industry
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {industryIds.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`${templateLabel(item)} industry`}
            aria-pressed={item === draft.industry}
            onPress={() => chooseIndustry(item)}
            style={{
              flexBasis: "46%",
              flexGrow: 1,
              padding: 17,
              borderWidth: 1,
              borderColor: item === draft.industry ? c.primary : c.border,
              backgroundColor:
                item === draft.industry ? c.actionPrimary : c.actionSecondary,
              borderRadius: 11,
              gap: 12,
            }}
          >
            <Icon
              name={item === "education" ? "class" : "building"}
              color={c.actionInk}
            />
            <Txt size={12} bold color={c.actionInk}>
              {templateLabel(item)}
            </Txt>
          </Pressable>
        ))}
      </View>
      <Txt size={12} bold>
        Access profile preview
      </Txt>
      <Txt size={11} color={c.muted}>
        The access role is shared. The profile supplies a relevant starting view
        for design review.
      </Txt>
      <Select
        label="Choose an access profile"
        value={draft.role}
        options={roleOptions}
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
