// Pieces the setup dialogs (classes, learners, cameras, users, residence,
// sources) share: the title, the scope picker, the session notice, the row
// actions menu and the delete confirmation.
import { View } from "react-native";
import type { DataRecord } from "../../../../domain/contracts/types";
import { useTheme } from "../../../../shared/theme/Theme";
import { Button, Row, Txt } from "../../../../shared/ui/Primitives";
import { Select } from "../../../../shared/ui/Select";
import { PersonOr } from "../PersonChip";
import type { SetupMode } from "./types";
import type { SetupScope } from "./useSetupScope";

/**
 * "Add camera", "Edit camera", "Delete camera", "Bulk upload cameras" (`many`,
 * else `one`); the actions menu is `menuTitle`.
 */
export function setupTitle(
  mode: SetupMode,
  nouns: { one: string; many?: string },
  menuTitle = "Record actions",
) {
  if (mode === "menu") return menuTitle;
  if (mode === "bulk") return `Bulk upload ${nouns.many ?? nouns.one}`;
  if (mode === "delete") return `Delete ${nouns.one}`;
  return `${mode === "edit" ? "Edit" : "Add"} ${nouns.one}`;
}

/** The place a new record goes, when the view covers several ("Campus: Choose campus"). */
export function ScopePicker({
  scope,
  label,
  placeholder,
}: {
  scope: SetupScope;
  /** Defaults to "Customer" or "Campus". */
  label?: string;
  /** Defaults to "Choose customer" or "Choose campus". */
  placeholder?: string;
}) {
  if (!scope.showPicker) return null;
  return (
    <Select
      label={label ?? (scope.unit === "customer" ? "Customer" : "Campus")}
      value={scope.scope}
      options={[
        { label: placeholder ?? `Choose ${scope.unit}`, value: "" },
        ...scope.choices.map((value) => ({ label: value, value })),
      ]}
      onChange={scope.setScope}
    />
  );
}

/** "Changes are kept for this session.", then what is not connected. */
export function SessionNotice({ detail }: { detail?: string }) {
  const c = useTheme();
  return (
    <Txt size={12} color={c.muted}>
      {detail
        ? "Changes are kept for this session. " + detail
        : "Changes are kept for this session."}
    </Txt>
  );
}

const ACTIONS = { learners: "Learners", edit: "Edit", delete: "Delete" };
type RecordAction = keyof typeof ACTIONS;

/** A row's actions: its title (a person chip for people), then one button per action. */
export function RecordMenu({
  target,
  person = false,
  actions = ["edit", "delete"],
  onPick,
}: {
  target: DataRecord;
  /** Show the record in the person format when it names a person. */
  person?: boolean;
  actions?: readonly RecordAction[];
  onPick: (action: RecordAction) => void;
}) {
  const title = <Txt bold>{target.detail.title}</Txt>;
  return (
    <View style={{ gap: 10 }}>
      {person ? <PersonOr record={target}>{title}</PersonOr> : title}
      {actions.map((action) => (
        <Button
          key={action}
          label={ACTIONS[action]}
          onPress={() => onPick(action)}
        />
      ))}
    </View>
  );
}

/** "Delete … ?" with an optional note, Cancel and Delete. */
export function DeleteConfirm({
  title,
  note,
  noteSize = 14,
  align = "end",
  onCancel,
  onConfirm,
}: {
  title: string;
  note?: string;
  noteSize?: number;
  /** Where the buttons sit. */
  align?: "start" | "end";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 14 }}>
      <Txt>Delete {title}?</Txt>
      {!!note && (
        <Txt size={noteSize} color={c.muted}>
          {note}
        </Txt>
      )}
      <Row style={align === "end" ? { justifyContent: "flex-end" } : undefined}>
        <Button label="Cancel" onPress={onCancel} />
        <Button label="Delete" variant="primary" onPress={onConfirm} />
      </Row>
    </View>
  );
}
