import { Switch, View } from "react-native";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Field, Row, Txt } from "../../../shared/ui/Primitives";
import {
  ErrorText,
  FormActions,
  FormCell,
  FormGrid,
  RequiredNote,
  SelectField,
} from "../../../shared/ui/Form";
import { useFormState } from "../../../shared/ui/useFormState";
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
} from "../../../domain/cameras/setup";
import {
  CameraCard,
  CameraConnectionFields,
} from "./setup/CameraConnectionFields";

export function AddCameraForm({
  variant,
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  variant: CameraVariant;
  initial?: CameraConfig;
  submitLabel: string;
  onSave: (c: CameraConfig) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const {
    value: form,
    setValue,
    set,
    errors,
    err,
    submitted,
    submit,
  } = useFormState(
    initial ?? emptyCamera(variant),
    (f) => validateCamera(f, variant),
    { reveal: !!initial },
  );
  const [locationA, locationB] = LOCATION_LABELS[variant];
  const mode = variant === "gate" ? "Direction" : "Attendance type";
  const setDevice = (i: number, patch: Partial<CameraDevice>) =>
    setValue((f) => ({
      ...f,
      cameras: f.cameras.map((d, j) => (j === i ? { ...d, ...patch } : d)),
    }));
  return (
    <View style={{ gap: 16 }}>
      <RequiredNote />
      <FormGrid>
        <FormCell basis={200}>
          <Field
            label={`${locationA} *`}
            value={form.building}
            onChange={set("building")}
            placeholder={
              variant === "gate" ? "e.g. Main Gate" : "e.g. Engineering Block"
            }
            error={err("building")}
          />
        </FormCell>
        <FormCell basis={200}>
          <Field
            label={`${locationB} *`}
            value={form.room_number}
            onChange={set("room_number")}
            placeholder={variant === "gate" ? "e.g. 1" : "e.g. 204"}
            error={err("room_number")}
          />
        </FormCell>
        <FormCell basis={200}>
          <Field
            label="Capture per hour"
            value={form.capture_per_hour}
            onChange={set("capture_per_hour")}
            placeholder="e.g. 4"
            error={err("capture_per_hour")}
          />
        </FormCell>
        <FormCell basis={200}>
          <SelectField
            label={mode}
            value={form.attendance_type}
            options={variant === "gate" ? DIRECTIONS : ATTENDANCE_TYPES}
            onChange={set("attendance_type")}
          />
        </FormCell>
        <FormCell basis={200}>
          <Field
            label="Detection *"
            value={form.detection}
            onChange={set("detection")}
            placeholder="e.g. 0.6"
            error={err("detection")}
          />
        </FormCell>
        <FormCell basis={200}>
          <Field
            label="Recognition *"
            value={form.recognition}
            onChange={set("recognition")}
            placeholder="e.g. 0.8"
            error={err("recognition")}
          />
        </FormCell>
        {variant === "room" && (
          <FormCell basis={200}>
            <Row style={{ gap: 10, minHeight: 44, marginTop: 20 }}>
              <Switch
                accessibilityLabel="Allowed duplicate class"
                value={form.allow_duplicate_classes}
                onValueChange={set("allow_duplicate_classes")}
                trackColor={{ true: c.actionPrimary, false: c.border }}
              />
              <Txt size={12}>Allowed duplicate class</Txt>
            </Row>
          </FormCell>
        )}
      </FormGrid>

      {form.cameras.map((d, i) => {
        const de = err("cameras")?.[i] ?? {};
        return (
          <CameraCard
            key={i}
            index={i}
            onRemove={
              form.cameras.length > 1
                ? () =>
                    setValue((f) => ({
                      ...f,
                      cameras: f.cameras.filter((_, j) => j !== i),
                    }))
                : undefined
            }
          >
            <FormGrid>
              <FormCell basis={200}>
                <Field
                  label="Display name *"
                  value={d.display_name}
                  onChange={(display_name) => setDevice(i, { display_name })}
                  placeholder="e.g. CAM-E204-01"
                  error={de.display_name}
                />
              </FormCell>
              <CameraConnectionFields
                value={{ ...d, brand: d.camera_brand }}
                errors={{ ...de, brand: de.camera_brand }}
                onChange={({ brand, ...patch }) =>
                  setDevice(
                    i,
                    brand === undefined
                      ? patch
                      : { ...patch, camera_brand: brand },
                  )
                }
                keepUnknownBrand
              />
            </FormGrid>
          </CameraCard>
        );
      })}
      <FormActions
        submitLabel={submitLabel}
        onCancel={onCancel}
        onSubmit={submit(onSave)}
        leading={
          <Button
            label="Add another camera"
            icon="plus"
            onPress={() =>
              setValue((f) => ({
                ...f,
                cameras: [...f.cameras, emptyDevice()],
              }))
            }
          />
        }
      />
      <ErrorText>
        {submitted && hasCameraErrors(errors)
          ? "Please fill the mandatory fields."
          : undefined}
      </ErrorText>
    </View>
  );
}
