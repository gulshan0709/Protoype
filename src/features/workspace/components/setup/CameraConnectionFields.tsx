import React from "react";
import { View } from "react-native";
import { CAMERA_BRANDS } from "../../../../domain/cameras/setup";
import { useTheme } from "../../../../shared/theme/Theme";
import { Field, Row, Txt } from "../../../../shared/ui/Primitives";
import {
  FormCell,
  PasswordField,
  RemoveButton,
  SelectField,
} from "../../../../shared/ui/Form";

/** How the app reaches one camera (the forms name the brand differently). */
export type CameraConnection = Record<
  "brand" | "ip" | "port" | "camera_id" | "user_name" | "password",
  string
>;
type Key = keyof CameraConnection;
type TextKey = Exclude<Key, "brand">;

const PLACEHOLDERS: Record<TextKey, string> = {
  ip: "e.g. 192.168.1.20",
  port: "554",
  camera_id: "e.g. 101",
  user_name: "Camera login",
  password: "Camera password",
};

/** One camera of a form: "Camera 2", its remove ✕ (when given), then its fields. */
export function CameraCard({
  index,
  onRemove,
  gap = 12,
  children,
}: {
  index: number;
  onRemove?: () => void;
  gap?: number;
  children: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        gap,
        padding: 12,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 10,
      }}
    >
      <Row style={{ justifyContent: "space-between" }}>
        <Txt size={13} bold>
          Camera {index + 1}
        </Txt>
        {onRemove && (
          <RemoveButton
            label={`Remove camera ${index + 1}`}
            onPress={onRemove}
          />
        )}
      </Row>
      {children}
    </View>
  );
}

/**
 * Brand, IP address, port, camera ID and login of one camera, as cells of the
 * caller's FormGrid (after its own name fields). Cells are 200px wide at
 * least (the port 120) unless `bases` says otherwise.
 */
export function CameraConnectionFields({
  value,
  errors = {},
  onChange,
  placeholders,
  bases,
  keepUnknownBrand = false,
}: {
  value: CameraConnection;
  errors?: Partial<Record<Key, string>>;
  onChange: (patch: Partial<CameraConnection>) => void;
  placeholders?: Partial<Record<TextKey, string>>;
  bases?: Partial<Record<Key, number>>;
  /** Keep a brand that is not in the list as an option (edited rows). */
  keepUnknownBrand?: boolean;
}) {
  const hint = { ...PLACEHOLDERS, ...placeholders };
  const basis = (k: Key) => bases?.[k] ?? (k === "port" ? 120 : 200);
  const text = (k: Exclude<TextKey, "password">, label: string) => (
    <FormCell basis={basis(k)}>
      <Field
        label={label}
        value={value[k]}
        onChange={(v) => onChange({ [k]: v })}
        placeholder={hint[k]}
        error={errors[k]}
      />
    </FormCell>
  );
  const unknown =
    keepUnknownBrand && !!value.brand && !CAMERA_BRANDS.includes(value.brand);
  return (
    <>
      <FormCell basis={basis("brand")}>
        <SelectField
          label="Camera brand"
          required
          value={value.brand}
          placeholder="Choose brand"
          options={unknown ? [value.brand, ...CAMERA_BRANDS] : CAMERA_BRANDS}
          onChange={(brand) => onChange({ brand })}
          error={errors.brand}
        />
      </FormCell>
      {text("ip", "IP address *")}
      {text("port", "Port *")}
      {text("camera_id", "Camera ID *")}
      {text("user_name", "User name *")}
      <FormCell basis={basis("password")}>
        <PasswordField
          label="Password *"
          value={value.password}
          onChange={(password) => onChange({ password })}
          placeholder={hint.password}
          error={errors.password}
        />
      </FormCell>
    </>
  );
}
