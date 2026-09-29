// What the workspace derives for its current page: the setup it offers, its
// rows with this session's changes, and the KPIs counted from those rows.
import {
  applySetup,
  setupStoreKey,
  type useSetupState,
} from "../../application/classSetupStore";
import { industries } from "../../domain/contracts/registry";
import { scopedRecords } from "../../domain/contracts/logic";
import { localRecord } from "../../domain/contracts/lifecycle";
import type {
  AuditEvent,
  DataRecord,
  Location,
  PageContract,
  Workspace,
} from "../../domain/contracts/types";
import {
  absentRowsFromUsers,
  attendanceMetrics,
  inOutMetrics,
} from "../../domain/gate/attendance";
import {
  surveillanceEnabled,
  userMetrics,
} from "../../domain/surveillance/setup";
import { cameraSetupVariant } from "../../domain/cameras/setup";
import { residenceSetupEnabled } from "../../domain/residence/setup";
import { sourcesSetupEnabled } from "../../domain/sources/setup";
import { learnerSetupEnabled } from "../../domain/learners/setup";
import { setupKinds, type SetupKind } from "../../domain/classes/setup";
import { SourcesSetupDialog } from "./components/SourcesSetupDialog";
import { ResidenceSetupDialog } from "./components/ResidenceSetupDialog";
import { SurveillanceUserDialog } from "./components/SurveillanceUserDialog";
import { CameraSetupDialog } from "./components/CameraSetupDialog";
import { LearnerSetupDialog } from "./components/LearnerSetupDialog";
import { ClassSetupDialog } from "./components/ClassSetupDialog";
import {
  hostelMetrics,
  leaveMetrics,
  wardenMetrics,
} from "./components/WardenSetup";

type SetupState = ReturnType<typeof useSetupState>;

/**
 * The setup a page offers: learners, cameras, surveillance users, residences
 * and sources have their own dialog, other setup pages the class and lab one;
 * `kinds` is what Add creates, `add` and `bulk` which buttons show.
 */
export function pageSetup(
  workspace: Workspace,
  page: PageContract | undefined,
  location: Location,
) {
  const learner = learnerSetupEnabled(workspace, page?.id);
  const camera = !!cameraSetupVariant(workspace, page?.id);
  const surveillance = surveillanceEnabled(workspace, page?.id);
  const residence = residenceSetupEnabled(workspace, page?.id);
  const sources = sourcesSetupEnabled(workspace, page?.id);
  // Learners on Class & Lab Attendance are edited or deleted, never added.
  const learnersFixed =
    learner &&
    location.type === "product" &&
    location.name === "Class & Lab Attendance";
  return {
    Dialog: sources
      ? SourcesSetupDialog
      : residence
        ? ResidenceSetupDialog
        : surveillance
          ? SurveillanceUserDialog
          : camera
            ? CameraSetupDialog
            : learner
              ? LearnerSetupDialog
              : ClassSetupDialog,
    kinds:
      learner || camera || surveillance || residence || sources
        ? (["class"] as SetupKind[])
        : setupKinds(workspace, page?.id),
    camera,
    surveillance,
    residence,
    add: !learnersFixed,
    bulk: !learnersFixed && !camera && !residence && !sources,
  };
}

/**
 * A page's rows in scope, with this session's setup changes and each record's
 * workflow state. Gate attendance also lists the configured surveillance users
 * without a capture today, as Absent.
 */
export function pageRows(
  page: PageContract,
  workspace: Workspace,
  audit: AuditEvent[],
  setupState: SetupState,
): DataRecord[] {
  const surveillancePage =
    industries[workspace.industry].pages[workspace.role]?.org[
      "Surveillance Users"
    ]?.Users;
  const absent =
    page.detailType === "gate_attendance" && surveillancePage
      ? absentRowsFromUsers(
          page,
          applySetup(
            setupState,
            setupStoreKey(workspace, surveillancePage.id),
            workspace.scope,
            scopedRecords(surveillancePage, workspace.scope),
          ),
        )
      : [];
  return applySetup(
    setupState,
    setupStoreKey(workspace, page.id),
    workspace.scope,
    [...scopedRecords(page, workspace.scope), ...absent],
  ).map((r) => localRecord(r, page.id, workspace, audit));
}

/** Rows of another Sources & Setup (or Shield) tab, for the setup dashboard. */
export function setupTabRows(
  workspace: Workspace,
  setupState: SetupState,
  tab: string,
) {
  const pages = industries[workspace.industry].pages[workspace.role];
  const p =
    pages?.org["Sources & Setup"]?.[tab] ?? pages?.product.Shield?.[tab];
  return p
    ? applySetup(
        setupState,
        setupStoreKey(workspace, p.id),
        workspace.scope,
        scopedRecords(p, workspace.scope),
      )
    : [];
}

/** A page's KPIs: setup and gate pages count their rows; others keep their authored values. */
export function pageMetrics(
  page: PageContract | undefined,
  rows: DataRecord[],
  setup: { residence: boolean; surveillance: boolean },
) {
  if (setup.residence)
    return page?.detailType === "warden"
      ? wardenMetrics(rows)
      : page?.detailType === "hostel"
        ? hostelMetrics(rows)
        : leaveMetrics(rows);
  if (setup.surveillance) return userMetrics(rows);
  if (page?.detailType === "gate_attendance") return attendanceMetrics(rows);
  if (page?.detailType === "gate_in_out") return inOutMetrics(rows);
  return page?.metrics;
}
