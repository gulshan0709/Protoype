import { useState } from "react";
import { View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Row, Txt } from "../../../shared/ui/Primitives";
import { FormLabel } from "../../../shared/ui/Form";
import { PersonAvatar } from "./PersonChip";

/** Image picker for person photos (web, iOS Photos/Files, Android). */
async function pickImages(multiple: boolean) {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/jpeg", "image/png", "image/gif"],
    multiple,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return (result.assets ?? []).filter((a) =>
    /\.(jpe?g|png|gif)$/i.test(a.name),
  );
}

/**
 * A person's photo in a setup form: the live avatar, Choose / Change and
 * Remove image, and a hint that turns into the error when a pick fails.
 */
export function PersonImageField({
  label,
  name,
  image,
  hint,
  onChange,
}: {
  label: string;
  /** The name typed so far; the avatar's initials follow it. */
  name: string;
  image?: string;
  hint: string;
  onChange: (uri?: string) => void;
}) {
  const c = useTheme();
  const [error, setError] = useState("");
  return (
    <View style={{ gap: 7 }}>
      <FormLabel>{label}</FormLabel>
      <Row style={{ flexWrap: "wrap", gap: 10 }}>
        {/* Same avatar as the list: the upload, a demo person's portrait, else
            initials that follow the name as it is typed. */}
        <PersonAvatar name={name} image={image || undefined} size={56} />
        <Button
          label={image ? "Change image" : "Choose image"}
          icon="camera"
          onPress={() =>
            void pickImages(false).then(
              (assets) => {
                if (!assets.length) return;
                setError("");
                onChange(assets[0].uri);
              },
              () => setError("The image could not be read."),
            )
          }
        />
        {!!image && (
          <Button label="Remove image" onPress={() => onChange(undefined)} />
        )}
      </Row>
      <Txt size={11} color={error ? c.critical : c.muted}>
        {error || hint}
      </Txt>
    </View>
  );
}
