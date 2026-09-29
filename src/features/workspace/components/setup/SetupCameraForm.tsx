import { View } from "react-native";
import {
  DAYS,
  emptySetupCamera,
  validateSetupCameras,
  type SetupCamera,
} from "../../../../domain/sources/setup";
import { Button, Field } from "../../../../shared/ui/Primitives";
import {
  ErrorText,
  FormActions,
  FormCell,
  FormGrid,
  SelectField,
} from "../../../../shared/ui/Form";
import { useFormState } from "../../../../shared/ui/useFormState";
import { ChipSelect } from "../../../../shared/ui/Chip";
import { CameraCard, CameraConnectionFields } from "./CameraConnectionFields";

/** Legacy "Create / Update Camera Configuration": several cameras at once. */
export function SetupCameraForm({
  initial,
  takenNames,
  locations,
  onSave,
  onCancel,
}: {
  initial?: SetupCamera;
  /** Other cameras' display names (the edited one is not among them). */
  takenNames: string[];
  locations: string[];
  onSave: (cams: SetupCamera[]) => void;
  onCancel: () => void;
}) {
  const {
    value: cams,
    setValue: setCams,
    errors,
    err,
    submitted,
    submit,
  } = useFormState(
    initial ? [initial] : [emptySetupCamera(1)],
    (all) => validateSetupCameras(all, takenNames),
    { reveal: !!initial },
  );
  const set = (i: number, patch: Partial<SetupCamera>) =>
    setCams((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <View style={{ gap: 14 }}>
      {cams.map((cam, i) => {
        const e = err(i) ?? {};
        return (
          <CameraCard
            key={i}
            index={i}
            gap={10}
            onRemove={
              cams.length > 1
                ? () => setCams((all) => all.filter((_, j) => j !== i))
                : undefined
            }
          >
            <FormGrid gap={10}>
              <FormCell basis={200}>
                <Field
                  label="Display name *"
                  value={cam.display_name}
                  onChange={(v) => set(i, { display_name: v })}
                  placeholder="Camera-1"
                  error={e.display_name}
                />
              </FormCell>
              <FormCell basis={200}>
                <Field
                  label="Camera group"
                  value={cam.group}
                  onChange={(v) => set(i, { group: v })}
                  placeholder="e.g. Main Gate"
                />
              </FormCell>
              <CameraConnectionFields
                value={cam}
                errors={e}
                onChange={(patch) => set(i, patch)}
                placeholders={{
                  ip: "127.0.0.1",
                  camera_id: "102",
                  user_name: "User",
                }}
                bases={{ port: 110, camera_id: 110 }}
              />
              <FormCell basis={140}>
                <Field
                  label="Start time"
                  value={cam.start}
                  onChange={(v) => set(i, { start: v })}
                  placeholder="HH:MM"
                  error={e.start}
                />
              </FormCell>
              <FormCell basis={140}>
                <Field
                  label="End time"
                  value={cam.end}
                  onChange={(v) => set(i, { end: v })}
                  placeholder="HH:MM"
                  error={e.end}
                />
              </FormCell>
              <FormCell basis={200}>
                <SelectField
                  label="Location"
                  value={cam.location}
                  placeholder="Not set"
                  options={[
                    ...new Set([
                      ...locations,
                      ...(cam.location ? [cam.location] : []),
                    ]),
                  ]}
                  onChange={(v) => set(i, { location: v })}
                />
              </FormCell>
              <FormCell basis={200}>
                <SelectField
                  label="Camera type"
                  value={cam.camera_type}
                  options={["Check In", "Check Out"]}
                  onChange={(v) =>
                    set(i, { camera_type: v as SetupCamera["camera_type"] })
                  }
                />
              </FormCell>
            </FormGrid>
            <ChipSelect
              label="Days"
              options={DAYS}
              value={cam.days}
              exclusive="All Day"
              optionLabel={(o) => `Days: ${o}`}
              onChange={(days) => set(i, { days })}
            />
          </CameraCard>
        );
      })}
      <FormActions
        submitLabel="Save"
        onCancel={onCancel}
        onSubmit={submit(onSave)}
        leading={
          initial ? undefined : (
            <Button
              label="Add another camera"
              icon="plus"
              onPress={() =>
                setCams((all) => [
                  ...all,
                  emptySetupCamera(all.length + 1, all[0]),
                ])
              }
            />
          )
        }
      />
      <ErrorText>
        {submitted && errors.some((e) => Object.keys(e).length)
          ? "Please fill the mandatory fields."
          : undefined}
      </ErrorText>
    </View>
  );
}
