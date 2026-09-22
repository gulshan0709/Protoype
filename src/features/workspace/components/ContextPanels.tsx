import React from "react";
import { View } from "react-native";
import type { PageContract } from "../../../domain/contracts/types";
import { cellText } from "../../../domain/contracts/logic";
import { useTheme } from "../../../shared/theme/Theme";
import {
  Card,
  Row,
  SectionTitle,
  Txt,
  Badge,
} from "../../../shared/ui/Primitives";

export function ContextPanels({ page }: { page: PageContract }) {
  const c = useTheme();
  return (
    <View style={{ gap: 14 }}>
      {page.sidePanels.map((panel) => (
        <Card key={panel.title} style={{ padding: 0, overflow: "hidden" }}>
          <View style={{ paddingVertical: 11, paddingHorizontal: 14 }}>
            <SectionTitle title={panel.title} subtitle={panel.subtitle} />
          </View>
          {panel.items.map((item, i) => (
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
              <View style={{ flex: 1, gap: 3 }}>
                <Txt size={12} bold>
                  {item.label}
                </Txt>
                {item.meta && (
                  <Txt size={10} color={c.muted}>
                    {item.meta}
                  </Txt>
                )}
              </View>
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
            title="Data and decision coverage"
            subtitle="Sources used by this page"
          />
        </View>
        {page.sources.map((source) => (
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
              <Txt size={12} bold style={{ flex: 1 }}>
                {source.label}
              </Txt>
              <View style={{ maxWidth: "50%" }}>
                <Badge label={source.value} tone={source.tone} />
              </View>
            </Row>
            <Txt size={9} color={c.muted}>
              {source.impact}
            </Txt>
          </View>
        ))}
      </Card>
    </View>
  );
}
