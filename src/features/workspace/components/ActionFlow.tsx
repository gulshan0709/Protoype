import React, { useState } from "react";
import { View } from "react-native";
import { useApp } from "../../../application/AppProvider";
import type {
  Action,
  DataRecord,
  PageContract,
} from "../../../domain/contracts/types";
import {
  actionKind,
  canAct,
  scopedRecords,
} from "../../../domain/contracts/logic";
import { transitionFor } from "../../../domain/contracts/lifecycle";
import { useTheme } from "../../../shared/theme/Theme";
import {
  Badge,
  Txt,
  Field,
  Button,
  Card,
  Row,
} from "../../../shared/ui/Primitives";
import { PersonOr } from "./PersonChip";
export function ActionFlow({
  action,
  record,
  page,
  onClose,
}: {
  action: Action;
  record?: DataRecord;
  page: PageContract;
  onClose: () => void;
}) {
  const c = useTheme();
  const { workspace, addAudit, notify } = useApp();
  const [reason, setReason] = useState("");
  const [owner, setOwner] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const inspect = actionKind(action) === "inspect";
  const transition =
    record?.state.tone !== "unavailable" ? transitionFor(action) : undefined;
  const needsOwner = /assign/.test(action.id);
  const submit = () => {
    if (reason.trim().length < 5) {
      setError("Add at least 5 characters explaining your decision.");
      return;
    }
    if (needsOwner && owner.trim().length < 2) {
      setError("Enter the accountable owner before saving.");
      return;
    }
    if (
      record
        ? !canAct(page, record.id, action.id, workspace)
        : page.primaryAction?.id !== action.id
    ) {
      setError("This action is not permitted in your current scope.");
      return;
    }
    if (
      record &&
      !record.detail.permittedActions.some((a) => a.id === action.id)
    ) {
      setError(
        "This workflow is complete. No further transition is available.",
      );
      return;
    }
    addAudit({
      recordId: record?.id ?? page.id,
      pageId: page.id,
      action: action.label,
      actionId: action.id,
      reason: (needsOwner ? `Owner: ${owner.trim()}. ` : "") + reason.trim(),
    });
    setDone(true);
    notify(
      transition
        ? `Workflow updated: ${transition.label}.`
        : "Your review was saved to the activity trail.",
    );
  };
  return done ? (
    <>
      <Badge
        label={transition ? transition.label : "Review saved"}
        tone="complete"
      />
      <Txt size={20} bold>
        Your next step is recorded.
      </Txt>
      <Txt color={c.muted}>
        {transition
          ? "The workflow status and activity trail have been updated."
          : "Your note is saved in the activity trail."}
      </Txt>
      <Button label="Back to workspace" variant="primary" onPress={onClose} />
    </>
  ) : (
    <>
      <Badge
        label={inspect ? "Record review" : "Review action"}
        tone="pending"
      />
      <PersonOr record={record}>
        <Txt size={18} bold>
          {record?.detail.title ?? page.heading}
        </Txt>
      </PersonOr>
      <Txt size={13} color={c.muted}>
        {record?.detail.summary ?? page.description}
      </Txt>
      <Card style={{ backgroundColor: c.hero, gap: 8 }}>
        <Txt size={12} bold>
          {action.label}
        </Txt>
        <Txt size={12} color={c.muted}>
          {transition
            ? `Update the workflow to ${transition.label} and add a note explaining your decision.`
            : "Review the source information, then record your decision."}
        </Txt>
        <Txt size={11} color={c.link}>
          Assigned scope · {workspace.scope}
        </Txt>
      </Card>
      {needsOwner && (
        <Field
          label="Accountable owner"
          value={owner}
          onChange={setOwner}
          placeholder="Owner name or team"
        />
      )}
      <Field
        label={
          action.requiresReason
            ? "Reason (required)"
            : "Decision or review note"
        }
        value={reason}
        onChange={setReason}
        multiline
        placeholder="Describe the next step and why it is needed…"
        error={error}
      />
      <Row style={{ justifyContent: "flex-end" }}>
        <Button label="Cancel" onPress={onClose} />
        <Button
          label={
            transition ? `Confirm ${action.label.toLowerCase()}` : "Save review"
          }
          variant="primary"
          onPress={submit}
        />
      </Row>
    </>
  );
}
