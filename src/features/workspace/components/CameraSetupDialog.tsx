import { View } from "react-native";
import {
  cameraRecord,
  cameraFromRecord,
  hasCameraErrors,
  validateCamera,
  cameraSetupVariant,
  CAMERA_ROW_TYPES,
  type CameraConfig,
} from "../../../domain/cameras/setup";
import {
  storeDeletedRecord,
  storeSetupRecords,
} from "../../../application/classSetupStore";
import { Txt } from "../../../shared/ui/Primitives";
import { Dialog } from "../../../shared/ui/Dialog";
import { ErrorText } from "../../../shared/ui/Form";
import { AddCameraForm } from "./CameraForm";
import type { SetupDialogProps } from "./setup/types";
import { useSetupScope } from "./setup/useSetupScope";
import {
  DeleteConfirm,
  RecordMenu,
  ScopePicker,
  SessionNotice,
  setupTitle,
} from "./setup/SetupDialogParts";

export function CameraSetupDialog({
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
  const enabled = cameraSetupVariant(workspace, page.id);
  const variant = enabled ?? "room";
  const target = rows.find((row) => row.id === request.recordId);
  const editing = request.mode === "edit";
  const setup = useSetupScope({ workspace, scopes, target, editing });
  const allowed =
    !!enabled &&
    (!request.recordId || (!!target && CAMERA_ROW_TYPES.includes(target.type)));
  const save = (forms: CameraConfig[], source: string) => {
    if (!allowed || !forms.length || (editing && !target)) return;
    if (!setup.requireScope()) return;
    for (const form of forms) {
      if (hasCameraErrors(validateCamera(form, variant))) {
        setup.setError("Complete the required camera fields.");
        return;
      }
      const existing = rows
        .filter((row) => row.id !== target?.id && row.setupKind === "camera")
        .flatMap((row) => cameraFromRecord(row, variant).cameras);
      if (
        form.cameras.some((device) =>
          existing.some(
            (other) =>
              other.camera_id.trim().toLowerCase() ===
              device.camera_id.trim().toLowerCase(),
          ),
        )
      ) {
        setup.setError("A camera with this ID already exists.");
        return;
      }
    }
    const records = forms.map((form) =>
      cameraRecord(
        page,
        form,
        variant,
        setup.recordScope(),
        actor,
        source,
        editing ? target : undefined,
      ),
    );
    storeSetupRecords(storeKey, records, editing);
    onSaved(
      editing
        ? "Camera changes saved for this session."
        : records.length + " camera(s) added for this session.",
    );
  };
  return (
    <Dialog
      title={setupTitle(
        request.mode,
        { one: "camera", many: "cameras" },
        "Camera actions",
      )}
      onClose={onClose}
      wide={["add", "edit", "bulk"].includes(request.mode)}
    >
      {!allowed ? (
        <Txt>This action is not available in your current scope.</Txt>
      ) : request.mode === "menu" && target ? (
        <RecordMenu
          target={target}
          onPick={(mode) => onRequest({ ...request, mode })}
        />
      ) : request.mode === "delete" && target ? (
        <DeleteConfirm
          title={target.detail.title}
          note="This removes the camera from this session."
          onCancel={onClose}
          onConfirm={() => {
            storeDeletedRecord(storeKey, target.id);
            onSaved("Camera removed from this session.");
          }}
        />
      ) : (
        <View style={{ gap: 14 }}>
          <SessionNotice detail="The camera service is not connected." />
          <ScopePicker scope={setup} />
          <ErrorText size={14}>{setup.error}</ErrorText>
          <AddCameraForm
            variant={variant}
            initial={
              editing && target ? cameraFromRecord(target, variant) : undefined
            }
            submitLabel={editing ? "Save changes" : "Add camera"}
            onSave={(form) =>
              save([form], editing ? "Camera edited" : "Camera created")
            }
            onCancel={onClose}
          />
        </View>
      )}
    </Dialog>
  );
}
