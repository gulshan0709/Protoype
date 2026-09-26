import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { useApp } from "../../../application/AppProvider";
import {
  industries,
  visibleProducts,
} from "../../../domain/contracts/registry";
import { familyOrder } from "../../../domain/contracts/priority";
import type { Location } from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { BrandMark, BrandWordmark, Icon } from "../../../shared/ui/Icon";
import { Row, Txt } from "../../../shared/ui/Primitives";

interface Props {
  location: Location;
  navigate: (type: "org" | "product", name: string) => void;
  open: (name: string) => void;
  collapsed?: boolean;
}

export function Navigation({ location, navigate, open, collapsed }: Props) {
  const c = useTheme();
  const { workspace } = useApp();
  const industry = industries[workspace.industry];
  const role = industry.core.roles[workspace.role];
  const familyColors = {
    Presence: c.presence,
    Safety: c.safety,
    Insights: c.insights,
  };
  const item = (name: string, icon: string, type: "org" | "product") => {
    const active = location.name === name && location.type === type;
    return (
      <Pressable
        key={name}
        accessibilityRole="button"
        accessibilityLabel={name}
        accessibilityState={{ selected: active }}
        aria-pressed={active}
        onPress={() => navigate(type, name)}
        style={({ pressed, hovered }: any) => ({
          minHeight: 39,
          paddingLeft: collapsed ? 7 : 10,
          paddingRight: 10,
          borderRadius: 8,
          borderLeftWidth: 3,
          borderLeftColor: active ? c.sidebarAccent : "transparent",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
          backgroundColor: active
            ? pressed
              ? c.actionPrimaryPressed
              : c.actionPrimary
            : pressed || hovered
              ? c.sidebarHover
              : "transparent",
        })}
      >
        <Icon
          name={icon}
          size={16}
          color={active ? c.actionInk : c.sidebarIcon}
        />
        {!collapsed && (
          <Txt
            size={13}
            bold={active}
            color={active ? c.actionInk : c.sidebarText}
            style={{ flex: 1 }}
          >
            {name}
          </Txt>
        )}
      </Pressable>
    );
  };
  return (
    <View
      testID="reference-sidebar"
      style={{
        flex: 1,
        backgroundColor: c.sidebar,
        paddingHorizontal: collapsed ? 8 : 12,
        paddingTop: 0,
        paddingBottom: 16,
      }}
    >
      <Row
        style={{
          height: 66,
          paddingHorizontal: 5,
          borderBottomWidth: 1,
          borderColor: c.sidebarLine,
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        {collapsed ? <BrandMark size={32} /> : <BrandWordmark />}
      </Row>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Switch workspace"
        onPress={() => open("workspace")}
        style={({ pressed }) => ({
          paddingHorizontal: 9,
          paddingTop: 14,
          paddingBottom: 8,
          backgroundColor: pressed ? c.sidebarHover : "transparent",
          borderRadius: 8,
        })}
      >
        <Row
          style={{
            gap: 6,
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          {collapsed ? (
            <Icon name="building" size={18} color={c.sidebarIcon} />
          ) : (
            <>
              <Txt
                size={10}
                color={c.sidebarMuted}
                style={{ flex: 1, letterSpacing: 1.3 }}
              >
                {role.label.toUpperCase()}
                {"\n"}WORKSPACE
              </Txt>
              <Icon name="down" size={13} color={c.sidebarMuted} />
            </>
          )}
        </Row>
      </Pressable>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 14 }}
      >
        {familyOrder(workspace.industry, workspace.role).map((family) => {
          const products = visibleProducts(workspace).filter(
            (p) => industry.core.productFamilies[p]?.family === family,
          );
          if (!products.length) return null;
          return (
            <View key={family} style={{ gap: 2, marginTop: 5 }}>
              <Row
                style={{
                  gap: 8,
                  paddingHorizontal: 9,
                  paddingTop: 11,
                  paddingBottom: 6,
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
              >
                <View
                  style={{
                    width: collapsed ? 5 : 14,
                    height: 3,
                    borderRadius: 10,
                    backgroundColor: familyColors[family],
                  }}
                />
                {!collapsed && (
                  <Txt
                    size={10}
                    color={familyColors[family]}
                    style={{ letterSpacing: 1.6 }}
                  >
                    {family.toUpperCase()}
                  </Txt>
                )}
              </Row>
              {products.map((p) =>
                item(p, industry.core.productFamilies[p].icon, "product"),
              )}
            </View>
          );
        })}
        <View
          style={{
            borderTopWidth: 1,
            borderColor: c.sidebarLine,
            marginTop: 14,
            paddingTop: 14,
            paddingBottom: 7,
            paddingHorizontal: 9,
          }}
        >
          {!collapsed && (
            <Txt
              size={10}
              color={c.sidebarMuted}
              style={{ letterSpacing: 1.5 }}
            >
              ORGANIZATION
            </Txt>
          )}
        </View>
        {role.organization.map((name) =>
          item(
            name,
            /People|Access/.test(name)
              ? "users"
              : /Sources|Health/.test(name)
                ? "settings"
                : /Overview|Readiness/.test(name)
                  ? "building"
                  : "folder",
            "org",
          ),
        )}
      </ScrollView>
      <View
        style={{
          borderTopWidth: 1,
          borderColor: c.sidebarLine,
          paddingTop: 10,
          gap: 2,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask Vizenta"
          onPress={() => open("assistant")}
          style={{
            minHeight: 39,
            paddingHorizontal: 13,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10,
          }}
        >
          <Icon name="sparkle" size={17} color={c.insights} />
          {!collapsed && (
            <Txt size={12} color={c.sidebarText}>
              Ask Vizenta
            </Txt>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings and preferences"
          onPress={() => open("settings")}
          style={{
            minHeight: 39,
            paddingHorizontal: 13,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10,
          }}
        >
          <Icon name="settings" size={17} color={c.sidebarIcon} />
          {!collapsed && (
            <Txt size={12} color={c.sidebarText}>
              Settings & preferences
            </Txt>
          )}
        </Pressable>
      </View>
    </View>
  );
}
