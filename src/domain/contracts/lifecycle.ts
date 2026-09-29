import type {
  Action,
  AuditEvent,
  DataRecord,
  Status,
  Workspace,
} from "./types";
const transitions: Record<string, Status> = {
  ack: { label: "Acknowledged", tone: "pending" },
  acknowledge: { label: "Acknowledged", tone: "pending" },
  assign: { label: "Assigned", tone: "pending" },
  "assign-owner": { label: "Assigned", tone: "pending" },
  escalate: { label: "Escalated", tone: "critical" },
  resolve: { label: "Resolved", tone: "complete" },
  "reconcile-checkout": { label: "Checked out", tone: "complete" },
};
export function transitionFor(action: Action) {
  return transitions[action.id];
}
/** Same industry, role and scope: audit entries and local edits belong to one workspace. */
export const sameWorkspace = (a: Workspace, b: Workspace) =>
  a.industry === b.industry && a.role === b.role && a.scope === b.scope;
// Facts and section items that show the record's status.
const STATUS_LABEL = /^(status|state|lifecycle|current state)$/i;
export function localRecord(
  record: DataRecord,
  pageId: string,
  workspace: Workspace,
  audit: AuditEvent[],
): DataRecord {
  const event = audit.find(
    (e) =>
      e.recordId === record.id &&
      e.pageId === pageId &&
      sameWorkspace(e.workspace, workspace) &&
      e.actionId &&
      transitions[e.actionId],
  );
  // Source uncertainty must never turn into a safe conclusion through a local action.
  if (!event || record.state.tone === "unavailable") return record;
  const state = transitions[event.actionId!];
  return {
    ...record,
    state,
    sourceState: record.state,
    localWorkflow: true,
    detail: {
      ...record.detail,
      facts: record.detail.facts.map((f) =>
        STATUS_LABEL.test(f.label)
          ? { ...f, value: state.label }
          : f,
      ),
      sections: record.detail.sections.map((s) => ({
        ...s,
        items: s.items.map((item) =>
          STATUS_LABEL.test(item.label)
            ? { ...item, value: state.label, tone: state.tone }
            : item,
        ),
      })),
      permittedActions: record.detail.permittedActions.filter(
        (a) => state.tone !== "complete" || !transitions[a.id],
      ),
    },
    cells: Object.fromEntries(
      Object.entries(record.cells).map(([key, value]) => [
        key,
        /^(state|status|lifecycle)$/i.test(key) ? state.label : value,
      ]),
    ),
  };
}
