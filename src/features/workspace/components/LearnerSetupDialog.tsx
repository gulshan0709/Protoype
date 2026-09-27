import React, { useState } from "react";
import { View } from "react-native";
import type {
  DataRecord,
  PageContract,
  Workspace,
} from "../../../domain/contracts/types";
import {
  learnerRecord,
  learnerFromRecord,
  listedUids,
  validateLearner,
  learnerSetupEnabled,
  type NewLearner,
} from "../../../domain/learners/setup";
import {
  storeAddedClasses,
  storeEditedRecord,
  storeDeletedRecord,
} from "../../../application/classSetupStore";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Row, Txt } from "../../../shared/ui/Primitives";
import { Dialog } from "../../../shared/ui/Dialog";
import { Select } from "../../../shared/ui/Select";
import { AddLearnerForm } from "./LearnerForm";
import { LearnerBulkUpload } from "./LearnerBulkUpload";
import type { ClassSetupRequest } from "./ClassSetupDialog";
import { PersonOr } from "./PersonChip";
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
}: {
  request: ClassSetupRequest;
  onRequest: (request: ClassSetupRequest) => void;
  page: PageContract;
  rows: DataRecord[];
  workspace: Workspace;
  scopes: string[];
  actor: string;
  storeKey: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const c = useTheme();
  const [scope, setScope] = useState(
    workspace.scope === "Across campuses" ? "" : workspace.scope,
  );
  const [error, setError] = useState("");
  const target = rows.find((row) => row.id === request.recordId);
  const editing = request.mode === "edit";
  const allowed =
    learnerSetupEnabled(workspace, page.id) && (!request.recordId || !!target);
  const save = (forms: NewLearner[], source: string) => {
    if (!allowed || !forms.length || (editing && !target)) return;
    if (!editing && !scopes.includes(scope)) {
      setError("Choose the campus or academic scope first.");
      return;
    }
    const seen = new Set(
      listedUids(rows.filter((row) => row.id !== target?.id)).map((uid) =>
        uid.trim().toLowerCase(),
      ),
    );
    for (const form of forms) {
      const errors = Object.values(validateLearner(form));
      if (errors.length) {
        setError(errors.join(". "));
        return;
      }
      const uid = form.uid.trim().toLowerCase();
      if (seen.has(uid)) {
        setError("UID " + form.uid + " is already listed.");
        return;
      }
      seen.add(uid);
    }
    const recordScope =
      target?.scope ??
      (scopes.includes("Across campuses")
        ? ["Across campuses", scope]
        : [scope]);
    const records = forms.map((form) =>
      learnerRecord(
        page,
        form,
        recordScope,
        actor,
        source,
        editing ? target : undefined,
      ),
    );
    if (editing) storeEditedRecord(storeKey, records[0]);
    else storeAddedClasses(storeKey, records);
    onSaved(
      editing
        ? "Learner changes saved for this session."
        : records.length + " learner(s) added for this session.",
    );
  };
  return (
    <Dialog
      title={
        request.mode === "menu"
          ? "Learner actions"
          : request.mode === "bulk"
            ? "Bulk upload learners"
            : request.mode === "delete"
              ? "Delete learner"
              : editing
                ? "Edit learner"
                : "Add learner"
      }
      onClose={onClose}
      wide={["add", "edit", "bulk"].includes(request.mode)}
    >
      {!allowed ? (
        <Txt>This action is not available in your current scope.</Txt>
      ) : request.mode === "menu" && target ? (
        <View style={{ gap: 10 }}>
          <PersonOr record={target}>
            <Txt bold>{target.detail.title}</Txt>
          </PersonOr>
          <Button
            label="Edit"
            onPress={() => onRequest({ ...request, mode: "edit" })}
          />
          <Button
            label="Delete"
            onPress={() => onRequest({ ...request, mode: "delete" })}
          />
        </View>
      ) : request.mode === "delete" && target ? (
        <View style={{ gap: 14 }}>
          <Txt>Delete {target.detail.title}?</Txt>
          <Txt color={c.muted}>This removes the learner from this session.</Txt>
          <Row style={{ justifyContent: "flex-end" }}>
            <Button label="Cancel" onPress={onClose} />
            <Button
              label="Delete"
              variant="primary"
              onPress={() => {
                storeDeletedRecord(storeKey, target.id);
                onSaved("Learner removed from this session.");
              }}
            />
          </Row>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <Txt size={12} color={c.muted}>
            Changes are kept for this session. The learner service is not
            connected.
          </Txt>
          {!editing && workspace.scope === "Across campuses" && (
            <Select
              label="Campus"
              value={scope}
              options={[
                { label: "Choose campus", value: "" },
                ...scopes
                  .filter((value) => value !== "Across campuses")
                  .map((value) => ({ label: value, value })),
              ]}
              onChange={(value) => {
                setScope(value);
                setError("");
              }}
            />
          )}
          {!!error && <Txt color={c.critical}>{error}</Txt>}
          {request.mode === "bulk" ? (
            <LearnerBulkUpload
              existingUids={listedUids(rows)}
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
