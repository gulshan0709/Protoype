// Sources & Setup → Setup: enabled services, notifications, and data retention
// (legacy skillatracker-ui Surveillance/SetUp). Kept for this session.
import { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { isEmail, isPhone } from "../../../../domain/common/validation";
import { USER_TYPES } from "../../../../domain/surveillance/setup";
import {
  useSaveSettings,
  useSettings,
  type Channel,
  type SurveillanceSettings,
} from "../../../../application/surveillanceSettings";
import { useTheme } from "../../../../shared/theme/Theme";
import { Button, Field, Row, Txt } from "../../../../shared/ui/Primitives";
import { Dialog } from "../../../../shared/ui/Dialog";
import {
  ErrorText,
  FormActions,
  FormCell,
  RemoveButton,
  SelectField,
} from "../../../../shared/ui/Form";
import { useFormState } from "../../../../shared/ui/useFormState";
import { ChipSelect } from "../../../../shared/ui/Chip";
import { SegmentedControl } from "../../../../shared/ui/SegmentedControl";
import { Panel, Toggle } from "./SettingsPanel";

const INTERVALS = [
  ["5", "5 min"],
  ["10", "10 min"],
  ["15", "15 min"],
  ["30", "30 min"],
  ["60", "1 hr"],
  ["720", "12 hr"],
  ["1440", "24 hr"],
];
const KEEP_DAYS = ["1", "2", "3", "5", "7", "15", "30", "60", "90", "120"];
const RESERVED_FIELDS = [
  "name",
  "email",
  "phone",
  "last name",
  "first name",
  "uid",
  "type",
];

export function SetupView({ notify }: { notify: (t: string) => void }) {
  const c = useTheme();
  const s = useSettings();
  const saveSettings = useSaveSettings();
  const wide = useWindowDimensions().width >= 1100;
  const [modules, setModules] = useState(s.modules);
  const [notifyState, setNotify] = useState(s.notify);
  const [moduleError, setModuleError] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [editing, setEditing] = useState<
    "" | "fields" | "surveillance" | "attendance"
  >("");
  const saveModules = () => {
    if (!modules.gate && !modules.analytics && !modules.video)
      return setModuleError("Select at least one module.");
    if (modules.analytics && modules.video)
      return setModuleError(
        "You can select only one: Surveillance Analytics or Surveillance Video and Analytics.",
      );
    setModuleError("");
    saveSettings({ modules });
    notify("Module setup saved for this session.");
  };
  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          flexDirection: wide ? "row" : "column",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <View
          style={{
            flex: wide ? 1 : undefined,
            width: wide ? undefined : "100%",
          }}
        >
          <Panel
            title="Enabled services"
            subtitle="Choose attendance and surveillance services for this workspace."
          >
            <Toggle
              label="Gate attendance"
              hint="Record arrivals, departures, and attendance at your gates."
              value={modules.gate}
              onChange={(gate) => setModules((m) => ({ ...m, gate }))}
            />
            <Toggle
              label="Surveillance analytics"
              hint="Recognise people and review camera activity."
              value={modules.analytics}
              onChange={(analytics) =>
                setModules((m) => ({
                  ...m,
                  analytics,
                  video: analytics ? false : m.video,
                }))
              }
            />
            <Toggle
              label="Video and analytics"
              hint="Adds live video and recordings to the surveillance dashboard."
              value={modules.video}
              onChange={(video) =>
                setModules((m) => ({
                  ...m,
                  video,
                  analytics: video ? false : m.analytics,
                }))
              }
            />
            <ErrorText>{moduleError}</ErrorText>
            <FormActions submitLabel="Save services" onSubmit={saveModules} />
          </Panel>
        </View>
        <View
          style={{
            flex: wide ? 1 : undefined,
            width: wide ? undefined : "100%",
          }}
        >
          <Panel
            title="Notifications"
            subtitle="Choose where recognition alerts are delivered."
            action={
              <Button
                label="Configure"
                compact
                variant="ghost"
                icon="settings"
                onPress={() => setAdvanced(true)}
              />
            }
          >
            {(["web", "email", "sms"] as const).map((k) => (
              <Toggle
                key={k}
                label={
                  {
                    web: "In-app alerts",
                    email: "Email",
                    sms: "SMS",
                  }[k]
                }
                hint={
                  {
                    web: "Show alerts within the workspace.",
                    email: "Send alerts to configured email recipients.",
                    sms: "Send time-sensitive alerts to mobile recipients.",
                  }[k]
                }
                value={notifyState[k].enable}
                onChange={(enable) =>
                  setNotify((n) => ({ ...n, [k]: { ...n[k], enable } }))
                }
              />
            ))}
            <FormActions
              submitLabel="Save notifications"
              onSubmit={() => {
                saveSettings({ notify: notifyState });
                notify("Notification setup saved for this session.");
              }}
            />
          </Panel>
        </View>
      </View>
      <Panel
        title="Data and retention"
        subtitle="Manage user information and retention periods."
      >
        {[
          ["fields", "Custom user fields", `${s.general.fields.length} fields`],
          [
            "surveillance",
            "Surveillance data retention",
            `${s.general.keepSurveillance} days`,
          ],
          [
            "attendance",
            "Attendance data retention",
            `${s.general.keepAttendance} days`,
          ],
        ].map(([key, label, value]) => (
          <Row
            key={key}
            style={{
              justifyContent: "space-between",
              borderTopWidth: key === "fields" ? 0 : 1,
              borderColor: c.border,
              paddingTop: key === "fields" ? 0 : 16,
              minHeight: 56,
              gap: 12,
            }}
          >
            <Txt size={13} style={{ flex: 1 }}>
              {label}
            </Txt>
            <Row style={{ gap: 10 }}>
              <Txt size={12} color={c.muted}>
                {value}
              </Txt>
              <Button
                compact
                variant="ghost"
                label="Edit"
                onPress={() => setEditing(key as typeof editing)}
              />
            </Row>
          </Row>
        ))}
      </Panel>
      {advanced && (
        <Dialog
          title="Notification rules"
          onClose={() => setAdvanced(false)}
          wide
        >
          <AdvanceNotification
            initial={notifyState}
            onCancel={() => setAdvanced(false)}
            onSave={(n) => {
              setNotify(n);
              saveSettings({ notify: n });
              setAdvanced(false);
              notify("Notification settings saved for this session.");
            }}
          />
        </Dialog>
      )}
      {!!editing && (
        <Dialog
          title={
            editing === "fields"
              ? "Custom user fields"
              : "Delete data after (days)"
          }
          onClose={() => setEditing("")}
        >
          <GeneralEdit
            kind={editing}
            onCancel={() => setEditing("")}
            onSave={(general) => {
              saveSettings({ general });
              setEditing("");
              notify("General setup saved for this session.");
            }}
          />
        </Dialog>
      )}
    </View>
  );
}

/** A recipient row's problem; a blank row is fine (it is dropped on save). */
function recipientError(
  k: "email" | "sms",
  r: { name: string; contact: string },
) {
  if (!r.name && !r.contact) return "";
  if (!r.name) return "Name is required";
  if (k === "email" && !isEmail(r.contact)) return "Enter a valid email";
  if (k === "sms" && !isPhone(r.contact, 10)) return "Use 10–15 digits";
  return "";
}

function AdvanceNotification({
  initial,
  onSave,
  onCancel,
}: {
  initial: SurveillanceSettings["notify"];
  onSave: (n: SurveillanceSettings["notify"]) => void;
  onCancel: () => void;
}) {
  const {
    value: n,
    setValue: setN,
    errors,
    submitted,
    submit,
  } = useFormState(
    () => JSON.parse(JSON.stringify(initial)) as SurveillanceSettings["notify"],
    (x) =>
      (["email", "sms"] as const).flatMap((k) =>
        x[k].recipients.map((r) => recipientError(k, r)).filter(Boolean),
      ),
  );
  const [open, setOpen] = useState<"web" | "email" | "sms">("web");
  const ch = n[open];
  const set = (patch: Partial<Channel>) =>
    setN((x) => ({ ...x, [open]: { ...x[open], ...patch } }));
  return (
    <View style={{ gap: 14 }}>
      <SegmentedControl
        label="Notification channel"
        fill
        options={[
          { value: "web", label: "Web" },
          { value: "email", label: "Email" },
          { value: "sms", label: "SMS" },
        ]}
        value={open}
        onChange={setOpen}
      />
      <Toggle
        label="Enable"
        value={ch.enable}
        onChange={(enable) => set({ enable })}
      />
      <ChipSelect
        label="User type"
        options={USER_TYPES}
        value={ch.userTypes}
        onChange={(userTypes) => set({ userTypes })}
        optionLabel={(o) => `User type: ${o}`}
      />
      <SelectField
        label="Notification interval / user"
        selectLabel="Notification interval"
        value={ch.interval}
        options={INTERVALS.map(([value, label]) => ({ value, label }))}
        onChange={(interval) => set({ interval })}
      />
      {open !== "web" && (
        <View style={{ gap: 8 }}>
          <Txt size={12} bold>
            {open === "email"
              ? "Whom do you want to send an email notification to?"
              : "Whom do you want to send an SMS notification to?"}
          </Txt>
          {ch.recipients.map((r, i) => (
            <View key={i} style={{ gap: 4 }}>
              <Row style={{ flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                <FormCell basis={160}>
                  <Field
                    label="Name"
                    value={r.name}
                    onChange={(name) =>
                      set({
                        recipients: ch.recipients.map((x, j) =>
                          j === i ? { ...x, name } : x,
                        ),
                      })
                    }
                  />
                </FormCell>
                <FormCell basis={200}>
                  <Field
                    label={open === "email" ? "Email" : "Contact number"}
                    value={r.contact}
                    onChange={(contact) =>
                      set({
                        recipients: ch.recipients.map((x, j) =>
                          j === i ? { ...x, contact } : x,
                        ),
                      })
                    }
                  />
                </FormCell>
                {ch.recipients.length > 1 && (
                  <RemoveButton
                    label={`Remove recipient ${i + 1}`}
                    onPress={() =>
                      set({
                        recipients: ch.recipients.filter((_, j) => j !== i),
                      })
                    }
                    style={{ padding: 10 }}
                  />
                )}
              </Row>
              {submitted && <ErrorText>{recipientError(open, r)}</ErrorText>}
            </View>
          ))}
          <Row>
            <Button
              label="Add recipient"
              icon="plus"
              onPress={() =>
                set({
                  recipients: [...ch.recipients, { name: "", contact: "" }],
                })
              }
            />
          </Row>
        </View>
      )}
      {submitted && errors.length > 0 && (
        <ErrorText>Fix the recipient rows on the Email or SMS tab.</ErrorText>
      )}
      <FormActions
        submitLabel="Save"
        onCancel={onCancel}
        onSubmit={submit((x) => {
          // Only fully filled recipient rows are kept (legacy behaviour).
          const clean = (k: "web" | "email" | "sms") => ({
            ...x[k],
            recipients: x[k].recipients.filter((r) => r.name && r.contact),
          });
          onSave({
            web: clean("web"),
            email: clean("email"),
            sms: clean("sms"),
          });
        })}
      />
    </View>
  );
}

function GeneralEdit({
  kind,
  onSave,
  onCancel,
}: {
  kind: "fields" | "surveillance" | "attendance";
  onSave: (g: SurveillanceSettings["general"]) => void;
  onCancel: () => void;
}) {
  const s = useSettings();
  const [g, setG] = useState(() => ({
    ...s.general,
    fields: s.general.fields.length ? [...s.general.fields] : [""],
  }));
  const [error, setError] = useState("");
  const save = () => {
    const fields = g.fields.map((f) => f.trim()).filter(Boolean);
    const seen = new Set<string>();
    for (const f of fields) {
      const k = f.toLowerCase();
      if (RESERVED_FIELDS.includes(k))
        return setError(`The field "${f}" is predefined.`);
      if (seen.has(k)) return setError(`The field "${f}" is a duplicate.`);
      seen.add(k);
    }
    if (Number(g.keepAttendance) < Number(g.keepSurveillance))
      return setError(
        "Keep attendance data must be more than or equal to keep surveillance data.",
      );
    onSave({ ...g, fields });
  };
  const days = (key: "keepSurveillance" | "keepAttendance") => (
    <SelectField
      label="Days"
      value={g[key]}
      options={KEEP_DAYS.map((d) => ({ value: d, label: `${d} Days` }))}
      onChange={(v) => setG((x) => ({ ...x, [key]: v }))}
    />
  );
  return (
    <View style={{ gap: 12 }}>
      {kind === "fields" ? (
        <>
          {g.fields.map((f, i) => (
            <Row key={i} style={{ gap: 8, alignItems: "flex-end" }}>
              <View style={{ flex: 1 }}>
                <Field
                  label={`Field name ${i + 1}`}
                  value={f}
                  onChange={(v) =>
                    setG((x) => ({
                      ...x,
                      fields: x.fields.map((y, j) => (j === i ? v : y)),
                    }))
                  }
                  placeholder="e.g. Blood group"
                />
              </View>
              {g.fields.length > 1 && (
                <RemoveButton
                  label={`Remove field ${i + 1}`}
                  onPress={() =>
                    setG((x) => ({
                      ...x,
                      fields: x.fields.filter((_, j) => j !== i),
                    }))
                  }
                  style={{ padding: 10 }}
                />
              )}
            </Row>
          ))}
          <Row>
            <Button
              label="Add field"
              icon="plus"
              onPress={() => setG((x) => ({ ...x, fields: [...x.fields, ""] }))}
            />
          </Row>
        </>
      ) : (
        days(kind === "surveillance" ? "keepSurveillance" : "keepAttendance")
      )}
      <ErrorText>{error}</ErrorText>
      <FormActions submitLabel="Save" onCancel={onCancel} onSubmit={save} />
    </View>
  );
}
