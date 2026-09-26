import React, { useState } from "react";
import { View } from "react-native";
import type {
  DataRecord,
  PageContract,
  Workspace,
} from "../../../domain/contracts/types";
import { industries } from "../../../domain/contracts/registry";
import { scopedRecords, cellText } from "../../../domain/contracts/logic";
import {
  applySetup,
  useSetupState,
  storeAddedClasses,
  storeEditedRecord,
  storeDeletedRecord,
} from "../../../application/classSetupStore";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Row, Txt } from "../../../shared/ui/Primitives";
import { Dialog } from "../../../shared/ui/Dialog";
import { Select } from "../../../shared/ui/Select";
import type { ClassSetupRequest } from "./ClassSetupDialog";
import { PersonOr } from "./PersonChip";
import {
  WardenForm,
  HostelForm,
  LeaveForm,
  wardenFromRecord,
  hostelFromRecord,
  leaveFromRecord,
  wardenRecord,
  hostelRecord,
  leaveRecord,
  leaveEditable,
} from "./WardenSetup";
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
  const state = useSetupState();
  const aggregate = ["Across campuses", "All customers"].includes(
    workspace.scope,
  );
  const [scope, setScope] = useState(aggregate ? "" : workspace.scope);
  const [error, setError] = useState("");
  const kind = page.detailType;
  const target = rows.find((row) => row.id === request.recordId);
  const editing = request.mode === "edit";
  const allowed =
    workspace.industry === "education" &&
    ["customer_admin", "vizenta_admin"].includes(workspace.role) &&
    /^(ca|va)-warden-(wardens|hostels|leaves)$/.test(page.id) &&
    (!request.recordId || !!target) &&
    !(target && kind === "leave" && !leaveEditable(target));
  const related = (tab: string) => {
    const p =
      industries[workspace.industry].pages[workspace.role].product.Warden?.[
        tab
      ];
    if (!p) return [];
    return applySetup(
      state,
      JSON.stringify([workspace.industry, workspace.role, p.id]),
      target?.scope.find(
        (s) => !["Across campuses", "All customers"].includes(s),
      ) ||
        scope ||
        workspace.scope,
      scopedRecords(
        p,
        target?.scope.find(
          (s) => !["Across campuses", "All customers"].includes(s),
        ) ||
          scope ||
          workspace.scope,
      ),
    );
  };
  const save = (build: (scope: string[]) => DataRecord) => {
    if (!allowed) return;
    if (!editing && !scopes.includes(scope)) {
      setError("Choose a scope first.");
      return;
    }
    const record = build(
      target?.scope ?? (aggregate ? [workspace.scope, scope] : [scope]),
    );
    if (editing) storeEditedRecord(storeKey, record);
    else storeAddedClasses(storeKey, [record]);
    onSaved("Changes saved for this session.");
  };
  const actorEvent = editing ? "Configuration updated" : "Record created";
  return (
    <Dialog
      title={
        request.mode === "menu"
          ? "Record actions"
          : request.mode === "delete"
            ? "Delete " + kind
            : (editing ? "Edit " : "Add ") + kind
      }
      onClose={onClose}
      wide={["add", "edit"].includes(request.mode)}
    >
      {!allowed ? (
        <Txt>
          This record cannot be changed in the current scope. Only pending leave
          can be changed.
        </Txt>
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
          <Txt color={c.muted}>This removes the record from this session.</Txt>
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
          {!editing && aggregate && (
            <Select
              label="Scope"
              value={scope}
              options={[
                { label: "Choose scope", value: "" },
                ...scopes
                  .filter(
                    (s) => !["Across campuses", "All customers"].includes(s),
                  )
                  .map((value) => ({ label: value, value })),
              ]}
              onChange={setScope}
            />
          )}
          {!!error && <Txt color={c.critical}>{error}</Txt>}
          {kind === "warden" ? (
            <WardenForm
              key={scope}
              initial={editing && target ? wardenFromRecord(target) : undefined}
              hostelOptions={related("Hostels").map((r) =>
                cellText(r.cells.hostel),
              )}
              takenEmails={rows
                .filter((r) => r.id !== target?.id)
                .map((r) => cellText(r.cells.email).trim().toLowerCase())}
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
              key={scope}
              initial={editing && target ? hostelFromRecord(target) : undefined}
              wardenOptions={related("Wardens")
                .filter((r) => r.cells.designation !== "Sub Admin")
                .map((r) => cellText(r.cells.warden))}
              takenNames={rows
                .filter((r) => r.id !== target?.id)
                .map((r) => cellText(r.cells.hostel).trim().toLowerCase())}
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
              key={scope}
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
