import React, { useState } from "react";
import { View } from "react-native";
import type {
  DataRecord,
  PageContract,
  Workspace,
} from "../../../domain/contracts/types";
import {
  classRecord,
  classKey,
  validateClass,
  formFromRecord,
  NOUN,
  setupKinds,
  type NewClass,
  type SetupKind,
} from "../../../domain/classes/setup";
import {
  storeAddedClasses,
  storeEditedRecord,
  storeDeletedRecord,
} from "../../../application/classSetupStore";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Row, Txt } from "../../../shared/ui/Primitives";
import { Dialog } from "../../../shared/ui/Dialog";
import { Select } from "../../../shared/ui/Select";
import { AddClassForm } from "./ClassForm";
import { ClassBulkUpload } from "./ClassBulkUpload";
import { ClassLearners } from "./ClassLearners";

export interface ClassSetupRequest {
  mode:
    | "choose-add"
    | "choose-bulk"
    | "add"
    | "bulk"
    | "menu"
    | "edit"
    | "delete"
    | "learners";
  kind: SetupKind;
  recordId?: string;
}

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
  const kinds = setupKinds(workspace, page.id);
  const [scope, setScope] = useState(
    workspace.scope === "Across campuses" ? "" : workspace.scope,
  );
  const [error, setError] = useState("");
  const target = rows.find((row) => row.id === request.recordId);
  const { mode, kind } = request;
  const editing = mode === "edit";
  const choosing = mode === "choose-add" || mode === "choose-bulk";
  const title = choosing
    ? mode === "choose-add"
      ? "Add class or lab"
      : "Bulk upload"
    : mode === "menu"
      ? "Class / lab actions"
      : mode === "learners"
        ? "Learners"
        : `${mode === "add" ? "Add" : mode === "bulk" ? "Bulk upload" : mode === "delete" ? "Delete" : "Edit"} ${NOUN[kind].one}`;
  const allowed = kinds.includes(kind) && (!request.recordId || !!target);
  const save = (forms: NewClass[], source: string) => {
    if (!allowed || (editing && !target)) return;
    if (!forms.length) return;
    if (!editing && !scopes.includes(scope)) {
      setError("Choose the campus or academic scope first.");
      return;
    }
    const recordScope =
      target?.scope ??
      (workspace.scope === "Across campuses" ||
      scopes.includes("Across campuses")
        ? ["Across campuses", scope]
        : [scope]);
    const mutationScope = editing
      ? (target?.scope.find((value) => value !== "Across campuses") ?? scope)
      : scope;
    const existing = rows
      .filter(
        (row) => row.id !== target?.id && row.scope.includes(mutationScope),
      )
      .map((row) => formFromRecord(row, kind).class_name.trim().toLowerCase());
    const seen = new Set<string>();
    for (const form of forms) {
      const errors = Object.values(validateClass(form, kind));
      if (errors.length) {
        setError(errors.join(". "));
        return;
      }
      const name = form.class_name.trim().toLowerCase();
      if (existing.includes(name) || seen.has(classKey(form))) {
        setError(
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
        recordScope,
        actor,
        source,
        kind,
        editing ? target : undefined,
      ),
    );
    if (editing) storeEditedRecord(storeKey, records[0]);
    else storeAddedClasses(storeKey, records);
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
        <View style={{ gap: 10 }}>
          <Txt size={14} bold>
            {target.detail.title}
          </Txt>
          {(["learners", "edit", "delete"] as const).map((mode) => (
            <Button
              key={mode}
              label={
                mode === "learners"
                  ? "Learners"
                  : mode === "edit"
                    ? "Edit"
                    : "Delete"
              }
              onPress={() => onRequest({ ...request, mode })}
            />
          ))}
        </View>
      ) : mode === "delete" && target ? (
        <View style={{ gap: 14 }}>
          <Txt>Delete {target.detail.title}?</Txt>
          <Txt size={12} color={c.muted}>
            This removes the {NOUN[kind].one} from this session. The source
            system is unchanged.
          </Txt>
          <Row style={{ justifyContent: "flex-end" }}>
            <Button label="Cancel" onPress={onClose} />
            <Button
              label="Delete"
              variant="primary"
              onPress={() => {
                storeDeletedRecord(storeKey, target.id);
                onSaved(`${NOUN[kind].title} removed from this session.`);
              }}
            />
          </Row>
        </View>
      ) : mode === "learners" && target ? (
        <ClassLearners
          storeKey={`${storeKey}:${target.id}`}
          record={target}
          kind={kind}
          onClose={onClose}
        />
      ) : (
        <View style={{ gap: 14 }}>
          <Txt size={12} color={c.muted}>
            Changes are kept for this session. Attendance sources and learner
            records are not connected.
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
          {!!error && (
            <Txt size={12} color={c.critical}>
              {error}
            </Txt>
          )}
          {mode === "bulk" ? (
            <ClassBulkUpload
              kind={kind}
              existingNames={rows
                .filter((row) => row.scope.includes(scope))
                .map((row) => formFromRecord(row, kind).class_name)}
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
