import { View } from "react-native";
import { metricFacts } from "../../../domain/contracts/logic";
import type { Metric, PageContract } from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import {
  Button,
  Card,
  LabeledValue,
  PanelCard,
  Txt,
} from "../../../shared/ui/Primitives";
import { SourceRows } from "./ContextPanels";

/** One KPI opened from the page: its value, how it is measured and its sources. */
export function MetricDetail({
  metric,
  page,
  scope,
  phone,
  onBack,
}: {
  metric: Metric;
  page: PageContract;
  scope: string;
  phone: boolean;
  onBack: () => void;
}) {
  const c = useTheme();
  return (
    <>
      <Card style={{ gap: 15 }}>
        <Button label="Back to overview" icon="back" onPress={onBack} />
        <Txt size={45} bold color={c.link}>
          {metric.valuesByScope?.[scope] ?? metric.value}
        </Txt>
        <Txt>{metric.contextsByScope?.[scope] ?? metric.context}</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
          {metricFacts(metric, page, scope).map((fact) => (
            <LabeledValue
              key={fact.label}
              label={fact.label}
              style={{ width: phone ? "100%" : "45%" }}
            >
              {fact.value}
            </LabeledValue>
          ))}
        </View>
        <Txt size={12} color={c.muted}>
          {metric.denominator ??
            "Related records are shown below. This list may not include every record used for the metric."}
        </Txt>
      </Card>
      <PanelCard
        title="Supporting data"
        subtitle="Sources and decision impact for this value."
      >
        <SourceRows sources={page.sources} />
      </PanelCard>
    </>
  );
}
