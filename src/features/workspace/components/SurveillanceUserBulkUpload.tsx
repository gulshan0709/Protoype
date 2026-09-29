import { useCallback } from "react";
import {
  USER_COLUMNS,
  checkUserUpload,
  type SurveillanceUser,
} from "../../../domain/surveillance/setup";
import { saveTemplate } from "../../../shared/files/classCsv";
import { CsvBulkUpload, PersonRowTitle } from "./setup/CsvBulkUpload";

export function SurveillanceUserBulkUpload({
  existing,
  onSave,
  onCancel,
}: {
  existing: { uids: string[]; emails: string[] };
  onSave: (forms: SurveillanceUser[], source: string) => void;
  onCancel: () => void;
}) {
  const check = useCallback(
    (table: string[][]) => checkUserUpload(table, existing),
    [existing],
  );
  return (
    <CsvBulkUpload
      noun="users"
      requiredHint="Required columns: uid, first_name, user_type (email except for Threat). Duplicate rows are blocked; invalid or existing rows must be corrected or removed."
      check={check}
      // A face identity must be unique: duplicates block saving too.
      blocking={["Invalid", "Existing", "Duplicate"]}
      renderTitle={(row) => <PersonRowTitle row={row} />}
      onTemplate={downloadUserTemplate}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
}

function downloadUserTemplate() {
  saveTemplate("surveillance_user_template.csv", "User upload template", [
    USER_COLUMNS,
    [
      "E1001",
      "Ravi",
      "Kumar",
      "ravi@campus.edu",
      "9876543210",
      "Identified",
      "General (09:00-18:00)",
      "Main Gate",
      "",
      "",
    ],
    [
      "V2001",
      "Anita",
      "Shah",
      "anita@mail.com",
      "",
      "Visitor",
      "",
      "Main Gate",
      "2026-09-28 10:00",
      "2026-09-28 17:00",
    ],
  ]);
}
