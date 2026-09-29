import { useCallback } from "react";
import {
  LEARNER_COLUMNS,
  checkLearnerUpload,
  type NewLearner,
} from "../../../domain/learners/setup";
import { saveTemplate } from "../../../shared/files/classCsv";
import { CsvBulkUpload, PersonRowTitle } from "./setup/CsvBulkUpload";

export function LearnerBulkUpload({
  existingUids,
  onSave,
  onCancel,
}: {
  existingUids: string[];
  onSave: (forms: NewLearner[], source: string) => void;
  onCancel: () => void;
}) {
  const check = useCallback(
    (table: string[][]) => checkLearnerUpload(table, existingUids),
    [existingUids],
  );
  return (
    <CsvBulkUpload
      noun="learners"
      requiredHint="Required columns: uid, first_name, last_name, type. Duplicate rows are skipped; invalid or existing rows must be corrected or removed."
      check={check}
      renderTitle={(row) => <PersonRowTitle row={row} />}
      onTemplate={downloadLearnerTemplate}
      onSave={onSave}
      onCancel={onCancel}
    />
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
  saveTemplate("learner_upload_template.csv", "Learner upload template", [
    LEARNER_COLUMNS,
    example,
  ]);
}
