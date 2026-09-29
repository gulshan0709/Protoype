import { useMemo } from "react";
import { View } from "react-native";
import {
  learnerRecord,
  learnerFromRecord,
  listedUids,
  validateLearner,
  learnerSetupEnabled,
  type NewLearner,
} from "../../../domain/learners/setup";
import {
  storeDeletedRecord,
  storeSetupRecords,
} from "../../../application/classSetupStore";
import { Txt } from "../../../shared/ui/Primitives";
import { Dialog } from "../../../shared/ui/Dialog";
import { ErrorText } from "../../../shared/ui/Form";
import { AddLearnerForm } from "./LearnerForm";
import { LearnerBulkUpload } from "./LearnerBulkUpload";
import type { SetupDialogProps } from "./setup/types";
import { useSetupScope } from "./setup/useSetupScope";
import {
  DeleteConfirm,
  RecordMenu,
  ScopePicker,
  SessionNotice,
  setupTitle,
} from "./setup/SetupDialogParts";

export function LearnerSetupDialog({
  request,
  onRequest,
  page,
  rows,
  workspace,
  scopes,
  actor,
  storeKey,
  onClose,
  onSaved,
}: SetupDialogProps) {
  const target = rows.find((row) => row.id === request.recordId);
  const editing = request.mode === "edit";
  const setup = useSetupScope({ workspace, scopes, target, editing });
  // Stable between renders, so the upload does not re-check its file.
  const existingUids = useMemo(() => listedUids(rows), [rows]);
  const allowed =
    learnerSetupEnabled(workspace, page.id) && (!request.recordId || !!target);
  const save = (forms: NewLearner[], source: string) => {
    if (!allowed || !forms.length || (editing && !target)) return;
    if (!setup.requireScope()) return;
    const seen = new Set(
      listedUids(rows.filter((row) => row.id !== target?.id)).map((uid) =>
        uid.trim().toLowerCase(),
      ),
    );
    for (const form of forms) {
      const errors = Object.values(validateLearner(form));
      if (errors.length) {
        setup.setError(errors.join(". "));
        return;
      }
      const uid = form.uid.trim().toLowerCase();
      if (seen.has(uid)) {
        setup.setError("UID " + form.uid + " is already listed.");
        return;
      }
      seen.add(uid);
    }
    const records = forms.map((form) =>
      learnerRecord(
        page,
        form,
        setup.recordScope(),
        actor,
        source,
        editing ? target : undefined,
      ),
    );
    storeSetupRecords(storeKey, records, editing);
    onSaved(
      editing
        ? "Learner changes saved for this session."
        : records.length + " learner(s) added for this session.",
    );
  };
  return (
    <Dialog
      title={setupTitle(
        request.mode,
        { one: "learner", many: "learners" },
        "Learner actions",
      )}
      onClose={onClose}
      wide={["add", "edit", "bulk"].includes(request.mode)}
    >
      {!allowed ? (
        <Txt>This action is not available in your current scope.</Txt>
      ) : request.mode === "menu" && target ? (
        <RecordMenu
          target={target}
          person
          onPick={(mode) => onRequest({ ...request, mode })}
        />
      ) : request.mode === "delete" && target ? (
        <DeleteConfirm
          title={target.detail.title}
          note="This removes the learner from this session."
          onCancel={onClose}
          onConfirm={() => {
            storeDeletedRecord(storeKey, target.id);
            onSaved("Learner removed from this session.");
          }}
        />
      ) : (
        <View style={{ gap: 14 }}>
          <SessionNotice detail="The learner service is not connected." />
          <ScopePicker scope={setup} />
          <ErrorText size={14}>{setup.error}</ErrorText>
          {request.mode === "bulk" ? (
            <LearnerBulkUpload
              existingUids={existingUids}
              onSave={save}
              onCancel={onClose}
            />
          ) : (
            <AddLearnerForm
              initial={
                editing && target ? learnerFromRecord(target) : undefined
              }
              submitLabel={editing ? "Save changes" : "Add learner"}
              onSave={(form) =>
                save([form], editing ? "Learner edited" : "Learner created")
              }
              onCancel={onClose}
            />
          )}
        </View>
      )}
    </Dialog>
  );
}
