import { useCallback, useMemo, useState } from "react";
import { Pressable } from "react-native";
import { useApp } from "../../../application/AppProvider";
import {
  getBranch,
  getPage,
  visibleProducts,
} from "../../../domain/contracts/registry";
import { filterRecords, scopedRecords } from "../../../domain/contracts/logic";
import type {
  DataRecord,
  Location,
  PageContract,
  Persona,
  Workspace,
} from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Row,
  Txt,
} from "../../../shared/ui/Primitives";
import { PersonOr } from "./PersonChip";

/** Dialog titles of the workspace's menus and panels, by modal name. */
export const DIALOG_TITLES: Record<string, string> = {
  workspace: "Your workspaces",
  assistant: "Ask Vizenta",
  settings: "Settings & preferences",
  notifications: "Your updates",
  help: "How can we help?",
  apps: "Your applications",
  search: "Search your workspace",
  export: "Export records",
  action: "Review action",
  menu: "Explore workspace",
};

/**
 * A record in a list: its person (or title), where it is, and its status.
 * Search results are outlined; notifications are filled, tinted while unread.
 */
export function RecordListItem({
  record,
  subtitle,
  onPress,
  unread,
}: {
  record: DataRecord;
  subtitle: string;
  onPress: () => void;
  unread?: boolean;
}) {
  const c = useTheme();
  const notification = unread !== undefined;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={
        notification
          ? {
              padding: 17,
              borderRadius: 12,
              backgroundColor: unread ? c.primarySoft : c.background,
              gap: 8,
            }
          : {
              padding: 16,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
              gap: 5,
            }
      }
    >
      <PersonOr record={record}>
        <Txt size={13} bold>
          {record.detail.title}
        </Txt>
      </PersonOr>
      <Txt size={12} color={c.muted}>
        {subtitle}
      </Txt>
      <Badge label={record.state.label} tone={record.state.tone} />
    </Pressable>
  );
}

export interface SearchHit {
  record: DataRecord;
  location: Location;
}
/** The first 12 records across every view the role may open. */
function searchWorkspace(workspace: Workspace, role: Persona, text: string) {
  if (text.trim().length < 2) return [];
  const hits: SearchHit[] = [];
  for (const type of ["org", "product"] as const)
    for (const name of type === "org"
      ? role.organization
      : visibleProducts(workspace)) {
      const branch = getBranch(workspace, type, name);
      for (const tab of Object.keys(branch ?? {})) {
        const location = { type, name, tab };
        const page = getPage(workspace, location);
        if (!page) continue;
        for (const record of filterRecords(
          scopedRecords(page, workspace.scope),
          text,
          {},
        )) {
          hits.push({ record, location });
          if (hits.length >= 12) return hits;
        }
      }
    }
  return hits;
}

/**
 * Search across the workspace. It owns its query, so typing re-renders only
 * this panel; `memory` keeps the last query for the next time it opens.
 */
export function SearchPanel({
  workspace,
  role,
  roleName,
  memory,
  onOpen,
}: {
  workspace: Workspace;
  role: Persona;
  roleName: string;
  memory: { current: string };
  onOpen: (hit: SearchHit) => void;
}) {
  const c = useTheme();
  const [search, setSearch] = useState(memory.current);
  const results = useMemo(
    () => searchWorkspace(workspace, role, search),
    [workspace, role, search],
  );
  return (
    <>
      <Field
        label="Search all entitled views"
        value={search}
        onChange={(text) => {
          memory.current = text;
          setSearch(text);
        }}
        placeholder="Try a campus, person, incident or reference…"
      />
      <Txt size={12} color={c.muted}>
        Results are limited to {roleName} · {workspace.scope}.
      </Txt>
      {search.length < 2 ? (
        <Txt color={c.muted}>Enter at least 2 characters to search.</Txt>
      ) : results.length ? (
        results.map((hit, i) => (
          <RecordListItem
            key={`${hit.record.id}-${i}`}
            record={hit.record}
            subtitle={`${hit.location.name} / ${hit.location.tab}`}
            onPress={() => onOpen(hit)}
          />
        ))
      ) : (
        <EmptyState
          title="No results found"
          description="Try a different name or reference within your assigned scope."
        />
      )}
    </>
  );
}

export function ExportPanel({
  page,
  count,
  scope,
  onExport,
}: {
  page: PageContract;
  count: number;
  scope: string;
  onExport: () => void;
}) {
  const c = useTheme();
  return (
    <>
      <Badge label="CSV export" tone="healthy" />
      <Txt size={20} bold>
        Take your current view with you.
      </Txt>
      <Txt color={c.muted}>
        {count} records from {page.heading}. Only the current scope and filters
        are included.
      </Txt>
      <Card style={{ gap: 10 }}>
        <Txt size={12}>Scope · {scope}</Txt>
        <Txt size={12}>
          Fields · {page.columns.map((col) => col.label).join(", ")}, status,
          record ID
        </Txt>
      </Card>
      <Button
        label="Export CSV"
        icon="download"
        variant="primary"
        onPress={onExport}
      />
    </>
  );
}

/** Record tones listed under Your updates. */
const UPDATE_TONES = ["critical", "attention", "unavailable"];

/** A page's updates (its critical, attention and unavailable records) and which ones were read. */
export function useUpdates(
  rows: DataRecord[],
  workspace: Workspace,
  pageId: string | undefined,
) {
  const { readNotifications, update } = useApp();
  const updates = useMemo(
    () => rows.filter((r) => UPDATE_TONES.includes(r.state.tone)),
    [rows],
  );
  // Read state is kept per workspace, scope and page.
  const keyOf = useCallback(
    (r: DataRecord) =>
      [workspace.industry, workspace.role, workspace.scope, pageId, r.id].join(
        ":",
      ),
    [workspace, pageId],
  );
  const read = useMemo(() => new Set(readNotifications), [readNotifications]);
  const unread = useMemo(
    () => updates.some((r) => !read.has(keyOf(r))),
    [updates, read, keyOf],
  );
  return {
    updates,
    unread,
    isRead: (r: DataRecord) => read.has(keyOf(r)),
    markRead: (records: DataRecord[]) =>
      update({
        readNotifications: [...new Set([...read, ...records.map(keyOf)])],
      }),
  };
}

export function NotificationsPanel({
  notifications,
  isRead,
  onMarkAll,
  onOpen,
}: {
  notifications: DataRecord[];
  isRead: (record: DataRecord) => boolean;
  onMarkAll: () => void;
  onOpen: (record: DataRecord) => void;
}) {
  const c = useTheme();
  return (
    <>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt size={12} color={c.muted}>
          Updates in this view
        </Txt>
        <Button compact label="Mark all as read" onPress={onMarkAll} />
      </Row>
      {notifications.length ? (
        notifications.map((r) => (
          <RecordListItem
            key={r.id}
            record={r}
            subtitle={r.detail.summary}
            unread={!isRead(r)}
            onPress={() => onOpen(r)}
          />
        ))
      ) : (
        <EmptyState
          title="You're all caught up"
          description="No attention items in this view."
          icon="check"
        />
      )}
    </>
  );
}

export function AppsPanel({
  workforce,
  onHome,
  onWorkforce,
}: {
  /** Whether Workforce Attendance is entitled for this industry and role. */
  workforce: boolean;
  onHome: () => void;
  onWorkforce: () => void;
}) {
  const c = useTheme();
  return (
    <>
      <Txt color={c.muted}>A connected workspace for your organization.</Txt>
      <Button
        label="Vizenta Vision · Presence, Safety & Insights"
        icon="grid"
        onPress={onHome}
      />
      <Button
        label="Workforce & HRMS"
        icon="users"
        disabled={!workforce}
        onPress={onWorkforce}
      />
      {!workforce && (
        <Txt size={12} color={c.muted}>
          Workforce & HRMS is not entitled for this industry and role.
        </Txt>
      )}
    </>
  );
}

const HELP = [
  [
    "Finding your way",
    "Use Presence for verified observations, Safety for incident and response workflows, and Insights for permitted analysis.",
  ],
  [
    "Changing your workspace",
    "Open the organization selector to choose your industry, role, and scope. Scope controls which records you can see.",
  ],
  [
    "Reviewing a record",
    "Select a row or card to open its facts, history and permitted actions. A saved review appears in the activity trail.",
  ],
  [
    "Understanding sources",
    "Source panels disclose freshness and decision impact. Unavailable data stays unknown and never becomes a safe or zero result.",
  ],
];

export function HelpPanel() {
  const c = useTheme();
  return (
    <>
      <Txt size={21} bold>
        Make yourself at home.
      </Txt>
      {HELP.map(([title, body]) => (
        <Card key={title} style={{ gap: 8 }}>
          <Txt size={14} bold>
            {title}
          </Txt>
          <Txt size={12} color={c.muted}>
            {body}
          </Txt>
        </Card>
      ))}
    </>
  );
}
