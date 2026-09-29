import { View } from "react-native";
import type { DataRecord } from "../../../domain/contracts/types";
import { industries } from "../../../domain/contracts/registry";
import {
  scopedRecords,
  cellText,
  isAggregateScope,
} from "../../../domain/contracts/logic";
import {
  applySetup,
  setupStoreKey,
  storeDeletedRecord,
  storeSetupRecords,
  useSetupState,
} from "../../../application/classSetupStore";
import {
  residenceSetupEnabled,
  wardenFromRecord,
  hostelFromRecord,
  leaveFromRecord,
  wardenRecord,
  hostelRecord,
  leaveRecord,
  leaveEditable,
} from "../../../domain/residence/setup";
import { Txt } from "../../../shared/ui/Primitives";
import { Dialog } from "../../../shared/ui/Dialog";
import { ErrorText } from "../../../shared/ui/Form";
import { WardenForm, HostelForm, LeaveForm } from "./WardenSetup";
import type { SetupDialogProps } from "./setup/types";
import { useSetupScope } from "./setup/useSetupScope";
import {
  DeleteConfirm,
  RecordMenu,
  ScopePicker,
  SessionNotice,
  setupTitle,
} from "./setup/SetupDialogParts";

export function ResidenceSetupDialog({
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
  const state = useSetupState();
  const kind = page.detailType;
  const target = rows.find((row) => row.id === request.recordId);
  const editing = request.mode === "edit";
  const setup = useSetupScope({ workspace, scopes, target, editing });
  const allowed =
    residenceSetupEnabled(workspace, page.id) &&
    (!request.recordId || !!target) &&
    !(target && kind === "leave" && !leaveEditable(target));
  // Hostels, wardens and students offered by the forms: the record's place,
  // else the chosen scope, else the workspace's.
  const relatedScope =
    target?.scope.find((s) => !isAggregateScope(s)) ||
    setup.scope ||
    workspace.scope;
  const related = (tab: string) => {
    const p =
      industries[workspace.industry].pages[workspace.role].product.Warden?.[
        tab
      ];
    if (!p) return [];
    return applySetup(
      state,
      setupStoreKey(workspace, p.id),
      relatedScope,
      scopedRecords(p, relatedScope),
    );
  };
  // Other records only: the one being edited may keep its own name or email.
  const others = rows.filter((r) => r.id !== target?.id);
  const save = (build: (scope: string[]) => DataRecord) => {
    if (!allowed) return;
    if (!setup.requireScope("Choose a scope first.")) return;
    storeSetupRecords(storeKey, [build(setup.recordScope())], editing);
    onSaved("Changes saved for this session.");
  };
  const actorEvent = editing ? "Configuration updated" : "Record created";
  return (
    <Dialog
      title={setupTitle(request.mode, { one: kind })}
      onClose={onClose}
      wide={["add", "edit"].includes(request.mode)}
    >
      {!allowed ? (
        <Txt>
          This record cannot be changed in the current scope. Only pending leave
          can be changed.
        </Txt>
      ) : request.mode === "menu" && target ? (
        <RecordMenu
          target={target}
          person
          onPick={(mode) => onRequest({ ...request, mode })}
        />
      ) : request.mode === "delete" && target ? (
        <DeleteConfirm
          title={target.detail.title}
          note="This removes the record from this session."
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
          <ScopePicker scope={setup} label="Scope" placeholder="Choose scope" />
          <ErrorText size={14}>{setup.error}</ErrorText>
          {kind === "warden" ? (
            <WardenForm
              key={setup.scope}
              initial={editing && target ? wardenFromRecord(target) : undefined}
              hostelOptions={related("Hostels").map((r) =>
                cellText(r.cells.hostel),
              )}
              takenEmails={others.map((r) =>
                cellText(r.cells.email).trim().toLowerCase(),
              )}
              submitLabel={editing ? "Save changes" : "Add warden"}
              onCancel={onClose}
              onSave={(form) =>
                save((scope) =>
                  wardenRecord(page, form, scope, actor, actorEvent, target),
                )
              }
            />
          ) : kind === "hostel" ? (
            <HostelForm
              key={setup.scope}
              initial={editing && target ? hostelFromRecord(target) : undefined}
              wardenOptions={related("Wardens")
                .filter((r) => r.cells.designation !== "Sub Admin")
                .map((r) => cellText(r.cells.warden))}
              takenNames={others.map((r) =>
                cellText(r.cells.hostel).trim().toLowerCase(),
              )}
              submitLabel={editing ? "Save changes" : "Add hostel"}
              onCancel={onClose}
              onSave={(form) =>
                save((scope) =>
                  hostelRecord(page, form, scope, actor, actorEvent, target),
                )
              }
            />
          ) : (
            <LeaveForm
              key={setup.scope}
              initial={editing && target ? leaveFromRecord(target) : undefined}
              students={[
                ...new Set(
                  related("Leave Management").map((r) =>
                    cellText(r.cells.student),
                  ),
                ),
              ]}
              submitLabel={editing ? "Save changes" : "Create leave"}
              onCancel={onClose}
              onSave={(form) =>
                save((scope) =>
                  leaveRecord(page, form, scope, actor, actorEvent, target),
                )
              }
            />
          )}
        </View>
      )}
    </Dialog>
  );
}
