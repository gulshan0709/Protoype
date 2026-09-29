import { Pressable, ScrollView, View } from "react-native";
import type { Mission } from "../../../domain/contracts/priority";
import type { DataRecord, PageContract } from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, IconButton, Row, Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Assistant } from "./Assistant";
import { MissionLabel } from "./Priority";

/** Phones show the page title in the content, under the compact header. */
export function PhoneHeading({
  mission,
  title,
  subtitle,
  onAssistant,
}: {
  mission: Mission;
  title: string;
  subtitle?: string;
  onAssistant: () => void;
}) {
  const c = useTheme();
  return (
    <Row
      style={{
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 16,
      }}
    >
      <View style={{ flex: 1, minWidth: 200, gap: 5 }}>
        <MissionLabel mission={mission} />
        <Row style={{ flexWrap: "wrap" }}>
          <Txt size={24} bold style={{ letterSpacing: -0.8, lineHeight: 29 }}>
            {title}
          </Txt>
        </Row>
        <Txt size={12} color={c.muted}>
          {subtitle}
        </Txt>
      </View>
      <Row>
        <Button
          label="Ask Vizenta"
          icon="sparkle"
          onPress={onAssistant}
          variant="primary"
          compact
        />
      </Row>
    </Row>
  );
}

/** The phone tab bar; Overview is highlighted on the role's home view. */
export function BottomNav({
  home,
  onHome,
  onOpen,
}: {
  home: boolean;
  onHome: () => void;
  onOpen: (modal: string) => void;
}) {
  const c = useTheme();
  const items = [
    { icon: "home", label: "Overview", action: onHome, active: home },
    { icon: "grid", label: "Explore", action: () => onOpen("menu") },
    {
      icon: "sparkle",
      label: "Ask Vizenta",
      action: () => onOpen("assistant"),
    },
    { icon: "search", label: "Search", action: () => onOpen("search") },
    { icon: "settings", label: "Settings", action: () => onOpen("settings") },
  ];
  return (
    <Row
      style={{
        height: 65,
        borderTopWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
        justifyContent: "space-around",
      }}
    >
      {items.map(({ icon, label, action, active }) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={action}
          style={{
            alignItems: "center",
            gap: 4,
            padding: 8,
            borderRadius: 8,
            backgroundColor: active ? c.actionPrimary : "transparent",
          }}
        >
          <Icon name={icon} color={active ? c.actionInk : c.link} size={20} />
          <Txt size={9} color={active ? c.actionInk : c.link}>
            {label}
          </Txt>
        </Pressable>
      ))}
    </Row>
  );
}

/** Ask Vizenta beside the page on wide screens. */
export function AssistantDock({
  page,
  rows,
  wide,
  onOpenRecord,
  onClose,
}: {
  page: PageContract;
  rows: DataRecord[];
  wide: boolean;
  onOpenRecord: (record: DataRecord) => void;
  onClose: () => void;
}) {
  const c = useTheme();
  return (
    <View
      testID="assistant-dock"
      style={{
        width: wide ? 390 : 340,
        minWidth: 0,
        borderLeftWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      }}
    >
      <Row
        style={{
          height: 66,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderColor: c.border,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={15} bold color={c.link}>
            Ask Vizenta
          </Txt>
          <Txt size={10} color={c.muted} lines={1}>
            Conversation for this view
          </Txt>
        </View>
        <IconButton name="close" label="Close Ask Vizenta" onPress={onClose} />
      </Row>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 14 }}
      >
        <Assistant page={page} rows={rows} onOpen={onOpenRecord} />
      </ScrollView>
    </View>
  );
}
