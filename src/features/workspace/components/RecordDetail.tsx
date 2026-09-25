import React, { useState } from "react";
import { View, Pressable } from "react-native";
import type {
  Action,
  DataRecord,
  PageContract,
} from "../../../domain/contracts/types";
import { useApp } from "../../../application/AppProvider";
import { cellText } from "../../../domain/contracts/logic";
import { useTheme } from "../../../shared/theme/Theme";
import {
  Row,
  Card,
  Txt,
  Badge,
  Button,
  SectionTitle,
} from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Dialog } from "../../../shared/ui/Dialog";
import { RefButton } from "./referenceUi";
export function RecordDetail({
  page,
  record,
  onAction,
  onBack,
  backLabel = "Back to records",
  onHome,
  homeLabel,
  onNext,
  wide,
  reference,
}: {
  page: PageContract;
  record: DataRecord;
  onAction: (action: Action) => void;
  onBack: () => void;
  backLabel?: string;
  onHome?: () => void;
  homeLabel?: string;
  onNext: () => void;
  wide: boolean;
  // Education v2 reference detail layout.
  reference?: boolean;
}) {
  const c = useTheme();
  const { audit, workspace } = useApp();
  const [related, setRelated] = useState(false);
  const d = record.localWorkflow
    ? {
        ...record.detail,
        summary: `Workflow: ${record.state.label}. Original source status: ${(record.sourceState as { label: string }).label}. ${record.detail.summary}`,
      }
    : record.detail;
  const events = audit.filter(
    (e) =>
      e.recordId === record.id &&
      e.pageId === page.id &&
      e.workspace.industry === workspace.industry &&
      e.workspace.role === workspace.role &&
      e.workspace.scope === workspace.scope,
  );
  const timeline = [
    ...events.map((e) => ({
      time: new Date(e.at).toLocaleString(),
      event: `${e.action} · ${e.reason}`,
      actor: e.actor,
    })),
    ...d.timeline,
  ];
  if (reference) {
    const LinkButton = ({
      label,
      onPress,
    }: {
      label: string;
      onPress: () => void;
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ hovered }: any) => ({
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 7,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: hovered ? c.primarySoft : c.surface,
        })}
      >
        <Txt size={12}>{label}</Txt>
      </Pressable>
    );
    return (
      <View style={{ gap: 14 }}>
        <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <Row style={{ flexWrap: "wrap", gap: 8 }}>
            <LinkButton label={`← ${backLabel}`} onPress={onBack} />
            {onHome && homeLabel && (
              <LinkButton label={homeLabel} onPress={onHome} />
            )}
          </Row>
          <LinkButton
            label="Continue to related records →"
            onPress={() => setRelated(true)}
          />
        </Row>
        <Card
          style={{
            padding: 20,
            flexDirection: wide ? "row" : "column",
            gap: 20,
          }}
        >
          <View style={{ flex: 1, gap: 10 }}>
            <Txt size={9} bold color={c.link} style={{ letterSpacing: 1.4 }}>
              {d.eyebrow
                .replaceAll("-", " ")
                .replaceAll("_", " ")
                .toUpperCase()}
            </Txt>
            <Txt size={26} bold style={{ letterSpacing: -0.5 }}>
              {d.title}
            </Txt>
            <Txt size={13} color={c.muted}>
              {d.summary}
            </Txt>
            <Row style={{ flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {d.permittedActions.map((action, i) => (
                <RefButton
                  key={action.id}
                  label={action.label}
                  onPress={() => onAction(action)}
                  kind={
                    action.kind === "primary" || i === 0
                      ? "primary"
                      : action.kind === "export"
                        ? "export"
                        : "plain"
                  }
                />
              ))}
            </Row>
          </View>
          <View
            style={{
              width: wide ? "45%" : "100%",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {d.facts.map((fact, i) => (
              <View
                key={`${fact.label}-${i}`}
                style={{
                  flexGrow: 1,
                  flexBasis: "45%",
                  padding: 11,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.background,
                  gap: 3,
                }}
              >
                <Txt size={10} color={c.muted}>
                  {fact.label}
                </Txt>
                <Txt size={13} bold>
                  {cellText(fact.value)}
                </Txt>
              </View>
            ))}
          </View>
        </Card>
        <View style={{ flexDirection: wide ? "row" : "column", gap: 14 }}>
          <Card style={{ flex: wide ? 1.1 : undefined, padding: 0 }}>
            {d.sections.map((section, i) => (
              <View key={`${section.title}-${i}`} style={{ paddingTop: 14 }}>
                <View style={{ paddingHorizontal: 14, paddingBottom: 8 }}>
                  <Txt size={13} bold>
                    {section.title}
                  </Txt>
                  {!!section.description && (
                    <Txt size={10} color={c.muted}>
                      {section.description}
                    </Txt>
                  )}
                </View>
                {section.items.map((item, j) => (
                  <Row
                    key={`${item.label}-${j}`}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderTopWidth: j === 0 ? 0 : 1,
                      borderBottomWidth: j === section.items.length - 1 ? 1 : 0,
                      borderColor: c.border,
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Txt size={12} bold>
                      {item.label}
                    </Txt>
                    <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
                      <Txt
                        size={12}
                        color={c.muted}
                        style={{ textAlign: "right" }}
                      >
                        {cellText(item.value)}
                      </Txt>
                      {item.meta && (
                        <Txt size={10} color={c.subtle}>
                          {item.meta}
                        </Txt>
                      )}
                    </View>
                  </Row>
                ))}
              </View>
            ))}
          </Card>
          <Card style={{ flex: wide ? 1 : undefined, padding: 0 }}>
            <View
              style={{
                padding: 14,
                borderBottomWidth: 1,
                borderColor: c.border,
              }}
            >
              <SectionTitle
                title={
                  timeline.length ? "Activity and audit" : "Data provenance"
                }
                subtitle={
                  timeline.length
                    ? "Stored events for this record"
                    : "Sources supporting this detail"
                }
              />
            </View>
            <View style={{ padding: 14 }}>
              {timeline.length
                ? timeline.map((event, i) => (
                    <Row
                      key={i}
                      style={{
                        alignItems: "flex-start",
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderColor: c.border,
                      }}
                    >
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          marginTop: 6,
                          backgroundColor: c.link,
                        }}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt size={12} bold>
                          {event.time}
                        </Txt>
                        <Txt size={11} color={c.muted}>
                          {event.event}
                        </Txt>
                        {!!event.actor && (
                          <Txt size={9} color={c.subtle}>
                            {event.actor}
                          </Txt>
                        )}
                      </View>
                    </Row>
                  ))
                : page.sources.map((source) => (
                    <Row
                      key={source.label}
                      style={{
                        justifyContent: "space-between",
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderColor: c.border,
                      }}
                    >
                      <Txt size={12} bold>
                        {source.label}
                      </Txt>
                      <Txt size={11} color={c.muted}>
                        {source.value}
                      </Txt>
                    </Row>
                  ))}
            </View>
          </Card>
        </View>
        {related && (
          <Dialog title="Related records" onClose={() => setRelated(false)}>
            {d.related?.length ? (
              d.related.map((r, i) => (
                <Row key={i} style={{ justifyContent: "space-between" }}>
                  <Txt size={12} bold>
                    {r.label}
                  </Txt>
                  <Txt size={12}>{cellText(r.value)}</Txt>
                </Row>
              ))
            ) : (
              <Txt size={12} color={c.muted}>
                No additional related records are available in {workspace.scope}
                . The navigation preserves the current detail and access
                boundary.
              </Txt>
            )}
            <Button
              label="Next record"
              icon="arrow"
              onPress={() => {
                setRelated(false);
                onNext();
              }}
            />
          </Dialog>
        )}
      </View>
    );
  }
  return (
    <View style={{ gap: 22 }}>
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <Row style={{ flexWrap: "wrap" }}>
          <Button label={backLabel} icon="back" onPress={onBack} />
          {onHome && homeLabel && <Button label={homeLabel} onPress={onHome} />}
        </Row>
        <Badge label={record.state.label} tone={record.state.tone} />
      </Row>
      <View style={{ gap: 8 }}>
        <Txt size={10} bold color={c.link} style={{ letterSpacing: 1.8 }}>
          {d.eyebrow.replaceAll("-", " ").replaceAll("_", " ").toUpperCase()}
        </Txt>
        <Txt size={30} bold style={{ letterSpacing: -0.7 }}>
          {d.title}
        </Txt>
        <Txt color={c.muted}>{d.summary}</Txt>
      </View>
      <Row style={{ flexWrap: "wrap" }}>
        {d.permittedActions.map((action, i) => (
          <Button
            key={action.id}
            label={action.label}
            onPress={() => onAction(action)}
            variant={i === 0 ? "primary" : "secondary"}
            icon={action.kind === "export" ? "download" : undefined}
          />
        ))}
      </Row>
      <View style={{ flexDirection: wide ? "row" : "column", gap: 22 }}>
        <View style={{ flex: 1, gap: 20 }}>
          <Card>
            <SectionTitle
              title="Record overview"
              subtitle={`Reference · ${record.id}`}
            />
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 24,
                marginTop: 24,
              }}
            >
              {d.facts.map((fact, i) => (
                <View
                  key={`${fact.label}-${i}`}
                  style={{ width: "45%", gap: 6 }}
                >
                  <Txt size={11} color={c.muted}>
                    {fact.label}
                  </Txt>
                  <Txt size={13} bold>
                    {cellText(fact.value)}
                  </Txt>
                </View>
              ))}
            </View>
          </Card>
          {d.sections.map((section, i) => (
            <Card key={`${section.title}-${i}`}>
              <SectionTitle
                title={section.title}
                subtitle={section.description}
              />
              <View style={{ gap: 18, marginTop: 20 }}>
                {section.items.map((item, j) => (
                  <Row
                    key={`${item.label}-${j}`}
                    style={{ alignItems: "flex-start" }}
                  >
                    <Txt size={12} color={c.muted} style={{ flex: 1 }}>
                      {item.label}
                    </Txt>
                    <View style={{ flex: 1, gap: 5 }}>
                      {item.tone ? (
                        <Badge label={cellText(item.value)} tone={item.tone} />
                      ) : (
                        <Txt size={12}>{cellText(item.value)}</Txt>
                      )}
                      {item.meta && (
                        <Txt size={10} color={c.subtle}>
                          {item.meta}
                        </Txt>
                      )}
                    </View>
                  </Row>
                ))}
              </View>
            </Card>
          ))}
        </View>
        <View style={{ width: wide ? 305 : undefined, gap: 20 }}>
          <Card>
            <SectionTitle
              title="Activity & audit trail"
              subtitle="Source history and your actions"
            />
            <View style={{ gap: 22, marginTop: 23 }}>
              {timeline.map((event, i) => (
                <Row key={i} style={{ alignItems: "flex-start" }}>
                  <View style={{ paddingTop: 4 }}>
                    <Icon
                      name={i === 0 ? "activity" : "clock"}
                      size={16}
                      color={c.link}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt size={11} bold>
                      {event.event}
                    </Txt>
                    <Txt size={10} color={c.muted}>
                      {event.actor ?? "Source service"}
                    </Txt>
                    <Txt size={9} color={c.subtle}>
                      {event.time}
                    </Txt>
                  </View>
                </Row>
              ))}
            </View>
          </Card>
          <Card style={{ backgroundColor: c.hero }}>
            <Icon name="lock" color={c.link} />
            <Txt size={13} bold style={{ marginTop: 12 }}>
              Within your assigned scope
            </Txt>
            <Txt size={11} color={c.muted} style={{ marginTop: 7 }}>
              {workspace.scope}. Actions follow this record's declared
              permissions.
            </Txt>
          </Card>
          {d.related && (
            <Card>
              <SectionTitle title="Related context" />
              <View style={{ gap: 14, marginTop: 15 }}>
                {d.related.map((r, i) => (
                  <View key={i}>
                    <Txt size={10} color={c.muted}>
                      {r.label}
                    </Txt>
                    <Txt size={12}>{cellText(r.value)}</Txt>
                  </View>
                ))}
              </View>
            </Card>
          )}
          <Button
            label="Continue to next record"
            icon="arrow"
            onPress={onNext}
          />
        </View>
      </View>
    </View>
  );
}
