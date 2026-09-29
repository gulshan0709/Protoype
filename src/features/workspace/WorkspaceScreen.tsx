import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../application/AppProvider";
import { ToastBanner } from "../../application/ToastBanner";
import {
  setupStoreKey,
  storeEditedRecord,
  useSetupState,
} from "../../application/classSetupStore";
import {
  industries,
  homeLocation,
  getBranch,
  getPage,
  visibleProducts,
} from "../../domain/contracts/registry";
import {
  filterRecords,
  actionKind,
  cellText,
} from "../../domain/contracts/logic";
import {
  actionQueue,
  canonicalRoleFor,
  evidenceStartsCollapsed,
  homeMetricLabel,
  missionFor,
  queueItems,
  showHomeMetric,
} from "../../domain/contracts/priority";
import { pageDescription } from "../../domain/contracts/experience";
import { MEDIA_EXPLORER_PAGE } from "../../domain/contracts/mediaExtension";
import type {
  Location,
  DataRecord,
  Action,
  Metric,
} from "../../domain/contracts/types";
import { markedRecord } from "../../domain/gate/attendance";
import { missionColor, useTheme } from "../../shared/theme/Theme";
import { Button, Txt, Row, EmptyState } from "../../shared/ui/Primitives";
import { Dialog } from "../../shared/ui/Dialog";
import { TabBar } from "../../shared/ui/TabBar";
import { SetupView, CriteriaView, DashboardView } from "./components/SetupTabs";
import { MarkAttendanceForm } from "./components/MarkAttendanceForm";
import type { SetupRequest } from "./components/setup/types";
import { MediaExplorer } from "./components/MediaExplorer";
import { Navigation } from "./components/Navigation";
import { Metrics } from "./components/Metrics";
import { Records } from "./components/Records";
import { ContextPanels } from "./components/ContextPanels";
import { MissionBoard } from "./components/Priority";
import { RecordDetail } from "./components/RecordDetail";
import { WorkspacePicker } from "./components/WorkspacePicker";
import { Assistant } from "./components/Assistant";
import { ActionFlow } from "./components/ActionFlow";
import { Settings } from "./components/Settings";
import { Login } from "./components/Login";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import {
  AssistantDock,
  BottomNav,
  PhoneHeading,
} from "./components/WorkspaceChrome";
import { MetricDetail } from "./components/MetricDetail";
import { SetupActions, rowActionsFor } from "./components/SetupActions";
import {
  PageNotices,
  UnavailableState,
  UserDirectoryPicker,
} from "./components/PageSections";
import { pageMetrics, pageRows, pageSetup, setupTabRows } from "./pageSetup";
import {
  DIALOG_TITLES,
  AppsPanel,
  ExportPanel,
  HelpPanel,
  NotificationsPanel,
  SearchPanel,
  useUpdates,
  type SearchHit,
} from "./components/WorkspaceDialogs";

/**
 * The session gate: login until signed in, then the workspace. While the saved
 * state loads, AppFrame's launch screen covers everything, so nothing renders.
 */
export default function WorkspaceScreen() {
  const app = useApp();
  if (!app.ready) return null;
  if (!app.session) return <Login />;
  return <Workspace />;
}

function Workspace() {
  const app = useApp();
  const { workspace } = app;
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
    // Media Explorer position: customer, camera, date and time slot folders.
    org?: string;
    camera?: string;
    date?: string;
    slot?: string;
  }>();
  const [modal, setModal] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  // Search keeps its query while the dialog is closed.
  const lastSearch = useRef("");
  const [preview, setPreview] = useState("populated");
  const [action, setAction] = useState<Action>();
  const [exportRecord, setExportRecord] = useState<DataRecord>();
  const [classSetup, setClassSetup] = useState<SetupRequest>();
  const [markingId, setMarkingId] = useState<string>();
  const setupState = useSetupState();
  const scroll = useRef<ScrollView>(null);
  const industry = industries[workspace.industry];
  const role = industry.core.roles[workspace.role];
  const mission = missionFor(workspace.industry, workspace.role);
  const roleName = canonicalRoleFor(workspace.role);
  const location = useMemo(
    (): Location =>
      params.name
        ? {
            type: params.type === "product" ? "product" : "org",
            name: params.name,
            tab: params.tab ?? "",
            record: params.record,
            metric: params.metric,
          }
        : homeLocation(workspace),
    [
      params.type,
      params.name,
      params.tab,
      params.record,
      params.metric,
      workspace,
    ],
  );
  const productFamily = industry.core.productFamilies[location.name]?.family;
  const headerAccent =
    productFamily === "Safety"
      ? c.missionSecurity
      : productFamily === "Insights"
        ? c.missionCombined
        : c.link;
  const peopleUsers =
    workspace.industry === "education" &&
    location.type === "org" &&
    location.name === "People & Access" &&
    location.tab === "Users" &&
    ["customer_admin", "vizenta_admin"].includes(workspace.role);
  const userPages = industry.pages[workspace.role];
  const peopleGroups = useMemo(
    () =>
      [
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
          page: getPage(workspace, location),
        },
      ].filter((group) => !!group.page),
    [userPages, workspace, location],
  );
  const selectedPeopleGroup =
    peopleGroups.find((group) => group.value === params.userGroup) ??
    peopleGroups[0];
  const sourcePage = peopleUsers
    ? selectedPeopleGroup?.page
    : getPage(workspace, location);
  // One object per directory, so the rows below stay memoised.
  const page = useMemo(
    () =>
      peopleUsers && sourcePage
        ? {
            ...sourcePage,
            columns: sourcePage.columns.map((column, index) =>
              index === 0 ? { ...column, label: "User" } : column,
            ),
          }
        : sourcePage,
    [peopleUsers, sourcePage],
  );
  const branch = getBranch(workspace, location.type, location.name);
  const setup = useMemo(
    () => pageSetup(workspace, page, location),
    [workspace, page, location],
  );
  const SetupDialog = setup.Dialog;
  const classStoreKey = setupStoreKey(workspace, page?.id);
  const gateAttendancePage = page?.detailType === "gate_attendance";
  const rows = useMemo(
    () => (page ? pageRows(page, workspace, app.audit, setupState) : []),
    [page, workspace, app.audit, setupState],
  );
  const filtered = useMemo(
    () => filterRecords(rows, query, filters),
    [rows, query, filters],
  );
  const record = rows.find((r) => r.id === location.record);
  const kpis = useMemo(
    () => pageMetrics(page, rows, setup),
    [page, rows, setup],
  );
  const metric = kpis?.find((m) => m.label === location.metric);
  const home =
    location.type === "org" &&
    location.name === role.home &&
    !record &&
    !metric;
  const shownMetrics = useMemo(() => {
    const available = kpis ?? [];
    return home
      ? available.filter((m) =>
          showHomeMetric(
            m.label,
            m.valuesByScope?.[workspace.scope] ?? m.value,
          ),
        )
      : available;
  }, [kpis, home, workspace.scope]);
  // Other review states keep the KPI tiles but show no values.
  const metricTiles = useMemo(
    () =>
      preview === "populated"
        ? shownMetrics
        : shownMetrics.map((m) => ({
            ...m,
            value: "—",
            valuesByScope: undefined,
            contextsByScope: undefined,
            context: "Unavailable in this review state",
            tone: "unavailable" as const,
          })),
    [preview, shownMetrics],
  );
  const pageTitle = metric
    ? homeMetricLabel(workspace.role, metric.label)
    : home
      ? role.home
      : location.name;
  const pageSubtitle = metric
    ? `Metric detail · ${roleName} · ${workspace.scope}`
    : home
      ? [roleName, workspace.scope, page?.window].filter(Boolean).join(" · ")
      : pageDescription(
          workspace.industry,
          location.type,
          location.name,
          page?.description,
        );
  const phone = width < 768;
  const side = width >= 1024;
  const wide = width > 1050;
  const collapsed = app.navigationCollapsed;
  const close = useCallback(() => setModal(""), []);
  const openAssistant = useCallback(() => {
    if (side) {
      setModal("");
      setAssistantOpen(true);
    } else setModal("assistant");
  }, [side]);
  const open = useCallback(
    (name: string) => {
      if (name === "assistant") openAssistant();
      else setModal(name);
    },
    [openAssistant],
  );
  const peopleGroup = peopleUsers ? selectedPeopleGroup.value : undefined;
  const go = useCallback(
    (next: Location, replace = false) => {
      const href = {
        pathname: "/" as const,
        params: {
          type: next.type,
          name: next.name,
          tab: next.tab,
          ...(peopleGroup &&
          next.name === "People & Access" &&
          next.tab === "Users"
            ? { userGroup: peopleGroup }
            : {}),
          ...(next.record ? { record: next.record } : {}),
          ...(next.metric ? { metric: next.metric } : {}),
        },
      };
      replace ? router.replace(href) : router.push(href);
      scroll.current?.scrollTo({ y: 0, animated: false });
    },
    [peopleGroup, router],
  );
  const navigate = useCallback(
    (type: "org" | "product", name: string) => {
      const b = getBranch(workspace, type, name);
      if (!b) return;
      go({ type, name, tab: Object.keys(b)[0] });
      close();
    },
    [workspace, go, close],
  );
  const openRecord = useCallback(
    (r: DataRecord) => {
      go({ ...location, record: r.id, metric: undefined });
      close();
    },
    [go, location, close],
  );
  const openMetric = useCallback(
    (m: Metric) => go({ ...location, metric: m.label }),
    [go, location],
  );
  const back = () => {
    if (router.canGoBack()) router.back();
    else go({ ...location, record: undefined, metric: undefined }, true);
  };
  const switchWorkspace = (w: typeof workspace) => {
    app.update({ workspace: w });
    go(homeLocation(w), true);
    setPreview("populated");
    close();
  };
  const { update } = app;
  const changeScope = useCallback(
    (scope: string) => {
      const w = { ...workspace, scope };
      update({ workspace: w });
      if (
        location.type === "product" &&
        !visibleProducts(w).includes(location.name)
      )
        go(homeLocation(w), true);
      else go({ ...location, record: undefined, metric: undefined }, true);
    },
    [workspace, location, update, go],
  );
  const toggleNavigation = useCallback(
    () => update({ navigationCollapsed: !collapsed }),
    [update, collapsed],
  );
  const clear = useCallback(() => {
    setQuery("");
    // Unchanged when there are no filters, so the filtered rows stay memoised.
    setFilters((f) => (Object.keys(f).length ? {} : f));
  }, []);
  const setFilter = useCallback(
    (id: string, value: string) => setFilters((f) => ({ ...f, [id]: value })),
    [],
  );
  const openExport = useCallback(() => {
    setExportRecord(undefined);
    open("export");
  }, [open]);
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
  }, [page?.id, workspace.scope]);
  const updates = useUpdates(rows, workspace, page?.id);
  const queue = useMemo(() => actionQueue(filtered), [filtered]);
  const focusItems = useMemo(
    () =>
      page
        ? queueItems(
            queue,
            page.columns.map((column) => column.id),
            cellText,
          )
        : [],
    [queue, page],
  );
  const labelFor = useMemo(
    () =>
      home
        ? (m: Metric) => homeMetricLabel(workspace.role, m.label)
        : undefined,
    [home, workspace.role],
  );
  const renderRowActions = useMemo(
    () =>
      rowActionsFor({
        gateAttendance: gateAttendancePage,
        kinds: setup.kinds,
        residence: setup.residence,
        camera: setup.camera,
        onMark: setMarkingId,
        onMenu: setClassSetup,
      }),
    [gateAttendancePage, setup],
  );
  const marking = markingId
    ? rows.find((row) => row.id === markingId && row.cells.status === "Absent")
    : undefined;
  const exportRows = exportRecord ? [exportRecord] : filtered;
  const unavailable = preview !== "populated" && preview !== "degraded";
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
          <View style={{ width: collapsed ? 72 : 232 }}>
            <Navigation
              location={location}
              navigate={navigate}
              open={open}
              collapsed={collapsed}
              onToggle={toggleNavigation}
            />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <WorkspaceHeader
            title={pageTitle}
            subtitle={pageSubtitle}
            accent={headerAccent}
            width={width}
            side={side}
            scope={workspace.scope}
            scopes={role.scopes}
            onScope={changeScope}
            assistantOpen={assistantOpen}
            onAssistant={openAssistant}
            onOpen={open}
            unread={updates.unread}
            name={app.name}
          />
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
            <View testID="workspace-page-transition" style={{ gap: 14 }}>
              {!page ? (
                <EmptyState
                  title="This view isn't available"
                  description="Your role or assigned scope cannot access this destination."
                  label="Return to overview"
                  icon="lock"
                  action={() => go(homeLocation(workspace), true)}
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
                  {phone && (
                    <PhoneHeading
                      mission={mission}
                      title={pageTitle}
                      subtitle={pageSubtitle}
                      onAssistant={() => open("assistant")}
                    />
                  )}
                  {!metric && (
                    <TabBar
                      label={`${location.name} views`}
                      tabs={Object.keys(branch ?? {}).map((tab) => ({
                        value: tab,
                        label: tab,
                      }))}
                      value={location.tab}
                      onChange={(tab) =>
                        go({
                          ...location,
                          tab,
                          record: undefined,
                          metric: undefined,
                        })
                      }
                      scroll
                      style={{ marginTop: -7 }}
                    />
                  )}
                  {metric ? (
                    <MetricDetail
                      metric={metric}
                      page={page}
                      scope={workspace.scope}
                      phone={phone}
                      onBack={back}
                    />
                  ) : !shownMetrics.length ? null : (
                    <>
                      {home && preview === "populated" && rows.length > 0 && (
                        <MissionBoard
                          mission={mission}
                          scope={workspace.scope}
                          count={queue.length}
                          critical={queue.some(
                            (item) => item.state.tone === "critical",
                          )}
                          next={focusItems[0]}
                          lanesFor={(queue.length ? queue : filtered).slice(
                            0,
                            2,
                          )}
                          metrics={shownMetrics}
                          readinessLanes={workspace.role === "customer_admin"}
                          onOpenRecord={openRecord}
                        />
                      )}
                      <Metrics
                        metrics={metricTiles}
                        scope={workspace.scope}
                        narrow={phone}
                        accent={missionColor(c, mission.family)}
                        labelFor={labelFor}
                        onPress={openMetric}
                      />
                    </>
                  )}
                  <PageNotices
                    preview={preview}
                    page={page}
                    onShowRecords={() => setPreview("populated")}
                  />
                  {unavailable ? (
                    <UnavailableState
                      preview={preview}
                      page={page}
                      onShowRecords={() => setPreview("populated")}
                    />
                  ) : page.id === "ca-setup-setup" ? (
                    <SetupView key={workspace.scope} notify={app.notify} />
                  ) : page.id === "ca-setup-criteria" ? (
                    <CriteriaView key={workspace.scope} notify={app.notify} />
                  ) : page.id === MEDIA_EXPLORER_PAGE ? (
                    <MediaExplorer
                      key={workspace.scope}
                      scope={workspace.scope}
                      selection={{
                        org: params.org,
                        camera: params.camera,
                        date: params.date,
                        slot: params.slot,
                      }}
                      onSelect={(next) => {
                        // Each step is a history entry, so Back goes up one level.
                        router.push({
                          pathname: "/",
                          params: {
                            type: location.type,
                            name: location.name,
                            tab: location.tab,
                            ...Object.fromEntries(
                              Object.entries(next).filter(([, v]) => v),
                            ),
                          },
                        });
                        scroll.current?.scrollTo({ y: 0, animated: false });
                      }}
                      notify={app.notify}
                    />
                  ) : page.id === "ca-setup-dashboard" ? (
                    <DashboardView
                      key={workspace.scope}
                      rows={rows}
                      cameras={setupTabRows(
                        workspace,
                        setupState,
                        "Camera Setup",
                      )}
                      clips={setupTabRows(
                        workspace,
                        setupState,
                        "Video Analytics",
                      )}
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
                          <UserDirectoryPicker
                            value={selectedPeopleGroup.value}
                            options={peopleGroups.map(({ value, label }) => ({
                              value,
                              label,
                            }))}
                            onChange={(userGroup) => {
                              clear();
                              setClassSetup(undefined);
                              router.setParams({
                                userGroup,
                                record: "",
                                metric: "",
                              });
                            }}
                          />
                        )}
                        <Records
                          key={page.id}
                          headingSubtitle={`${roleName} · ${workspace.scope}`}
                          headingActions={
                            setup.kinds.length > 0 ? (
                              <SetupActions
                                kinds={setup.kinds}
                                add={setup.add}
                                bulk={setup.bulk}
                                phone={phone}
                                onRequest={setClassSetup}
                              />
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
                          onFilter={setFilter}
                          onOpen={openRecord}
                          renderRowActions={renderRowActions}
                          onClear={clear}
                          onExport={openExport}
                        />
                      </View>
                      <View style={{ width: wide ? 310 : "100%" }}>
                        <ContextPanels
                          page={page}
                          evidenceCollapsed={evidenceStartsCollapsed(
                            workspace.role,
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
            </View>
          </ScrollView>
          {phone && (
            <BottomNav
              home={home}
              onHome={() => go(homeLocation(workspace))}
              onOpen={open}
            />
          )}
        </View>
        {side && assistantOpen && page && (
          <AssistantDock
            page={page}
            rows={rows}
            wide={width >= 1500}
            onOpenRecord={openRecord}
            onClose={() => setAssistantOpen(false)}
          />
        )}
      </View>
      <ToastBanner />
      {marking && (
        <Dialog title="Mark attendance" onClose={() => setMarkingId(undefined)}>
          <MarkAttendanceForm
            title={marking.detail.title}
            onCancel={() => setMarkingId(undefined)}
            onSave={(mark) => {
              storeEditedRecord(
                classStoreKey,
                markedRecord(marking, mark, app.name),
              );
              setMarkingId(undefined);
              app.notify("Attendance marked for this session.");
            }}
          />
        </Dialog>
      )}
      {classSetup && page && (
        <SetupDialog
          key={`${classStoreKey}:${workspace.scope}:${classSetup.mode}:${classSetup.kind}:${classSetup.recordId ?? "new"}`}
          request={classSetup}
          onRequest={setClassSetup}
          page={page}
          rows={rows}
          workspace={workspace}
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
          title={DIALOG_TITLES[modal] ?? "Vizenta"}
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
            <SearchPanel
              workspace={workspace}
              role={role}
              roleName={roleName}
              memory={lastSearch}
              onOpen={(hit: SearchHit) => {
                go({ ...hit.location, record: hit.record.id });
                close();
              }}
            />
          )}
          {modal === "export" && page && (
            <ExportPanel
              page={page}
              count={exportRows.length}
              scope={workspace.scope}
              onExport={() => {
                void app.exportRows(page, exportRows);
                close();
              }}
            />
          )}
          {modal === "notifications" && (
            <NotificationsPanel
              notifications={updates.updates}
              isRead={updates.isRead}
              onMarkAll={() => {
                updates.markRead(updates.updates);
                app.notify("Updates marked as read.");
              }}
              onOpen={(r) => {
                updates.markRead([r]);
                openRecord(r);
              }}
            />
          )}
          {modal === "apps" && (
            <AppsPanel
              workforce={visibleProducts(workspace).includes(
                "Workforce Attendance",
              )}
              onHome={() => {
                go(homeLocation(workspace));
                close();
              }}
              onWorkforce={() => navigate("product", "Workforce Attendance")}
            />
          )}
          {modal === "help" && <HelpPanel />}
        </Dialog>
      )}
    </View>
  );
}
