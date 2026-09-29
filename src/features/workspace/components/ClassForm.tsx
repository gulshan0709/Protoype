import { View } from "react-native";
import { Field } from "../../../shared/ui/Primitives";
import {
  FormActions,
  FormCell,
  FormGrid,
  RequiredNote,
  SelectField,
} from "../../../shared/ui/Form";
import { useFormState } from "../../../shared/ui/useFormState";
import {
  emptyClass,
  validateClass,
  labelFor,
  LABELS,
  REQUIRED,
  CLASS_TAGS,
  WEEKDAYS,
  ATTENDANCE_TYPES,
  NOUN,
  type Column,
  type NewClass,
  type SetupKind,
} from "../../../domain/classes/setup";

export function AddClassForm({
  kind = "class",
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  kind?: SetupKind;
  initial?: NewClass;
  submitLabel?: string;
  onSave: (c: NewClass) => void;
  onCancel: () => void;
}) {
  // Editing shows what still needs completing straight away.
  const {
    value: form,
    set,
    err,
    submit,
  } = useFormState(
    initial ?? {
      ...emptyClass(),
      Tag: kind === "lab" ? "Lab" : "Lecture",
      attendance_type: kind === "lab" ? "Continuous" : "Snapshot",
    },
    (f) => validateClass(f, kind),
    { reveal: !!initial },
  );
  const text = (k: Column, placeholder?: string) => (
    <FormCell key={k}>
      <Field
        label={`${labelFor(k, kind)}${REQUIRED.includes(k) ? " *" : ""}`}
        value={form[k]}
        onChange={set(k)}
        placeholder={placeholder}
        error={err(k)}
      />
    </FormCell>
  );
  const choice = (k: Column, options: string[]) => (
    <FormCell key={k}>
      <SelectField
        label={LABELS[k]}
        required={REQUIRED.includes(k)}
        value={form[k]}
        placeholder={REQUIRED.includes(k) ? undefined : "Not set"}
        options={options}
        onChange={(v) => {
          set(k)(v);
          // Labs and practicals use continuous verification by default.
          if (k === "Tag")
            set("attendance_type")(
              v === "Lab" || v === "Practical" ? "Continuous" : "Snapshot",
            );
        }}
        error={err(k)}
      />
    </FormCell>
  );
  return (
    <View style={{ gap: 16 }}>
      <RequiredNote />
      <FormGrid>
        {text(
          "class_name",
          kind === "lab" ? "e.g. AI Systems Lab 3" : "e.g. Data Structures",
        )}
        {text("program", "e.g. B.Tech CSE")}
        {text("department", "e.g. Computing")}
        {text("cohort", "e.g. 2026")}
        {text("section", "e.g. CSE-5A")}
        {text("semester", "e.g. 5")}
        {choice("Tag", CLASS_TAGS)}
        {text("faculty_email", "faculty@college.edu")}
        {choice("attendance_type", ATTENDANCE_TYPES)}
        {text("start_date", "YYYY-MM-DD")}
        {text("end_date", "YYYY-MM-DD")}
        {choice("day", WEEKDAYS)}
        {text("start_time", "HH:MM, e.g. 09:00")}
        {text("end_time", "HH:MM, e.g. 10:00")}
        {text("building", "e.g. Engineering Block")}
        {text("room", kind === "lab" ? "e.g. L-12" : "e.g. 204")}
        {kind === "lab" && text("capacity", "e.g. 30")}
      </FormGrid>
      <FormActions
        submitLabel={submitLabel ?? `Add ${NOUN[kind].one}`}
        onCancel={onCancel}
        onSubmit={submit(onSave)}
      />
    </View>
  );
}
