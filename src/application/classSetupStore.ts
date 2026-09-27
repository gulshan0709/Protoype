import { useSyncExternalStore } from "react";
import type { DataRecord } from "../domain/contracts/types";
import type { Learner } from "../domain/classes/setup";

// Session changes to class and lab pages, keyed by industry, role and page. Kept outside any
// screen because every navigation mounts a new screen instance (list →
// detail). No class service is connected yet, so nothing is persisted.
interface SetupState {
  added: Record<string, DataRecord[]>;
  edited: Record<string, Record<string, DataRecord>>;
  deleted: Record<string, string[]>;
  learners: Record<string, Learner[]>;
}
let setupState: SetupState = {
  added: {},
  edited: {},
  deleted: {},
  learners: {},
};
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const update = (next: Partial<SetupState>) => {
  setupState = { ...setupState, ...next };
  listeners.forEach((l) => l());
};
export function useSetupState(): SetupState {
  return useSyncExternalStore(subscribe, () => setupState);
}
export function storeAddedClasses(pageId: string, records: DataRecord[]) {
  update({
    added: {
      ...setupState.added,
      [pageId]: [...records, ...(setupState.added[pageId] ?? [])],
    },
  });
}
export function storeEditedRecord(pageId: string, record: DataRecord) {
  const added = setupState.added[pageId] ?? [];
  if (added.some((r) => r.id === record.id))
    update({
      added: {
        ...setupState.added,
        [pageId]: added.map((r) => (r.id === record.id ? record : r)),
      },
    });
  else
    update({
      edited: {
        ...setupState.edited,
        [pageId]: { ...setupState.edited[pageId], [record.id]: record },
      },
    });
}
export function storeDeletedRecord(pageId: string, id: string) {
  update({
    added: {
      ...setupState.added,
      [pageId]: (setupState.added[pageId] ?? []).filter((r) => r.id !== id),
    },
    deleted: {
      ...setupState.deleted,
      [pageId]: [...(setupState.deleted[pageId] ?? []), id],
    },
  });
}
export function storeLearners(key: string, list: Learner[]) {
  update({ learners: { ...setupState.learners, [key]: list } });
}
/** Session-added rows first, then contract rows with edits and deletions. */
export function applySetup(
  state: SetupState,
  pageId: string,
  scope: string,
  contractRows: DataRecord[],
): DataRecord[] {
  const deleted = new Set(state.deleted[pageId] ?? []);
  const edited = state.edited[pageId] ?? {};
  return [
    ...(state.added[pageId] ?? []).filter((r) => r.scope.includes(scope)),
    ...contractRows
      .filter((r) => !deleted.has(r.id))
      .map((r) => edited[r.id] ?? r),
  ];
}
