import React, { useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  Share,
  View,
  useWindowDimensions,
} from "react-native";
import type { DataRecord } from "../../../domain/contracts/types";
import { cellText } from "../../../domain/contracts/logic";
import { useTheme } from "../../../shared/theme/Theme";
import { Field, Row, Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { RefButton } from "./referenceUi";
import {
  NOUN,
  storeLearners,
  useSetupState,
  type Learner,
  type SetupKind,
} from "./ClassSetup";

// Row "⋮" menu for class and lab rows (legacy ClassStructure.jsx
// ThreeDotsMenu: Learners, Edit, Delete).

export type RowAction = "learners" | "edit" | "delete" | "mark" | "register";
const ITEMS: [RowAction, string][] = [
  ["register", "Register"],
  ["mark", "Mark attendance"],
  ["learners", "Learners"],
  ["edit", "Edit"],
  ["delete", "Delete"],
];

/** "⋮" button with a dropdown anchored below it (web, iOS and Android). */
export function RowActionsMenu({
  title,
  onAction,
  actions = ["learners", "edit", "delete"],
}: {
  title: string;
  onAction: (action: RowAction) => void;
  actions?: RowAction[];
}) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const anchor = useRef<View>(null);
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const open = () =>
    anchor.current?.measureInWindow((x, y, w, h) =>
      setAt({ top: y + h + 4, right: Math.max(8, width - (x + w)) }),
    );
  return (
    <>
      <Pressable
        ref={anchor}
        accessibilityRole="button"
        accessibilityLabel={`More actions for ${title}`}
        onPress={open}
        hitSlop={6}
        style={({ hovered }: any) => ({
          width: 30,
          height: 32,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: hovered ? c.primarySoft : "transparent",
        })}
      >
        <Icon name="more" size={18} color={c.text} />
      </Pressable>
      <Modal
        transparent
        visible={!!at}
        animationType="none"
        onRequestClose={() => setAt(null)}
      >
        <Pressable
          accessibilityLabel="Close menu"
          style={{ flex: 1 }}
          onPress={() => setAt(null)}
        >
          {at && (
            <View
              accessibilityRole="menu"
              style={{
                position: "absolute",
                top: at.top,
                right: at.right,
                minWidth: 150,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surface,
                boxShadow: "0 4px 16px rgba(6,30,50,0.2)",
              }}
            >
              {ITEMS.filter(([id]) => actions.includes(id)).map(
                ([id, label]) => (
                  <Pressable
                    key={id}
                    accessibilityRole="menuitem"
                    accessibilityLabel={label}
                    onPress={() => {
                      setAt(null);
                      onAction(id);
                    }}
                    style={({ hovered, pressed }: any) => ({
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      backgroundColor:
                        hovered || pressed ? c.primarySoft : "transparent",
                    })}
                  >
                    <Txt
                      size={13}
                      color={id === "delete" ? c.critical : c.text}
                    >
                      {label}
                    </Txt>
                  </Pressable>
                ),
              )}
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

/** Legacy "Confirm to Delete" dialog body. */
export function ConfirmDelete({
  kind,
  title,
  onConfirm,
  onCancel,
}: {
  kind: SetupKind;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 16 }}>
      <Txt size={13}>
        Are you sure you want to delete the {NOUN[kind].one}{" "}
        <Txt size={13} bold>
          {title}
        </Txt>
        ?
      </Txt>
      <Txt size={11} color={c.muted}>
        It is removed from this list for the current session. No class service
        is connected yet, so nothing is deleted at the source.
      </Txt>
      <Row style={{ justifyContent: "flex-end", gap: 8 }}>
        <RefButton label="Cancel" onPress={onCancel} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete"
          onPress={onConfirm}
          style={{
            height: 34,
            paddingHorizontal: 14,
            borderRadius: 8,
            backgroundColor: c.critical,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt size={12} bold color={c.white}>
            Delete
          </Txt>
        </Pressable>
      </Row>
    </View>
  );
}

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
  if (Platform.OS !== "web") {
    void Share.share({ title: `${name} learners`, message: csv });
    return;
  }
  const url = URL.createObjectURL(
    new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.replace(/[^\w-]+/g, "_")}_learners.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  const learners = useSetupState().learners[storeKey] ?? [];
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
            in this session
            {roster ? ` · source roster ${roster}` : ""}
          </Txt>
        </View>
        <Row style={{ gap: 8 }}>
          <RefButton
            label="Download"
            icon="download"
            kind="export"
            onPress={() => exportLearners(title, learners)}
          />
          <RefButton label="Back" icon="back" onPress={onClose} />
        </Row>
      </Row>
      <Txt size={11} color={c.muted}>
        The SIS roster connector is not connected in this build, so learners
        from the source roster are not listed here. Learners you map are kept
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
              <Txt size={12} bold style={{ minWidth: 70 }}>
                {l.uid}
              </Txt>
              <Txt size={12} style={{ flexGrow: 1, flexBasis: 120 }}>
                {l.name}
              </Txt>
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
        <RefButton
          label="Map learner"
          icon="plus"
          kind="primary"
          onPress={add}
        />
      </Row>
    </View>
  );
}
