import { demoPortrait } from "../../../shared/ui/demoPortrait";
import React, { useMemo, useState } from "react";
import { Image, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Field, Row, Txt } from "../../../shared/ui/Primitives";
import { Select } from "../../../shared/ui/Select";
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
/** Image picker for learner photos (web, iOS Photos/Files, Android). */
export async function pickImages(multiple: boolean) {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/jpeg", "image/png", "image/gif"],
    multiple,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return (result.assets ?? []).filter((a) =>
    /\.(jpe?g|png|gif)$/i.test(a.name),
  );
}

function FormCell({ children }: { children: React.ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: 220 }}>{children}</View>;
}

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
  const c = useTheme();
  const [form, setForm] = useState<NewLearner>(initial ?? emptyLearner());
  // Editing shows what still needs completing straight away.
  const [submitted, setSubmitted] = useState(!!initial);
  const [imageError, setImageError] = useState("");
  const errors = useMemo(() => validateLearner(form), [form]);
  const set = (k: Column) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const label = (k: Column) =>
    `${LABELS[k]}${REQUIRED.includes(k) ? " *" : ""}`;
  const text = (k: Column, placeholder?: string) => (
    <FormCell key={k}>
      <Field
        label={label(k)}
        value={form[k]}
        onChange={set(k)}
        placeholder={placeholder}
        error={submitted ? errors[k] : undefined}
      />
    </FormCell>
  );
  const choice = (k: Column, options: string[]) => (
    <FormCell key={k}>
      <View style={{ gap: 7 }}>
        <Txt size={12} bold>
          {label(k)}
        </Txt>
        <Select
          label={LABELS[k]}
          value={form[k]}
          options={[
            ...(REQUIRED.includes(k) ? [] : [{ label: "Not set", value: "" }]),
            ...options.map((o) => ({ label: o, value: o })),
          ]}
          onChange={set(k)}
        />
        {submitted && !!errors[k] && (
          <Txt size={12} color={c.critical}>
            {errors[k]}
          </Txt>
        )}
      </View>
    </FormCell>
  );
  return (
    <View style={{ gap: 16 }}>
      <Txt size={12} color={c.muted}>
        Fields marked * are required.
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
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
      </View>
      <View style={{ gap: 7 }}>
        <Txt size={12} bold>
          Image
        </Txt>
        <Row style={{ flexWrap: "wrap", gap: 10 }}>
          {!!form.image && (
            <Image
              accessibilityLabel="Learner image"
              source={demoPortrait(form.image)}
              style={{ width: 56, height: 56, borderRadius: 8 }}
            />
          )}
          <Button
            label={form.image ? "Change image" : "Choose image"}
            icon="camera"
            onPress={() =>
              void pickImages(false).then(
                (assets) => {
                  if (!assets.length) return;
                  setImageError("");
                  setForm((f) => ({ ...f, image: assets[0].uri }));
                },
                () => setImageError("The image could not be read."),
              )
            }
          />
          {!!form.image && (
            <Button
              label="Remove image"
              onPress={() => setForm((f) => ({ ...f, image: undefined }))}
            />
          )}
        </Row>
        <Txt size={11} color={imageError ? c.critical : c.muted}>
          {imageError ||
            "JPEG, PNG or GIF. Used for face matching during attendance."}
        </Txt>
      </View>
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
