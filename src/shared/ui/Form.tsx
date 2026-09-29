// Building blocks shared by the setup forms: the wrapping field grid, labels,
// error lines, labelled selects, the password field, the action row and the
// remove ✕ of list items.
import React, { useState } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/Theme";
import { Button, Field, Row, Txt } from "./Primitives";
import { Icon } from "./Icon";
import { Select } from "./Select";

type FieldProps = React.ComponentProps<typeof Field>;

/** Fields in a row that wraps; each cell grows from its basis. */
export function FormGrid({
  gap = 12,
  children,
}: {
  gap?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
      {children}
    </View>
  );
}

/** One cell of a FormGrid: `basis` px wide at least, sharing spare room by `grow`. */
export function FormCell({
  basis = 220,
  grow = 1,
  children,
}: {
  basis?: number;
  grow?: number;
  children: React.ReactNode;
}) {
  return <View style={{ flexGrow: grow, flexBasis: basis }}>{children}</View>;
}

/** A field label; `required` adds " *". */
export function FormLabel({
  children,
  required = false,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <Txt size={12} bold>
      {required ? children + " *" : children}
    </Txt>
  );
}

/** A validation message; renders nothing without one. */
export function ErrorText({
  children,
  size = 12,
}: {
  children?: string;
  size?: number;
}) {
  const c = useTheme();
  return children ? (
    <Txt size={size} color={c.critical}>
      {children}
    </Txt>
  ) : null;
}

/**
 * A labelled Select with its error. The picker is named `selectLabel`, else
 * `label` without the " *", so its accessible name reads "Camera brand: Axis".
 */
export function SelectField({
  label,
  required,
  value,
  options,
  onChange,
  error,
  placeholder,
  selectLabel,
  children,
}: {
  label: string;
  required?: boolean;
  value: string;
  options: readonly string[] | readonly { label: string; value: string }[];
  onChange: (value: string) => void;
  error?: string;
  /** A first option with the value "", e.g. "Choose brand" or "Not set". */
  placeholder?: string;
  selectLabel?: string;
  /** Shown between the picker and its error, e.g. the chosen person. */
  children?: React.ReactNode;
}) {
  const list = options.map((o) =>
    typeof o === "string" ? { label: o, value: o } : o,
  );
  return (
    <View style={{ gap: 7 }}>
      <FormLabel required={required}>{label}</FormLabel>
      <Select
        label={selectLabel ?? label}
        value={value}
        options={
          placeholder === undefined
            ? list
            : [{ label: placeholder, value: "" }, ...list]
        }
        onChange={onChange}
      />
      {children}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

/** A Field with a Show / Hide password toggle below it. */
export function PasswordField(props: Omit<FieldProps, "secure">) {
  const c = useTheme();
  const [shown, setShown] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Field {...props} secure={!shown} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shown ? "Hide password" : "Show password"}
        onPress={() => setShown((s) => !s)}
        style={{ alignSelf: "flex-start" }}
      >
        <Txt size={11} color={c.link}>
          {shown ? "Hide password" : "Show password"}
        </Txt>
      </Pressable>
    </View>
  );
}

/**
 * The form's buttons at the trailing edge: Cancel (when `onCancel` is given)
 * and the primary submit. `leading` sits at the other end, e.g. "Add another".
 */
export function FormActions({
  submitLabel,
  onSubmit,
  onCancel,
  cancelLabel = "Cancel",
  leading,
}: {
  submitLabel: string;
  onSubmit: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  leading?: React.ReactNode;
}) {
  const buttons = (
    <Row style={{ justifyContent: "flex-end", gap: 8 }}>
      {onCancel && <Button label={cancelLabel} onPress={onCancel} />}
      <Button label={submitLabel} variant="primary" onPress={onSubmit} />
    </Row>
  );
  return leading ? (
    <Row style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      {leading}
      {buttons}
    </Row>
  ) : (
    buttons
  );
}

/** "Fields marked * are required.", then any form-specific rule. */
export function RequiredNote({ children }: { children?: string }) {
  const c = useTheme();
  return (
    <Txt size={12} color={c.muted}>
      {children
        ? "Fields marked * are required. " + children
        : "Fields marked * are required."}
    </Txt>
  );
}

/** The ✕ that removes one item of a list (a camera, recipient or learner). */
export function RemoveButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  /** e.g. padding, to line the ✕ up with the inputs beside it. */
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={style}
    >
      <Icon name="close" size={16} color={c.muted} />
    </Pressable>
  );
}
