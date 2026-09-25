import React, { useState } from "react";
import { View } from "react-native";
import type {
  DataRecord,
  PageContract,
  Workspace,
} from "../../../domain/contracts/types";
import {
  userRecord,
  listedIdentities,
  validateUser,
  surveillanceEnabled,
  type SurveillanceUser,
} from "../../../domain/surveillance/setup";
import {
  storeAddedClasses,
  storeEditedRecord,
  storeDeletedRecord,
} from "../../../application/classSetupStore";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Row, Txt } from "../../../shared/ui/Primitives";
import { Dialog } from "../../../shared/ui/Dialog";
import { Select } from "../../../shared/ui/Select";
import { UserForm } from "./SurveillanceUserForm";
import { SurveillanceUserBulkUpload } from "./SurveillanceUserBulkUpload";
import type { ClassSetupRequest } from "./ClassSetupDialog";
export function SurveillanceUserDialog({
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
    ["Across campuses", "All customers"].includes(workspace.scope)
      ? ""
      : workspace.scope,
  );
  const [error, setError] = useState("");
  const target = rows.find((row) => row.id === request.recordId);
  const editing = request.mode === "edit";
  const allowed =
    surveillanceEnabled(workspace, page.id) && (!request.recordId || !!target);
  const save = (forms: SurveillanceUser[], source: string) => {
    if (!allowed || !forms.length || (editing && !target)) return;
    if (!editing && !scopes.includes(scope)) {
      setError("Choose the campus or academic scope first.");
      return;
    }
    const taken = listedIdentities(rows.filter((row) => row.id !== target?.id));
    const uids = new Set(taken.uids),
      emails = new Set(taken.emails);
    for (const form of forms) {
      const problems = Object.values(validateUser(form));
      if (problems.length) {
        setError(problems.join(". "));
        return;
      }
      const uid = form.uid.trim().toLowerCase(),
        email = form.email.trim().toLowerCase();
      if (uids.has(uid) || (email && emails.has(email))) {
        setError("A user with this UID or email already exists.");
        return;
      }
      uids.add(uid);
      if (email) emails.add(email);
    }
    const recordScope =
      target?.scope ??
      (scopes.some((value) =>
        ["Across campuses", "All customers"].includes(value),
      )
        ? [
            scopes.find((value) =>
              ["Across campuses", "All customers"].includes(value),
            )!,
            scope,
          ]
        : [scope]);
    const records = forms.map((form) =>
      userRecord(
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
        ? "User changes saved for this session."
        : records.length + " user(s) added for this session.",
    );
  };
  return (
    <Dialog
      title={
        request.mode === "menu"
          ? "User actions"
          : request.mode === "bulk"
            ? "Bulk upload users"
            : request.mode === "delete"
              ? "Delete user"
              : editing
                ? "Edit user"
                : "Add user"
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
          <Txt color={c.muted}>This removes the user from this session.</Txt>
          <Row style={{ justifyContent: "flex-end" }}>
            <Button label="Cancel" onPress={onClose} />
            <Button
              label="Delete"
              variant="primary"
              onPress={() => {
                storeDeletedRecord(storeKey, target.id);
                onSaved("User removed from this session.");
              }}
            />
          </Row>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <Txt size={12} color={c.muted}>
            Changes are kept for this session. The user service is not
            connected.
          </Txt>
          {!editing &&
            ["Across campuses", "All customers"].includes(workspace.scope) && (
              <Select
                label={
                  workspace.role === "vizenta_admin" ? "Customer" : "Campus"
                }
                value={scope}
                options={[
                  { label: "Choose scope", value: "" },
                  ...scopes
                    .filter(
                      (value) =>
                        !["Across campuses", "All customers"].includes(value),
                    )
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
            <SurveillanceUserBulkUpload
              existing={listedIdentities(rows)}
              onSave={save}
              onCancel={onClose}
            />
          ) : (
            <UserForm
              taken={listedIdentities(
                rows.filter((row) => row.id !== target?.id),
              )}
              initial={
                editing && target
                  ? { ...(target.setup as SurveillanceUser) }
                  : undefined
              }
              submitLabel={editing ? "Save changes" : "Add user"}
              onSave={(form) =>
                save([form], editing ? "User edited" : "User created")
              }
              onCancel={onClose}
            />
          )}
        </View>
      )}
    </Dialog>
  );
}
