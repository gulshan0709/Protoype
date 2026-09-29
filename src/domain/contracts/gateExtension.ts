import type { DataRecord as Rec, Industry, PageContract } from "./types";
import { str as text } from "../common/text";
import {
  acrossCampuses,
  EDUCATION_TENANT_SCOPE,
  insertTab,
  pageStates,
  placeholderMetrics,
  syncProductTabs,
  textColumns,
} from "./pageBuilders";

export function gateAttendance(education: Industry) {
  const src = education.pages;
  const history = (role: string): Rec[] =>
    src[role]?.product.Gate?.History?.records ?? [];
  const movement: Rec[] =
    src.warden?.product.Gate?.["Resident Movement"]?.records ?? [];

  const attendanceRows = (
    records: Rec[],
    prefix: string,
    scope: (r: Rec) => string[],
  ): Rec[] =>
    records.map((r) => {
      const [date, checkIn] = splitStamp(text(r.cells.firstIn));
      const out = text(r.cells.lastOut);
      const checkOut = out === "—" ? "—" : splitStamp(out)[1];
      const status =
        text(r.cells.state) === "Corrected"
          ? "Present · corrected"
          : out === "—"
            ? "Present · inside"
            : "Present";
      return {
        ...r,
        id: `${prefix}-ATT-${r.id}`,
        type: "gate_attendance",
        cells: {
          user: r.cells.person,
          type: r.cells.type,
          date,
          shift: "—",
          status,
          log: r.cells.duration,
          checkIn,
          checkOut,
          state: status,
        },
        state: {
          label: status,
          tone: status === "Present · inside" ? "attention" : "healthy",
        },
        scope: scope(r),
      };
    });
  const inOutRows = (prefix: string, scope: (r: Rec) => string[]): Rec[] =>
    movement.map((r) => {
      const move = text(r.cells.movement);
      const status = move.startsWith("Out") ? move : "In";
      const [gate, time] = text(r.cells.gate).split(" · ");
      return {
        ...r,
        id: `${prefix}-IO-${r.id}`,
        type: "gate_in_out",
        cells: {
          person: r.cells.resident,
          hostel: r.cells.hostel,
          status,
          gate,
          captured: time ?? "—",
          state: status,
        },
        state: {
          label: status,
          tone:
            status === "In"
              ? "healthy"
              : status === "Out · no return"
                ? "critical"
                : "attention",
        },
        scope: scope(r),
      };
    });

  const states = (subject: string) =>
    pageStates(subject, {
      degraded: `A gate source is degraded; affected ${subject} keep their last verified event and are not treated as absent.`,
      notConfigured: "This view needs configured gate cameras.",
      insufficientHistory: "There is not enough gate history yet.",
    });
  const attendancePage = (id: string, records: Rec[]): PageContract =>
    ({
      id,
      heading: "User attendance",
      description:
        "Daily gate attendance per person: first verified entry, last exit and time on campus.",
      detailType: "gate_attendance",
      metrics: placeholderMetrics([
        "Present",
        "Still inside",
        "Low confidence",
        "Absent",
      ]),
      columns: textColumns([
        ["user", "Name / UID"],
        ["type", "User type"],
        ["date", "Date"],
        ["shift", "Shift"],
        ["status", "Status"],
        ["log", "Log hours"],
        ["checkIn", "Check-in"],
        ["checkOut", "Check-out"],
      ]),
      filters: [
        {
          id: "status",
          label: "Status",
          options: ["All statuses", "Present", "Absent", "Low confidence"],
        },
        {
          id: "type",
          label: "User type",
          options: [
            "All types",
            "Learner",
            "Faculty",
            "Resident",
            "Visitor",
            "Identified",
          ],
        },
      ],
      records,
      sidePanels: [],
      sources: src.security_admin?.product.Gate?.History?.sources ?? [],
      states: states("people"),
    }) as unknown as PageContract;
  const inOutPage = (id: string, records: Rec[]): PageContract =>
    ({
      id,
      heading: "In / Out summary",
      description:
        "Current in/out status per resident from the last verified gate event.",
      detailType: "gate_in_out",
      recordLabel: "resident",
      metrics: placeholderMetrics(["In", "Out", "Out without return"]),
      columns: textColumns([
        ["person", "Name / ID"],
        ["hostel", "Hostel"],
        ["status", "Status"],
        ["gate", "Gate"],
        ["captured", "Captured time"],
      ]),
      filters: [
        {
          id: "hostel",
          label: "Hostel",
          options: ["All hostels", "Hostel A", "Hostel C"],
        },
        { id: "status", label: "Status", options: ["All", "In", "Out"] },
      ],
      records,
      sidePanels: [],
      sources: src.warden?.product.Gate?.["Resident Movement"]?.sources ?? [],
      states: states("residents"),
    }) as unknown as PageContract;

  // Customer Admin: after Cameras. Campus-level scopes only (no hostels).
  const ca = src.customer_admin?.product.Gate;
  if (ca && !ca["User Attendance"]) {
    const campus = (r: Rec) => acrossCampuses(r.scope, true);
    insertTab(
      ca,
      "Cameras",
      "User Attendance",
      attendancePage(
        "ca-gate-user-attendance",
        attendanceRows(history("security_admin"), "ca", campus),
      ),
    );
    insertTab(
      ca,
      "User Attendance",
      "In/Out",
      inOutPage("ca-gate-in-out", inOutRows("ca", campus)),
    );
  }
  // Warden: after Resident Movement, own residents only.
  const wd = src.warden?.product.Gate;
  if (wd && !wd["User Attendance"]) {
    insertTab(
      wd,
      "Resident Movement",
      "User Attendance",
      attendancePage(
        "warden-gate-user-attendance",
        attendanceRows(history("warden"), "wd", (r) => r.scope),
      ),
    );
    insertTab(
      wd,
      "User Attendance",
      "In/Out",
      inOutPage(
        "warden-gate-in-out",
        inOutRows("wd", (r) => r.scope),
      ),
    );
  }
  // Vizenta Admin: a Gate product with only these two tabs, scoped to the
  // education tenant (Northbridge Education).
  const va = education.core.roles.vizenta_admin;
  const vaPages = src.vizenta_admin;
  if (va?.products && vaPages && !vaPages.product.Gate) {
    const tenant = () => [...EDUCATION_TENANT_SCOPE];
    vaPages.product.Gate = {
      "User Attendance": attendancePage(
        "va-gate-user-attendance",
        attendanceRows(history("security_admin"), "va", tenant),
      ),
      "In/Out": inOutPage("va-gate-in-out", inOutRows("va", tenant)),
    };
    if (!va.products.includes("Gate")) va.products.push("Gate");
  }
  for (const role of ["customer_admin", "warden", "vizenta_admin"])
    syncProductTabs(education, role, "Gate");
}

function splitStamp(stamp: string): [string, string] {
  const m = stamp.match(/^(.*\S)\s+(\d{1,2}:\d{2})$/);
  return m ? [m[1], m[2]] : [stamp, "—"];
}
