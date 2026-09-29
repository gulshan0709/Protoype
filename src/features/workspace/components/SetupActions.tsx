import type { ReactNode } from "react";
import { View } from "react-native";
import type { DataRecord } from "../../../domain/contracts/types";
import { CAMERA_ROW_TYPES } from "../../../domain/cameras/setup";
import { kindOf, type SetupKind } from "../../../domain/classes/setup";
import { Button, IconButton, Row } from "../../../shared/ui/Primitives";
import type { SetupRequest } from "./setup/types";
import { leaveEditable } from "./WardenSetup";

/** Add and Bulk upload above a setup page's records (a chooser when it has classes and labs). */
export function SetupActions({
  kinds,
  add,
  bulk,
  phone,
  onRequest,
}: {
  kinds: SetupKind[];
  add: boolean;
  bulk: boolean;
  phone: boolean;
  onRequest: (request: SetupRequest) => void;
}) {
  const many = kinds.length > 1;
  return (
    <Row style={{ flexWrap: "wrap", gap: 8 }}>
      {add && (
        <View style={{ flex: phone ? 1 : undefined }}>
          <Button
            compact={!phone}
            label="Add"
            icon="plus"
            variant="primary"
            onPress={() =>
              onRequest({ kind: kinds[0], mode: many ? "choose-add" : "add" })
            }
          />
        </View>
      )}
      {bulk && (
        <View style={{ flex: phone ? 1 : undefined }}>
          <Button
            compact={!phone}
            label="Bulk upload"
            icon="folder"
            onPress={() =>
              onRequest({
                kind: kinds[0],
                mode: many ? "choose-bulk" : "bulk",
              })
            }
          />
        </View>
      )}
    </Row>
  );
}

/**
 * The trailing action of each record row, if the page has one: Mark attendance
 * for absent people on gate attendance, else the setup menu of each editable
 * row (not closed leaves, not rows that are not cameras on camera pages).
 */
export function rowActionsFor({
  gateAttendance,
  kinds,
  residence,
  camera,
  onMark,
  onMenu,
}: {
  gateAttendance: boolean;
  kinds: SetupKind[];
  residence: boolean;
  camera: boolean;
  onMark: (recordId: string) => void;
  onMenu: (request: SetupRequest) => void;
}): ((row: DataRecord) => ReactNode) | undefined {
  if (gateAttendance)
    return (row) =>
      row.cells.status === "Absent" ? (
        <Button
          compact
          label="Mark attendance"
          onPress={() => onMark(row.id)}
        />
      ) : null;
  if (!kinds.length) return undefined;
  return (row) =>
    (residence && row.type === "leave" && !leaveEditable(row)) ||
    (camera && !CAMERA_ROW_TYPES.includes(row.type)) ? null : (
      <IconButton
        name="more"
        label={`Actions for ${row.detail.title}`}
        onPress={() =>
          onMenu({
            mode: "menu",
            kind: kindOf(row, kinds[0]),
            recordId: row.id,
          })
        }
      />
    );
}
