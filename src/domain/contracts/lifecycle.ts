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
      e.workspace.industry === workspace.industry &&
      e.workspace.role === workspace.role &&
      e.workspace.scope === workspace.scope &&
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
        /^(status|state|lifecycle|current state)$/i.test(f.label)
          ? { ...f, value: state.label }
          : f,
      ),
      sections: record.detail.sections.map((s) => ({
        ...s,
        items: s.items.map((item) =>
          /^(status|state|lifecycle|current state)$/i.test(item.label)
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
