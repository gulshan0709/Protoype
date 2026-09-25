import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Field, Row, Txt } from "../../../shared/ui/Primitives";
import { Select } from "../../../shared/ui/Select";
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

function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {children}
    </View>
  );
}
function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: 220 }}>{children}</View>;
}

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
  const c = useTheme();
  const [form, setForm] = useState<NewClass>(
    initial ?? {
      ...emptyClass(),
      Tag: kind === "lab" ? "Lab" : "Lecture",
      attendance_type: kind === "lab" ? "Continuous" : "Snapshot",
    },
  );
  // Editing shows what still needs completing straight away.
  const [submitted, setSubmitted] = useState(!!initial);
  const errors = useMemo(() => validateClass(form, kind), [form, kind]);
  const set = (k: Column) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const text = (k: Column, placeholder?: string) => (
    <Cell key={k}>
      <Field
        label={`${labelFor(k, kind)}${REQUIRED.includes(k) ? " *" : ""}`}
        value={form[k]}
        onChange={set(k)}
        placeholder={placeholder}
        error={submitted ? errors[k] : undefined}
      />
    </Cell>
  );
  const choice = (k: Column, options: string[]) => (
    <Cell key={k}>
      <View style={{ gap: 7 }}>
        <Txt size={12} bold>
          {LABELS[k]}
          {REQUIRED.includes(k) ? " *" : ""}
        </Txt>
        <Select
          label={LABELS[k]}
          value={form[k]}
          options={[
            ...(REQUIRED.includes(k) ? [] : [{ label: "Not set", value: "" }]),
            ...options.map((o) => ({ label: o, value: o })),
          ]}
          onChange={(v) => {
            set(k)(v);
            // Labs and practicals use continuous verification by default.
            if (k === "Tag")
              set("attendance_type")(
                v === "Lab" || v === "Practical" ? "Continuous" : "Snapshot",
              );
          }}
        />
        {submitted && errors[k] && (
          <Txt size={12} color={c.critical}>
            {errors[k]}
          </Txt>
        )}
      </View>
    </Cell>
  );
  return (
    <View style={{ gap: 16 }}>
      <Txt size={12} color={c.muted}>
        Fields marked * are required.
      </Txt>
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
      <Row style={{ justifyContent: "flex-end", gap: 8 }}>
        <Button label="Cancel" onPress={onCancel} />
        <Button
          label={submitLabel ?? `Add ${NOUN[kind].one}`}
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
