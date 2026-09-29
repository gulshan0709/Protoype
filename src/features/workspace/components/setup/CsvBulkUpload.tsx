import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { parseCsv } from "../../../../domain/common/csv";
import { fullName } from "../../../../domain/common/text";
import type { UploadRow, UploadStatus } from "../../../../domain/common/upload";
import { pickCsv } from "../../../../shared/files/classCsv";
import { useTheme } from "../../../../shared/theme/Theme";
import { Badge, Button, Row, Txt } from "../../../../shared/ui/Primitives";
import { ErrorText } from "../../../../shared/ui/Form";
import { PersonChip } from "../PersonChip";

/** The chosen CSV as rows of cells, its file name, and the read error. */
export function usePickedCsv() {
  const [table, setTable] = useState<string[][]>([]);
  const [file, setFile] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
  return { table, setTable, file, error, busy, choose };
}

/** A preview row's title line. */
export function RowTitle({ children }: { children: string }) {
  return (
    <Txt size={13} bold lines={1} style={{ flex: 1 }}>
      {children}
    </Txt>
  );
}

/** A person row's title: the standard person chip, else its UID or row number. */
export function PersonRowTitle({
  row,
}: {
  row: UploadRow<{ uid: string; first_name: string; last_name: string }>;
}) {
  const name = fullName(row.data);
  return name ? (
    <View style={{ flex: 1, minWidth: 0 }}>
      <PersonChip name={name} uid={row.data.uid || undefined} />
    </View>
  ) : (
    <RowTitle>{row.data.uid || `Row ${row.key + 2}`}</RowTitle>
  );
}

/**
 * Bulk upload from a CSV template: download the template, choose a file,
 * review every row (the first 100 are listed, each removable), then save the
 * valid ones. Rows with a `blocking` status must be fixed or removed first;
 * other rows that are not valid are skipped. `check` should keep its identity
 * between renders (useCallback) so the file is not re-validated each time.
 */
export function CsvBulkUpload<T>({
  noun,
  requiredHint,
  check,
  blocking = ["Invalid", "Existing"],
  renderTitle,
  renderMeta,
  onTemplate,
  onSave,
  onCancel,
}: {
  /** Plural in the intro and on the Save button: "learners". */
  noun: string;
  /** The required columns and how duplicates are treated. */
  requiredHint: string;
  check: (table: string[][]) => { rows: UploadRow<T>[]; error?: string };
  blocking?: readonly UploadStatus[];
  renderTitle: (row: UploadRow<T>) => React.ReactNode;
  /** A line under the title. */
  renderMeta?: (row: UploadRow<T>) => React.ReactNode;
  onTemplate: () => void;
  onSave: (forms: T[], source: string) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const csv = usePickedCsv();
  const result = useMemo(() => check(csv.table), [check, csv.table]);
  const valid = result.rows.filter((row) => row.status === "Valid");
  const blocked =
    !!csv.error ||
    !!result.error ||
    result.rows.some((row) => blocking.includes(row.status));
  return (
    <View style={{ gap: 14 }}>
      <Txt size={12} color={c.muted}>
        {`Download the template, fill in your ${noun}, then choose the CSV to review it before saving.`}
      </Txt>
      <Row style={{ flexWrap: "wrap" }}>
        <Button
          label="Download template"
          icon="download"
          onPress={onTemplate}
        />
        <Button
          label={csv.busy ? "Reading CSV…" : "Choose CSV file"}
          icon="folder"
          disabled={csv.busy}
          onPress={() => void csv.choose()}
        />
      </Row>
      {!!csv.file && (
        <Txt size={12} bold>
          {csv.file}
        </Txt>
      )}
      <Txt size={12} color={c.muted}>
        {requiredHint}
      </Txt>
      <ErrorText>
        {csv.error || (csv.file ? result.error : undefined)}
      </ErrorText>
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
              {renderTitle(row)}
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
            {renderMeta?.(row)}
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
                  csv.setTable((rows) =>
                    rows.filter((_, i) => i !== row.key + 1),
                  )
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
          label={`Save ${valid.length} ${noun}`}
          disabled={csv.busy || blocked || !valid.length}
          onPress={() => {
            if (!blocked && valid.length)
              onSave(
                valid.map((row) => row.data),
                `Imported from ${csv.file}`,
              );
          }}
        />
      </Row>
    </View>
  );
}
