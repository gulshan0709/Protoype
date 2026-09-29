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
import { PersonImageField } from "./PersonImageField";
import {
  type SurveillanceUser,
  type Column,
  LABELS,
  USER_TYPES,
  emptyUser,
  validateUser,
  isVisitor,
  isThreat,
} from "../../../domain/surveillance/setup";

export function UserForm({
  initial,
  taken,
  submitLabel = "Add user",
  onSave,
  onCancel,
}: {
  initial?: SurveillanceUser;
  // UIDs and emails used by other users (a face identity must be unique).
  taken: { uids: string[]; emails: string[] };
  submitLabel?: string;
  onSave: (u: SurveillanceUser) => void;
  onCancel: () => void;
}) {
  const {
    value: form,
    setValue,
    set,
    err,
    submit,
  } = useFormState(
    initial ?? emptyUser(),
    (u) => {
      const e = validateUser(u);
      if (!e.uid && taken.uids.includes(u.uid.toLowerCase()))
        e.uid = "A user with this UID already exists";
      if (!e.email && u.email && taken.emails.includes(u.email.toLowerCase()))
        e.email = "A user with this email already exists";
      return e;
    },
    { reveal: !!initial },
  );
  const required = (k: Column) =>
    k === "uid" ||
    k === "first_name" ||
    k === "user_type" ||
    (k === "email" && !isThreat(form)) ||
    ((k === "start_time" || k === "end_time") && isVisitor(form));
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
  return (
    <View style={{ gap: 16 }}>
      <RequiredNote>
        Email is optional for Threat users; visitors need a validity window.
      </RequiredNote>
      <FormGrid>
        {text("uid", "e.g. E1001")}
        {text("first_name", "e.g. Ravi")}
        {text("last_name", "e.g. Kumar")}
        <FormCell>
          <SelectField
            label="User type"
            required
            value={form.user_type}
            options={USER_TYPES}
            onChange={set("user_type")}
          />
        </FormCell>
        {text("email", "person@campus.edu")}
        {text("phone", "Digits only")}
        {!isVisitor(form) && text("shift", "e.g. General (09:00–18:00)")}
        {text("camera_group", "e.g. Main Gate (blank = all cameras)")}
        {isVisitor(form) && text("start_time", "YYYY-MM-DD HH:MM")}
        {isVisitor(form) && text("end_time", "YYYY-MM-DD HH:MM")}
      </FormGrid>
      <PersonImageField
        label="Profile image"
        name={fullName({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
        })}
        image={form.image}
        hint="JPG or PNG. A clear front-facing photo is used for recognition."
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
