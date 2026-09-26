import { userIdentity } from "../../../domain/contracts/userIdentity";
import { UserIdentity } from "./UserIdentity";
import { MediaPlayer } from "./RecordMedia";
import { ClassAttendance } from "./ClassAttendance";
import { DecisionBar } from "./Priority";
import { missionFor } from "../../../domain/contracts/priority";
import React from "react";
import { View } from "react-native";
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
export function RecordDetail({
  page,
  record,
  onAction,
  onBack,
  onNext,
  wide,
}: {
  page: PageContract;
  record: DataRecord;
  onAction: (action: Action) => void;
  onBack: () => void;
  onNext: () => void;
  wide: boolean;
}) {
  const c = useTheme();
  const { audit, workspace } = useApp();
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
  return (
    <View style={{ gap: 22 }}>
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <Button label="Back to records" icon="back" onPress={onBack} />
        <Badge label={record.state.label} tone={record.state.tone} />
      </Row>
      {typeof record.captureAsset === "number" && (
        <MediaPlayer record={record} />
      )}
      <View style={{ gap: 8 }}>
        <Txt size={10} bold color={c.link} style={{ letterSpacing: 1.8 }}>
          {d.eyebrow.replaceAll("-", " ").replaceAll("_", " ").toUpperCase()}
        </Txt>
        {userIdentity(record) ? (
          <UserIdentity record={record} size={72} />
        ) : (
          <Txt size={30} bold style={{ letterSpacing: -0.7 }}>
            {d.title}
          </Txt>
        )}
        <Txt color={c.muted}>{d.summary}</Txt>
      </View>
      <DecisionBar
        mission={missionFor(workspace.industry, workspace.role)}
        record={{ ...record, detail: d }}
        page={page}
        scope={workspace.scope}
      >
        {d.permittedActions.map((action, i) => (
          <Button
            key={action.id}
            label={action.label}
            onPress={() => onAction(action)}
            variant={i === 0 ? "primary" : "secondary"}
            icon={action.kind === "export" ? "download" : undefined}
          />
        ))}
      </DecisionBar>
      {workspace.industry === "education" && <ClassAttendance pageId={page.id} record={record} />}
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
                      {!!item.meta && (
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
              {[
                ...events.map((e) => ({
                  time: new Date(e.at).toLocaleString(),
                  event: `${e.action} · ${e.reason}`,
                  actor: e.actor,
                })),
                ...d.timeline,
              ].map((event, i) => (
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
