import { View } from "react-native";
import { useTheme } from "../../../shared/theme/Theme";
import { Field, Row, Txt } from "../../../shared/ui/Primitives";
import {
  FormActions,
  FormCell,
  FormGrid,
  FormLabel,
  RequiredNote,
  SelectField,
} from "../../../shared/ui/Form";
import { useFormState } from "../../../shared/ui/useFormState";
import { Chip, ChipSelect } from "../../../shared/ui/Chip";
import { SegmentedControl } from "../../../shared/ui/SegmentedControl";
import {
  DESIGNATIONS,
  LEAVE_STATUSES,
  PERMISSION_GROUPS,
  PERMISSION_MODULES,
  emptyHostel,
  emptyLeave,
  emptyWarden,
  leaveDays,
  subAdminDefaults,
  validateHostel,
  validateLeave,
  validateWarden,
  type Hostel,
  type Leave,
  type Warden,
} from "../../../domain/residence/setup";
import { PersonAvatar, PersonOr } from "./PersonChip";

// The Warden setup forms. The models, validation, records and live counts are
// in domain/residence/setup.
export {
  wardenMetrics,
  hostelMetrics,
  leaveMetrics,
  leaveEditable,
} from "../../../domain/residence/setup";

// ─────────────────────────── Wardens ───────────────────────────

export function WardenForm({
  initial,
  hostelOptions,
  takenEmails,
  submitLabel = "Add warden",
  onSave,
  onCancel,
}: {
  initial?: Warden;
  hostelOptions: string[];
  /** Other wardens' emails (the edited one is not among them). */
  takenEmails: string[];
  submitLabel?: string;
  onSave: (w: Warden) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const {
    value: w,
    setValue: setW,
    set,
    err,
    submit,
  } = useFormState(
    initial ?? emptyWarden(),
    (x) => validateWarden(x, takenEmails),
    { reveal: !!initial },
  );
  const perms =
    w.designation === "Sub Admin"
      ? { ...subAdminDefaults(), ...w.permissions }
      : {};
  return (
    <View style={{ gap: 16 }}>
      {/* The warden's avatar, following the name as it is typed. */}
      <Row style={{ gap: 12 }}>
        <PersonAvatar name={w.name.trim()} size={56} />
        <View style={{ flexShrink: 1, minWidth: 0, gap: 2 }}>
          <Txt size={15} bold lines={1}>
            {w.name.trim() || "New " + w.designation.toLowerCase()}
          </Txt>
          <RequiredNote />
        </View>
      </Row>
      <FormGrid>
        <FormCell>
          <Field
            label="Name *"
            value={w.name}
            onChange={set("name")}
            placeholder="e.g. Warden Rao"
            error={err("name")}
          />
        </FormCell>
        <FormCell>
          <Field
            label="Email *"
            value={w.email}
            onChange={set("email")}
            placeholder="warden@campus.edu"
            error={err("email")}
          />
        </FormCell>
        <FormCell>
          <Field
            label="Phone *"
            value={w.phone}
            onChange={set("phone")}
            placeholder="7–15 digits"
            error={err("phone")}
          />
        </FormCell>
      </FormGrid>
      <View style={{ gap: 7 }}>
        <FormLabel>Role</FormLabel>
        <SegmentedControl
          label="Role"
          fill
          options={DESIGNATIONS.map((d) => ({ value: d, label: d }))}
          value={w.designation}
          // Switching role changes the baseline, so start permissions clean.
          onChange={(designation) =>
            setW((x) => ({ ...x, designation, permissions: {} }))
          }
        />
        <Txt size={11} color={c.muted}>
          {w.designation === "Sub Admin"
            ? "Sub Admin sees the whole dashboard in view-only mode, and can download reports."
            : "Warden can view, edit and download, but only for the hostels assigned to them."}
        </Txt>
      </View>
      {w.designation === "Warden" ? (
        <ChipSelect
          label="Assigned hostels"
          options={hostelOptions}
          value={w.hostels}
          onChange={set("hostels")}
          empty="Add hostels on the Hostels tab first."
        />
      ) : (
        <View
          style={{
            gap: 8,
            padding: 12,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 10,
          }}
        >
          <FormLabel>Permissions</FormLabel>
          <Txt size={11} color={c.muted}>
            Defaults for this role are applied automatically. Adjust only if
            this account needs something extra.
          </Txt>
          {PERMISSION_MODULES.map((m) => (
            <Row
              key={m}
              style={{
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "space-between",
              }}
            >
              <Txt size={12} bold style={{ minWidth: 130 }}>
                {m}
              </Txt>
              <Row style={{ gap: 6, flexWrap: "wrap" }}>
                {PERMISSION_GROUPS.map((g) => {
                  const on = perms[m]?.includes(g) ?? false;
                  return (
                    <Chip
                      key={g}
                      label={g}
                      accessibilityLabel={`${m} ${g}`}
                      role="checkbox"
                      check
                      compact
                      selected={on}
                      onPress={() =>
                        setW((x) => {
                          const current =
                            { ...subAdminDefaults(), ...x.permissions }[m] ??
                            [];
                          const next = on
                            ? current.filter((y) => y !== g)
                            : [...current, g];
                          return {
                            ...x,
                            permissions: { ...x.permissions, [m]: next },
                          };
                        })
                      }
                    />
                  );
                })}
              </Row>
            </Row>
          ))}
        </View>
      )}
      <FormActions
        submitLabel={submitLabel}
        onCancel={onCancel}
        onSubmit={submit(onSave)}
      />
    </View>
  );
}

// ─────────────────────────── Hostels ───────────────────────────

export function HostelForm({
  initial,
  wardenOptions,
  takenNames,
  submitLabel = "Add hostel",
  onSave,
  onCancel,
}: {
  initial?: Hostel;
  wardenOptions: string[];
  /** Other hostels' names (the edited one is not among them). */
  takenNames: string[];
  submitLabel?: string;
  onSave: (h: Hostel) => void;
  onCancel: () => void;
}) {
  const {
    value: h,
    set,
    err,
    submit,
  } = useFormState(
    initial ?? emptyHostel(),
    (x) => validateHostel(x, takenNames),
    { reveal: !!initial },
  );
  return (
    <View style={{ gap: 16 }}>
      <FormGrid>
        <FormCell>
          <Field
            label="Hostel name *"
            value={h.hostel_name}
            onChange={set("hostel_name")}
            placeholder="e.g. Hostel D"
            error={err("hostel_name")}
          />
        </FormCell>
        <FormCell basis={160}>
          <Field
            label="Closing time"
            value={h.closing_time}
            onChange={set("closing_time")}
            placeholder="HH:MM, e.g. 22:30"
            error={err("closing_time")}
          />
        </FormCell>
        <FormCell>
          <Field
            label="Blocks / rooms"
            value={h.rooms}
            onChange={set("rooms")}
            placeholder="e.g. 2 blocks · 180 rooms"
          />
        </FormCell>
      </FormGrid>
      <ChipSelect
        label="Select wardens"
        options={wardenOptions}
        value={h.wardens}
        onChange={set("wardens")}
        empty="Add wardens on the Wardens tab first."
        leading={(name) => <PersonAvatar name={name} size={22} decorative />}
      />
      <FormActions
        submitLabel={submitLabel}
        onCancel={onCancel}
        onSubmit={submit(onSave)}
      />
    </View>
  );
}

// ──────────────────────── Leave management ────────────────────────

export function LeaveForm({
  initial,
  students,
  submitLabel = "Create leave",
  onSave,
  onCancel,
}: {
  initial?: Leave;
  students: string[];
  submitLabel?: string;
  onSave: (l: Leave) => void;
  onCancel: () => void;
}) {
  const {
    value: l,
    set,
    errors,
    err,
    submit,
  } = useFormState(initial ?? emptyLeave(), validateLeave, {
    reveal: !!initial,
  });
  const valid =
    !errors.start_date && !errors.end_date && !!l.start_date && !!l.end_date;
  return (
    <View style={{ gap: 16 }}>
      <FormGrid>
        <FormCell>
          <SelectField
            label="Select student"
            required
            value={l.student}
            placeholder="Choose a student"
            options={students}
            onChange={set("student")}
            error={err("student")}
          >
            {/* The chosen resident in the standard person format. */}
            {!!l.student && <PersonOr text={l.student}>{null}</PersonOr>}
          </SelectField>
        </FormCell>
        <FormCell basis={160}>
          <SelectField
            label="Status"
            value={l.status}
            options={LEAVE_STATUSES}
            onChange={(status) => set("status")(status as Leave["status"])}
          />
        </FormCell>
        <FormCell basis={160}>
          <Field
            label="Start date *"
            value={l.start_date}
            onChange={set("start_date")}
            placeholder="YYYY-MM-DD"
            error={err("start_date")}
          />
        </FormCell>
        <FormCell basis={160}>
          <Field
            label="End date *"
            value={l.end_date}
            onChange={set("end_date")}
            placeholder="YYYY-MM-DD"
            error={err("end_date")}
          />
        </FormCell>
      </FormGrid>
      <Field
        label="Reason *"
        value={l.reason}
        onChange={set("reason")}
        placeholder="e.g. Family function at home"
        multiline
        error={err("reason")}
      />
      {valid && (
        <Txt size={12}>
          Leave count: {leaveDays(l)} day{leaveDays(l) === 1 ? "" : "s"}
        </Txt>
      )}
      <FormActions
        submitLabel={submitLabel}
        onCancel={onCancel}
        onSubmit={submit(onSave)}
      />
    </View>
  );
}
