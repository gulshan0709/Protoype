import { PersonChip } from "./PersonChip";
import React, { useState } from "react";
import { View, Pressable } from "react-native";
import type { DataRecord } from "../../../domain/contracts/types";
import { cellText } from "../../../domain/contracts/logic";
import {
  NOUN,
  type Learner,
  type SetupKind,
} from "../../../domain/classes/setup";
import {
  storeLearners,
  useSetupState,
} from "../../../application/classSetupStore";
import { useTheme } from "../../../shared/theme/Theme";
import { Button, Field, Row, Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { saveCsv } from "../../../shared/files/classCsv";

/** Roster figure shown by the table row, if the page has one. */
function rosterOf(record: DataRecord): string | undefined {
  for (const key of ["roster", "expected", "attendance"]) {
    const v = record.cells[key];
    if (v !== undefined && cellText(v) !== "—") return cellText(v);
  }
  return undefined;
}

function exportLearners(name: string, learners: Learner[]) {
  const quote = (v: string) =>
    '"' + (/^[=+\-@]/.test(v) ? "'" + v : v).replaceAll('"', '""') + '"';
  const csv = [
    ["UID", "Name", "Email"],
    ...learners.map((l) => [l.uid, l.name, l.email]),
  ]
    .map((r) => r.map(quote).join(","))
    .join("\r\n");
  saveCsv("class_learners.csv", `${name} learners`, csv);
}

/** Learners mapped to a class or lab (legacy Mappedlearnerinclass.jsx). */
export function ClassLearners({
  storeKey,
  record,
  kind,
  onClose,
}: {
  storeKey: string;
  record: DataRecord;
  kind: SetupKind;
  onClose: () => void;
}) {
  const c = useTheme();
  const learners =
    useSetupState().learners[storeKey] ??
    (record.demoLearners as Learner[] | undefined) ??
    [];
  const [draft, setDraft] = useState({ uid: "", name: "", email: "" });
  const [error, setError] = useState("");
  const roster = rosterOf(record);
  const title = record.detail.title;
  const add = () => {
    const uid = draft.uid.trim();
    const name = draft.name.trim();
    const email = draft.email.trim();
    if (!uid || !name) return setError("UID and name are required.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError("Enter a valid email.");
    if (learners.some((l) => l.uid.toLowerCase() === uid.toLowerCase()))
      return setError(
        `UID ${uid} is already mapped to this ${NOUN[kind].one}.`,
      );
    storeLearners(storeKey, [...learners, { uid, name, email }]);
    setDraft({ uid: "", name: "", email: "" });
    setError("");
  };
  return (
    <View style={{ gap: 14 }}>
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <View style={{ flexShrink: 1, gap: 2 }}>
          <Txt size={15} bold>
            {title}
          </Txt>
          <Txt size={11} color={c.muted}>
            {learners.length} learner{learners.length === 1 ? "" : "s"} mapped
            {roster ? ` · source roster ${roster}` : ""}
          </Txt>
        </View>
        <Row style={{ gap: 8 }}>
          <Button
            compact
            label="Download"
            icon="download"

            onPress={() => exportLearners(title, learners)}
          />
          <Button compact label="Back" icon="back" onPress={onClose} />
        </Row>
      </Row>
      <Txt size={11} color={c.muted}>
        Manage the learners assigned to this {NOUN[kind].one}. Changes are kept
        for this session.
      </Txt>
      <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 8 }}>
        {learners.length ? (
          learners.map((l, i) => (
            <Row
              key={l.uid}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderTopWidth: i ? 1 : 0,
                borderColor: c.border,
                flexWrap: "wrap",
              }}
            >
              <View style={{ flexGrow: 1, flexBasis: 180, minWidth: 0 }}>
                <PersonChip name={l.name} uid={l.uid} />
              </View>
              <Txt
                size={12}
                color={c.muted}
                style={{ flexGrow: 1, flexBasis: 160 }}
              >
                {l.email || "—"}
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${l.name}`}
                hitSlop={8}
                onPress={() =>
                  storeLearners(
                    storeKey,
                    learners.filter((x) => x.uid !== l.uid),
                  )
                }
              >
                <Icon name="close" size={15} color={c.muted} />
              </Pressable>
            </Row>
          ))
        ) : (
          <Txt
            size={12}
            color={c.muted}
            style={{ padding: 14, textAlign: "center" }}
          >
            No learners mapped yet.
          </Txt>
        )}
      </View>
      <Txt size={12} bold>
        Map a learner
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <View style={{ flexGrow: 1, flexBasis: 110 }}>
          <Field
            label="UID *"
            value={draft.uid}
            onChange={(uid) => setDraft((d) => ({ ...d, uid }))}
            placeholder="e.g. 24031"
          />
        </View>
        <View style={{ flexGrow: 2, flexBasis: 180 }}>
          <Field
            label="Name *"
            value={draft.name}
            onChange={(name) => setDraft((d) => ({ ...d, name }))}
            placeholder="e.g. Aarav Mehta"
          />
        </View>
        <View style={{ flexGrow: 2, flexBasis: 200 }}>
          <Field
            label="Email"
            value={draft.email}
            onChange={(email) => setDraft((d) => ({ ...d, email }))}
            placeholder="learner@college.edu"
          />
        </View>
      </View>
      {!!error && (
        <Txt size={12} color={c.critical}>
          {error}
        </Txt>
      )}
      <Row style={{ justifyContent: "flex-end" }}>
        <Button
          compact
          label="Map learner"
          icon="plus"
          variant="primary"
          onPress={add}
        />
      </Row>
    </View>
  );
}
