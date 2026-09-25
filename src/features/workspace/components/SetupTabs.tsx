import { MediaPlayer, RecordMedia } from "./RecordMedia";
import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  View,
  useWindowDimensions,
} from "react-native";
import type { DataRecord, PageContract } from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Field, Row, Txt, Badge } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Select } from "../../../shared/ui/Select";
import { Dialog } from "../../../shared/ui/Dialog";
import { useApp } from "../../../application/AppProvider";
import { CAMERA_BRANDS } from "../../../domain/cameras/setup";

// Customer Admin → Sources & Setup, carried over from the legacy
// skillatracker-ui Surveillance/SetUp (/skilla_SetUp: Setup, Camera Setup,
// Shift, Camera Criteria) and Surveillance/Serveillance
// (/Surveillance_dashboard). No setup service is connected yet: changes are
// kept for this session.

const text = (v: unknown) => (typeof v === "string" ? v : "");
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const HOST =
  /^(?=.{1,253}$)[a-z\d]([a-z\d-]*[a-z\d])?(\.[a-z\d]([a-z\d-]*[a-z\d])?)*$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const newId = (p: string) =>
  `NEW-${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ───────────────────────── Settings store ─────────────────────────

export interface Channel {
  enable: boolean;
  userTypes: string[];
  interval: string;
  recipients: { name: string; contact: string }[];
}
export interface SurveillanceSettings {
  modules: { gate: boolean; analytics: boolean; video: boolean };
  notify: Record<"web" | "email" | "sms", Channel>;
  general: {
    fields: string[];
    keepSurveillance: string;
    keepAttendance: string;
  };
  criteria: Record<string, string>;
  saved: boolean;
}
const channel = (): Channel => ({
  enable: false,
  userTypes: ["Identified"],
  interval: "1440",
  recipients: [{ name: "", contact: "" }],
});
let settings: SurveillanceSettings = {
  modules: { gate: true, analytics: false, video: true },
  notify: {
    web: {
      ...channel(),
      enable: true,
      userTypes: ["Threat", "Visitor"],
      interval: "5",
    },
    email: {
      ...channel(),
      enable: true,
      userTypes: ["Threat"],
      interval: "60",
      recipients: [
        { name: "Campus operations", contact: "operations@example.com" },
      ],
    },
    sms: {
      ...channel(),
      recipients: [{ name: "Security desk", contact: "9876501001" }],
    },
  },
  general: {
    fields: ["Department", "Employee code", "Emergency contact"],
    keepSurveillance: "30",
    keepAttendance: "90",
  },
  criteria: {
    min_mean_intensity: "40",
    max_mean_intensity: "220",
    ideal_min: "80",
    ideal_max: "180",
    uniformity_min: "0.7",
    min_std_dev: "20",
    min_dynamic_range: "80",
    min_laplacian_variance: "100",
    ideal_laplacian_variance: "250",
    edge_density_min: "0.1",
    min_width: "1280",
    min_height: "720",
    recommended_width: "1920",
    recommended_height: "1080",
    min_face_confidence: "0.85",
    max_detection_time_ms: "500",
    max_yaw_degrees: "30",
    max_pitch_degrees: "20",
  },
  saved: true,
};
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const settingsByScope = new Map<string, SurveillanceSettings>();
export const useSettings = () => {
  const app = useApp();
  const key = JSON.stringify([
    app.workspace.industry,
    app.workspace.role,
    app.workspace.scope,
  ]);
  return useSyncExternalStore(
    subscribe,
    () => settingsByScope.get(key) ?? settings,
  );
};
const useSaveSettings = () => {
  const app = useApp();
  const key = JSON.stringify([
    app.workspace.industry,
    app.workspace.role,
    app.workspace.scope,
  ]);
  return (next: Partial<SurveillanceSettings>) => {
    settingsByScope.set(key, {
      ...(settingsByScope.get(key) ?? settings),
      ...next,
      saved: true,
    });
    listeners.forEach((l) => l());
  };
};

// ───────────────────────── Shared bits ─────────────────────────

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 12,
        boxShadow: c.panelShadow,
        overflow: "hidden",
      }}
    >
      <Row
        style={{
          padding: 20,
          gap: 12,
          flexWrap: "wrap",
          borderBottomWidth: 1,
          borderColor: c.border,
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1, minWidth: 180, gap: 6 }}>
          <Txt size={18} bold>
            {title}
          </Txt>
          {!!subtitle && (
            <Txt size={13} color={c.muted}>
              {subtitle}
            </Txt>
          )}
        </View>
        {action}
      </Row>
      <View style={{ padding: 20, gap: 16 }}>{children}</View>
    </View>
  );
}
function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  const c = useTheme();
  return (
    <Row
      style={{
        justifyContent: "space-between",
        gap: 16,
        minHeight: 62,
        paddingVertical: 10,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={14} bold>
          {label}
        </Txt>
        {!!hint && (
          <Txt size={12} color={c.muted}>
            {hint}
          </Txt>
        )}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.actionPrimary, false: c.border }}
      />
    </Row>
  );
}
function Chips({
  options,
  value,
  onChange,
  label,
  single,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  label: string;
  single?: string;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Txt size={12} bold>
        {label}
      </Txt>
      <Row style={{ flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <Pressable
              key={o}
              accessibilityRole="checkbox"
              accessibilityLabel={`${label}: ${o}`}
              accessibilityState={{ checked: on }}
              aria-checked={on}
              onPress={() => {
                // "All Day" replaces individual days, and the other way round.
                if (single && o === single) return onChange(on ? [] : [single]);
                const base = value.filter((x) => x !== single);
                onChange(on ? base.filter((x) => x !== o) : [...base, o]);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 99,
                borderWidth: 1,
                borderColor: on ? c.actionPrimary : c.border,
                backgroundColor: on ? c.primarySoft : c.surface,
              }}
            >
              {on && <Icon name="check" size={13} color={c.link} />}
              <Txt size={12}>{o}</Txt>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}
function Cell({
  children,
  basis = 200,
}: {
  children: React.ReactNode;
  basis?: number;
}) {
  return <View style={{ flexGrow: 1, flexBasis: basis }}>{children}</View>;
}
function Actions({
  label,
  onSave,
  onCancel,
}: {
  label: string;
  onSave: () => void;
  onCancel?: () => void;
}) {
  return (
    <Row style={{ justifyContent: "flex-end", gap: 8 }}>
      {onCancel && <Button label="Cancel" onPress={onCancel} />}
      <Button label={label} variant="primary" onPress={onSave} />
    </Row>
  );
}
function ErrorLine({ children }: { children?: string }) {
  const c = useTheme();
  return children ? (
    <Txt size={12} color={c.critical}>
      {children}
    </Txt>
  ) : null;
}

// ───────────────────────── Setup tab ─────────────────────────

const USER_TYPES = ["Identified", "Threat", "Visitor"];
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
            <ErrorLine>{moduleError}</ErrorLine>
            <Actions label="Save services" onSave={saveModules} />
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
            <Actions
              label="Save notifications"
              onSave={() => {
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

function AdvanceNotification({
  initial,
  onSave,
  onCancel,
}: {
  initial: SurveillanceSettings["notify"];
  onSave: (n: SurveillanceSettings["notify"]) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [n, setN] = useState(
    () => JSON.parse(JSON.stringify(initial)) as SurveillanceSettings["notify"],
  );
  const [open, setOpen] = useState<"web" | "email" | "sms">("web");
  const [submitted, setSubmitted] = useState(false);
  const ch = n[open];
  const set = (patch: Partial<Channel>) =>
    setN((x) => ({ ...x, [open]: { ...x[open], ...patch } }));
  const recipientError = (
    k: "email" | "sms",
    r: { name: string; contact: string },
  ) => {
    if (!r.name && !r.contact) return "";
    if (!r.name) return "Name is required";
    if (k === "email" && !EMAIL.test(r.contact)) return "Enter a valid email";
    if (k === "sms" && !/^\+?\d{10,15}$/.test(r.contact.replace(/[\s-]/g, "")))
      return "Use 10–15 digits";
    return "";
  };
  const errors = (["email", "sms"] as const).flatMap((k) =>
    n[k].recipients.map((r) => recipientError(k, r)).filter(Boolean),
  );
  return (
    <View style={{ gap: 14 }}>
      <Row style={{ gap: 0 }}>
        {(["web", "email", "sms"] as const).map((k, i) => (
          <Pressable
            key={k}
            accessibilityRole="tab"
            accessibilityState={{ selected: open === k }}
            onPress={() => setOpen(k)}
            style={{
              flex: 1,
              paddingVertical: 9,
              alignItems: "center",
              borderWidth: 1,
              borderColor: open === k ? c.actionPrimary : c.border,
              backgroundColor: open === k ? c.actionPrimary : c.surface,
              borderTopLeftRadius: i === 0 ? 8 : 0,
              borderBottomLeftRadius: i === 0 ? 8 : 0,
              borderTopRightRadius: i === 2 ? 8 : 0,
              borderBottomRightRadius: i === 2 ? 8 : 0,
            }}
          >
            <Txt size={12} bold color={open === k ? c.actionInk : c.text}>
              {{ web: "Web", email: "Email", sms: "SMS" }[k]}
            </Txt>
          </Pressable>
        ))}
      </Row>
      <Toggle
        label="Enable"
        value={ch.enable}
        onChange={(enable) => set({ enable })}
      />
      <Chips
        label="User type"
        options={USER_TYPES}
        value={ch.userTypes}
        onChange={(userTypes) => set({ userTypes })}
      />
      <View style={{ gap: 7 }}>
        <Txt size={12} bold>
          Notification interval / user
        </Txt>
        <Select
          label="Notification interval"
          value={ch.interval}
          options={INTERVALS.map(([value, label]) => ({ value, label }))}
          onChange={(interval) => set({ interval })}
        />
      </View>
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
                <Cell basis={160}>
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
                </Cell>
                <Cell basis={200}>
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
                </Cell>
                {ch.recipients.length > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove recipient ${i + 1}`}
                    onPress={() =>
                      set({
                        recipients: ch.recipients.filter((_, j) => j !== i),
                      })
                    }
                    style={{ padding: 10 }}
                  >
                    <Icon name="close" size={16} color={c.muted} />
                  </Pressable>
                )}
              </Row>
              {submitted && <ErrorLine>{recipientError(open, r)}</ErrorLine>}
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
        <ErrorLine>Fix the recipient rows on the Email or SMS tab.</ErrorLine>
      )}
      <Actions
        label="Save"
        onCancel={onCancel}
        onSave={() => {
          setSubmitted(true);
          if (errors.length) return;
          // Only fully filled recipient rows are kept (legacy behaviour).
          const clean = (k: "web" | "email" | "sms") => ({
            ...n[k],
            recipients: n[k].recipients.filter((r) => r.name && r.contact),
          });
          onSave({
            web: clean("web"),
            email: clean("email"),
            sms: clean("sms"),
          });
        }}
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
  const saveSettings = useSaveSettings();
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
    <View style={{ gap: 7 }}>
      <Txt size={12} bold>
        Days
      </Txt>
      <Select
        label="Days"
        value={g[key]}
        options={KEEP_DAYS.map((d) => ({ value: d, label: `${d} Days` }))}
        onChange={(v) => setG((x) => ({ ...x, [key]: v }))}
      />
    </View>
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove field ${i + 1}`}
                  onPress={() =>
                    setG((x) => ({
                      ...x,
                      fields: x.fields.filter((_, j) => j !== i),
                    }))
                  }
                  style={{ padding: 10 }}
                >
                  <Icon name="close" size={16} />
                </Pressable>
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
      <ErrorLine>{error}</ErrorLine>
      <Actions label="Save" onCancel={onCancel} onSave={save} />
    </View>
  );
}

// ───────────────────────── Camera Criteria tab ─────────────────────────

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
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {fields.map(([k, label]) => (
              <Cell key={k} basis={170}>
                <Field
                  label={label}
                  value={v[k] ?? ""}
                  onChange={(x) => setV((y) => ({ ...y, [k]: x }))}
                  placeholder="System default"
                  error={errors[k]}
                />
              </Cell>
            ))}
          </View>
        </View>
      ))}
      <ErrorLine>{message}</ErrorLine>
      <Row style={{ justifyContent: "flex-end", gap: 8 }}>
        <Button
          label="Reset to defaults"
          onPress={() => {
            setV({});
            setErrors({});
            setMessage("");
            saveSettings({ criteria: {} });
            notify("Camera criteria reset to defaults.");
          }}
        />
        <Button label="Save" variant="primary" onPress={save} />
      </Row>
    </Panel>
  );
}

// ───────────────────────── Camera Setup tab ─────────────────────────

export const DAYS = [
  "All Day",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];
export interface SetupCamera {
  display_name: string;
  group: string;
  brand: string;
  ip: string;
  port: string;
  camera_id: string;
  user_name: string;
  password: string;
  days: string[];
  start: string;
  end: string;
  location: string;
  camera_type: "Check In" | "Check Out";
}
const emptySetupCamera = (n: number, from?: SetupCamera): SetupCamera => ({
  display_name: `Camera-${n}`,
  group: "",
  brand: "",
  // A new card copies the connection of the first one (legacy behaviour).
  ip: from?.ip ?? "",
  port: from?.port ?? "",
  camera_id: "",
  user_name: from?.user_name ?? "",
  password: from?.password ?? "",
  days: ["All Day"],
  start: "",
  end: "",
  location: "",
  camera_type: "Check In",
});
export function setupCameraFromRecord(r: DataRecord): SetupCamera {
  if (r.setup) return { ...(r.setup as SetupCamera) };
  const cam = emptySetupCamera(1);
  cam.display_name = text(r.cells.display);
  cam.location = text(r.cells.location);
  return cam;
}
function validateSetupCamera(cam: SetupCamera, taken: string[]) {
  const e: Partial<Record<keyof SetupCamera, string>> = {};
  if (!cam.display_name.trim()) e.display_name = "Please enter display name";
  else if (taken.includes(cam.display_name.trim().toLowerCase()))
    e.display_name = "Another camera uses this name";
  if (!cam.brand) e.brand = "Please select camera brand";
  const ip = cam.ip.trim();
  if (!ip) e.ip = "Please enter IP address";
  else if (/^[\d.]+$/.test(ip) ? !IPV4.test(ip) : !HOST.test(ip))
    e.ip = "Enter an IPv4 address or host name";
  if (!cam.port.trim()) e.port = "Please enter port";
  else if (!/^\d+$/.test(cam.port) || +cam.port < 1 || +cam.port > 65535)
    e.port = "Port must be 1–65535";
  if (!cam.camera_id.trim()) e.camera_id = "Please enter camera ID";
  if (!cam.user_name.trim()) e.user_name = "Please enter user name";
  if (!cam.password) e.password = "Please enter password";
  if (cam.start && !TIME.test(cam.start)) e.start = "Use 24-hour HH:MM";
  if (cam.end && !TIME.test(cam.end)) e.end = "Use 24-hour HH:MM";
  return e;
}
export function setupCameraRecord(
  page: PageContract,
  cam: SetupCamera,
  scope: string[],
  actor: string,
  source: string,
  previous?: DataRecord,
): DataRecord {
  const cells: Record<string, string> = {
    display: cam.display_name,
    location: cam.location || "—",
    brand: cam.brand,
    cameraId: cam.camera_id,
    ip: cam.ip,
    port: cam.port,
    days: cam.days.join(", ") || "—",
    start: cam.start || "—",
    end: cam.end || "—",
    status: previous ? text(previous.cells.status) : "Not active",
    state: previous ? text(previous.cells.state) : "Not connected",
  };
  return {
    ...(previous ?? {}),
    id: previous?.id ?? newId("CAM"),
    type: "setup_camera",
    setup: cam,
    setupKind: "setupCamera",
    cells: Object.fromEntries(
      page.columns.map((col) => [col.id, cells[col.id] ?? "—"]),
    ),
    state: previous
      ? previous.state
      : { label: "Not connected", tone: "pending" },
    action: "Open camera",
    scope: previous?.scope ?? scope,
    detail: {
      ...(previous?.detail ?? {}),
      title: cam.display_name,
      eyebrow: "CAMERA CONFIGURATION",
      summary:
        previous?.detail.summary ??
        "Added in this session. The camera service must connect before it can capture.",
      facts: [
        { label: "Brand", value: cam.brand },
        { label: "Endpoint", value: `${cam.ip}:${cam.port}` },
        { label: "Camera ID", value: cam.camera_id },
        { label: "Camera type", value: cam.camera_type },
      ],
      sections: [
        {
          title: "Schedule",
          description: "When the camera captures",
          items: [
            { label: "Active days", value: cells.days },
            { label: "Start", value: cells.start },
            { label: "End", value: cells.end },
            { label: "Location", value: cells.location },
            { label: "Camera group", value: cam.group || "—" },
          ],
        },
      ],
      timeline: [
        { time: "Just now", event: source, actor },
        ...(previous?.detail.timeline ?? []),
      ],
      permittedActions: [],
    },
  };
}

/** Legacy "Create / Update Camera Configuration": several cameras at once. */
export function SetupCameraForm({
  initial,
  takenNames,
  locations,
  onSave,
  onCancel,
}: {
  initial?: SetupCamera;
  takenNames: string[];
  locations: string[];
  onSave: (cams: SetupCamera[]) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [cams, setCams] = useState<SetupCamera[]>(
    initial ? [initial] : [emptySetupCamera(1)],
  );
  const [submitted, setSubmitted] = useState(!!initial);
  const [shown, setShown] = useState<Record<number, boolean>>({});
  const own = (initial?.display_name ?? "").toLowerCase();
  const errors = useMemo(
    () =>
      cams.map((cam, i) => {
        const others = [
          ...takenNames.filter((n) => n !== own),
          ...cams
            .filter((_, j) => j !== i)
            .map((x) => x.display_name.trim().toLowerCase()),
        ];
        return validateSetupCamera(cam, others);
      }),
    [cams, takenNames, own],
  );
  const set = (i: number, patch: Partial<SetupCamera>) =>
    setCams((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (i: number, k: keyof SetupCamera) =>
    submitted ? errors[i][k] : undefined;
  return (
    <View style={{ gap: 14 }}>
      {cams.map((cam, i) => (
        <View
          key={i}
          style={{
            gap: 10,
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
            {cams.length > 1 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove camera ${i + 1}`}
                onPress={() => setCams((all) => all.filter((_, j) => j !== i))}
                hitSlop={8}
              >
                <Icon name="close" size={16} color={c.muted} />
              </Pressable>
            )}
          </Row>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <Cell>
              <Field
                label="Display name *"
                value={cam.display_name}
                onChange={(v) => set(i, { display_name: v })}
                placeholder="Camera-1"
                error={err(i, "display_name")}
              />
            </Cell>
            <Cell>
              <Field
                label="Camera group"
                value={cam.group}
                onChange={(v) => set(i, { group: v })}
                placeholder="e.g. Main Gate"
              />
            </Cell>
            <Cell>
              <View style={{ gap: 7 }}>
                <Txt size={12} bold>
                  Camera brand *
                </Txt>
                <Select
                  label="Camera brand"
                  value={cam.brand}
                  options={[
                    { value: "", label: "Choose brand" },
                    ...CAMERA_BRANDS.map((b) => ({ value: b, label: b })),
                  ]}
                  onChange={(v) => set(i, { brand: v })}
                />
                <ErrorLine>{err(i, "brand")}</ErrorLine>
              </View>
            </Cell>
            <Cell>
              <Field
                label="IP address *"
                value={cam.ip}
                onChange={(v) => set(i, { ip: v })}
                placeholder="127.0.0.1"
                error={err(i, "ip")}
              />
            </Cell>
            <Cell basis={110}>
              <Field
                label="Port *"
                value={cam.port}
                onChange={(v) => set(i, { port: v })}
                placeholder="554"
                error={err(i, "port")}
              />
            </Cell>
            <Cell basis={110}>
              <Field
                label="Camera ID *"
                value={cam.camera_id}
                onChange={(v) => set(i, { camera_id: v })}
                placeholder="102"
                error={err(i, "camera_id")}
              />
            </Cell>
            <Cell>
              <Field
                label="User name *"
                value={cam.user_name}
                onChange={(v) => set(i, { user_name: v })}
                placeholder="User"
                error={err(i, "user_name")}
              />
            </Cell>
            <Cell>
              <View style={{ gap: 4 }}>
                <Field
                  label="Password *"
                  value={cam.password}
                  onChange={(v) => set(i, { password: v })}
                  placeholder="Camera password"
                  secure={!shown[i]}
                  error={err(i, "password")}
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
            <Cell basis={140}>
              <Field
                label="Start time"
                value={cam.start}
                onChange={(v) => set(i, { start: v })}
                placeholder="HH:MM"
                error={err(i, "start")}
              />
            </Cell>
            <Cell basis={140}>
              <Field
                label="End time"
                value={cam.end}
                onChange={(v) => set(i, { end: v })}
                placeholder="HH:MM"
                error={err(i, "end")}
              />
            </Cell>
            <Cell>
              <View style={{ gap: 7 }}>
                <Txt size={12} bold>
                  Location
                </Txt>
                <Select
                  label="Location"
                  value={cam.location}
                  options={[
                    { value: "", label: "Not set" },
                    ...[
                      ...new Set([
                        ...locations,
                        ...(cam.location ? [cam.location] : []),
                      ]),
                    ].map((l) => ({ value: l, label: l })),
                  ]}
                  onChange={(v) => set(i, { location: v })}
                />
              </View>
            </Cell>
            <Cell>
              <View style={{ gap: 7 }}>
                <Txt size={12} bold>
                  Camera type
                </Txt>
                <Select
                  label="Camera type"
                  value={cam.camera_type}
                  options={[
                    { value: "Check In", label: "Check In" },
                    { value: "Check Out", label: "Check Out" },
                  ]}
                  onChange={(v) =>
                    set(i, { camera_type: v as SetupCamera["camera_type"] })
                  }
                />
              </View>
            </Cell>
          </View>
          <Chips
            label="Days"
            options={DAYS}
            value={cam.days}
            single="All Day"
            onChange={(days) => set(i, { days })}
          />
        </View>
      ))}
      <Row
        style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
      >
        {initial ? (
          <View />
        ) : (
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
        )}
        <Actions
          label="Save"
          onCancel={onCancel}
          onSave={() => {
            setSubmitted(true);
            if (errors.every((e) => !Object.keys(e).length)) onSave(cams);
          }}
        />
      </Row>
      {submitted && errors.some((e) => Object.keys(e).length) && (
        <ErrorLine>Please fill the mandatory fields.</ErrorLine>
      )}
    </View>
  );
}

// ───────────────────────── Shift tab ─────────────────────────

export interface Shift {
  name: string;
  start: string;
  end: string;
  startBuffer: string;
  endBuffer: string;
}
export const shiftFromRecord = (r: DataRecord): Shift => ({
  ...(r.setup as Shift),
});
export function shiftRecord(
  page: PageContract,
  sh: Shift,
  scope: string[],
  actor: string,
  source: string,
  previous?: DataRecord,
): DataRecord {
  const cells: Record<string, string> = {
    name: sh.name.trim(),
    start: sh.start,
    end: sh.end,
    startBuffer: sh.startBuffer || "0",
    endBuffer: sh.endBuffer || "0",
    state: "Active",
  };
  return {
    id: previous?.id ?? newId("SHF"),
    type: "shift",
    setup: sh,
    setupKind: "shift",
    cells: Object.fromEntries(
      page.columns.map((col) => [col.id, cells[col.id] ?? "—"]),
    ),
    state: { label: "Active", tone: "healthy" },
    action: "Open shift",
    scope: previous?.scope ?? scope,
    detail: {
      title: sh.name.trim(),
      eyebrow: "SHIFT",
      summary: `${sh.start}–${sh.end}${sh.end < sh.start ? " (overnight)" : ""}`,
      facts: [
        { label: "Start", value: sh.start },
        { label: "End", value: sh.end },
        { label: "Start buffer", value: `${cells.startBuffer} min` },
        { label: "End buffer", value: `${cells.endBuffer} min` },
      ],
      sections: [],
      timeline: [
        { time: "Just now", event: source, actor },
        ...(previous?.detail.timeline ?? []),
      ],
      permittedActions: [],
    },
  };
}
export function ShiftForm({
  initial,
  takenNames,
  onSave,
  onCancel,
}: {
  initial?: Shift;
  takenNames: string[];
  onSave: (s: Shift) => void;
  onCancel: () => void;
}) {
  const [sh, setSh] = useState<Shift>(
    initial ?? {
      name: "",
      start: "",
      end: "",
      startBuffer: "0",
      endBuffer: "0",
    },
  );
  const [submitted, setSubmitted] = useState(!!initial);
  const own = (initial?.name ?? "").toLowerCase();
  const errors = useMemo(() => {
    const e: Partial<Record<keyof Shift, string>> = {};
    if (!sh.name.trim()) e.name = "Please enter shift name";
    else if (
      sh.name.trim().toLowerCase() !== own &&
      takenNames.includes(sh.name.trim().toLowerCase())
    )
      e.name = "Shift with this name already exists";
    if (!sh.start) e.start = "Please select start time";
    else if (!TIME.test(sh.start)) e.start = "Use 24-hour HH:MM";
    if (!sh.end) e.end = "Please select end time";
    else if (!TIME.test(sh.end)) e.end = "Use 24-hour HH:MM";
    else if (!e.start && sh.start === sh.end)
      e.end = "Start time and end time cannot be the same";
    for (const k of ["startBuffer", "endBuffer"] as const)
      if (sh[k] && !/^\d+$/.test(sh[k])) e[k] = "Use whole minutes (0 or more)";
    return e;
  }, [sh, takenNames, own]);
  const set = (k: keyof Shift) => (v: string) =>
    setSh((x) => ({ ...x, [k]: v }));
  const err = (k: keyof Shift) => (submitted ? errors[k] : undefined);
  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Shift name *"
        value={sh.name}
        onChange={set("name")}
        placeholder="e.g. Morning, Evening, Night"
        error={err("name")}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Cell basis={140}>
          <Field
            label="Start time *"
            value={sh.start}
            onChange={set("start")}
            placeholder="HH:MM"
            error={err("start")}
          />
        </Cell>
        <Cell basis={140}>
          <Field
            label="End time *"
            value={sh.end}
            onChange={set("end")}
            placeholder="HH:MM"
            error={err("end")}
          />
        </Cell>
        <Cell basis={140}>
          <Field
            label="Start buffer (mins)"
            value={sh.startBuffer}
            onChange={set("startBuffer")}
            placeholder="0"
            error={err("startBuffer")}
          />
        </Cell>
        <Cell basis={140}>
          <Field
            label="End buffer (mins)"
            value={sh.endBuffer}
            onChange={set("endBuffer")}
            placeholder="0"
            error={err("endBuffer")}
          />
        </Cell>
      </View>
      <Actions
        label={initial ? "Update" : "Create"}
        onCancel={onCancel}
        onSave={() => {
          setSubmitted(true);
          if (!Object.keys(errors).length) onSave(sh);
        }}
      />
    </View>
  );
}

// ───────────────────────── Surveillance Dashboard ─────────────────────────

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
/** A detection belongs to a camera when its place names the camera location. */
function atCamera(detection: DataRecord, camera: DataRecord) {
  const place = words(text(detection.cells.camera));
  const location = words(
    text(camera.cells.location) || text(camera.cells.display),
  );
  return place.length > 0 && place.every((w) => location.includes(w));
}
const TYPES = ["Identified", "Threat", "Visitor", "Unidentified"];

export function DashboardView({
  rows,
  cameras,
  clips,
}: {
  rows: DataRecord[];
  cameras: DataRecord[];
  clips: DataRecord[];
}) {
  const c = useTheme();
  const wide = useWindowDimensions().width >= 1100;
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<"analytics" | "video">("analytics");
  // Legacy default: Unidentified is not selected.
  const [types, setTypes] = useState(["Identified", "Threat", "Visitor"]);
  const [now, setNow] = useState(new Date());
  const s = useSettings();
  useEffect(
    () => setActive((a) => Math.min(a, Math.max(cameras.length - 1, 0))),
    [cameras.length],
  );
  if (!cameras.length)
    return (
      <Panel title="Surveillance dashboard">
        <Txt size={13} color={c.muted}>
          Please configure a camera on the Camera Setup tab to view the data.
        </Txt>
      </Panel>
    );
  const cam = cameras[active];
  const here = rows.filter(
    (d, index, all) =>
      atCamera(d, cam) &&
      all.findIndex((other) =>
        ["uid", "name", "camera", "time", "type"].every(
          (key) => text(other.cells[key]) === text(d.cells[key]),
        ),
      ) === index,
  );
  const shown = here.filter((d) => types.includes(text(d.cells.type)));
  const count = (t: string) =>
    here.filter((d) => text(d.cells.type) === t).length;
  const on = text(cam.cells.status) === "Active";
  const camClips = clips.filter((v) =>
    atCamera({ ...v, cells: { camera: v.cells.camera } } as DataRecord, cam),
  );
  return (
    <View style={{ gap: 14 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {cameras.map((x, i) => (
          <Pressable
            key={x.id}
            accessibilityRole="tab"
            accessibilityLabel={text(x.cells.display)}
            accessibilityState={{ selected: i === active }}
            onPress={() => setActive(i)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: i === active ? c.actionPrimary : c.border,
              backgroundColor: i === active ? c.actionPrimary : c.surface,
            }}
          >
            <Txt size={12} bold color={i === active ? c.actionInk : c.text}>
              {text(x.cells.display)}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Txt size={12} color={c.muted}>
          {"Updated " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Txt>
        <Button label="Refresh" icon="refresh" onPress={() => setNow(new Date())} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["Total persons", here.length, c.text],
          ["Identified", count("Identified"), c.healthy],
          ["Unidentified", count("Unidentified"), c.attention],
          ["Threat", count("Threat"), c.critical],
          ["Visitor", count("Visitor"), c.link],
        ].map(([label, value, color]) => (
          <View
            key={label as string}
            style={{
              flexGrow: 1,
              flexBasis: 110,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
              gap: 4,
            }}
          >
            <Txt size={12} color={c.muted}>
              {label as string}
            </Txt>
            <Txt size={20} bold color={color as string}>
              {String(value)}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: wide ? "row" : "column", gap: 14 }}>
        <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
          <Panel
            title={text(cam.cells.display)}
            subtitle={text(cam.cells.location)}
            action={
              <Badge
                label={on ? "ON" : "OFF"}
                tone={on ? "healthy" : "critical"}
              />
            }
          >
            {s.modules.video ? <MediaPlayer key={cam.id} record={cam} /> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[
                ["Brand", text(cam.cells.brand)],
                ["IP address", text(cam.cells.ip)],
                ["Camera ID", text(cam.cells.cameraId)],
                ["Start time", text(cam.cells.start)],
                ["End time", text(cam.cells.end)],
                ["Active days", text(cam.cells.days)],
              ].map(([label, value]) => (
                <View
                  key={label}
                  style={{
                    flexGrow: 1,
                    flexBasis: 140,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: c.background,
                    gap: 2,
                  }}
                >
                  <Txt size={10} color={c.muted}>
                    {label}
                  </Txt>
                  <Txt size={12} bold>
                    {value || "—"}
                  </Txt>
                </View>
              ))}
            </View>
            {!on && (
              <Txt size={11} color={c.muted}>
                {text(cam.cells.state) || "Camera is not connected."}
              </Txt>
            )}
          </Panel>
        </View>
        <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
      <Panel
        title="Camera activity"
        subtitle={
          tab === "analytics"
            ? shown.length +
              " recognition" +
              (shown.length === 1 ? "" : "s") +
              " at this camera"
            : "Recorded clips for this camera"
        }
        action={
          <View
            accessibilityRole="tablist"
            accessibilityLabel="Camera activity views"
            style={{ flexDirection:"row", gap: 20 }}
          >
            {(["analytics", "video"] as const).map((view) => (
              <Pressable
                key={view}
                accessibilityRole="tab"
                accessibilityLabel={
                  view === "analytics" ? "Analytics" : "Video"
                }
                accessibilityState={{ selected: tab === view }}
                aria-selected={tab === view}
                onPress={() => setTab(view)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                  borderBottomWidth: 2,
                  borderBottomColor: tab === view ? c.link : "transparent",
                }}
              >
                <Txt
                  size={13}
                  bold={tab === view}
                  color={tab === view ? c.link : c.muted}
                >
                  {view === "analytics" ? "Analytics" : "Video"}
                </Txt>
              </Pressable>
            ))}
          </View>
        }
      >
        {tab === "analytics" ? (
          <>
            <Chips
              label="User type"
              options={TYPES}
              value={types}
              onChange={setTypes}
            />
            {shown.length ? (
              <View style={{ gap: 0 }}>
                {shown.map((d) => (
                  <Row
                    key={d.id}
                    style={{
                      gap: 16,
                      paddingVertical: 12,
                      borderTopWidth: 1,
                      borderColor: c.border,
                      alignItems: "center",
                    }}
                  >
                    <RecordMedia record={d} />
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                      <Txt size={14} bold lines={1}>
                        {text(d.cells.name)}
                      </Txt>
                      <Txt size={12} color={c.muted} lines={1}>
                        {"UID: " + text(d.cells.uid)}
                      </Txt>
                    </View>
                    <View
                      style={{ alignItems: "flex-end", gap: 6, maxWidth: 140 }}
                    >
                      <Badge label={text(d.cells.type)} tone={d.state.tone} />
                      <Txt size={12} color={c.muted}>
                        {text(d.cells.time)}
                      </Txt>
                    </View>
                  </Row>
                ))}
              </View>
            ) : (
              <Txt size={12} color={c.muted}>
                No recognitions at this camera for the selected user types.
              </Txt>
            )}
          </>
        ) : camClips.length ? (
          camClips.map((v) => (
            <Row
              key={v.id}
              style={{
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderColor: c.border,
                paddingTop: 10,
              }}
            >
              <Txt size={12}>
                {text(v.cells.date)} · {text(v.cells.start)} ·{" "}
                {text(v.cells.kind)}
              </Txt>
              <RecordMedia record={v} />
            </Row>
          ))
        ) : (
          <Txt size={12} color={c.muted}>
            No video available for this camera.
          </Txt>
        )}
      </Panel>
        </View>
      </View>
    </View>
  );
}
