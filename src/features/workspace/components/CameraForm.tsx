import React, { useMemo, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Field, Row, Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Select } from "../../../shared/ui/Select";
import {
  type CameraVariant,
  type CameraConfig,
  type CameraDevice,
  emptyCamera,
  emptyDevice,
  validateCamera,
  hasCameraErrors,
  LOCATION_LABELS,
  DIRECTIONS,
  ATTENDANCE_TYPES,
  CAMERA_BRANDS,
} from "../../../domain/cameras/setup";
function Cell({
  children,
  basis = 200,
}: {
  children: React.ReactNode;
  basis?: number;
}) {
  return <View style={{ flexGrow: 1, flexBasis: basis }}>{children}</View>;
}

export function AddCameraForm({
  variant,
  initial,
  submitLabel = "Save camera",
  onSave,
  onCancel,
}: {
  variant: CameraVariant;
  initial?: CameraConfig;
  submitLabel?: string;
  onSave: (c: CameraConfig) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [form, setForm] = useState<CameraConfig>(
    initial ?? emptyCamera(variant),
  );
  const [submitted, setSubmitted] = useState(!!initial);
  const [shown, setShown] = useState<Record<number, boolean>>({});
  const errors = useMemo(() => validateCamera(form, variant), [form, variant]);
  const [locationA, locationB] = LOCATION_LABELS[variant];
  const err = (v?: string) => (submitted ? v : undefined);
  const set = (k: keyof CameraConfig) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setDevice = (i: number, k: keyof CameraDevice) => (v: string) =>
    setForm((f) => ({
      ...f,
      cameras: f.cameras.map((d, j) => (j === i ? { ...d, [k]: v } : d)),
    }));
  return (
    <View style={{ gap: 16 }}>
      <Txt size={12} color={c.muted}>
        Fields marked * are required.
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Cell>
          <Field
            label={`${locationA} *`}
            value={form.building}
            onChange={set("building")}
            placeholder={
              variant === "gate" ? "e.g. Main Gate" : "e.g. Engineering Block"
            }
            error={err(errors.building)}
          />
        </Cell>
        <Cell>
          <Field
            label={`${locationB} *`}
            value={form.room_number}
            onChange={set("room_number")}
            placeholder={variant === "gate" ? "e.g. 1" : "e.g. 204"}
            error={err(errors.room_number)}
          />
        </Cell>
        <Cell>
          <Field
            label="Capture per hour"
            value={form.capture_per_hour}
            onChange={set("capture_per_hour")}
            placeholder="e.g. 4"
            error={err(errors.capture_per_hour)}
          />
        </Cell>
        <Cell>
          <View style={{ gap: 7 }}>
            <Txt size={12} bold>
              {variant === "gate" ? "Direction" : "Attendance type"}
            </Txt>
            <Select
              label={variant === "gate" ? "Direction" : "Attendance type"}
              value={form.attendance_type}
              options={(variant === "gate" ? DIRECTIONS : ATTENDANCE_TYPES).map(
                (o) => ({ label: o, value: o }),
              )}
              onChange={set("attendance_type")}
            />
          </View>
        </Cell>
        <Cell>
          <Field
            label="Detection *"
            value={form.detection}
            onChange={set("detection")}
            placeholder="e.g. 0.6"
            error={err(errors.detection)}
          />
        </Cell>
        <Cell>
          <Field
            label="Recognition *"
            value={form.recognition}
            onChange={set("recognition")}
            placeholder="e.g. 0.8"
            error={err(errors.recognition)}
          />
        </Cell>
        {variant === "room" && (
          <Cell>
            <Row style={{ gap: 10, minHeight: 44, marginTop: 20 }}>
              <Switch
                accessibilityLabel="Allowed duplicate class"
                value={form.allow_duplicate_classes}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, allow_duplicate_classes: v }))
                }
                trackColor={{ true: c.actionPrimary, false: c.border }}
              />
              <Txt size={12}>Allowed duplicate class</Txt>
            </Row>
          </Cell>
        )}
      </View>

      {form.cameras.map((d, i) => {
        const de = submitted ? (errors.cameras[i] ?? {}) : {};
        return (
          <View
            key={i}
            style={{
              gap: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
            }}
          >
            <Row style={{ justifyContent: "space-between" }}>
              <Txt size={13} bold>
                Camera {i + 1}
              </Txt>
              {form.cameras.length > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove camera ${i + 1}`}
                  hitSlop={8}
                  onPress={() =>
                    setForm((f) => ({
                      ...f,
                      cameras: f.cameras.filter((_, j) => j !== i),
                    }))
                  }
                >
                  <Icon name="close" size={16} color={c.muted} />
                </Pressable>
              )}
            </Row>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <Cell>
                <Field
                  label="Display name *"
                  value={d.display_name}
                  onChange={setDevice(i, "display_name")}
                  placeholder="e.g. CAM-E204-01"
                  error={de.display_name}
                />
              </Cell>
              <Cell>
                <View style={{ gap: 7 }}>
                  <Txt size={12} bold>
                    Camera brand *
                  </Txt>
                  <Select
                    label="Camera brand"
                    value={d.camera_brand}
                    options={[
                      { label: "Choose brand", value: "" },
                      // Keep a brand that is not in the list (edited rows).
                      ...(d.camera_brand &&
                      !CAMERA_BRANDS.includes(d.camera_brand)
                        ? [d.camera_brand]
                        : []
                      )
                        .concat(CAMERA_BRANDS)
                        .map((b) => ({ label: b, value: b })),
                    ]}
                    onChange={setDevice(i, "camera_brand")}
                  />
                  {!!de.camera_brand && (
                    <Txt size={12} color={c.critical}>
                      {de.camera_brand}
                    </Txt>
                  )}
                </View>
              </Cell>
              <Cell>
                <Field
                  label="IP address *"
                  value={d.ip}
                  onChange={setDevice(i, "ip")}
                  placeholder="e.g. 192.168.1.20"
                  error={de.ip}
                />
              </Cell>
              <Cell basis={120}>
                <Field
                  label="Port *"
                  value={d.port}
                  onChange={setDevice(i, "port")}
                  placeholder="554"
                  error={de.port}
                />
              </Cell>
              <Cell>
                <Field
                  label="Camera ID *"
                  value={d.camera_id}
                  onChange={setDevice(i, "camera_id")}
                  placeholder="e.g. 101"
                  error={de.camera_id}
                />
              </Cell>
              <Cell>
                <Field
                  label="User name *"
                  value={d.user_name}
                  onChange={setDevice(i, "user_name")}
                  placeholder="Camera login"
                  error={de.user_name}
                />
              </Cell>
              <Cell>
                <View style={{ gap: 4 }}>
                  <Field
                    label="Password *"
                    value={d.password}
                    onChange={setDevice(i, "password")}
                    placeholder="Camera password"
                    secure={!shown[i]}
                    error={de.password}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      shown[i] ? "Hide password" : "Show password"
                    }
                    onPress={() => setShown((s) => ({ ...s, [i]: !s[i] }))}
                    style={{ alignSelf: "flex-start" }}
                  >
                    <Txt size={11} color={c.link}>
                      {shown[i] ? "Hide password" : "Show password"}
                    </Txt>
                  </Pressable>
                </View>
              </Cell>
            </View>
          </View>
        );
      })}
      <Row
        style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
      >
        <Button
          label="Add another camera"
          icon="plus"
          onPress={() =>
            setForm((f) => ({ ...f, cameras: [...f.cameras, emptyDevice()] }))
          }
        />
        <Row style={{ gap: 8 }}>
          <Button label="Cancel" onPress={onCancel} />
          <Button
            label={submitLabel}
            variant="primary"
            onPress={() => {
              setSubmitted(true);
              if (!hasCameraErrors(errors)) onSave(form);
            }}
          />
        </Row>
      </Row>
      {submitted && hasCameraErrors(errors) && (
        <Txt size={12} color={c.critical}>
          Please fill the mandatory fields.
        </Txt>
      )}
    </View>
  );
}
