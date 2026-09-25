import React, { useState } from "react";
import { View } from "react-native";
import { useApp } from "../../../application/AppProvider";
import { industries } from "../../../domain/contracts/registry";
import type { PageContract, DataRecord } from "../../../domain/contracts/types";
import { cellText } from "../../../domain/contracts/logic";
import { useTheme } from "../../../shared/theme/Theme";
import { Row, Txt, Button, Field, Card } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
export function Assistant({
  page,
  rows,
  onOpen,
}: {
  page: PageContract;
  rows: DataRecord[];
  onOpen: (record: DataRecord) => void;
}) {
  const c = useTheme();
  const { workspace } = useApp();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [matches, setMatches] = useState<DataRecord[]>([]);
  const ask = (input: string) => {
    if (!input.trim()) return;
    setQuestion(input);
    const problem = /attention|block|risk|critical|review|brief|summary/i.test(
      input,
    );
    const found = problem
      ? rows.filter((r) =>
          ["attention", "critical", "pending", "unavailable"].includes(
            r.state.tone,
          ),
        )
      : rows.filter((r) =>
          input
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3)
            .some((word) =>
              JSON.stringify(r.cells).toLowerCase().includes(word),
            ),
        );
    setMatches(found);
    setAnswer(
      /source|health|camera/i.test(input)
        ? page.sources
            .map((s) => `${s.label}: ${s.value}. ${s.impact}`)
            .join("\n\n")
        : found.length
          ? `${found.length} ${problem ? "records need your attention" : "matching records"} in ${workspace.scope}. ${found.map((r) => `${r.detail.title}: ${r.state.label}.`).join(" ")} Open a record to review its evidence and permitted next steps.`
          : `No matching records were found among the ${rows.length} records in this view. Try a person's name, a location, or ask about source health.`,
    );
  };
  return (
    <>
      <Row>
        <View
          style={{
            backgroundColor: c.primarySoft,
            padding: 12,
            borderRadius: 12,
          }}
        >
          <Icon name="sparkle" color={c.link} size={27} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={18} bold>
            A little more clarity.
          </Txt>
          <Txt size={12} color={c.muted}>
            Your workspace, in conversation.
          </Txt>
        </View>
      </Row>
      <Txt size={12} color={c.muted}>
        {industries[workspace.industry].core.roles[workspace.role].label} ·{" "}
        {workspace.scope}
      </Txt>
      <View style={{ gap: 8 }}>
        {[
          "Give me a workspace briefing",
          "What needs attention?",
          "How healthy are my sources?",
        ].map((q) => (
          <Button key={q} label={q} onPress={() => ask(q)} icon="sparkle" />
        ))}
      </View>
      {!!answer && (
        <Card style={{ backgroundColor: c.hero, borderColor: c.grid, gap: 12 }}>
          <Txt size={13}>{answer}</Txt>
          <Txt size={10} color={c.muted}>
            Source: {page.heading}
          </Txt>
          {matches.map((r) => (
            <Button
              key={r.id}
              compact
              label={r.detail.title}
              icon="arrow"
              onPress={() => onOpen(r)}
            />
          ))}
        </Card>
      )}
      <Field
        label="Ask about this view"
        value={question}
        onChange={setQuestion}
        placeholder="What should I look at first?"
        onSubmit={() => ask(question)}
      />
      <Button
        label="Ask Vizenta"
        variant="primary"
        icon="arrow"
        disabled={!question.trim()}
        onPress={() => ask(question)}
      />
    </>
  );
}
