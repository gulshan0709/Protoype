import { useCallback } from "react";
import {
  checkUpload,
  NOUN,
  type NewClass,
  type SetupKind,
} from "../../../domain/classes/setup";
import { downloadTemplate } from "../../../shared/files/classCsv";
import { useTheme } from "../../../shared/theme/Theme";
import { Txt } from "../../../shared/ui/Primitives";
import { CsvBulkUpload, RowTitle } from "./setup/CsvBulkUpload";

export function ClassBulkUpload({
  kind,
  existingNames,
  onSave,
  onCancel,
}: {
  kind: SetupKind;
  existingNames: string[];
  onSave: (forms: NewClass[], source: string) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const check = useCallback(
    (table: string[][]) => checkUpload(table, existingNames, kind),
    [existingNames, kind],
  );
  return (
    <CsvBulkUpload
      noun={NOUN[kind].many}
      requiredHint={`Required columns: ${kind}_name, faculty_email, Tag. Duplicate rows are skipped; invalid or existing rows must be corrected or removed.`}
      check={check}
      renderTitle={(row) => (
        <RowTitle>{row.data.class_name || `Row ${row.key + 2}`}</RowTitle>
      )}
      renderMeta={(row) => (
        <Txt size={12} color={c.muted}>
          {row.data.faculty_email} · {row.data.Tag}
        </Txt>
      )}
      onTemplate={() => downloadTemplate(kind)}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
}
