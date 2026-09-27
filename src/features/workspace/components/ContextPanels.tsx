import React, { useState } from "react";
import { Pressable, View } from "react-native";
import type { PageContract } from "../../../domain/contracts/types";
import { cellText } from "../../../domain/contracts/logic";
import { isEvidencePanel } from "../../../domain/contracts/priority";
import { useTheme } from "../../../shared/theme/Theme";
import { Icon } from "../../../shared/ui/Icon";
import {
  Card,
  Row,
  SectionTitle,
  Txt,
  Badge,
} from "../../../shared/ui/Primitives";
import { PersonChip, personChip } from "./PersonChip";

const coverageTitle = "Data and decision coverage";

export function ContextPanels({
  page,
  evidenceCollapsed = false,
}: {
  page: PageContract;
  /** Start evidence panels collapsed (operators with healthy sources). */
  evidenceCollapsed?: boolean;
}) {
  const c = useTheme();
  const [collapsedBy, setCollapsedBy] = useState<Record<string, boolean>>({});
  const key = (title: string) => `${page.id}:${title}`;
  const collapsed = (title: string) =>
    isEvidencePanel(title) && (collapsedBy[key(title)] ?? evidenceCollapsed);
  const toggle = (title: string) =>
    isEvidencePanel(title) ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${collapsed(title) ? "Show" : "Hide"} ${title}`}
        accessibilityState={{ expanded: !collapsed(title) }}
        aria-expanded={!collapsed(title)}
        onPress={() =>
          setCollapsedBy((state) => ({
            ...state,
            [key(title)]: !collapsed(title),
          }))
        }
        style={({ pressed }) => ({
          width: 28,
          height: 28,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: pressed ? c.primarySoft : c.surface,
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        <Icon
          name={collapsed(title) ? "plus" : "minus"}
          size={14}
          color={c.muted}
        />
      </Pressable>
    ) : undefined;
  return (
    <View style={{ gap: 14 }}>
      {page.sidePanels.map((panel) => (
        <Card key={panel.title} style={{ padding: 0, overflow: "hidden" }}>
          <View style={{ paddingVertical: 11, paddingHorizontal: 14 }}>
            <SectionTitle
              title={panel.title}
              subtitle={panel.subtitle}
              truncate
              trailing={toggle(panel.title)}
            />
          </View>
          {!collapsed(panel.title) &&
            panel.items.map((item, i) => (
              <Row
                key={item.label + "-" + i}
                style={{
                  paddingVertical: 11,
                  paddingHorizontal: 13,
                  borderTopWidth: 1,
                  borderColor: c.border,
                  alignItems: "flex-start",
                }}
              >
                {personChip(item.label) ? (
                  // Items about a person use the standard person format.
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <PersonChip {...personChip(item.label, item.meta)!} />
                  </View>
                ) : (
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Txt size={12} bold lines={1}>
                      {item.label}
                    </Txt>
                    {!!item.meta && (
                      <Txt size={11} color={c.muted} lines={1}>
                        {item.meta}
                      </Txt>
                    )}
                  </View>
                )}
                <View style={{ maxWidth: "55%" }}>
                  <Badge label={cellText(item.value)} tone={item.tone} />
                </View>
              </Row>
            ))}
        </Card>
      ))}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <View style={{ paddingVertical: 11, paddingHorizontal: 14 }}>
          <SectionTitle
            title={coverageTitle}
            subtitle="Sources used by this page"
            truncate
            trailing={toggle(coverageTitle)}
          />
        </View>
        {!collapsed(coverageTitle) &&
          page.sources.map((source) => (
            <View
              key={source.label}
              style={{
                paddingVertical: 11,
                paddingHorizontal: 13,
                borderTopWidth: 1,
                borderColor: c.border,
                gap: 4,
              }}
            >
              <Row style={{ alignItems: "flex-start" }}>
                <Txt size={12} bold lines={1} style={{ flex: 1 }}>
                  {source.label}
                </Txt>
                <View style={{ maxWidth: "50%" }}>
                  <Badge label={source.value} tone={source.tone} />
                </View>
              </Row>
              <Txt size={11} color={c.muted} lines={1}>
                {source.impact}
              </Txt>
            </View>
          ))}
      </Card>
    </View>
  );
}
