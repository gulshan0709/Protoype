import { SourcesSetupDialog } from "./components/SourcesSetupDialog";
import { SetupView, CriteriaView, DashboardView } from "./components/SetupTabs";
import { ResidenceSetupDialog } from "./components/ResidenceSetupDialog";
import {
  wardenMetrics,
  hostelMetrics,
  leaveMetrics,
  leaveEditable,
} from "./components/WardenSetup";
import {
  attendanceMetrics,
  inOutMetrics,
  absentRowsFromUsers,
  markedRecord,
} from "../../domain/gate/attendance";
import { MarkAttendanceForm } from "./components/MarkAttendanceForm";
import { storeEditedRecord } from "../../application/classSetupStore";
import {
  surveillanceEnabled,
  userMetrics,
} from "../../domain/surveillance/setup";
import { SurveillanceUserDialog } from "./components/SurveillanceUserDialog";
import { cameraSetupVariant } from "../../domain/cameras/setup";
import { CameraSetupDialog } from "./components/CameraSetupDialog";
import { learnerSetupEnabled } from "../../domain/learners/setup";
import { LearnerSetupDialog } from "./components/LearnerSetupDialog";
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
  metricFacts,
} from "../../domain/contracts/logic";
import {
  actionQueue,
  evidenceStartsCollapsed,
  missionFor,
  queueItems,
} from "../../domain/contracts/priority";
import { localRecord } from "../../domain/contracts/lifecycle";
import type {
  Location,
  DataRecord,
  Action,
  Workspace,
} from "../../domain/contracts/types";
import { missionColor, useTheme } from "../../shared/theme/Theme";
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
import { MissionBoard, MissionLabel } from "./components/Priority";
import { RecordDetail } from "./components/RecordDetail";
import { WorkspacePicker } from "./components/WorkspacePicker";
import { Assistant } from "./components/Assistant";
import { PersonAvatar, PersonOr, personIn } from "./components/PersonChip";
import { ActionFlow } from "./components/ActionFlow";
import { Settings } from "./components/Settings";
import { Login } from "./components/Login";
import { LaunchScreen } from "../../shared/ui/LaunchScreen";
import { MotionView } from "../../shared/motion/MotionView";
import { applySetup, useSetupState } from "../../application/classSetupStore";
import { kindOf, setupKinds } from "../../domain/classes/setup";
import {
  ClassSetupDialog,
  type ClassSetupRequest,
} from "./components/ClassSetupDialog";

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
};
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
    userGroup?: string;
  }>();
  const [modal, setModal] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState("populated");
  const [action, setAction] = useState<Action>();
  const [exportRecord, setExportRecord] = useState<DataRecord>();
  const [classSetup, setClassSetup] = useState<ClassSetupRequest>();
  const setupState = useSetupState();
  const scroll = useRef<ScrollView>(null);
  const industry = industries[app.workspace.industry];
  const role = industry.core.roles[app.workspace.role];
  const mission = missionFor(app.workspace.industry, app.workspace.role);
  const location: Location = params.name
    ? {
        type: params.type === "product" ? "product" : "org",
        name: params.name,
        tab: params.tab ?? "",
        record: params.record,
        metric: params.metric,
      }
    : homeLocation(app.workspace);
  const peopleUsers =
    app.workspace.industry === "education" &&
    location.type === "org" &&
    location.name === "People & Access" &&
    location.tab === "Users" &&
    ["customer_admin", "vizenta_admin"].includes(app.workspace.role);
  const userPages = industry.pages[app.workspace.role];
  const peopleGroups = [
    {
      value: "learners",
      label: "Learners",
      page: userPages?.product["Class & Lab Attendance"]?.Learners,
    },
    {
      value: "surveillance",
      label: "Surveillance users",
      page: userPages?.org["Surveillance Users"]?.Users,
    },
    {
      value: "accounts",
      label: "Workspace users",
      page: getPage(app.workspace, location),
    },
  ].filter((group) => !!group.page);
  const selectedPeopleGroup =
    peopleGroups.find((group) => group.value === params.userGroup) ??
    peopleGroups[0];
  const sourcePage = peopleUsers
    ? selectedPeopleGroup?.page
    : getPage(app.workspace, location);
  const page =
    peopleUsers && sourcePage
      ? {
          ...sourcePage,
          columns: sourcePage.columns.map((column, index) =>
            index === 0 ? { ...column, label: "User" } : column,
          ),
        }
      : sourcePage;
  const branch = getBranch(app.workspace, location.type, location.name);
  const learnerManagement = learnerSetupEnabled(app.workspace, page?.id);
  const cameraManagement = !!cameraSetupVariant(app.workspace, page?.id);
  const surveillanceManagement = surveillanceEnabled(app.workspace, page?.id);
  const residenceManagement =
    app.workspace.industry === "education" &&
    ["customer_admin", "vizenta_admin"].includes(app.workspace.role) &&
    /^(ca|va)-warden-(wardens|hostels|leaves)$/.test(page?.id ?? "");
  const sourcesManagement =
    app.workspace.industry === "education" &&
    app.workspace.role === "customer_admin" &&
    ["ca-setup-cameras", "ca-setup-shifts"].includes(page?.id ?? "");
  const SetupDialog = sourcesManagement
    ? SourcesSetupDialog
    : residenceManagement
      ? ResidenceSetupDialog
      : surveillanceManagement
        ? SurveillanceUserDialog
        : cameraManagement
          ? CameraSetupDialog
          : learnerManagement
            ? LearnerSetupDialog
            : ClassSetupDialog;
  const classKinds =
    learnerManagement ||
    cameraManagement ||
    surveillanceManagement ||
    residenceManagement ||
    sourcesManagement
      ? ["class" as const]
      : setupKinds(app.workspace, page?.id);
  const classStoreKey = JSON.stringify([
    app.workspace.industry,
    app.workspace.role,
    page?.id,
  ]);
  const [markingId, setMarkingId] = useState<string>();
  const gateAttendancePage = page?.detailType === "gate_attendance";
  const surveillancePage =
    industry.pages[app.workspace.role]?.org["Surveillance Users"]?.Users;
  const attendanceUsers =
    gateAttendancePage && surveillancePage
      ? applySetup(
          setupState,
          JSON.stringify([
            app.workspace.industry,
            app.workspace.role,
            surveillancePage.id,
          ]),
          app.workspace.scope,
          scopedRecords(surveillancePage, app.workspace.scope),
        )
      : [];
  const rows = useMemo(
    () =>
      page
        ? applySetup(setupState, classStoreKey, app.workspace.scope, [
            ...scopedRecords(page, app.workspace.scope),
            ...(gateAttendancePage
              ? absentRowsFromUsers(page, attendanceUsers)
              : []),
          ]).map((r) => {
            const record = localRecord(r, page.id, app.workspace, app.audit);
            return record;
          })
        : [],
    [page, app.workspace, app.audit, setupState, classStoreKey],
  );
  const sourceTabRows = (tab: string) => {
    const p =
      industry.pages[app.workspace.role]?.org["Sources & Setup"]?.[tab] ??
      industry.pages[app.workspace.role]?.product.Shield?.[tab];
    return p
      ? applySetup(
          setupState,
          JSON.stringify([app.workspace.industry, app.workspace.role, p.id]),
          app.workspace.scope,
          scopedRecords(p, app.workspace.scope),
        )
      : [];
  };
  const filtered = useMemo(
    () => filterRecords(rows, query, filters),
    [rows, query, filters],
  );
  const record = rows.find((r) => r.id === location.record);
  const pageMetrics = residenceManagement
    ? page?.detailType === "warden"
      ? wardenMetrics(rows)
      : page?.detailType === "hostel"
        ? hostelMetrics(rows)
        : leaveMetrics(rows)
    : surveillanceManagement
      ? userMetrics(rows)
      : gateAttendancePage
        ? attendanceMetrics(rows)
        : page?.detailType === "gate_in_out"
          ? inOutMetrics(rows)
          : page?.metrics;
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
        ...(peopleUsers &&
        next.name === "People & Access" &&
        next.tab === "Users"
          ? { userGroup: selectedPeopleGroup.value }
          : {}),
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
  const clear = () => {
    setQuery("");
    setFilters({});
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
    setClassSetup(undefined);
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
  if (!app.ready) return <LaunchScreen />;
  if (!app.session) return <Login />;
  const exportRows = exportRecord ? [exportRecord] : filtered;
  const unavailable = preview !== "populated" && preview !== "degraded";
  const queue = actionQueue(filtered);
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
              gap: phone ? 8 : 15,
            }}
          >
            <IconButton
              name="menu"
              label={side ? "Toggle sidebar" : "Open navigation"}
              onPress={() => (side ? setCollapsed(!collapsed) : open("menu"))}
            />
            {phone ? (
              // Same 35 px tile and radius as the header icon buttons.
              <BrandMark size={35} radius={9} markScale={0.72} />
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
            {!phone && (
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
                height={35}
                fill={phone}
                label="Assigned scope"
                value={app.workspace.scope}
                options={role.scopes.map((value) => ({ value, label: value }))}
                onChange={changeScope}
                icon={phone ? undefined : "site"}
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile and settings"
              onPress={() => open("settings")}
              style={{
                width: 35,
                height: 35,
                borderRadius: 18,
                backgroundColor: c.actionPrimary,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {personIn(app.name) ? (
                // A signed-in persona with a person's name shows their portrait.
                <PersonAvatar name={app.name} size={35} decorative />
              ) : (
                <Txt size={11} bold color={c.actionInk}>
                  {app.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </Txt>
              )}
            </Pressable>
          </Row>
          <ScrollView
            ref={scroll}
            testID="workspace-scroll"
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
                  onNext={() =>
                    openRecord(rows[(rows.indexOf(record) + 1) % rows.length])
                  }
                  wide={width >= 1150}
                />
              ) : (
                <>
                  <Row
                    style={{
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 16,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 200, gap: 5 }}>
                      <MissionLabel mission={mission} />
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
                  {!metric && (
                    <View
                      style={{ borderBottomWidth: 1, borderColor: c.border }}
                    >
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
                              borderBottomColor:
                                tab === location.tab ? c.link : "transparent",
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
                  )}
                  {!metric && !unavailable && (
                    <MissionBoard
                      mission={mission}
                      scope={app.workspace.scope}
                      count={queue.length}
                      critical={queue.some((r) => r.state.tone === "critical")}
                      next={
                        queueItems(
                          queue,
                          page.columns.map((column) => column.id),
                          cellText,
                          1,
                        )[0]
                      }
                      lanesFor={queue.length ? queue : filtered}
                      metrics={pageMetrics ?? page.metrics}
                      readinessLanes={app.workspace.role === "customer_admin"}
                      onOpenRecord={openRecord}
                    />
                  )}
                  {metric ? (
                    <>
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
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 18,
                          }}
                        >
                          {metricFacts(metric, page, app.workspace.scope).map(
                            (fact) => (
                              <View
                                key={fact.label}
                                style={{
                                  width: phone ? "100%" : "45%",
                                  gap: 5,
                                }}
                              >
                                <Txt size={11} color={c.muted}>
                                  {fact.label}
                                </Txt>
                                <Txt size={13} bold>
                                  {fact.value}
                                </Txt>
                              </View>
                            ),
                          )}
                        </View>
                        <Txt size={12} color={c.muted}>
                          {metric.denominator ??
                            "Related records are shown below. This list may not include every record used for the metric."}
                        </Txt>
                      </Card>
                      <Card style={{ padding: 0, overflow: "hidden" }}>
                        <View
                          style={{ paddingVertical: 11, paddingHorizontal: 14 }}
                        >
                          <SectionTitle
                            title="Supporting data"
                            subtitle="Sources and decision impact for this value."
                          />
                        </View>
                        {page.sources.map((source) => (
                          <View
                            key={source.label}
                            style={{
                              paddingVertical: 11,
                              paddingHorizontal: 13,
                              borderTopWidth: 1,
                              borderColor: c.border,
                              gap: 4,
                            }}
                          >
                            <Row style={{ alignItems: "flex-start" }}>
                              <Txt size={12} bold style={{ flex: 1 }}>
                                {source.label}
                              </Txt>
                              <View style={{ maxWidth: "50%" }}>
                                <Badge
                                  label={source.value}
                                  tone={source.tone}
                                />
                              </View>
                            </Row>
                            <Txt size={11} color={c.muted}>
                              {source.impact}
                            </Txt>
                          </View>
                        ))}
                      </Card>
                    </>
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
                      accent={missionColor(c, mission.family)}
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
                  {unavailable ? (
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
                  ) : page.id === "ca-setup-setup" ? (
                    <SetupView key={app.workspace.scope} notify={app.notify} />
                  ) : page.id === "ca-setup-criteria" ? (
                    <CriteriaView
                      key={app.workspace.scope}
                      notify={app.notify}
                    />
                  ) : page.id === "ca-setup-dashboard" ? (
                    <DashboardView
                      key={app.workspace.scope}
                      rows={rows}
                      cameras={sourceTabRows("Camera Setup")}
                      clips={sourceTabRows("Video Analytics")}
                    />
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
                          flex: wide ? 1 : undefined,
                          width: wide ? undefined : "100%",
                          minWidth: 0,
                          gap: 12,
                        }}
                      >
                        {peopleUsers && (
                          <Row
                            style={{
                              gap: 12,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <Txt size={13} bold>
                              User directory
                            </Txt>
                            <Select
                              label="User directory"
                              value={selectedPeopleGroup.value}
                              options={peopleGroups.map(({ value, label }) => ({
                                value,
                                label,
                              }))}
                              onChange={(userGroup) => {
                                setQuery("");
                                setFilters({});
                                setClassSetup(undefined);
                                router.setParams({
                                  userGroup,
                                  record: "",
                                  metric: "",
                                });
                              }}
                            />
                          </Row>
                        )}
                        <Records
                          key={page.id}
                          headingSubtitle={`${role.label} · ${app.workspace.scope}`}
                          headingActions={
                            classKinds.length > 0 ? (
                              <Row style={{ flexWrap: "wrap", gap: 8 }}>
                                {!(
                                  learnerManagement &&
                                  location.type === "product" &&
                                  location.name === "Class & Lab Attendance"
                                ) && (
                                  <View style={{ flex: phone ? 1 : undefined }}>
                                    <Button
                                      compact={!phone}
                                      label="Add"
                                      icon="plus"
                                      variant="primary"
                                      onPress={() =>
                                        setClassSetup({
                                          kind: classKinds[0],
                                          mode:
                                            classKinds.length > 1
                                              ? "choose-add"
                                              : "add",
                                        })
                                      }
                                    />
                                  </View>
                                )}
                                {!(
                                  learnerManagement &&
                                  location.type === "product" &&
                                  location.name === "Class & Lab Attendance"
                                ) &&
                                  !cameraManagement &&
                                  !residenceManagement &&
                                  !sourcesManagement && (
                                    <View
                                      style={{ flex: phone ? 1 : undefined }}
                                    >
                                      <Button
                                        compact={!phone}
                                        label="Bulk upload"
                                        icon="folder"
                                        onPress={() =>
                                          setClassSetup({
                                            kind: classKinds[0],
                                            mode:
                                              classKinds.length > 1
                                                ? "choose-bulk"
                                                : "bulk",
                                          })
                                        }
                                      />
                                    </View>
                                  )}
                              </Row>
                            ) : (
                              page.primaryAction && (
                                <Button
                                  compact
                                  label={page.primaryAction.label}
                                  icon="plus"
                                  variant="primary"
                                  onPress={() => runAction(page.primaryAction!)}
                                />
                              )
                            )
                          }
                          page={page}
                          rows={filtered}
                          query={query}
                          onQuery={setQuery}
                          filters={filters}
                          onFilter={(id, value) =>
                            setFilters((f) => ({ ...f, [id]: value }))
                          }
                          onOpen={openRecord}
                          renderRowActions={
                            gateAttendancePage
                              ? (row) =>
                                  row.cells.status === "Absent" ? (
                                    <Button
                                      compact
                                      label="Mark attendance"
                                      onPress={() => setMarkingId(row.id)}
                                    />
                                  ) : null
                              : classKinds.length
                                ? (row) =>
                                    (residenceManagement &&
                                      row.type === "leave" &&
                                      !leaveEditable(row)) ||
                                    (cameraManagement &&
                                      ![
                                        "camera",
                                        "camera_source",
                                        "gate_camera",
                                      ].includes(row.type)) ? null : (
                                      <IconButton
                                        name="more"
                                        label={`Actions for ${row.detail.title}`}
                                        onPress={() =>
                                          setClassSetup({
                                            mode: "menu",
                                            kind: kindOf(row, classKinds[0]),
                                            recordId: row.id,
                                          })
                                        }
                                      />
                                    )
                                : undefined
                          }
                          onClear={clear}
                          onExport={() => {
                            setExportRecord(undefined);
                            open("export");
                          }}
                        />
                      </View>
                      <View style={{ width: wide ? 310 : "100%" }}>
                        <ContextPanels
                          page={page}
                          evidenceCollapsed={evidenceStartsCollapsed(
                            app.workspace.role,
                            page.sources,
                          )}
                        />
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
      {markingId &&
        rows.some(
          (row) => row.id === markingId && row.cells.status === "Absent",
        ) && (
          <Dialog
            title="Mark attendance"
            onClose={() => setMarkingId(undefined)}
          >
            <MarkAttendanceForm
              title={rows.find((row) => row.id === markingId)!.detail.title}
              onCancel={() => setMarkingId(undefined)}
              onSave={(marking) => {
                const target = rows.find((row) => row.id === markingId);
                if (!target || target.cells.status !== "Absent") return;
                storeEditedRecord(
                  classStoreKey,
                  markedRecord(target, marking, app.name),
                );
                setMarkingId(undefined);
                app.notify("Attendance marked for this session.");
              }}
            />
          </Dialog>
        )}
      {classSetup && page && (
        <SetupDialog
          key={`${classStoreKey}:${app.workspace.scope}:${classSetup.mode}:${classSetup.kind}:${classSetup.recordId ?? "new"}`}
          request={classSetup}
          onRequest={setClassSetup}
          page={page}
          rows={rows}
          workspace={app.workspace}
          scopes={role.scopes}
          actor={app.name}
          storeKey={classStoreKey}
          onClose={() => setClassSetup(undefined)}
          onSaved={(message) => {
            setClassSetup(undefined);
            clear();
            app.notify(message);
          }}
        />
      )}
      {!!modal && (
        <Dialog
          title={titles[modal] ?? "Vizenta"}
          onClose={close}
          wide={modal === "search"}
        >
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
              <Txt size={12} color={c.muted}>
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
                    <PersonOr record={hit.record}>
                      <Txt size={13} bold>
                        {hit.record.detail.title}
                      </Txt>
                    </PersonOr>
                    <Txt size={12} color={c.muted}>
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
                    <PersonOr record={r}>
                      <Txt size={13} bold>
                        {r.detail.title}
                      </Txt>
                    </PersonOr>
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
