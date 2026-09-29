import { View } from "react-native";
import type { DataRecord } from "../../../domain/contracts/types";
import {
  storeDeletedRecord,
  storeSetupRecords,
} from "../../../application/classSetupStore";
import {
  setupCameraFromRecord,
  setupCameraRecord,
  shiftFromRecord,
  shiftRecord,
  sourcesSetupEnabled,
} from "../../../domain/sources/setup";
import { Txt } from "../../../shared/ui/Primitives";
import { Dialog } from "../../../shared/ui/Dialog";
import { ErrorText } from "../../../shared/ui/Form";
import { SetupCameraForm } from "./setup/SetupCameraForm";
import { ShiftForm } from "./setup/ShiftForm";
import type { SetupDialogProps } from "./setup/types";
import { useSetupScope } from "./setup/useSetupScope";
import {
  DeleteConfirm,
  RecordMenu,
  ScopePicker,
  SessionNotice,
  setupTitle,
} from "./setup/SetupDialogParts";

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
}: SetupDialogProps) {
  const target = rows.find((r) => r.id === request.recordId);
  const editing = request.mode === "edit";
  const setup = useSetupScope({ workspace, scopes, target, editing });
  const camera = page.id === "ca-setup-cameras";
  const name = camera ? "camera" : "shift";
  const allowed =
    sourcesSetupEnabled(workspace, page.id) && (!request.recordId || !!target);
  const save = (build: (scope: string[]) => DataRecord[]) => {
    if (!allowed) return;
    if (!setup.requireScope("Choose a campus first.")) return;
    storeSetupRecords(storeKey, build(setup.recordScope()), editing);
    onSaved("Changes saved for this session.");
  };
  // Other records only: the one being edited may keep its own name.
  const taken = rows
    .filter((r) => r.id !== target?.id)
    .map((r) =>
      String(r.cells[camera ? "display" : "name"])
        .trim()
        .toLowerCase(),
    );
  return (
    <Dialog
      title={setupTitle(request.mode, { one: name })}
      wide={["add", "edit"].includes(request.mode)}
      onClose={onClose}
    >
      {!allowed ? (
        <Txt>This action is unavailable in the current scope.</Txt>
      ) : request.mode === "menu" && target ? (
        <RecordMenu
          target={target}
          onPick={(mode) => onRequest({ ...request, mode })}
        />
      ) : request.mode === "delete" && target ? (
        <DeleteConfirm
          title={target.detail.title}
          align="start"
          onCancel={onClose}
          onConfirm={() => {
            storeDeletedRecord(storeKey, target.id);
            onSaved("Record removed from this session.");
          }}
        />
      ) : (
        <View style={{ gap: 14 }}>
          <SessionNotice />
          <ScopePicker scope={setup} />
          <ErrorText size={14}>{setup.error}</ErrorText>
          {camera ? (
            <SetupCameraForm
              initial={
                editing && target ? setupCameraFromRecord(target) : undefined
              }
              takenNames={taken}
              locations={[
                ...new Set(
                  rows
                    .filter(
                      (r) => !setup.scope || r.scope.includes(setup.scope),
                    )
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
