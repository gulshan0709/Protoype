// Sources & Setup → Camera Criteria: the quality thresholds of the camera
// health check (legacy skillatracker-ui Surveillance/SetUp). Kept for this session.
import { useState } from "react";
import { View } from "react-native";
import {
  useSaveSettings,
  useSettings,
} from "../../../../application/surveillanceSettings";
import { useTheme } from "../../../../shared/theme/Theme";
import { Field, Txt } from "../../../../shared/ui/Primitives";
import {
  ErrorText,
  FormActions,
  FormCell,
  FormGrid,
} from "../../../../shared/ui/Form";
import { Panel } from "./SettingsPanel";

const CRITERIA: [
  group: string,
  hint: string,
  fields: [key: string, label: string][],
  pairs: [string, string][],
][] = [
  [
    "Brightness",
    "How well-lit the image is (pixel intensity 0–255).",
    [
      ["min_mean_intensity", "Min mean intensity"],
      ["max_mean_intensity", "Max mean intensity"],
      ["ideal_min", "Ideal range — min"],
      ["ideal_max", "Ideal range — max"],
      ["uniformity_min", "Min uniformity"],
    ],
    [
      ["min_mean_intensity", "max_mean_intensity"],
      ["ideal_min", "ideal_max"],
    ],
  ],
  [
    "Contrast",
    "Separation between light and dark areas.",
    [
      ["min_std_dev", "Min std-dev"],
      ["min_dynamic_range", "Min dynamic range"],
    ],
    [],
  ],
  [
    "Sharpness",
    "How in-focus / crisp the image is.",
    [
      ["min_laplacian_variance", "Min laplacian variance"],
      ["ideal_laplacian_variance", "Ideal laplacian variance"],
      ["edge_density_min", "Min edge density"],
    ],
    [["min_laplacian_variance", "ideal_laplacian_variance"]],
  ],
  [
    "Resolution",
    "Pixel dimensions of the stream.",
    [
      ["min_width", "Min width (px)"],
      ["min_height", "Min height (px)"],
      ["recommended_width", "Recommended width (px)"],
      ["recommended_height", "Recommended height (px)"],
    ],
    [
      ["min_width", "recommended_width"],
      ["min_height", "recommended_height"],
    ],
  ],
  [
    "Face detection",
    "Face-engine confidence and speed.",
    [
      ["min_face_confidence", "Min face confidence"],
      ["max_detection_time_ms", "Max detection time (ms)"],
    ],
    [],
  ],
  [
    "Angle",
    "Acceptable head-pose deviation from straight-on.",
    [
      ["max_yaw_degrees", "Max yaw (°)"],
      ["max_pitch_degrees", "Max pitch (°)"],
    ],
    [],
  ],
];

export function CriteriaView({ notify }: { notify: (t: string) => void }) {
  const c = useTheme();
  const s = useSettings();
  const saveSettings = useSaveSettings();
  const [v, setV] = useState<Record<string, string>>(s.criteria);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const save = () => {
    const e: Record<string, string> = {};
    const partial: string[] = [];
    for (const [group, , fields, pairs] of CRITERIA) {
      const filled = fields.filter(([k]) => v[k]?.trim());
      for (const [k] of fields)
        if (v[k]?.trim() && !/^\d+(\.\d+)?$/.test(v[k].trim()))
          e[k] = "Use a number";
      if (filled.length && filled.length < fields.length) {
        partial.push(group);
        for (const [k] of fields) if (!v[k]?.trim()) e[k] = "Required";
      }
      for (const [lo, hi] of pairs)
        if (!e[lo] && !e[hi] && v[lo] && v[hi] && Number(v[lo]) > Number(v[hi]))
          e[hi] = "Must not be below the minimum";
    }
    setErrors(e);
    if (partial.length)
      return setMessage(`Please fill all fields for: ${partial.join(", ")}.`);
    if (Object.keys(e).length) return setMessage("Fix the highlighted values.");
    if (!Object.values(v).some((x) => x?.trim()))
      return setMessage("Please fill at least one field before saving.");
    setMessage("");
    saveSettings({ criteria: v });
    notify("Camera criteria saved for this session.");
  };
  return (
    <Panel
      title="Camera acceptance criteria"
      subtitle="Set the quality thresholds used to score every camera during the service-status health check. Leave a group blank to use the system default."
    >
      {CRITERIA.map(([group, hint, fields]) => (
        <View
          key={group}
          style={{
            gap: 12,
            borderTopWidth: group === "Brightness" ? 0 : 1,
            borderColor: c.border,
            paddingTop: group === "Brightness" ? 0 : 24,
            paddingBottom: 8,
          }}
        >
          <Txt size={13} bold>
            {group}
          </Txt>
          <Txt size={11} color={c.muted}>
            {hint}
          </Txt>
          <FormGrid gap={10}>
            {fields.map(([k, label]) => (
              <FormCell key={k} basis={170}>
                <Field
                  label={label}
                  value={v[k] ?? ""}
                  onChange={(x) => setV((y) => ({ ...y, [k]: x }))}
                  placeholder="System default"
                  error={errors[k]}
                />
              </FormCell>
            ))}
          </FormGrid>
        </View>
      ))}
      <ErrorText>{message}</ErrorText>
      <FormActions
        submitLabel="Save"
        onSubmit={save}
        cancelLabel="Reset to defaults"
        onCancel={() => {
          setV({});
          setErrors({});
          setMessage("");
          saveSettings({ criteria: {} });
          notify("Camera criteria reset to defaults.");
        }}
      />
    </Panel>
  );
}
