import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Field, Row, Txt } from "../../../shared/ui/Primitives";
import { type Marking, TIME, minutes } from "../../../domain/gate/attendance";
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
  const [m, setM] = useState<Marking>({
    checkIn: "",
    checkOut: "",
    reason: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const errors = useMemo(() => {
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
  }, [m]);
  const set = (k: keyof Marking) => (v: string) =>
    setM((x) => ({ ...x, [k]: v }));
  const err = (k: keyof Marking) => (submitted ? errors[k] : undefined);
  return (
    <View style={{ gap: 16 }}>
      <Txt size={13}>
        Mark attendance for{" "}
        <Txt size={13} bold>
          {title}
        </Txt>
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <View style={{ flexGrow: 1, flexBasis: 180 }}>
          <Field
            label="Check-in time *"
            value={m.checkIn}
            onChange={set("checkIn")}
            placeholder="HH:MM, e.g. 09:05"
            error={err("checkIn")}
          />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 180 }}>
          <Field
            label="Check-out time"
            value={m.checkOut}
            onChange={set("checkOut")}
            placeholder="HH:MM, e.g. 17:30"
            error={err("checkOut")}
          />
        </View>
      </View>
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
      <Row style={{ justifyContent: "flex-end", gap: 8 }}>
        <Button label="Cancel" onPress={onCancel} />
        <Button
          label="Mark attendance"
          variant="primary"
          onPress={() => {
            setSubmitted(true);
            if (!Object.keys(errors).length) onSave(m);
          }}
        />
      </Row>
    </View>
  );
}
