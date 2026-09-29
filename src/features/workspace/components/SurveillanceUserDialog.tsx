import { useMemo } from "react";
import { View } from "react-native";
import {
  userRecord,
  listedIdentities,
  validateUser,
  surveillanceEnabled,
  type SurveillanceUser,
} from "../../../domain/surveillance/setup";
import {
  storeDeletedRecord,
  storeSetupRecords,
} from "../../../application/classSetupStore";
import { Txt } from "../../../shared/ui/Primitives";
import { Dialog } from "../../../shared/ui/Dialog";
import { ErrorText } from "../../../shared/ui/Form";
import { UserForm } from "./SurveillanceUserForm";
import { SurveillanceUserBulkUpload } from "./SurveillanceUserBulkUpload";
import type { SetupDialogProps } from "./setup/types";
import { useSetupScope } from "./setup/useSetupScope";
import {
  DeleteConfirm,
  RecordMenu,
  ScopePicker,
  SessionNotice,
  setupTitle,
} from "./setup/SetupDialogParts";

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
}: SetupDialogProps) {
  const target = rows.find((row) => row.id === request.recordId);
  const editing = request.mode === "edit";
  const setup = useSetupScope({ workspace, scopes, target, editing });
  // Stable between renders, so the upload does not re-check its file.
  const existing = useMemo(() => listedIdentities(rows), [rows]);
  // The edited user may keep their own UID and email.
  const taken = useMemo(
    () => listedIdentities(rows.filter((row) => row.id !== target?.id)),
    [rows, target],
  );
  const allowed =
    surveillanceEnabled(workspace, page.id) && (!request.recordId || !!target);
  const save = (forms: SurveillanceUser[], source: string) => {
    if (!allowed || !forms.length || (editing && !target)) return;
    if (!setup.requireScope("Choose the campus or academic scope first."))
      return;
    const uids = new Set(taken.uids),
      emails = new Set(taken.emails);
    for (const form of forms) {
      const problems = Object.values(validateUser(form));
      if (problems.length) {
        setup.setError(problems.join(". "));
        return;
      }
      const uid = form.uid.trim().toLowerCase(),
        email = form.email.trim().toLowerCase();
      if (uids.has(uid) || (email && emails.has(email))) {
        setup.setError("A user with this UID or email already exists.");
        return;
      }
      uids.add(uid);
      if (email) emails.add(email);
    }
    const records = forms.map((form) =>
      userRecord(
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
        ? "User changes saved for this session."
        : records.length + " user(s) added for this session.",
    );
  };
  return (
    <Dialog
      title={setupTitle(
        request.mode,
        { one: "user", many: "users" },
        "User actions",
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
          note="This removes the user from this session."
          onCancel={onClose}
          onConfirm={() => {
            storeDeletedRecord(storeKey, target.id);
            onSaved("User removed from this session.");
          }}
        />
      ) : (
        <View style={{ gap: 14 }}>
          <SessionNotice detail="The user service is not connected." />
          <ScopePicker scope={setup} placeholder="Choose scope" />
          <ErrorText size={14}>{setup.error}</ErrorText>
          {request.mode === "bulk" ? (
            <SurveillanceUserBulkUpload
              existing={existing}
              onSave={save}
              onCancel={onClose}
            />
          ) : (
            <UserForm
              taken={taken}
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
