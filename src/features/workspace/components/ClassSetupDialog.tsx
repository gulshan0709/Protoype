import { useMemo } from "react";
import { View } from "react-native";
import { isAggregateScope } from "../../../domain/contracts/logic";
import {
  classRecord,
  classKey,
  validateClass,
  formFromRecord,
  NOUN,
  setupKinds,
  type NewClass,
} from "../../../domain/classes/setup";
import {
  storeDeletedRecord,
  storeSetupRecords,
} from "../../../application/classSetupStore";
import { Button, Txt } from "../../../shared/ui/Primitives";
import { Dialog } from "../../../shared/ui/Dialog";
import { ErrorText } from "../../../shared/ui/Form";
import { AddClassForm } from "./ClassForm";
import { ClassBulkUpload } from "./ClassBulkUpload";
import { ClassLearners } from "./ClassLearners";
import type { SetupDialogProps } from "./setup/types";
import { useSetupScope } from "./setup/useSetupScope";
import {
  DeleteConfirm,
  RecordMenu,
  ScopePicker,
  SessionNotice,
  setupTitle,
} from "./setup/SetupDialogParts";

export type { SetupRequest as ClassSetupRequest } from "./setup/types";

export function ClassSetupDialog({
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
  const kinds = setupKinds(workspace, page.id);
  const target = rows.find((row) => row.id === request.recordId);
  const { mode, kind } = request;
  const editing = mode === "edit";
  const setup = useSetupScope({ workspace, scopes, target, editing });
  // Stable between renders, so the upload does not re-check its file.
  const existingNames = useMemo(
    () =>
      rows
        .filter((row) => row.scope.includes(setup.scope))
        .map((row) => formFromRecord(row, kind).class_name),
    [rows, setup.scope, kind],
  );
  const choosing = mode === "choose-add" || mode === "choose-bulk";
  const title = choosing
    ? mode === "choose-add"
      ? "Add class or lab"
      : "Bulk upload"
    : mode === "learners"
      ? "Learners"
      : setupTitle(mode, { one: NOUN[kind].one }, "Class / lab actions");
  const allowed = kinds.includes(kind) && (!request.recordId || !!target);
  const save = (forms: NewClass[], source: string) => {
    if (!allowed || (editing && !target)) return;
    if (!forms.length) return;
    if (!setup.requireScope()) return;
    const mutationScope = editing
      ? (target?.scope.find((value) => !isAggregateScope(value)) ?? setup.scope)
      : setup.scope;
    const existing = rows
      .filter(
        (row) => row.id !== target?.id && row.scope.includes(mutationScope),
      )
      .map((row) => formFromRecord(row, kind).class_name.trim().toLowerCase());
    const seen = new Set<string>();
    for (const form of forms) {
      const errors = Object.values(validateClass(form, kind));
      if (errors.length) {
        setup.setError(errors.join(". "));
        return;
      }
      const name = form.class_name.trim().toLowerCase();
      if (existing.includes(name) || seen.has(classKey(form))) {
        setup.setError(
          `A class or lab named "${form.class_name}" already exists in this scope.`,
        );
        return;
      }
      seen.add(classKey(form));
    }
    const records = forms.map((form) =>
      classRecord(
        page,
        form,
        setup.recordScope(),
        actor,
        source,
        kind,
        editing ? target : undefined,
      ),
    );
    storeSetupRecords(storeKey, records, editing);
    onSaved(
      `${editing ? "Changes saved" : `${records.length} ${records.length === 1 ? NOUN[kind].one : NOUN[kind].many} added`}. Available for this session.`,
    );
  };
  return (
    <Dialog
      title={title}
      onClose={onClose}
      wide={
        mode === "add" ||
        mode === "edit" ||
        mode === "bulk" ||
        mode === "learners"
      }
    >
      {!allowed ? (
        <Txt>This action is not available in your current scope.</Txt>
      ) : choosing ? (
        <View style={{ gap: 10 }}>
          {kinds.map((kind) => (
            <Button
              key={kind}
              label={NOUN[kind].title}
              onPress={() =>
                onRequest({
                  kind,
                  mode: mode === "choose-add" ? "add" : "bulk",
                })
              }
            />
          ))}
        </View>
      ) : mode === "menu" && target ? (
        <RecordMenu
          target={target}
          actions={["learners", "edit", "delete"]}
          onPick={(mode) => onRequest({ ...request, mode })}
        />
      ) : mode === "delete" && target ? (
        <DeleteConfirm
          title={target.detail.title}
          note={`This removes the ${NOUN[kind].one} from this session. The source system is unchanged.`}
          noteSize={12}
          onCancel={onClose}
          onConfirm={() => {
            storeDeletedRecord(storeKey, target.id);
            onSaved(`${NOUN[kind].title} removed from this session.`);
          }}
        />
      ) : mode === "learners" && target ? (
        <ClassLearners
          storeKey={`${storeKey}:${target.id}`}
          record={target}
          kind={kind}
          onClose={onClose}
        />
      ) : (
        <View style={{ gap: 14 }}>
          <SessionNotice detail="Attendance sources and learner records are not connected." />
          <ScopePicker scope={setup} />
          <ErrorText>{setup.error}</ErrorText>
          {mode === "bulk" ? (
            <ClassBulkUpload
              kind={kind}
              existingNames={existingNames}
              onSave={save}
              onCancel={onClose}
            />
          ) : (
            <AddClassForm
              kind={kind}
              initial={
                editing && target ? formFromRecord(target, kind) : undefined
              }
              submitLabel={editing ? "Save changes" : undefined}
              onCancel={onClose}
              onSave={(form) =>
                save(
                  [form],
                  editing
                    ? "Class/lab configuration edited"
                    : "Created from class/lab form",
                )
              }
            />
          )}
        </View>
      )}
    </Dialog>
  );
}
