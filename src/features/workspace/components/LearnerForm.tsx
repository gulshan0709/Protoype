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
import { fullName } from "../../../domain/common/text";
import {
  type NewLearner,
  type Column,
  REQUIRED,
  LABELS,
  GENDERS,
  USER_TYPES,
  emptyLearner,
  validateLearner,
} from "../../../domain/learners/setup";
import { PersonImageField } from "./PersonImageField";

export function AddLearnerForm({
  initial,
  submitLabel = "Add learner",
  onSave,
  onCancel,
}: {
  initial?: NewLearner;
  submitLabel?: string;
  onSave: (l: NewLearner) => void;
  onCancel: () => void;
}) {
  // Editing shows what still needs completing straight away.
  const {
    value: form,
    setValue,
    set,
    err,
    submit,
  } = useFormState(initial ?? emptyLearner(), validateLearner, {
    reveal: !!initial,
  });
  const required = (k: Column) => REQUIRED.includes(k);
  const text = (k: Column, placeholder?: string) => (
    <FormCell key={k}>
      <Field
        label={`${LABELS[k]}${required(k) ? " *" : ""}`}
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
        required={required(k)}
        value={form[k]}
        placeholder={required(k) ? undefined : "Not set"}
        options={options}
        onChange={set(k)}
        error={err(k)}
      />
    </FormCell>
  );
  return (
    <View style={{ gap: 16 }}>
      <RequiredNote />
      <FormGrid>
        {text("uid", "e.g. 24031")}
        {text("first_name", "e.g. Aarav")}
        {text("last_name", "e.g. Mehta")}
        {choice("type", USER_TYPES)}
        {text("email", "learner@college.edu")}
        {text("mobile", "10–15 digits")}
        {choice("gender", GENDERS)}
        {text("dob", "YYYY-MM-DD")}
        {text("group_name", "e.g. CSE 2026")}
        {text("Department_name", "e.g. Computing")}
        {text("program", "e.g. B.Tech CSE")}
        {text("section", "e.g. 5A")}
        {text("parentsemail", "parent@mail.com")}
        {text("parentsmobile", "10–15 digits")}
      </FormGrid>
      <PersonImageField
        label="Image"
        name={fullName({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
        })}
        image={form.image}
        hint="JPEG, PNG or GIF. Used for face matching during attendance."
        onChange={(image) => setValue((f) => ({ ...f, image }))}
      />
      <FormActions
        submitLabel={submitLabel}
        onCancel={onCancel}
        onSubmit={submit(onSave)}
      />
    </View>
  );
}
