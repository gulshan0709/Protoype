import { parseCsv } from "../../../domain/classes/setup";
import { USER_COLUMNS } from "../../../domain/surveillance/setup";
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import {
  checkUserUpload,
  type SurveillanceUser,
} from "../../../domain/surveillance/setup";
import { saveCsv, pickCsv } from "../../../shared/files/classCsv";
import { Button, Badge, Row, Txt } from "../../../shared/ui/Primitives";
import { useTheme } from "../../../shared/theme/Theme";

export function SurveillanceUserBulkUpload({
  existing,
  onSave,
  onCancel,
}: {
  existing: { uids: string[]; emails: string[] };
  onSave: (forms: SurveillanceUser[], source: string) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [table, setTable] = useState<string[][]>([]);
  const [file, setFile] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const result = useMemo(
    () => checkUserUpload(table, existing),
    [table, existing],
  );
  const valid = result.rows.filter((row) => row.status === "Valid");
  const blocked =
    !!error ||
    !!result.error ||
    result.rows.some((row) => row.status !== "Valid");
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
        Download the template, fill in your users, then choose the CSV to review
        it before saving.
      </Txt>
      <Row style={{ flexWrap: "wrap" }}>
        <Button
          label="Download template"
          icon="download"
          onPress={() => downloadUserTemplate()}
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
        Required columns: uid, first_name, user_type (email except for Threat).
        Duplicate rows are blocked; invalid or existing rows must be corrected
        or removed.
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
              <Txt size={13} bold lines={1} style={{ flex: 1 }}>
                {row.data.uid || `Row ${row.key + 2}`}
              </Txt>
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
            <Txt size={12} color={c.muted}>
              {row.data.first_name} · {row.data.last_name}
            </Txt>
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
          label={`Save ${valid.length} users`}
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

function downloadUserTemplate() {
  const rows = [
    USER_COLUMNS.join(","),
    "E1001,Ravi,Kumar,ravi@campus.edu,9876543210,Identified,General (09:00-18:00),Main Gate,,",
    "V2001,Anita,Shah,anita@mail.com,,Visitor,,Main Gate,2026-09-28 10:00,2026-09-28 17:00",
  ];
  saveCsv(
    "surveillance_user_template.csv",
    "User upload template",
    rows.join("\r\n"),
  );
}
