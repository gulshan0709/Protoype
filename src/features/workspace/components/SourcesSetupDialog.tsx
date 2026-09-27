import React, { useState } from "react";
import { View } from "react-native";
import type {
  DataRecord,
  PageContract,
  Workspace,
} from "../../../domain/contracts/types";
import {
  storeAddedClasses,
  storeEditedRecord,
  storeDeletedRecord,
} from "../../../application/classSetupStore";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Row, Txt } from "../../../shared/ui/Primitives";
import { Dialog } from "../../../shared/ui/Dialog";
import { Select } from "../../../shared/ui/Select";
import type { ClassSetupRequest } from "./ClassSetupDialog";
import {
  SetupCameraForm,
  ShiftForm,
  setupCameraRecord,
  setupCameraFromRecord,
  shiftRecord,
  shiftFromRecord,
} from "./SetupTabs";
export function SourcesSetupDialog({
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
  const target = rows.find((r) => r.id === request.recordId);
  const editing = request.mode === "edit";
  const camera = page.id === "ca-setup-cameras";
  const name = camera ? "camera" : "shift";
  const allowed =
    workspace.industry === "education" &&
    workspace.role === "customer_admin" &&
    ["ca-setup-cameras", "ca-setup-shifts"].includes(page.id) &&
    (!request.recordId || !!target);
  const save = (build: (scope: string[]) => DataRecord[]) => {
    if (!allowed) return;
    if (!editing && !scopes.includes(scope)) {
      setError("Choose a campus first.");
      return;
    }
    const records = build(target?.scope ?? ["Across campuses", scope]);
    if (editing) storeEditedRecord(storeKey, records[0]);
    else storeAddedClasses(storeKey, records);
    onSaved("Changes saved for this session.");
  };
  const taken = rows
    .filter((r) => r.id !== target?.id)
    .map((r) =>
      String(r.cells[camera ? "display" : "name"])
        .trim()
        .toLowerCase(),
    );
  return (
    <Dialog
      title={
        request.mode === "menu"
          ? "Record actions"
          : request.mode === "delete"
            ? "Delete " + name
            : (editing ? "Edit " : "Add ") + name
      }
      wide={["add", "edit"].includes(request.mode)}
      onClose={onClose}
    >
      {!allowed ? (
        <Txt>This action is unavailable in the current scope.</Txt>
      ) : request.mode === "menu" && target ? (
        <View style={{ gap: 10 }}>
          <Txt bold>{target.detail.title}</Txt>
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
          <Row>
            <Button label="Cancel" onPress={onClose} />
            <Button
              label="Delete"
              variant="primary"
              onPress={() => {
                storeDeletedRecord(storeKey, target.id);
                onSaved("Record removed from this session.");
              }}
            />
          </Row>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <Txt size={12} color={c.muted}>
            Changes are kept for this session.
          </Txt>
          {!editing && workspace.scope === "Across campuses" && (
            <Select
              label="Campus"
              value={scope}
              options={[
                { label: "Choose campus", value: "" },
                ...scopes
                  .filter((s) => s !== "Across campuses")
                  .map((value) => ({ label: value, value })),
              ]}
              onChange={setScope}
            />
          )}
          {!!error && <Txt color={c.critical}>{error}</Txt>}
          {camera ? (
            <SetupCameraForm
              initial={
                editing && target ? setupCameraFromRecord(target) : undefined
              }
              takenNames={taken}
              locations={[
                ...new Set(
                  rows
                    .filter((r) => !scope || r.scope.includes(scope))
                    .map((r) => String(r.cells.location)),
                ),
              ]}
              onCancel={onClose}
              onSave={(forms) =>
                save((scope) =>
                  forms.map((form) =>
                    setupCameraRecord(
                      page,
                      form,
                      scope,
                      actor,
                      editing ? "Camera updated" : "Camera created",
                      target,
                    ),
                  ),
                )
              }
            />
          ) : (
            <ShiftForm
              initial={editing && target ? shiftFromRecord(target) : undefined}
              takenNames={taken}
              onCancel={onClose}
              onSave={(form) =>
                save((scope) => [
                  shiftRecord(
                    page,
                    form,
                    scope,
                    actor,
                    editing ? "Shift updated" : "Shift created",
                    target,
                  ),
                ])
              }
            />
          )}
        </View>
      )}
    </Dialog>
  );
}
