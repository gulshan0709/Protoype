import type { PageContract } from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import {
  Button,
  Card,
  EmptyState,
  Row,
  Txt,
} from "../../../shared/ui/Primitives";
import { Select } from "../../../shared/ui/Select";

/** Titles of the data states that replace the records (Settings → Review tools). */
const STATE_TITLES: Record<string, string> = {
  empty: "No records yet",
  unavailable: "Source unavailable",
  notConfigured: "Configuration required",
  unauthorized: "Access restricted",
  insufficientHistory: "More history needed",
};

/** Cards above a page's records: the review data state, reduced source confidence, the page's banner. */
export function PageNotices({
  preview,
  page,
  onShowRecords,
}: {
  preview: string;
  page: PageContract;
  onShowRecords: () => void;
}) {
  const c = useTheme();
  return (
    <>
      {preview !== "populated" && (
        <Card style={{ backgroundColor: c.attentionBg, padding: 15 }}>
          <Row style={{ flexWrap: "wrap", justifyContent: "space-between" }}>
            <Txt size={12} color={c.attention}>
              Review mode · {preview}
            </Txt>
            <Button compact label="Show records" onPress={onShowRecords} />
          </Row>
        </Card>
      )}
      {preview === "degraded" && (
        <Card style={{ backgroundColor: c.attentionBg, gap: 6 }}>
          <Txt bold size={13}>
            Source confidence is reduced
          </Txt>
          <Txt size={12}>{page.states.degraded}</Txt>
        </Card>
      )}
      {page.banner && (
        <Card style={{ backgroundColor: c.attentionBg, gap: 5, padding: 16 }}>
          <Txt size={12} bold>
            {page.banner.title}
          </Txt>
          <Txt size={12} color={c.muted}>
            {page.banner.text}
          </Txt>
        </Card>
      )}
    </>
  );
}

/** A review data state shown instead of the records: its values are unknown, not zero. */
export function UnavailableState({
  preview,
  page,
  onShowRecords,
}: {
  preview: string;
  page: PageContract;
  onShowRecords: () => void;
}) {
  return (
    <Card>
      <EmptyState
        title={STATE_TITLES[preview] ?? "Unavailable"}
        description={
          page.states[preview] ??
          "This source cannot currently support a conclusion. Its values are unknown, not zero."
        }
        icon={preview === "unauthorized" ? "lock" : "activity"}
        label="Show records"
        action={onShowRecords}
      />
    </Card>
  );
}

/** People & Access → Users: which directory the table lists. */
export function UserDirectoryPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Row style={{ gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <Txt size={13} bold>
        User directory
      </Txt>
      <Select
        label="User directory"
        value={value}
        options={options}
        onChange={onChange}
      />
    </Row>
  );
}
