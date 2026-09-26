import { demoPortrait } from "../../../shared/ui/demoPortrait";
import { userIdentity } from "../../../domain/contracts/userIdentity";
import React, { useState } from "react";
import { Image, View } from "react-native";
import type { DataRecord } from "../../../domain/contracts/types";
import type { SurveillanceUser } from "../../../domain/surveillance/setup";
import { useTheme } from "../../../shared/theme/Theme";
import { Row, Txt } from "../../../shared/ui/Primitives";
export function UserIdentity({ record, size = 38 }: { record: DataRecord; size?: number }) {
  const c = useTheme();
  const person = userIdentity(record)!;
  const words = person.name.split(/\s+/);
  const user = { first_name: words[0], last_name: words.slice(1).join(" "), uid: person.uid, image: person.image };
  const [failed, setFailed] = useState(false);
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const initials = [user.first_name, user.last_name]
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <Row style={{ gap: 10, minWidth: 0, flex: 1 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          backgroundColor: c.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {user.image && !failed ? (
          <Image
            key={user.image}
            source={demoPortrait(user.image, name)}
            accessibilityLabel={name + " profile image"}
            onError={() => setFailed(true)}
            style={{ width: size, height: size }}
          />
        ) : (
          <Txt size={12} bold color={c.muted}>
            {initials || "?"}
          </Txt>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Txt bold size={size > 38 ? 22 : 13} lines={1}>
          {name}
        </Txt>
        {!!user.uid && <Txt size={12} color={c.muted} lines={1}>
          {"UID: " + user.uid}
        </Txt>}
      </View>
    </Row>
  );
}
