import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Field, Row, Txt } from "../../../shared/ui/Primitives";
import { Select } from "../../../shared/ui/Select";
import { pickImages } from "./LearnerForm";
import { PersonAvatar } from "./PersonChip";
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
function FormCell({ children }: { children: React.ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: 220 }}>{children}</View>;
}

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
  const c = useTheme();
  const [form, setForm] = useState<SurveillanceUser>(initial ?? emptyUser());
  const [imageError, setImageError] = useState("");
  const [submitted, setSubmitted] = useState(!!initial);
  const errors = useMemo(() => {
    const e = validateUser(form);
    const own = (v?: string) => (v ?? "").toLowerCase();
    if (
      !e.uid &&
      form.uid.toLowerCase() !== own(initial?.uid) &&
      taken.uids.includes(form.uid.toLowerCase())
    )
      e.uid = "A user with this UID already exists";
    if (
      !e.email &&
      form.email &&
      form.email.toLowerCase() !== own(initial?.email) &&
      taken.emails.includes(form.email.toLowerCase())
    )
      e.email = "A user with this email already exists";
    return e;
  }, [form, initial, taken]);
  const set = (k: Column) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
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
        error={submitted ? errors[k] : undefined}
      />
    </FormCell>
  );
  return (
    <View style={{ gap: 16 }}>
      <Txt size={12} color={c.muted}>
        Fields marked * are required. Email is optional for Threat users;
        visitors need a validity window.
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {text("uid", "e.g. E1001")}
        {text("first_name", "e.g. Ravi")}
        {text("last_name", "e.g. Kumar")}
        <FormCell>
          <View style={{ gap: 7 }}>
            <Txt size={12} bold>
              User type *
            </Txt>
            <Select
              label="User type"
              value={form.user_type}
              options={USER_TYPES.map((t) => ({ label: t, value: t }))}
              onChange={set("user_type")}
            />
          </View>
        </FormCell>
        {text("email", "person@campus.edu")}
        {text("phone", "Digits only")}
        {!isVisitor(form) && text("shift", "e.g. General (09:00–18:00)")}
        {text("camera_group", "e.g. Main Gate (blank = all cameras)")}
        {isVisitor(form) && text("start_time", "YYYY-MM-DD HH:MM")}
        {isVisitor(form) && text("end_time", "YYYY-MM-DD HH:MM")}
      </View>
      <View style={{ gap: 7 }}>
        <Txt size={12} bold>
          Profile image
        </Txt>
        <Row style={{ flexWrap: "wrap", gap: 10 }}>
          {!!form.image && (
            // Same portrait as the list: the upload, else the person's pool portrait.
            <PersonAvatar
              name={
                [form.first_name, form.last_name]
                  .map((part) => part?.trim())
                  .filter(Boolean)
                  .join(" ") || "New user"
              }
              image={form.image}
              size={56}
            />
          )}
          <Button
            label={form.image ? "Change image" : "Choose image"}
            icon="camera"
            onPress={() =>
              void pickImages(false)
                .then((assets) => {
                  setImageError("");
                  if (assets.length)
                    setForm((f) => ({ ...f, image: assets[0].uri }));
                })
                .catch(() => setImageError("The image could not be read."))
            }
          />
          {!!form.image && (
            <Button
              label="Remove image"
              onPress={() => setForm((f) => ({ ...f, image: undefined }))}
            />
          )}
        </Row>
        <Txt size={11} color={c.muted}>
          JPG or PNG. A clear front-facing photo is used for recognition.
        </Txt>
      </View>
      {!!imageError && <Txt color={c.critical}>{imageError}</Txt>}
      <Row style={{ justifyContent: "flex-end", gap: 8 }}>
        <Button label="Cancel" onPress={onCancel} />
        <Button
          label={submitLabel}
          variant="primary"
          onPress={() => {
            setSubmitted(true);
            if (!Object.keys(errors).length) onSave(form);
          }}
        />
      </Row>
    </View>
  );
}
