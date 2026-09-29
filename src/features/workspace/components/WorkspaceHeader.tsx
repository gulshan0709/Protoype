import { memo, useMemo } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "../../../shared/theme/Theme";
import { IconButton, Row, Txt } from "../../../shared/ui/Primitives";
import { BrandMark, Icon } from "../../../shared/ui/Icon";
import { Select } from "../../../shared/ui/Select";
import { PersonAvatar } from "./PersonChip";

/** The brand tile that opens Ask Vizenta; `expanded` tells whether its dock is open. */
export function AssistantMark({
  onPress,
  expanded,
}: {
  onPress: () => void;
  expanded?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Ask Vizenta"
      accessibilityState={{ expanded }}
      aria-expanded={expanded}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <BrandMark size={35} radius={9} markScale={0.72} />
    </Pressable>
  );
}

/**
 * The workspace's top bar: page title (brand tile on phones), search, assigned
 * scope, Ask Vizenta, applications, updates, help and the profile.
 */
export const WorkspaceHeader = memo(function WorkspaceHeader({
  title,
  subtitle,
  accent,
  width,
  side,
  scope,
  scopes,
  onScope,
  assistantOpen,
  onAssistant,
  onOpen,
  unread,
  name,
}: {
  title: string;
  subtitle?: string;
  /** Title and underline colour of the product family. */
  accent: string;
  width: number;
  /** The sidebar is shown, so the menu button is not. */
  side: boolean;
  scope: string;
  scopes: string[];
  onScope: (scope: string) => void;
  assistantOpen: boolean;
  onAssistant: () => void;
  onOpen: (modal: string) => void;
  /** Some update in this view is unread. */
  unread: boolean;
  name: string;
}) {
  const c = useTheme();
  const phone = width < 768;
  const scopeOptions = useMemo(
    () => scopes.map((value) => ({ value, label: value })),
    [scopes],
  );
  return (
    <Row
      style={{
        height: 66,
        paddingHorizontal: phone ? 10 : 18,
        borderBottomWidth: 2,
        borderBottomColor: accent,
        backgroundColor: c.hero,
        gap: phone ? 8 : 15,
      }}
    >
      {!side && (
        <IconButton
          name="menu"
          label="Open navigation"
          onPress={() => onOpen("menu")}
        />
      )}
      {phone ? (
        <AssistantMark onPress={onAssistant} />
      ) : (
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt
            size={18}
            bold
            color={accent}
            lines={1}
            style={{ letterSpacing: -0.4 }}
          >
            {title}
          </Txt>
          <Txt size={11} color={c.muted} lines={1}>
            {subtitle}
          </Txt>
        </View>
      )}
      {!phone &&
        (width >= 1180 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search workspace"
            onPress={() => onOpen("search")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: c.background,
              borderRadius: 8,
              padding: 11,
              width: width > 1300 ? 230 : 185,
            }}
          >
            <Icon name="search" size={16} />
            <Txt size={11} color={c.subtle}>
              Search workspace
            </Txt>
          </Pressable>
        ) : (
          <IconButton
            name="search"
            label="Search workspace"
            onPress={() => onOpen("search")}
          />
        ))}
      <View style={{ flex: phone ? 1 : undefined, minWidth: 0 }}>
        <Select
          compact
          height={35}
          fill={phone}
          label="Assigned scope"
          value={scope}
          options={scopeOptions}
          onChange={onScope}
          icon={phone ? undefined : "site"}
        />
      </View>
      {!phone && (
        <AssistantMark onPress={onAssistant} expanded={assistantOpen} />
      )}
      {!phone && (
        <IconButton
          name="grid"
          label="Switch application"
          onPress={() => onOpen("apps")}
        />
      )}
      <View>
        <IconButton
          name="bell"
          label="Notifications"
          onPress={() => onOpen("notifications")}
        />
        {unread && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: 10,
              top: 9,
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: c.attention,
            }}
          />
        )}
      </View>
      {width >= 1180 && (
        <IconButton
          name="help"
          label="Help center"
          onPress={() => onOpen("help")}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profile and settings"
        onPress={() => onOpen("settings")}
        style={{ borderRadius: 18 }}
      >
        {/* The signed-in user's portrait, else their gradient initials. */}
        <PersonAvatar name={name} size={35} decorative />
      </Pressable>
    </Row>
  );
});
