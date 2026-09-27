import React, { useState } from "react";
import { View } from "react-native";
import type {
  DataRecord,
  PageContract,
  Workspace,
} from "../../../domain/contracts/types";
import {
  cameraRecord,
  cameraFromRecord,
  hasCameraErrors,
  validateCamera,
  cameraSetupVariant,
  type CameraConfig,
} from "../../../domain/cameras/setup";
import {
  storeAddedClasses,
  storeEditedRecord,
  storeDeletedRecord,
} from "../../../application/classSetupStore";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Row, Txt } from "../../../shared/ui/Primitives";
import { Dialog } from "../../../shared/ui/Dialog";
import { Select } from "../../../shared/ui/Select";
import { AddCameraForm } from "./CameraForm";
import type { ClassSetupRequest } from "./ClassSetupDialog";
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
  const variant = cameraSetupVariant(workspace, page.id) ?? "room";
  const [scope, setScope] = useState(
    workspace.scope === "Across campuses" ? "" : workspace.scope,
  );
  const [error, setError] = useState("");
  const target = rows.find((row) => row.id === request.recordId);
  const editing = request.mode === "edit";
  const allowed =
    cameraSetupVariant(workspace, page.id) &&
    (!request.recordId ||
      (!!target &&
        ["camera", "camera_source", "gate_camera"].includes(target.type)));
  const save = (forms: CameraConfig[], source: string) => {
    if (!allowed || !forms.length || (editing && !target)) return;
    if (!editing && !scopes.includes(scope)) {
      setError("Choose the campus or academic scope first.");
      return;
    }
    for (const form of forms) {
      if (hasCameraErrors(validateCamera(form, variant))) {
        setError("Complete the required camera fields.");
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
        setError("A camera with this ID already exists.");
        return;
      }
    }
    const recordScope =
      target?.scope ??
      (scopes.includes("Across campuses")
        ? ["Across campuses", scope]
        : [scope]);
    const records = forms.map((form) =>
      cameraRecord(
        page,
        form,
        variant,
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
        ? "Camera changes saved for this session."
        : records.length + " camera(s) added for this session.",
    );
  };
  return (
    <Dialog
      title={
        request.mode === "menu"
          ? "Camera actions"
          : request.mode === "bulk"
            ? "Bulk upload cameras"
            : request.mode === "delete"
              ? "Delete camera"
              : editing
                ? "Edit camera"
                : "Add camera"
      }
      onClose={onClose}
      wide={["add", "edit", "bulk"].includes(request.mode)}
    >
      {!allowed ? (
        <Txt>This action is not available in your current scope.</Txt>
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
          <Txt color={c.muted}>This removes the camera from this session.</Txt>
          <Row style={{ justifyContent: "flex-end" }}>
            <Button label="Cancel" onPress={onClose} />
            <Button
              label="Delete"
              variant="primary"
              onPress={() => {
                storeDeletedRecord(storeKey, target.id);
                onSaved("Camera removed from this session.");
              }}
            />
          </Row>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <Txt size={12} color={c.muted}>
            Changes are kept for this session. The camera service is not
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
