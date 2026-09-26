import { parseCsv } from "../../../domain/classes/setup";
import { LEARNER_COLUMNS } from "../../../domain/learners/setup";
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import {
  checkLearnerUpload,
  type NewLearner,
} from "../../../domain/learners/setup";
import { saveCsv, pickCsv } from "../../../shared/files/classCsv";
import { Button, Badge, Row, Txt } from "../../../shared/ui/Primitives";
import { useTheme } from "../../../shared/theme/Theme";
import { PersonChip } from "./PersonChip";

// Name of a CSV row, previewed in the standard person format.
const fullName = (row: { first_name?: string; last_name?: string }) =>
  [row.first_name, row.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

export function LearnerBulkUpload({
  existingUids,
  onSave,
  onCancel,
}: {
  existingUids: string[];
  onSave: (forms: NewLearner[], source: string) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [table, setTable] = useState<string[][]>([]);
  const [file, setFile] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const result = useMemo(
    () => checkLearnerUpload(table, existingUids),
    [table, existingUids],
  );
  const valid = result.rows.filter((row) => row.status === "Valid");
  const blocked =
    !!error ||
    !!result.error ||
    result.rows.some(
      (row) => row.status === "Invalid" || row.status === "Existing",
    );
  const choose = async () => {
    setBusy(true);
    try {
      const picked = await pickCsv();
      if (!picked) return;
      setTable([]);
      setFile("");
      if ("error" in picked) {
        setError(picked.error);
        return;
      }
      const parsed = parseCsv(picked.text);
      if (parsed.length > 2001)
        throw new Error("Upload at most 2,000 rows at a time.");
      setTable(parsed);
      setFile(picked.name);
      setError("");
    } catch (e) {
      setTable([]);
      setFile("");
      setError(e instanceof Error ? e.message : "The CSV could not be read.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 14 }}>
      <Txt size={12} color={c.muted}>
        Download the template, fill in your learners, then choose the CSV to
        review it before saving.
      </Txt>
      <Row style={{ flexWrap: "wrap" }}>
        <Button
          label="Download template"
          icon="download"
          onPress={() => downloadLearnerTemplate()}
        />
        <Button
          label={busy ? "Reading CSV…" : "Choose CSV file"}
          icon="folder"
          disabled={busy}
          onPress={() => void choose()}
        />
      </Row>
      {!!file && (
        <Txt size={12} bold>
          {file}
        </Txt>
      )}
      <Txt size={12} color={c.muted}>
        Required columns: uid, first_name, last_name, type. Duplicate rows are
        skipped; invalid or existing rows must be corrected or removed.
      </Txt>
      {!!(error || (file && result.error)) && (
        <Txt size={12} color={c.critical}>
          {error || result.error}
        </Txt>
      )}
      {!!result.rows.length && (
        <Txt size={12}>
          {valid.length} ready · {result.rows.length - valid.length} need review
          or will be skipped
        </Txt>
      )}
      <View style={{ gap: 8 }}>
        {result.rows.slice(0, 100).map((row) => (
          <View
            key={row.key}
            style={{
              padding: 12,
              gap: 6,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
            }}
          >
            <Row style={{ justifyContent: "space-between" }}>
              {fullName(row.data) ? (
                <View style={{ flex: 1, minWidth: 0 }}>
                  <PersonChip
                    name={fullName(row.data)}
                    uid={row.data.uid || undefined}
                  />
                </View>
              ) : (
                <Txt size={13} bold lines={1} style={{ flex: 1 }}>
                  {row.data.uid || `Row ${row.key + 2}`}
                </Txt>
              )}
              <Badge
                label={row.status}
                tone={
                  row.status === "Valid"
                    ? "healthy"
                    : row.status === "Invalid"
                      ? "critical"
                      : "attention"
                }
              />
            </Row>
            <Txt
              size={12}
              color={row.status === "Invalid" ? c.critical : c.muted}
            >
              {row.message}
            </Txt>
            <Row style={{ justifyContent: "flex-end" }}>
              <Button
                compact
                variant="ghost"
                label={`Remove row ${row.key + 2}`}
                onPress={() =>
                  setTable((rows) => rows.filter((_, i) => i !== row.key + 1))
                }
              />
            </Row>
          </View>
        ))}
      </View>
      {result.rows.length > 100 && (
        <Txt size={12} color={c.muted}>
          Showing the first 100 rows. All {result.rows.length} rows are
          validated; fix any remaining errors in the CSV and choose it again.
        </Txt>
      )}
      <Row style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
        <Button label="Cancel" onPress={onCancel} />
        <Button
          variant="primary"
          label={`Save ${valid.length} learners`}
          disabled={busy || blocked || !valid.length}
          onPress={() => {
            if (!blocked && valid.length)
              onSave(
                valid.map((row) => row.data),
                `Imported from ${file}`,
              );
          }}
        />
      </Row>
    </View>
  );
}

function downloadLearnerTemplate() {
  const example = [
    "24190",
    "Riya",
    "Sharma",
    "Female",
    "riya@college.edu",
    "9876543210",
    "2005-04-12",
    "Learner",
    "CSE 2026",
    "Computing",
    "B.Tech CSE",
    "5A",
    "parent@mail.com",
    "9876500000",
  ];
  saveCsv(
    "learner_upload_template.csv",
    "Learner upload template",
    [LEARNER_COLUMNS.join(","), example.join(",")].join("\r\n"),
  );
}
