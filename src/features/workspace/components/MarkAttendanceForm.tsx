import { View } from "react-native";
import { useTheme } from "../../../shared/theme/Theme";
import { Field, Txt } from "../../../shared/ui/Primitives";
import { FormActions, FormCell, FormGrid } from "../../../shared/ui/Form";
import { useFormState } from "../../../shared/ui/useFormState";
import { type Marking, TIME, minutes } from "../../../domain/gate/attendance";
import { PersonOr } from "./PersonChip";

function validateMarking(m: Marking) {
  const e: Partial<Record<keyof Marking, string>> = {};
  if (!m.checkIn) e.checkIn = "Check-in time is required";
  else if (!TIME.test(m.checkIn)) e.checkIn = "Use 24-hour HH:MM";
  if (m.checkOut && !TIME.test(m.checkOut)) e.checkOut = "Use 24-hour HH:MM";
  else if (
    m.checkOut &&
    !e.checkIn &&
    minutes(m.checkOut) <= minutes(m.checkIn)
  )
    e.checkOut = "Check-out must be after check-in";
  if (!m.reason.trim()) e.reason = "A reason is required for the audit trail";
  return e;
}

export function MarkAttendanceForm({
  title,
  onSave,
  onCancel,
}: {
  title: string;
  onSave: (m: Marking) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const {
    value: m,
    set,
    err,
    submit,
  } = useFormState({ checkIn: "", checkOut: "", reason: "" }, validateMarking);
  return (
    <View style={{ gap: 16 }}>
      <PersonOr text={title}>
        <Txt size={13}>
          Mark attendance for{" "}
          <Txt size={13} bold>
            {title}
          </Txt>
        </Txt>
      </PersonOr>
      <FormGrid>
        <FormCell basis={180}>
          <Field
            label="Check-in time *"
            value={m.checkIn}
            onChange={set("checkIn")}
            placeholder="HH:MM, e.g. 09:05"
            error={err("checkIn")}
          />
        </FormCell>
        <FormCell basis={180}>
          <Field
            label="Check-out time"
            value={m.checkOut}
            onChange={set("checkOut")}
            placeholder="HH:MM, e.g. 17:30"
            error={err("checkOut")}
          />
        </FormCell>
      </FormGrid>
      <Field
        label="Reason *"
        value={m.reason}
        onChange={set("reason")}
        placeholder="e.g. Camera offline at Main Gate; verified by guard"
        multiline
        error={err("reason")}
      />
      <Txt size={11} color={c.muted}>
        Manual marks are labelled "Present · manual" and keep the reason in the
        activity trail.
      </Txt>
      <FormActions
        submitLabel="Mark attendance"
        onCancel={onCancel}
        onSubmit={submit(onSave)}
      />
    </View>
  );
}
