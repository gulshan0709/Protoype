import { memo, useState } from "react";
import { View } from "react-native";
import type { PageContract } from "../../../domain/contracts/types";
import { cellText } from "../../../domain/contracts/logic";
import { isEvidencePanel } from "../../../domain/contracts/priority";
import { useTheme } from "../../../shared/theme/Theme";
import {
  Badge,
  IconButton,
  PanelCard,
  Row,
  Txt,
} from "../../../shared/ui/Primitives";
import { PersonChip, personChip } from "./PersonChip";

const coverageTitle = "Data and decision coverage";

/** A page's sources: each one's status and what it means for decisions. */
export function SourceRows({
  sources,
  truncate = false,
}: {
  sources: PageContract["sources"];
  /** One line per label and impact (the narrow side rail). */
  truncate?: boolean;
}) {
  const c = useTheme();
  const lines = truncate ? 1 : undefined;
  return (
    <>
      {sources.map((source) => (
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
            <Txt size={12} bold lines={lines} style={{ flex: 1 }}>
              {source.label}
            </Txt>
            <View style={{ maxWidth: "50%" }}>
              <Badge label={source.value} tone={source.tone} />
            </View>
          </Row>
          <Txt size={11} color={c.muted} lines={lines}>
            {source.impact}
          </Txt>
        </View>
      ))}
    </>
  );
}

export const ContextPanels = memo(function ContextPanels({
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
      <IconButton
        name={collapsed(title) ? "plus" : "minus"}
        label={`${collapsed(title) ? "Show" : "Hide"} ${title}`}
        size={28}
        iconSize={14}
        color={c.muted}
        expanded={!collapsed(title)}
        onPress={() =>
          setCollapsedBy((state) => ({
            ...state,
            [key(title)]: !collapsed(title),
          }))
        }
      />
    ) : undefined;
  return (
    <View style={{ gap: 14 }}>
      {page.sidePanels.map((panel) => (
        <PanelCard
          key={panel.title}
          title={panel.title}
          subtitle={panel.subtitle}
          truncate
          trailing={toggle(panel.title)}
        >
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
        </PanelCard>
      ))}
      <PanelCard
        title={coverageTitle}
        subtitle="Sources used by this page"
        truncate
        trailing={toggle(coverageTitle)}
      >
        {!collapsed(coverageTitle) && (
          <SourceRows sources={page.sources} truncate />
        )}
      </PanelCard>
    </View>
  );
});
