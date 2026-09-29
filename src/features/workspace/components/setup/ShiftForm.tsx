import { View } from "react-native";
import {
  emptyShift,
  validateShift,
  type Shift,
} from "../../../../domain/sources/setup";
import { Field } from "../../../../shared/ui/Primitives";
import { FormActions, FormCell, FormGrid } from "../../../../shared/ui/Form";
import { useFormState } from "../../../../shared/ui/useFormState";

export function ShiftForm({
  initial,
  takenNames,
  onSave,
  onCancel,
}: {
  initial?: Shift;
  /** Other shifts' names (the edited one is not among them). */
  takenNames: string[];
  onSave: (s: Shift) => void;
  onCancel: () => void;
}) {
  const {
    value: sh,
    set,
    err,
    submit,
  } = useFormState(
    initial ?? emptyShift(),
    (x) => validateShift(x, takenNames),
    { reveal: !!initial },
  );
  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Shift name *"
        value={sh.name}
        onChange={set("name")}
        placeholder="e.g. Morning, Evening, Night"
        error={err("name")}
      />
      <FormGrid gap={10}>
        <FormCell basis={140}>
          <Field
            label="Start time *"
            value={sh.start}
            onChange={set("start")}
            placeholder="HH:MM"
            error={err("start")}
          />
        </FormCell>
        <FormCell basis={140}>
          <Field
            label="End time *"
            value={sh.end}
            onChange={set("end")}
            placeholder="HH:MM"
            error={err("end")}
          />
        </FormCell>
        <FormCell basis={140}>
          <Field
            label="Start buffer (mins)"
            value={sh.startBuffer}
            onChange={set("startBuffer")}
            placeholder="0"
            error={err("startBuffer")}
          />
        </FormCell>
        <FormCell basis={140}>
          <Field
            label="End buffer (mins)"
            value={sh.endBuffer}
            onChange={set("endBuffer")}
            placeholder="0"
            error={err("endBuffer")}
          />
        </FormCell>
      </FormGrid>
      <FormActions
        submitLabel={initial ? "Update" : "Create"}
        onCancel={onCancel}
        onSubmit={submit(onSave)}
      />
    </View>
  );
}
