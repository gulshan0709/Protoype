import type {
  DataRecord,
  PageContract,
  Workspace,
} from "../../../../domain/contracts/types";
import type { SetupKind } from "../../../../domain/classes/setup";

/** What the workspace screen asks a setup dialog to show. */
export interface SetupRequest {
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
export type SetupMode = SetupRequest["mode"];

/** Props every setup dialog takes (the screen picks the dialog by page). */
export interface SetupDialogProps {
  request: SetupRequest;
  onRequest: (request: SetupRequest) => void;
  page: PageContract;
  rows: DataRecord[];
  workspace: Workspace;
  scopes: string[];
  actor: string;
  storeKey: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}
