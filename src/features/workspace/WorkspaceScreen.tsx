import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { View, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../application/AppProvider";
import {
  industries,
  homeLocation,
  getBranch,
  getPage,
  visibleProducts,
} from "../../domain/contracts/registry";
import {
  scopedRecords,
  filterRecords,
  actionKind,
  cellText,
} from "../../domain/contracts/logic";
import { localRecord } from "../../domain/contracts/lifecycle";
import type {
  Location,
  DataRecord,
  Action,
  Metric,
  PageContract,
  Workspace,
} from "../../domain/contracts/types";
import { useTheme } from "../../shared/theme/Theme";
import {
  Button,
  IconButton,
  Txt,
  Row,
  Card,
  Field,
  Badge,
  EmptyState,
  SectionTitle,
} from "../../shared/ui/Primitives";
import { BrandMark, Icon } from "../../shared/ui/Icon";
import { Dialog } from "../../shared/ui/Dialog";
import { Select } from "../../shared/ui/Select";
import { Navigation } from "./components/Navigation";
import { Metrics } from "./components/Metrics";
import { Records } from "./components/Records";
import { ContextPanels } from "./components/ContextPanels";
import { RecordDetail } from "./components/RecordDetail";
import { WorkspacePicker } from "./components/WorkspacePicker";
import { Assistant } from "./components/Assistant";
import { ActionFlow } from "./components/ActionFlow";
import { Settings } from "./components/Settings";
import { Login } from "./components/Login";
import { LaunchScreen } from "../../shared/ui/LaunchScreen";
import { MotionView } from "../../shared/motion/MotionView";
import { REF, RefButton, RefHeaderBox } from "./components/referenceUi";
import {
  ClassLearners,
  ConfirmDelete,
  RowActionsMenu,
} from "./components/RowActions";
import {
  CriteriaView,
  DashboardView,
  SetupCameraForm,
  SetupView,
  ShiftForm,
  setupCameraFromRecord,
  setupCameraRecord,
  shiftFromRecord,
  shiftRecord,
} from "./components/SetupTabs";
import { emptyUser } from "./components/SurveillanceUsers";
import {
  HostelForm,
  LeaveForm,
  WardenForm,
  hostelFromRecord,
  hostelMetrics,
  hostelRecord,
  leaveEditable,
  leaveFromRecord,
  leaveMetrics,
  leaveRecord,
  wardenFromRecord,
  wardenMetrics,
  wardenRecord,
} from "./components/WardenSetup";
import {
  MarkAttendanceForm,
  absentRowsFromUsers,
  attendanceMetrics,
  inOutMetrics,
  markedRecord,
} from "./components/GateAttendance";
import {
  BulkUploadUsers,
  UserForm,
  listedIdentities,
  userMetrics,
  userName,
  userRecord,
  type SurveillanceUser,
} from "./components/SurveillanceUsers";
import {
  AddCameraForm,
  cameraFromRecord,
  cameraRecord,
  type CameraConfig,
} from "./components/CameraSetup";
import {
  AddLearnerForm,
  BulkUploadLearner,
  learnerFromRecord,
  learnerName,
  learnerRecord,
  listedUids,
  type NewLearner,
} from "./components/LearnerSetup";
import {
  AddClassForm,
  BulkUploadClass,
  classRecord,
  storeAddedClasses,
  storeDeletedRecord,
  storeEditedRecord,
  useSetupState,
  applySetup,
  formFromRecord,
  kindOf,
  NOUN,
  type NewClass,
  type SetupKind,
} from "./components/ClassSetup";

const titles: Record<string, string> = {
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
  "add:class": "Add class",
  "bulk:class": "Bulk Upload Class",
  "add:lab": "Add lab",
  "bulk:lab": "Bulk Upload Lab",
  "add:learner": "Add Learner",
  "add:camera": "Add camera",
  "add:user": "Add user",
  "bulk:user": "Bulk Upload User",
  "row:edit:user": "Edit user",
  "row:mark": "Mark attendance",
  "add:warden": "Add warden",
  "add:hostel": "Create hostel",
  "add:leave": "Create leave application",
  "add:setupCamera": "Create camera configuration",
  "add:shift": "Create shift",
  "row:register": "Register user",
  "bulk:learner": "Bulk Upload Learner",
  "row:learners": "Learners",
  "row:edit": "Edit",
  "row:delete": "Confirm to Delete",
};
// Class and lab setup (legacy "+ Class" / "Bulk Upload Class") per role and
// page. Customer Admin's Coverage page lists classes and labs together.
const SETUP_PAGES: Record<string, Record<string, SetupKind[]>> = {
  dean: {
    "dean-classes": ["class"],
    "dean-labs": ["lab"],
    "dean-learners": ["learner"],
  },
  coordinator: {
    "coordinator-classes": ["class"],
    "coordinator-labs": ["lab"],
    "coordinator-learners": ["learner"],
  },
  customer_admin: {
    "ca-class-coverage": ["class", "lab"],
    "ca-class-learners": ["learner"],
    "ca-class-sources": ["camera"],
    "ca-gate-cameras": ["camera"],
    "ca-surveillance-users": ["user"],
    "ca-setup-cameras": ["setupCamera"],
    "ca-setup-shifts": ["shift"],
  },
  vizenta_admin: {
    "va-surveillance-users": ["user"],
    "va-warden-wardens": ["warden"],
    "va-warden-hostels": ["hostel"],
    "va-warden-leaves": ["leave"],
  },
};
for (const [id, kind] of [
  ["ca-warden-wardens", "warden"],
  ["ca-warden-hostels", "hostel"],
  ["ca-warden-leaves", "leave"],
] as const)
  SETUP_PAGES.customer_admin[id] = [kind];
// Pages that render their own view instead of the records table (settings
// screens, dashboards). Registered by feature modules.
export interface CustomViewProps {
  page: PageContract;
  rows: DataRecord[];
  scope: string;
  actor: string;
  notify: (text: string) => void;
  // Rows of another tab in the same destination.
  tabRows: (tab: string) => DataRecord[];
}
const CUSTOM_VIEWS: Record<string, (p: CustomViewProps) => React.ReactNode> = {
  "ca-setup-setup": (p) => <SetupView notify={p.notify} />,
  "ca-setup-criteria": (p) => <CriteriaView notify={p.notify} />,
  "ca-setup-dashboard": (p) => (
    <DashboardView
      rows={p.rows}
      cameras={p.tabRows("Camera Setup")}
      clips={p.tabRows("Video Analytics")}
    />
  ),
};
// Pages whose header counts come from the rows in scope.
const LIVE_METRICS: Record<string, (rows: DataRecord[]) => Metric[]> = {
  "ca-surveillance-users": userMetrics,
  "va-surveillance-users": userMetrics,
  "ca-gate-user-attendance": attendanceMetrics,
  "va-gate-user-attendance": attendanceMetrics,
  "warden-gate-user-attendance": attendanceMetrics,
  "ca-gate-in-out": inOutMetrics,
  "va-gate-in-out": inOutMetrics,
  "warden-gate-in-out": inOutMetrics,
  "ca-warden-wardens": wardenMetrics,
  "va-warden-wardens": wardenMetrics,
  "ca-warden-hostels": hostelMetrics,
  "va-warden-hostels": hostelMetrics,
  "ca-warden-leaves": leaveMetrics,
  "va-warden-leaves": leaveMetrics,
};
// User Attendance pages, with the surveillance users page whose people
// appear as Absent until a gate event is recorded.
const ATTENDANCE_USERS: Record<string, string | undefined> = {
  "ca-gate-user-attendance": "ca-surveillance-users",
  "va-gate-user-attendance": "va-surveillance-users",
  "warden-gate-user-attendance": undefined,
};
// Kinds created from a single form (no bulk upload).
const FORM_ONLY: SetupKind[] = [
  "camera",
  "warden",
  "hostel",
  "leave",
  "setupCamera",
  "shift",
];
// Surveillance Attendance: unregistered recognitions can be registered.
const REGISTER_PAGES = new Set(["ca-setup-attendance"]);
export default function WorkspaceScreen() {
  const app = useApp();
  const c = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    name?: string;
    tab?: string;
    record?: string;
    metric?: string;
  }>();
  const [modal, setModal] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState("populated");
  const [action, setAction] = useState<Action>();
  const [exportRecord, setExportRecord] = useState<DataRecord>();
  const [kpiFilter, setKpiFilter] = useState("");
  // Classes and labs added, edited or deleted in this session (no class
  // service is connected yet).
  const setupState = useSetupState();
  const [rowTarget, setRowTarget] = useState<{
    record: DataRecord;
    kind: SetupKind;
  }>();
  const scroll = useRef<ScrollView>(null);
  const industry = industries[app.workspace.industry];
  const role = industry.core.roles[app.workspace.role];
  const location: Location = params.name
    ? {
        type: params.type === "product" ? "product" : "org",
        name: params.name,
        tab: params.tab ?? "",
        record: params.record,
        metric: params.metric,
      }
    : homeLocation(app.workspace);
  const page = getPage(app.workspace, location);
  const branch = getBranch(app.workspace, location.type, location.name);
  const rows = useMemo(
    () =>
      page
        ? applySetup(setupState, page.id, app.workspace.scope, [
            ...scopedRecords(page, app.workspace.scope).map((r) =>
              localRecord(r, page.id, app.workspace, app.audit),
            ),
            ...(page.id in ATTENDANCE_USERS
              ? absentRowsFromUsers(
                  page,
                  setupState.added[ATTENDANCE_USERS[page.id] ?? ""] ?? [],
                ).filter((r) => r.scope.includes(app.workspace.scope))
              : []),
          ])
        : [],
    [page, app.workspace, app.audit, setupState],
  );
  // Class & Lab Attendance and Gate follow the Education v2 reference
  // console layout.
  const reference =
    (location.type === "product" &&
      ["Class & Lab Attendance", "Gate", "Warden"].includes(location.name)) ||
    (location.type === "org" &&
      ["Surveillance Users", "Sources & Setup"].includes(location.name));
  const filtered = useMemo(() => {
    const matches = filterRecords(rows, query, filters);
    if (!kpiFilter) return matches;
    const drill = kpiFilter.toLowerCase();
    return matches.filter((r) =>
      JSON.stringify(r).toLowerCase().includes(drill),
    );
  }, [rows, query, filters, kpiFilter]);
  const record = rows.find((r) => r.id === location.record);
  const pageMetrics =
    page && LIVE_METRICS[page.id] ? LIVE_METRICS[page.id](rows) : page?.metrics;
  const metric = pageMetrics?.find((m) => m.label === location.metric);
  const home =
    location.type === "org" &&
    location.name === role.home &&
    !record &&
    !metric;
  const phone = width < 768;
  const side = width >= 1024;
  const wide = width > 1050;
  const close = useCallback(() => setModal(""), []);
  const open = useCallback((name: string) => setModal(name), []);
  const go = (next: Location, replace = false) => {
    const href = {
      pathname: "/" as const,
      params: {
        type: next.type,
        name: next.name,
        tab: next.tab,
        ...(next.record ? { record: next.record } : {}),
        ...(next.metric ? { metric: next.metric } : {}),
      },
    };
    replace ? router.replace(href) : router.push(href);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const navigate = (type: "org" | "product", name: string) => {
    const b = getBranch(app.workspace, type, name);
    if (!b) return;
    go({ type, name, tab: Object.keys(b)[0] });
    close();
  };
  const openRecord = (r: DataRecord) => {
    go({ ...location, record: r.id, metric: undefined });
    close();
  };
  const back = () => {
    if (router.canGoBack()) router.back();
    else go({ ...location, record: undefined, metric: undefined }, true);
  };
  const switchWorkspace = (w: Workspace) => {
    app.update({ workspace: w });
    go(homeLocation(w), true);
    setPreview("populated");
    close();
  };
  const changeScope = (scope: string) => {
    const w = { ...app.workspace, scope };
    app.update({ workspace: w });
    if (
      location.type === "product" &&
      !visibleProducts(w).includes(location.name)
    )
      go(homeLocation(w), true);
    else go({ ...location, record: undefined, metric: undefined }, true);
  };
  const setupKinds: SetupKind[] =
    (page && SETUP_PAGES[app.workspace.role]?.[page.id]) || [];
  // Open setup dialog, e.g. "add:lab" or "bulk:class".
  const [setupMode, setupKind] = modal.split(":") as [string, SetupKind];
  const setupOpen =
    (setupMode === "add" || setupMode === "bulk") &&
    setupKinds.includes(setupKind);
  // An aggregate scope ("Across campuses") also lists its campus records.
  const newRecordScope = () => [
    app.workspace.scope,
    ...(/^(Across|All) /.test(role.scopes[0]) &&
    role.scopes[0] !== app.workspace.scope
      ? [role.scopes[0]]
      : []),
  ];
  const addLearners = (learners: NewLearner[], source: string) => {
    if (!page || !learners.length) return;
    const scope = newRecordScope();
    storeAddedClasses(
      page.id,
      learners.map((l) => learnerRecord(page, l, scope, role.label, source)),
    );
    close();
    app.notify(
      learners.length === 1
        ? `${learnerName(learners[0])} added. It is kept for this session only.`
        : `${learners.length} learners added. They are kept for this session only.`,
    );
  };
  const cameraVariant = page?.id === "ca-gate-cameras" ? "gate" : "room";
  // Rows of another tab (for pickers and cross-tab views).
  const tabRows = (tab: string, type = location.type, name = location.name) => {
    const p = getBranch(app.workspace, type, name)?.[tab];
    return p
      ? applySetup(
          setupState,
          p.id,
          app.workspace.scope,
          scopedRecords(p, app.workspace.scope),
        )
      : [];
  };
  // Rows of a sibling tab in the Warden product (for pickers).
  const wardenTabRows = (tab: string) => {
    const p = getBranch(app.workspace, "product", "Warden")?.[tab];
    return p
      ? applySetup(
          setupState,
          p.id,
          app.workspace.scope,
          scopedRecords(p, app.workspace.scope),
        )
      : [];
  };
  const cellOf = (r: DataRecord, key: string) =>
    typeof r.cells[key] === "string" ? (r.cells[key] as string) : "";
  const addResidence = (record: DataRecord, label: string) => {
    if (!page) return;
    storeAddedClasses(page.id, [record]);
    close();
    app.notify(`${label} added. It is kept for this session only.`);
  };
  const addUsers = (users: SurveillanceUser[], source: string) => {
    if (!page || !users.length) return;
    const scope = newRecordScope();
    storeAddedClasses(
      page.id,
      users.map((u) => userRecord(page, u, scope, role.label, source)),
    );
    close();
    app.notify(
      users.length === 1
        ? `${userName(users[0])} added. It is kept for this session only.`
        : `${users.length} users added. They are kept for this session only.`,
    );
  };
  const addCamera = (config: CameraConfig) => {
    if (!page) return;
    storeAddedClasses(page.id, [
      cameraRecord(
        page,
        config,
        cameraVariant,
        newRecordScope(),
        role.label,
        "Camera added from the form",
      ),
    ]);
    close();
    app.notify(
      `${config.cameras.map((d) => d.display_name).join(", ")} added. It is kept for this session only.`,
    );
  };
  const addClasses = (classes: NewClass[], source: string, kind: SetupKind) => {
    if (!page || !classes.length) return;
    const scope = newRecordScope();
    const records = classes.map((cls) =>
      classRecord(page, cls, scope, role.label, source, kind),
    );
    storeAddedClasses(page.id, records);
    close();
    app.notify(
      classes.length === 1
        ? `${classes[0].class_name} added. It is kept for this session only.`
        : `${classes.length} ${NOUN[kind].many} added. They are kept for this session only.`,
    );
  };
  const clear = () => {
    setQuery("");
    setFilters({});
    setKpiFilter("");
  };
  const runAction = (a: Action) => {
    if (actionKind(a) === "export") {
      setExportRecord(record);
      setModal("export");
    } else {
      setAction(a);
      setModal("action");
    }
  };
  useEffect(() => {
    clear();
    setPreview("populated");
  }, [page?.id, app.workspace.scope]);
  const notifications = rows.filter((r) =>
    ["critical", "attention", "unavailable"].includes(r.state.tone),
  );
  const notificationKey = (r: DataRecord) =>
    [
      app.workspace.industry,
      app.workspace.role,
      app.workspace.scope,
      page?.id,
      r.id,
    ].join(":");
  const searchResults = useMemo(() => {
    if (search.trim().length < 2) return [];
    const hits: { record: DataRecord; location: Location }[] = [];
    for (const type of ["org", "product"] as const)
      for (const name of type === "org"
        ? role.organization
        : visibleProducts(app.workspace)) {
        const b = getBranch(app.workspace, type, name);
        for (const tab of Object.keys(b ?? {})) {
          const loc = { type, name, tab };
          const p = getPage(app.workspace, loc);
          if (!p) continue;
          for (const r of filterRecords(
            scopedRecords(p, app.workspace.scope),
            search,
            {},
          )) {
            hits.push({ record: r, location: loc });
            if (hits.length >= 12) return hits;
          }
        }
      }
    return hits;
  }, [search, app.workspace, role]);
  const tabsBar = (
    <View style={{ borderBottomWidth: 1, borderColor: c.border }}>
      <ScrollView
        horizontal
        accessibilityRole="tablist"
        accessibilityLabel={`${location.name} views`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 24 }}
      >
        {Object.keys(branch ?? {}).map((tab) => (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityLabel={tab}
            accessibilityState={{
              selected: tab === location.tab,
            }}
            aria-selected={tab === location.tab}
            onPress={() =>
              go({
                ...location,
                tab,
                record: undefined,
                metric: undefined,
              })
            }
            style={{
              paddingVertical: 13,
              paddingHorizontal: 4,
              backgroundColor: "transparent",
              borderBottomWidth: 2,
              borderBottomColor: tab === location.tab ? c.link : "transparent",
            }}
          >
            <Txt
              size={12}
              bold={tab === location.tab}
              color={tab === location.tab ? c.link : c.muted}
            >
              {tab}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
  if (!app.ready) return <LaunchScreen />;
  if (!app.session) return <Login />;
  const exportRows = exportRecord ? [exportRecord] : filtered;
  const unavailable = preview !== "populated" && preview !== "degraded";
  const affectedSources = (page?.sources ?? []).filter((s) =>
    ["attention", "critical", "unavailable", "pending"].includes(s.tone),
  ).length;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <StatusBar
        style={
          app.theme === "system"
            ? "auto"
            : app.theme === "dark"
              ? "light"
              : "dark"
        }
      />
      <View style={{ flex: 1, flexDirection: "row" }}>
        {side && (
          <View style={{ width: collapsed ? 64 : 232 }}>
            <Navigation
              location={location}
              navigate={navigate}
              open={open}
              collapsed={collapsed}
              reference={reference}
              onCollapse={() => setCollapsed(true)}
            />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Row
            style={{
              height: 66,
              paddingHorizontal: phone ? 10 : 18,
              borderBottomWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
              gap: phone ? 6 : 15,
            }}
          >
            {(!reference || !side || collapsed) && (
              <IconButton
                name="menu"
                label={side ? "Toggle sidebar" : "Open navigation"}
                onPress={() => (side ? setCollapsed(!collapsed) : open("menu"))}
              />
            )}
            {phone ? (
              <BrandMark size={29} />
            ) : reference && page ? (
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt
                  size={23}
                  bold
                  lines={1}
                  style={{ letterSpacing: -0.7, lineHeight: 27 }}
                >
                  {record
                    ? record.detail.title
                    : metric
                      ? metric.label
                      : page.heading}
                </Txt>
                <Txt size={10} color={c.muted} lines={1}>
                  {record
                    ? record.detail.summary
                    : metric
                      ? `${metric.valuesByScope?.[app.workspace.scope] ?? metric.value} — ${metric.contextsByScope?.[app.workspace.scope] ?? metric.context}`
                      : page.description}
                </Txt>
              </View>
            ) : (
              <Row style={{ flex: 1 }}>
                <Txt size={12} color={c.muted}>
                  {industry.label}
                </Txt>
                <Icon name="chevron" size={12} />
                <Txt size={12} bold>
                  {home ? "Overview" : location.name}
                </Txt>
              </Row>
            )}
            {!phone && reference && (
              <Row
                style={{
                  gap: 6,
                  paddingVertical: 7,
                  paddingHorizontal: 9,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 9,
                  backgroundColor: c.primarySoft,
                  maxWidth: 190,
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: affectedSources ? REF.amber : REF.green,
                  }}
                />
                <Txt size={10} color={c.muted} lines={1}>
                  {affectedSources
                    ? `${affectedSources} source${affectedSources === 1 ? "" : "s"} affect${affectedSources === 1 ? "s" : ""} this page`
                    : "Supporting sources current"}
                </Txt>
              </Row>
            )}
            {!phone && reference && (
              <RefHeaderBox
                icon="person"
                caption="Persona"
                label="Persona and workspace"
                onPress={() => open("workspace")}
              />
            )}
            {!phone && !reference && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search workspace"
                onPress={() => open("search")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: c.background,
                  borderRadius: 8,
                  padding: 11,
                  width: width > 1300 ? 230 : 170,
                }}
              >
                <Icon name="search" size={16} />
                <Txt size={11} color={c.subtle}>
                  Search workspace
                </Txt>
              </Pressable>
            )}
            <View style={{ flex: phone ? 1 : undefined, minWidth: 0 }}>
              <Select
                compact
                label="Assigned scope"
                value={app.workspace.scope}
                options={role.scopes.map((value) => ({ value, label: value }))}
                onChange={changeScope}
                icon={phone ? undefined : "site"}
                trigger={
                  reference && !phone
                    ? (current, show) => (
                        <RefHeaderBox
                          icon="building"
                          caption={current}
                          label={`Assigned scope: ${current}`}
                          onPress={show}
                        />
                      )
                    : undefined
                }
              />
            </View>
            {!phone && (
              <IconButton
                name="grid"
                label="Switch application"
                onPress={() => open("apps")}
              />
            )}
            <View>
              <IconButton
                name="bell"
                label="Notifications"
                onPress={() => open("notifications")}
              />
              {notifications.some(
                (r) => !app.readNotifications.includes(notificationKey(r)),
              ) && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 9,
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: c.attention,
                  }}
                />
              )}
            </View>
            {!phone && (
              <IconButton
                name="help"
                label="Help center"
                onPress={() => open("help")}
              />
            )}
            {reference && !phone ? (
              <IconButton
                name="person"
                label="Profile and settings"
                onPress={() => open("settings")}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Profile and settings"
                onPress={() => open("settings")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 18,
                  backgroundColor: c.actionPrimary,
                  justifyContent: "center",
                  alignItems: "center",
                  marginLeft: 3,
                }}
              >
                <Txt size={11} bold color={c.actionInk}>
                  {app.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </Txt>
              </Pressable>
            )}
          </Row>
          <ScrollView
            ref={scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingVertical: phone ? 12 : 16,
              paddingHorizontal: phone ? 11 : 18,
              paddingBottom: 40,
              gap: 14,
              maxWidth: 1650,
              width: "100%",
              alignSelf: "center",
            }}
          >
            <MotionView
              testID="workspace-page-transition"
              sceneKey={[
                app.workspace.industry,
                app.workspace.role,
                app.workspace.scope,
                page?.id,
                location.record,
                location.metric,
              ].join(":")}
              style={{ gap: 14 }}
            >
              {reference && page && (
                <>
                  <Txt size={11} color={c.muted}>
                    {[
                      industry.label,
                      role.label,
                      location.name,
                      location.tab,
                      app.workspace.scope,
                    ].join(" › ")}
                  </Txt>
                  {tabsBar}
                </>
              )}
              {!page ? (
                <EmptyState
                  title="This view isn't available"
                  description="Your role or assigned scope cannot access this destination."
                  label="Return to overview"
                  icon="lock"
                  action={() => go(homeLocation(app.workspace), true)}
                />
              ) : location.record && !record ? (
                <EmptyState
                  title="Record unavailable"
                  description="This record is outside your current assigned scope, or no longer exists."
                  action={() => go({ ...location, record: undefined }, true)}
                  label="Back to records"
                />
              ) : record ? (
                <RecordDetail
                  page={page}
                  record={record}
                  onAction={runAction}
                  onBack={back}
                  backLabel={reference ? `Back to ${location.tab}` : undefined}
                  onHome={
                    reference
                      ? () => go(homeLocation(app.workspace))
                      : undefined
                  }
                  homeLabel={`Return to ${role.home}`}
                  reference={reference}
                  onNext={() =>
                    openRecord(rows[(rows.indexOf(record) + 1) % rows.length])
                  }
                  wide={width >= 1150}
                />
              ) : (
                <>
                  {!reference && (
                    <Row
                      style={{
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 16,
                      }}
                    >
                      <View style={{ flex: 1, minWidth: 200, gap: 5 }}>
                        <Row style={{ flexWrap: "wrap" }}>
                          <Txt
                            size={phone ? 20 : 23}
                            bold
                            style={{ letterSpacing: -0.6 }}
                          >
                            {metric
                              ? metric.label
                              : home
                                ? "Workspace overview"
                                : reference
                                  ? page.heading
                                  : location.name}
                          </Txt>
                        </Row>
                        <Txt size={12} color={c.muted}>
                          {metric
                            ? "Understand this measure and its source context."
                            : home
                              ? "A clear picture of what matters. All in one place."
                              : page.description}
                        </Txt>
                      </View>
                      <Row>
                        <Button
                          label="Ask Vizenta"
                          icon="sparkle"
                          onPress={() => open("assistant")}
                          variant="primary"
                          compact={phone}
                        />
                      </Row>
                    </Row>
                  )}
                  {!metric && !reference && tabsBar}
                  {metric && reference ? (
                    <>
                      <Row style={{ flexWrap: "wrap" }}>
                        <Button
                          label={`Back to ${location.tab}`}
                          icon="back"
                          onPress={back}
                        />
                        <Button
                          label={`Return to ${role.home}`}
                          onPress={() => go(homeLocation(app.workspace))}
                        />
                      </Row>
                      <Card style={{ gap: 14 }}>
                        <Txt
                          size={9}
                          bold
                          color={c.link}
                          style={{ letterSpacing: 1.4 }}
                        >
                          {`KPI · ${location.name}`.toUpperCase()}
                        </Txt>
                        <Txt size={22} bold>
                          {metric.label}
                        </Txt>
                        <Txt size={12} color={c.muted}>
                          {metric.valuesByScope?.[app.workspace.scope] ??
                            metric.value}{" "}
                          —{" "}
                          {metric.contextsByScope?.[app.workspace.scope] ??
                            metric.context}
                        </Txt>
                        <Row style={{ flexWrap: "wrap" }}>
                          <RefButton
                            label="Apply KPI filter"
                            kind="primary"
                            onPress={() => {
                              // Stay on this screen instance so the filter
                              // state survives leaving the KPI view.
                              setKpiFilter(metric.drill || metric.label);
                              router.setParams({ metric: "" });
                              scroll.current?.scrollTo({
                                y: 0,
                                animated: false,
                              });
                            }}
                          />
                        </Row>
                        <Row style={{ flexWrap: "wrap", gap: 12 }}>
                          {[
                            ["Scope", app.workspace.scope],
                            ["Page", page.heading],
                            ["Time window", "Current page window"],
                            [
                              "Calculation",
                              metric.denominator ??
                                "Defined by this page contract",
                            ],
                          ].map(([label, value]) => (
                            <View
                              key={label}
                              style={{
                                flexGrow: 1,
                                flexBasis: 180,
                                padding: 12,
                                borderRadius: 10,
                                backgroundColor: c.background,
                                gap: 4,
                              }}
                            >
                              <Txt size={10} color={c.muted}>
                                {label}
                              </Txt>
                              <Txt size={12} bold>
                                {value}
                              </Txt>
                            </View>
                          ))}
                        </Row>
                      </Card>
                      <Card style={{ gap: 12 }}>
                        <SectionTitle
                          title="Supporting data"
                          subtitle="Sources and decision impact for this value."
                        />
                        {page.sources.map((source) => (
                          <Row
                            key={source.label}
                            style={{
                              alignItems: "flex-start",
                              borderTopWidth: 1,
                              borderColor: c.border,
                              paddingTop: 10,
                            }}
                          >
                            <Txt size={12} bold style={{ flex: 1 }}>
                              {source.label}
                            </Txt>
                            <View style={{ flex: 1, gap: 4 }}>
                              <Badge label={source.value} tone={source.tone} />
                              <Txt size={10} color={c.muted}>
                                {source.impact}
                              </Txt>
                            </View>
                          </Row>
                        ))}
                      </Card>
                    </>
                  ) : metric ? (
                    <Card style={{ gap: 15 }}>
                      <Button
                        label="Back to overview"
                        icon="back"
                        onPress={back}
                      />
                      <Txt size={45} bold color={c.link}>
                        {metric.valuesByScope?.[app.workspace.scope] ??
                          metric.value}
                      </Txt>
                      <Txt>
                        {metric.contextsByScope?.[app.workspace.scope] ??
                          metric.context}
                      </Txt>
                      <Txt size={12} color={c.muted}>
                        {metric.denominator ??
                          "Related records are shown below. This list may not include every record used for the metric."}
                      </Txt>
                      <Txt size={11} color={c.muted}>
                        Source: {page.sources.map((s) => s.label).join(" · ")}
                      </Txt>
                    </Card>
                  ) : !(pageMetrics ?? page.metrics).length ? null : (
                    <Metrics
                      metrics={
                        preview === "populated"
                          ? (pageMetrics ?? page.metrics)
                          : (pageMetrics ?? page.metrics).map((m) => ({
                              ...m,
                              value: "—",
                              valuesByScope: undefined,
                              contextsByScope: undefined,
                              context: "Unavailable in this review state",
                              tone: "unavailable" as const,
                            }))
                      }
                      scope={app.workspace.scope}
                      narrow={phone}
                      onPress={(m) => go({ ...location, metric: m.label })}
                    />
                  )}
                  {preview !== "populated" && (
                    <Card
                      style={{ backgroundColor: c.attentionBg, padding: 15 }}
                    >
                      <Row
                        style={{
                          flexWrap: "wrap",
                          justifyContent: "space-between",
                        }}
                      >
                        <Txt size={12} color={c.attention}>
                          Review mode · {preview}
                        </Txt>
                        <Button
                          compact
                          label="Show records"
                          onPress={() => setPreview("populated")}
                        />
                      </Row>
                    </Card>
                  )}
                  {preview === "degraded" && (
                    <Card style={{ backgroundColor: c.attentionBg, gap: 6 }}>
                      <Txt bold size={13}>
                        Source confidence is reduced
                      </Txt>
                      <Txt size={12}>{page.states.degraded}</Txt>
                    </Card>
                  )}
                  {page.banner && (
                    <Card
                      style={{
                        backgroundColor: c.attentionBg,
                        gap: 5,
                        padding: 16,
                      }}
                    >
                      <Txt size={12} bold>
                        {page.banner.title}
                      </Txt>
                      <Txt size={12} color={c.muted}>
                        {page.banner.text}
                      </Txt>
                    </Card>
                  )}
                  {metric && reference ? null : unavailable ? (
                    <Card>
                      <EmptyState
                        title={
                          {
                            empty: "No records yet",
                            unavailable: "Source unavailable",
                            notConfigured: "Configuration required",
                            unauthorized: "Access restricted",
                            insufficientHistory: "More history needed",
                          }[preview] ?? "Unavailable"
                        }
                        description={
                          page.states[preview] ??
                          "This source cannot currently support a conclusion. Its values are unknown, not zero."
                        }
                        icon={preview === "unauthorized" ? "lock" : "activity"}
                        label="Show records"
                        action={() => setPreview("populated")}
                      />
                    </Card>
                  ) : (
                    <View
                      style={{
                        flexDirection: wide ? "row" : "column",
                        gap: 14,
                        alignItems: "flex-start",
                      }}
                    >
                      <View
                        style={{
                          flex: wide ? (reference ? 2.15 : 1) : undefined,
                          width: wide ? undefined : "100%",
                          minWidth: 0,
                          gap: 12,
                        }}
                      >
                        {!reference && (
                          <Row
                            style={{
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: 12,
                            }}
                          >
                            <View style={{ flex: 1, minWidth: 160, gap: 4 }}>
                              <Txt size={15} bold>
                                {page.heading}
                              </Txt>
                              <Txt size={11} color={c.muted}>
                                {role.label} · {app.workspace.scope}
                              </Txt>
                            </View>
                            {page.primaryAction && (
                              <Button
                                compact
                                label={page.primaryAction.label}
                                icon="plus"
                                variant="primary"
                                onPress={() => runAction(page.primaryAction!)}
                              />
                            )}
                          </Row>
                        )}
                        {CUSTOM_VIEWS[page.id] ? (
                          CUSTOM_VIEWS[page.id]!({
                            page,
                            rows: filtered,
                            scope: app.workspace.scope,
                            actor: role.label,
                            notify: app.notify,
                            tabRows: (tab) => tabRows(tab),
                          })
                        ) : (
                          <Records
                            key={page.id}
                            page={page}
                            rows={filtered}
                            query={query}
                            onQuery={setQuery}
                            filters={filters}
                            onFilter={(id, value) =>
                              setFilters((f) => ({ ...f, [id]: value }))
                            }
                            onOpen={openRecord}
                            onClear={clear}
                            onExport={() => {
                              setExportRecord(undefined);
                              open("export");
                            }}
                            reference={
                              reference
                                ? {
                                    scope: app.workspace.scope,
                                    onPrimary: runAction,
                                    kpiFilter,
                                    onClearKpi: () => setKpiFilter(""),
                                    rowMenu: REGISTER_PAGES.has(page.id)
                                      ? (row: DataRecord) =>
                                          row.cells.name === "Unregistered" ? (
                                            <RowActionsMenu
                                              title={row.detail.title}
                                              actions={["register"]}
                                              onAction={() => {
                                                setRowTarget({
                                                  record: row,
                                                  kind: "user",
                                                });
                                                open("row:register");
                                              }}
                                            />
                                          ) : null
                                      : page.id in ATTENDANCE_USERS
                                        ? (row: DataRecord) =>
                                            row.cells.status === "Absent" ? (
                                              <RowActionsMenu
                                                title={row.detail.title}
                                                actions={["mark"]}
                                                onAction={() => {
                                                  setRowTarget({
                                                    record: row,
                                                    kind: "user",
                                                  });
                                                  open("row:mark");
                                                }}
                                              />
                                            ) : null
                                        : setupKinds.length
                                          ? (row: DataRecord) => {
                                              const kind: SetupKind =
                                                setupKinds.length === 1 &&
                                                setupKinds[0] !== "class" &&
                                                setupKinds[0] !== "lab"
                                                  ? setupKinds[0]
                                                  : kindOf(row, setupKinds[0]);
                                              // Camera Edit / Delete only on camera rows (not processors).
                                              if (
                                                kind === "camera" &&
                                                row.setupKind !== "camera" &&
                                                !/camera/i.test(row.type)
                                              )
                                                return null;
                                              // Legacy rule: only pending leave can be changed.
                                              if (
                                                kind === "leave" &&
                                                !leaveEditable(row)
                                              )
                                                return null;
                                              return (
                                                <RowActionsMenu
                                                  title={row.detail.title}
                                                  actions={
                                                    kind === "learner" ||
                                                    kind === "camera" ||
                                                    kind === "user" ||
                                                    kind === "warden" ||
                                                    kind === "hostel" ||
                                                    kind === "leave" ||
                                                    kind === "setupCamera" ||
                                                    kind === "shift"
                                                      ? ["edit", "delete"]
                                                      : undefined
                                                  }
                                                  onAction={(a) => {
                                                    setRowTarget({
                                                      record: row,
                                                      kind,
                                                    });
                                                    open(`row:${a}`);
                                                  }}
                                                />
                                              );
                                            }
                                          : undefined,
                                    setup: setupKinds.map((kind) => ({
                                      kind,
                                      label: NOUN[kind].title,
                                      onAdd: () => open(`add:${kind}`),
                                      onBulk: FORM_ONLY.includes(kind)
                                        ? undefined
                                        : () => open(`bulk:${kind}`),
                                    })),
                                  }
                                : undefined
                            }
                          />
                        )}
                      </View>
                      <View
                        style={
                          wide && reference
                            ? { flex: 0.85, minWidth: 290 }
                            : { width: wide ? 310 : "100%" }
                        }
                      >
                        <ContextPanels page={page} />
                      </View>
                    </View>
                  )}
                </>
              )}
              <Row
                style={{
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                  paddingTop: 6,
                }}
              >
                <Txt size={10} color={c.subtle}>
                  VIZENTA AI · Presence. Safety. Insights.
                </Txt>
              </Row>
            </MotionView>
          </ScrollView>
          {!side && (
            <Row
              style={{
                height: 65,
                borderTopWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surface,
                justifyContent: "space-around",
              }}
            >
              {[
                ["home", "Overview"],
                ["grid", "Explore"],
                ["sparkle", "Ask Vizenta"],
                ["search", "Search"],
                ["settings", "Settings"],
              ].map(([icon, label], i) => (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  onPress={() =>
                    i === 0
                      ? go(homeLocation(app.workspace))
                      : open(["", "menu", "assistant", "search", "settings"][i])
                  }
                  style={{
                    alignItems: "center",
                    gap: 4,
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor:
                      i === 0 && home ? c.actionPrimary : "transparent",
                  }}
                >
                  <Icon
                    name={icon}
                    color={i === 0 && home ? c.actionInk : c.link}
                    size={20}
                  />
                  <Txt size={9} color={i === 0 && home ? c.actionInk : c.link}>
                    {label}
                  </Txt>
                </Pressable>
              ))}
            </Row>
          )}
        </View>
      </View>
      {reference && side && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask Vizenta"
          onPress={() => open("assistant")}
          style={{
            position: "absolute",
            right: 28,
            bottom: 28,
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: c.actionAssistant,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: c.panelShadow,
          }}
        >
          <Icon name="message" color={c.actionInk} size={20} />
        </Pressable>
      )}
      {!!app.toast && (
        <View
          accessibilityRole="alert"
          style={{
            position: "absolute",
            bottom: side ? 24 : 80,
            left: phone ? 18 : undefined,
            right: phone ? 18 : 30,
            backgroundColor: c.ink,
            borderRadius: 12,
            padding: 17,
            maxWidth: 460,
          }}
        >
          <Txt size={12} color={c.white}>
            {app.toast}
          </Txt>
        </View>
      )}
      {!!modal && (
        <Dialog
          title={titles[modal] ?? "Vizenta"}
          onClose={close}
          wide={
            modal === "search" ||
            setupOpen ||
            modal === "row:edit" ||
            modal === "row:learners"
          }
        >
          {modal === "row:learners" && rowTarget && page && (
            <ClassLearners
              storeKey={`${page.id}:${rowTarget.record.id}`}
              record={rowTarget.record}
              kind={rowTarget.kind}
              onClose={close}
            />
          )}
          {modal === "row:edit" && rowTarget?.kind === "learner" && page && (
            <AddLearnerForm
              key={rowTarget.record.id}
              initial={learnerFromRecord(rowTarget.record)}
              submitLabel="Save changes"
              onCancel={close}
              onSave={(form) => {
                storeEditedRecord(
                  page.id,
                  learnerRecord(
                    page,
                    form,
                    rowTarget.record.scope,
                    role.label,
                    "Learner edited",
                    rowTarget.record,
                  ),
                );
                close();
                app.notify(`${learnerName(form)} updated for this session.`);
              }}
            />
          )}
          {setupOpen &&
            setupKind === "setupCamera" &&
            setupMode === "add" &&
            page && (
              <SetupCameraForm
                takenNames={rows.map((r) => cellOf(r, "display").toLowerCase())}
                locations={[
                  ...new Set(
                    rows
                      .map((r) => cellOf(r, "location"))
                      .filter((l) => l && l !== "—"),
                  ),
                ]}
                onCancel={close}
                onSave={(cams) => {
                  storeAddedClasses(
                    page.id,
                    cams.map((cam) =>
                      setupCameraRecord(
                        page,
                        cam,
                        newRecordScope(),
                        role.label,
                        "Camera configuration created",
                      ),
                    ),
                  );
                  close();
                  app.notify(
                    `${cams.length} camera${cams.length === 1 ? "" : "s"} added. Kept for this session only.`,
                  );
                }}
              />
            )}
          {setupOpen &&
            setupKind === "shift" &&
            setupMode === "add" &&
            page && (
              <ShiftForm
                takenNames={rows.map((r) => cellOf(r, "name").toLowerCase())}
                onCancel={close}
                onSave={(sh) =>
                  addResidence(
                    shiftRecord(
                      page,
                      sh,
                      newRecordScope(),
                      role.label,
                      "Shift created",
                    ),
                    sh.name.trim(),
                  )
                }
              />
            )}
          {modal === "row:edit" &&
            rowTarget?.kind === "setupCamera" &&
            page && (
              <SetupCameraForm
                key={rowTarget.record.id}
                initial={setupCameraFromRecord(rowTarget.record)}
                takenNames={rows.map((r) => cellOf(r, "display").toLowerCase())}
                locations={[
                  ...new Set(
                    rows
                      .map((r) => cellOf(r, "location"))
                      .filter((l) => l && l !== "—"),
                  ),
                ]}
                onCancel={close}
                onSave={([cam]) => {
                  storeEditedRecord(
                    page.id,
                    setupCameraRecord(
                      page,
                      cam,
                      rowTarget.record.scope,
                      role.label,
                      "Camera configuration updated",
                      rowTarget.record,
                    ),
                  );
                  close();
                  app.notify(`${cam.display_name} updated for this session.`);
                }}
              />
            )}
          {modal === "row:edit" && rowTarget?.kind === "shift" && page && (
            <ShiftForm
              key={rowTarget.record.id}
              initial={shiftFromRecord(rowTarget.record)}
              takenNames={rows.map((r) => cellOf(r, "name").toLowerCase())}
              onCancel={close}
              onSave={(sh) => {
                storeEditedRecord(
                  page.id,
                  shiftRecord(
                    page,
                    sh,
                    rowTarget.record.scope,
                    role.label,
                    "Shift updated",
                    rowTarget.record,
                  ),
                );
                close();
                app.notify(`${sh.name.trim()} updated for this session.`);
              }}
            />
          )}
          {modal === "row:register" && rowTarget && page && (
            <RegisterDetection
              detection={rowTarget.record}
              workspaceUsers={() => {
                const users = getBranch(
                  app.workspace,
                  "org",
                  "Surveillance Users",
                )?.Users;
                return users
                  ? {
                      page: users,
                      rows: applySetup(
                        setupState,
                        users.id,
                        app.workspace.scope,
                        scopedRecords(users, app.workspace.scope),
                      ),
                    }
                  : undefined;
              }}
              scope={newRecordScope()}
              actor={role.label}
              onCancel={close}
              onDone={(label, usersPage, userRec, detection) => {
                if (usersPage) storeAddedClasses(usersPage.id, [userRec]);
                storeEditedRecord(page.id, detection);
                close();
                app.notify(`${label} registered as a surveillance user.`);
              }}
            />
          )}
          {setupOpen &&
            setupKind === "warden" &&
            setupMode === "add" &&
            page && (
              <WardenForm
                hostelOptions={wardenTabRows("Hostels").map((r) =>
                  cellOf(r, "hostel"),
                )}
                takenEmails={rows.map((r) => cellOf(r, "email").toLowerCase())}
                onCancel={close}
                onSave={(w) =>
                  addResidence(
                    wardenRecord(
                      page,
                      w,
                      newRecordScope(),
                      role.label,
                      "Warden added",
                    ),
                    w.name,
                  )
                }
              />
            )}
          {setupOpen &&
            setupKind === "hostel" &&
            setupMode === "add" &&
            page && (
              <HostelForm
                wardenOptions={wardenTabRows("Wardens").map((r) =>
                  cellOf(r, "warden"),
                )}
                takenNames={rows.map((r) => cellOf(r, "hostel").toLowerCase())}
                onCancel={close}
                onSave={(h) =>
                  addResidence(
                    hostelRecord(
                      page,
                      h,
                      newRecordScope(),
                      role.label,
                      "Hostel created",
                    ),
                    h.hostel_name,
                  )
                }
              />
            )}
          {setupOpen &&
            setupKind === "leave" &&
            setupMode === "add" &&
            page && (
              <LeaveForm
                students={
                  (page as unknown as { students?: string[] }).students ?? []
                }
                onCancel={close}
                onSave={(l) =>
                  addResidence(
                    leaveRecord(
                      page,
                      l,
                      newRecordScope(),
                      role.label,
                      "Leave application created",
                    ),
                    `Leave for ${l.student}`,
                  )
                }
              />
            )}
          {modal === "row:edit" &&
            rowTarget &&
            ["warden", "hostel", "leave"].includes(rowTarget.kind) &&
            page && (
              <ResidenceEdit
                key={rowTarget.record.id}
                kind={rowTarget.kind}
                record={rowTarget.record}
                page={page}
                rows={rows}
                wardenTabRows={wardenTabRows}
                cellOf={cellOf}
                actor={role.label}
                onCancel={close}
                onSaved={(record, label) => {
                  storeEditedRecord(page.id, record);
                  close();
                  app.notify(`${label} updated for this session.`);
                }}
              />
            )}
          {modal === "row:mark" && rowTarget && page && (
            <MarkAttendanceForm
              title={rowTarget.record.detail.title}
              onCancel={close}
              onSave={(m) => {
                storeEditedRecord(
                  page.id,
                  markedRecord(rowTarget.record, m, role.label),
                );
                close();
                app.notify(`${rowTarget.record.detail.title} marked present.`);
              }}
            />
          )}
          {modal === "row:edit" && rowTarget?.kind === "user" && page && (
            <UserForm
              key={rowTarget.record.id}
              initial={{ ...(rowTarget.record.setup as SurveillanceUser) }}
              taken={listedIdentities(rows)}
              submitLabel="Save changes"
              onCancel={close}
              onSave={(u) => {
                storeEditedRecord(
                  page.id,
                  userRecord(
                    page,
                    u,
                    rowTarget.record.scope,
                    role.label,
                    "User edited",
                    rowTarget.record,
                  ),
                );
                close();
                app.notify(`${userName(u)} updated for this session.`);
              }}
            />
          )}
          {modal === "row:edit" && rowTarget?.kind === "camera" && page && (
            <AddCameraForm
              key={rowTarget.record.id}
              variant={cameraVariant}
              initial={cameraFromRecord(rowTarget.record, cameraVariant)}
              submitLabel="Save changes"
              onCancel={close}
              onSave={(config) => {
                storeEditedRecord(
                  page.id,
                  cameraRecord(
                    page,
                    config,
                    cameraVariant,
                    rowTarget.record.scope,
                    role.label,
                    "Camera edited",
                    rowTarget.record,
                  ),
                );
                close();
                app.notify("Camera updated for this session.");
              }}
            />
          )}
          {modal === "row:edit" &&
            rowTarget &&
            rowTarget.kind !== "learner" &&
            rowTarget.kind !== "camera" &&
            rowTarget.kind !== "user" &&
            !["warden", "hostel", "leave", "setupCamera", "shift"].includes(
              rowTarget.kind,
            ) &&
            page && (
              <AddClassForm
                key={rowTarget.record.id}
                kind={rowTarget.kind}
                initial={formFromRecord(rowTarget.record, rowTarget.kind)}
                submitLabel="Save changes"
                onCancel={close}
                onSave={(form) => {
                  storeEditedRecord(
                    page.id,
                    classRecord(
                      page,
                      form,
                      rowTarget.record.scope,
                      role.label,
                      `${NOUN[rowTarget.kind].title} edited`,
                      rowTarget.kind,
                      rowTarget.record,
                    ),
                  );
                  close();
                  app.notify(`${form.class_name} updated for this session.`);
                }}
              />
            )}
          {modal === "row:delete" && rowTarget && page && (
            <ConfirmDelete
              kind={rowTarget.kind}
              title={rowTarget.record.detail.title}
              onCancel={close}
              onConfirm={() => {
                storeDeletedRecord(page.id, rowTarget.record.id);
                close();
                app.notify(
                  `${rowTarget.record.detail.title} deleted for this session.`,
                );
              }}
            />
          )}
          {setupOpen && setupKind === "user" && setupMode === "add" && (
            <UserForm
              taken={listedIdentities(rows)}
              onCancel={close}
              onSave={(u) => addUsers([u], "User added from the form")}
            />
          )}
          {setupOpen && setupKind === "user" && setupMode === "bulk" && (
            <BulkUploadUsers
              existing={listedIdentities(rows)}
              onCancel={close}
              onSave={(users, file) => addUsers(users, `Uploaded from ${file}`)}
            />
          )}
          {setupOpen && setupKind === "camera" && setupMode === "add" && (
            <AddCameraForm
              variant={cameraVariant}
              submitLabel="Add camera"
              onCancel={close}
              onSave={addCamera}
            />
          )}
          {setupOpen && setupKind === "learner" && setupMode === "add" && (
            <AddLearnerForm
              onCancel={close}
              onSave={(l) => addLearners([l], "Learner added from the form")}
            />
          )}
          {setupOpen && setupKind === "learner" && setupMode === "bulk" && (
            <BulkUploadLearner
              existingUids={listedUids(rows)}
              onCancel={close}
              onSave={(learners, file) =>
                addLearners(learners, `Uploaded from ${file}`)
              }
            />
          )}
          {setupOpen &&
            setupKind !== "learner" &&
            setupKind !== "camera" &&
            setupKind !== "user" &&
            !FORM_ONLY.includes(setupKind) &&
            setupMode === "add" && (
              <AddClassForm
                key={setupKind}
                kind={setupKind}
                onCancel={close}
                onSave={(cls) =>
                  addClasses(
                    [cls],
                    `${NOUN[setupKind].title} added from the form`,
                    setupKind,
                  )
                }
              />
            )}
          {setupOpen &&
            setupKind !== "learner" &&
            setupKind !== "user" &&
            setupMode === "bulk" &&
            page && (
              <BulkUploadClass
                key={setupKind}
                kind={setupKind}
                existingNames={rows.flatMap((r) =>
                  cellText(r.cells[page.columns[0].id]).split(" · "),
                )}
                onCancel={close}
                onSave={(classes, file) =>
                  addClasses(classes, `Uploaded from ${file}`, setupKind)
                }
              />
            )}
          {modal === "workspace" && (
            <WorkspacePicker onSave={switchWorkspace} />
          )}
          {modal === "settings" && (
            <Settings
              onClose={close}
              onState={(value) => {
                setPreview(value);
                if (record || metric)
                  router.setParams({ record: "", metric: "" });
              }}
            />
          )}
          {modal === "assistant" && page && (
            <Assistant page={page} rows={rows} onOpen={openRecord} />
          )}
          {modal === "action" && action && page && (
            <ActionFlow
              action={action}
              record={record}
              page={page}
              onClose={close}
            />
          )}
          {modal === "menu" && (
            <View style={{ height: 600 }}>
              <Navigation location={location} navigate={navigate} open={open} />
            </View>
          )}
          {modal === "search" && (
            <>
              <Field
                label="Search all entitled views"
                value={search}
                onChange={setSearch}
                placeholder="Try a campus, person, incident or reference…"
              />
              <Txt size={11} color={c.muted}>
                Results are limited to {role.label} · {app.workspace.scope}.
              </Txt>
              {search.length < 2 ? (
                <Txt color={c.muted}>
                  Enter at least 2 characters to search.
                </Txt>
              ) : searchResults.length ? (
                searchResults.map((hit, i) => (
                  <Pressable
                    key={`${hit.record.id}-${i}`}
                    accessibilityRole="button"
                    onPress={() => {
                      go({ ...hit.location, record: hit.record.id });
                      close();
                    }}
                    style={{
                      padding: 16,
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 10,
                      gap: 5,
                    }}
                  >
                    <Txt size={13} bold>
                      {hit.record.detail.title}
                    </Txt>
                    <Txt size={11} color={c.muted}>
                      {hit.location.name} / {hit.location.tab}
                    </Txt>
                    <Badge
                      label={hit.record.state.label}
                      tone={hit.record.state.tone}
                    />
                  </Pressable>
                ))
              ) : (
                <EmptyState
                  title="No results found"
                  description="Try a different name or reference within your assigned scope."
                />
              )}
            </>
          )}
          {modal === "export" && page && (
            <>
              <Badge label="CSV export" tone="healthy" />
              <Txt size={20} bold>
                Take your current view with you.
              </Txt>
              <Txt color={c.muted}>
                {exportRows.length} records from {page.heading}. Only the
                current scope and filters are included.
              </Txt>
              <Card style={{ gap: 10 }}>
                <Txt size={12}>Scope · {app.workspace.scope}</Txt>
                <Txt size={12}>
                  Fields · {page.columns.map((col) => col.label).join(", ")},
                  status, record ID
                </Txt>
              </Card>
              <Button
                label="Export CSV"
                icon="download"
                variant="primary"
                onPress={() => {
                  void app.exportRows(page, exportRows);
                  close();
                }}
              />
            </>
          )}
          {modal === "notifications" && (
            <>
              <Row style={{ justifyContent: "space-between" }}>
                <Txt size={12} color={c.muted}>
                  Updates in this view
                </Txt>
                <Button
                  compact
                  label="Mark all as read"
                  onPress={() => {
                    app.update({
                      readNotifications: [
                        ...new Set([
                          ...app.readNotifications,
                          ...notifications.map(notificationKey),
                        ]),
                      ],
                    });
                    app.notify("Updates marked as read.");
                  }}
                />
              </Row>
              {notifications.length ? (
                notifications.map((r) => (
                  <Pressable
                    key={r.id}
                    accessibilityRole="button"
                    onPress={() => {
                      app.update({
                        readNotifications: [
                          ...new Set([
                            ...app.readNotifications,
                            notificationKey(r),
                          ]),
                        ],
                      });
                      openRecord(r);
                    }}
                    style={{
                      padding: 17,
                      borderRadius: 12,
                      backgroundColor: app.readNotifications.includes(
                        notificationKey(r),
                      )
                        ? c.background
                        : c.primarySoft,
                      gap: 8,
                    }}
                  >
                    <Txt size={13} bold>
                      {r.detail.title}
                    </Txt>
                    <Txt size={12} color={c.muted}>
                      {r.detail.summary}
                    </Txt>
                    <Badge label={r.state.label} tone={r.state.tone} />
                  </Pressable>
                ))
              ) : (
                <EmptyState
                  title="You're all caught up"
                  description="No attention items in this view."
                  icon="check"
                />
              )}
            </>
          )}
          {modal === "apps" && (
            <>
              <Txt color={c.muted}>
                A connected workspace for your organization.
              </Txt>
              <Button
                label="Vizenta Vision · Presence, Safety & Insights"
                icon="grid"
                onPress={() => {
                  go(homeLocation(app.workspace));
                  close();
                }}
              />
              <Button
                label="Workforce & HRMS"
                icon="users"
                disabled={
                  !visibleProducts(app.workspace).includes(
                    "Workforce Attendance",
                  )
                }
                onPress={() => navigate("product", "Workforce Attendance")}
              />
              {!visibleProducts(app.workspace).includes(
                "Workforce Attendance",
              ) && (
                <Txt size={12} color={c.muted}>
                  Workforce & HRMS is not entitled for this industry and role.
                </Txt>
              )}
            </>
          )}
          {modal === "help" && (
            <>
              <Txt size={21} bold>
                Make yourself at home.
              </Txt>
              {[
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
              ].map(([title, body]) => (
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
          )}
        </Dialog>
      )}
    </View>
  );
}

/** Edit dialogs for the Warden product (wardens, hostels, leave). */
function ResidenceEdit({
  kind,
  record,
  page,
  rows,
  wardenTabRows,
  cellOf,
  actor,
  onCancel,
  onSaved,
}: {
  kind: SetupKind;
  record: DataRecord;
  page: PageContract;
  rows: DataRecord[];
  wardenTabRows: (tab: string) => DataRecord[];
  cellOf: (r: DataRecord, key: string) => string;
  actor: string;
  onCancel: () => void;
  onSaved: (record: DataRecord, label: string) => void;
}) {
  if (kind === "warden")
    return (
      <WardenForm
        initial={wardenFromRecord(record)}
        hostelOptions={wardenTabRows("Hostels").map((r) => cellOf(r, "hostel"))}
        takenEmails={rows.map((r) => cellOf(r, "email").toLowerCase())}
        submitLabel="Save changes"
        onCancel={onCancel}
        onSave={(w) =>
          onSaved(
            wardenRecord(page, w, record.scope, actor, "Warden edited", record),
            w.name,
          )
        }
      />
    );
  if (kind === "hostel")
    return (
      <HostelForm
        initial={hostelFromRecord(record)}
        wardenOptions={wardenTabRows("Wardens").map((r) => cellOf(r, "warden"))}
        takenNames={rows.map((r) => cellOf(r, "hostel").toLowerCase())}
        submitLabel="Save changes"
        onCancel={onCancel}
        onSave={(h) =>
          onSaved(
            hostelRecord(page, h, record.scope, actor, "Hostel edited", record),
            h.hostel_name,
          )
        }
      />
    );
  return (
    <LeaveForm
      initial={leaveFromRecord(record)}
      students={(page as unknown as { students?: string[] }).students ?? []}
      submitLabel="Save changes"
      onCancel={onCancel}
      onSave={(l) =>
        onSaved(
          leaveRecord(page, l, record.scope, actor, "Leave edited", record),
          `Leave for ${l.student}`,
        )
      }
    />
  );
}

/** Legacy "Register User" for an unregistered recognition: creates a
 * surveillance user and relabels the detection. */
function RegisterDetection({
  detection,
  workspaceUsers,
  scope,
  actor,
  onCancel,
  onDone,
}: {
  detection: DataRecord;
  workspaceUsers: () => { page: PageContract; rows: DataRecord[] } | undefined;
  scope: string[];
  actor: string;
  onCancel: () => void;
  onDone: (
    label: string,
    usersPage: PageContract | undefined,
    user: DataRecord,
    detection: DataRecord,
  ) => void;
}) {
  const users = workspaceUsers();
  const uid =
    typeof detection.cells.uid === "string" ? detection.cells.uid : "";
  return (
    <UserForm
      initial={{ ...emptyUser(), uid }}
      taken={listedIdentities(users?.rows ?? [])}
      submitLabel="Save"
      onCancel={onCancel}
      onSave={(u) => {
        const record = userRecord(
          users?.page ?? ({ columns: [] } as unknown as PageContract),
          u,
          scope,
          actor,
          "Registered from surveillance attendance",
        );
        const tone =
          u.user_type === "Threat"
            ? "critical"
            : u.user_type === "Visitor"
              ? "attention"
              : "healthy";
        onDone(userName(u), users?.page, record, {
          ...detection,
          cells: {
            ...detection.cells,
            uid: u.uid,
            name: userName(u),
            type: u.user_type,
            state: u.user_type,
          },
          state: { label: u.user_type, tone },
          detail: {
            ...detection.detail,
            title: `${userName(u)} · ${u.uid}`,
            timeline: [
              {
                time: "Just now",
                event: `Registered as ${u.user_type}`,
                actor,
              },
              ...detection.detail.timeline,
            ],
          },
        });
      }}
    />
  );
}
