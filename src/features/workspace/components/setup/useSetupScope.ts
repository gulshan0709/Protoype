import { useState } from "react";
import type { DataRecord, Workspace } from "../../../../domain/contracts/types";
import { isAggregateScope } from "../../../../domain/contracts/logic";

/**
 * The scope a setup dialog saves to, and its error line. In an all-campuses
 * or all-customers view a new record first needs one place; an edit keeps its
 * record's scope.
 */
export function useSetupScope({
  workspace,
  scopes,
  target,
  editing,
}: {
  workspace: Workspace;
  scopes: string[];
  /** The record being changed, if any. */
  target?: DataRecord;
  editing: boolean;
}) {
  const aggregate = isAggregateScope(workspace.scope);
  const allScope = scopes.find(isAggregateScope);
  const unit = workspace.role === "vizenta_admin" ? "customer" : "campus";
  const [scope, setScopeValue] = useState(aggregate ? "" : workspace.scope);
  const [error, setError] = useState("");
  return {
    scope,
    /** Picks the scope and clears the error an earlier save left. */
    setScope: (value: string) => {
      setScopeValue(value);
      setError("");
    },
    error,
    setError,
    showPicker: !editing && aggregate,
    unit,
    /** The places the picker offers. */
    choices: scopes.filter((value) => !isAggregateScope(value)),
    /** False, showing `message`, while a new record has no scope. */
    requireScope: (message = `Choose the ${unit} or academic scope first.`) => {
      if (editing || scopes.includes(scope)) return true;
      setError(message);
      return false;
    },
    /** A new record is also listed in the role's aggregate view. */
    recordScope: () =>
      target?.scope ?? (allScope ? [allScope, scope] : [scope]),
  };
}
export type SetupScope = ReturnType<typeof useSetupScope>;
