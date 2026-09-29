// The 22 September priority update (dev package priority-ux.js): each persona
// gets a mission that orients the first screen. Pure data and rules only, so
// tests can load this module directly.
export type MissionFamily = "security" | "automation" | "combined" | "platform";
export interface Mission {
  family: MissionFamily;
  /** Page-level orientation label, e.g. "Security Response". */
  label: string;
  headline: string;
  description: string;
  /** Name of the persona's primary action queue. */
  queue: string;
}
const mission = (
  family: MissionFamily,
  label: string,
  headline: string,
  description: string,
  queue: string,
): Mission => ({ family, label, headline, description, queue });
const S = "Security Response";
const A = "Presence & Automation";
const C = "Combined Operations";
const P = "Platform Administration";

export const missions: Record<string, Record<string, Mission>> = {
  education: {
    dean: mission(
      "automation",
      A,
      "Academic attendance and engagement",
      "Review class and lab exceptions, engagement trends and downstream ERP readiness.",
      "Session sequence",
    ),
    faculty: mission(
      "automation",
      A,
      "Today's sessions and learner exceptions",
      "Complete assigned attendance reviews with clear evidence and minimal interruption.",
      "Today · sessions",
    ),
    coordinator: mission(
      "automation",
      A,
      "Program and department completion",
      "Find missing reviews, mapping issues and late submissions before downstream synchronization.",
      "Academic operations",
    ),
    security_admin: mission(
      "security",
      S,
      "Critical cases and response SLA",
      "Acknowledge, assign and escalate the highest-risk campus events first.",
      "Command queue",
    ),
    warden: mission(
      "security",
      S,
      "Resident actions and shift handover",
      "Prioritize missing residents, overdue returns and welfare escalations.",
      "Residence action queue",
    ),
    customer_admin: mission(
      "combined",
      C,
      "Customer readiness and blockers",
      "Separate security coverage from attendance and ERP readiness, with an owner for every blocker.",
      "Readiness",
    ),
    vizenta_admin: mission(
      "platform",
      P,
      "Customer and deployment health",
      "Resolve deployment, entitlement and support risk across the managed estate.",
      "Platform work queue",
    ),
  },
  corporate: {
    corporate_security_admin: mission(
      "security",
      S,
      "Critical cases and response SLA",
      "Act on unacknowledged events, ownership gaps and degraded security sources.",
      "Command queue",
    ),
    facilities_manager: mission(
      "automation",
      A,
      "Building and service-area exceptions",
      "Resolve controlled-area, coverage and visitor conditions that affect the workplace.",
      "Building action board",
    ),
    infosec_audit: mission(
      "security",
      "Governance & Evidence",
      "Retention, access and evidence integrity",
      "Prioritize legal hold, reveal, policy and audit exceptions.",
      "Governance review",
    ),
    reception_lead: mission(
      "automation",
      A,
      "Today's visitor flow",
      "Handle waiting visitors, delayed hosts, denied access and overdue checkout.",
      "Arrival timeline",
    ),
    hr_workforce_admin: mission(
      "automation",
      A,
      "Attendance and payroll cutoff",
      "Resolve workforce exceptions and HRMS synchronization failures before cutoff.",
      "Reconciliation queue",
    ),
    regional_operations: mission(
      "combined",
      C,
      "Cross-site risk and recurring exceptions",
      "Compare locations and direct attention to the sites with the greatest operational impact.",
      "Portfolio priorities",
    ),
    customer_admin: mission(
      "combined",
      C,
      "Customer readiness and blockers",
      "Separate security coverage from workforce, visitor and integration readiness.",
      "Readiness",
    ),
    vizenta_admin: mission(
      "platform",
      P,
      "Customer and deployment health",
      "Resolve deployment, entitlement and support risk across the managed estate.",
      "Platform work queue",
    ),
  },
  retail: {
    loss_prevention: mission(
      "security",
      S,
      "Loss, safety and evidence priorities",
      "Acknowledge critical events, protect evidence and close response gaps first.",
      "Loss-prevention queue",
    ),
    regional_manager: mission(
      "combined",
      C,
      "Locations requiring intervention",
      "Compare risk, recurring patterns and unresolved actions across the region.",
      "Regional priorities",
    ),
    location_manager: mission(
      "combined",
      C,
      "Location operating position",
      "Prioritize security and closing risk at stores; prioritize dock, zone and shift flow at warehouses.",
      "Location action board",
    ),
    shift_supervisor: mission(
      "automation",
      A,
      "Shift readiness and handover",
      "Resolve staffing, zone and attendance exceptions before the operating cutoff.",
      "Shift readiness board",
    ),
    logistics: mission(
      "automation",
      A,
      "Dock, yard and arrival flow",
      "Prioritize delayed arrivals, authorization exceptions and incomplete release workflows.",
      "Dock timeline",
    ),
    customer_admin: mission(
      "combined",
      C,
      "Customer readiness and blockers",
      "Separate loss-prevention coverage from workforce and logistics integration readiness.",
      "Readiness",
    ),
    vizenta_admin: mission(
      "platform",
      P,
      "Customer and rollout health",
      "Resolve rollout, template, entitlement and support risk across the estate.",
      "Platform work queue",
    ),
  },
  manufacturing: {
    plant_security_admin: mission(
      "security",
      S,
      "Critical plant cases and response SLA",
      "Act on unauthorized access, unowned cases and degraded security coverage.",
      "Plant command queue",
    ),
    ehs_incident_commander: mission(
      "security",
      S,
      "Active command and accountability",
      "Put alarm, muster, hazards and the next command action ahead of configuration detail.",
      "EHS command board",
    ),
    plant_operations_manager: mission(
      "combined",
      C,
      "Plant operating position",
      "See critical safety, authorization, workforce and source blockers before drilling into products.",
      "Operations priorities",
    ),
    workforce_contractor_admin: mission(
      "automation",
      A,
      "Shift, contractor and payroll readiness",
      "Resolve attendance, certification and reconciliation exceptions before cutoff.",
      "Workforce readiness board",
    ),
    stores_logistics_manager: mission(
      "automation",
      A,
      "Inbound, dock and dispatch flow",
      "Prioritize arrival, authorization, delay and release exceptions.",
      "Dispatch timeline",
    ),
    customer_admin: mission(
      "combined",
      C,
      "Plant readiness and blockers",
      "Separate security response readiness from workforce, certification and ERP integration readiness.",
      "Readiness",
    ),
    vizenta_admin: mission(
      "platform",
      P,
      "Customer and deployment health",
      "Resolve deployment, integration, entitlement and support risk across the managed estate.",
      "Platform work queue",
    ),
  },
  construction: {
    site_security_admin: mission(
      "security",
      S,
      "Critical site cases and response SLA",
      "Act on unauthorized access, unowned cases and degraded security coverage.",
      "Site command queue",
    ),
    ehs_safety_manager: mission(
      "security",
      S,
      "Safety, muster and permit readiness",
      "Prioritize active hazards, accountability gaps and expiring work permits.",
      "EHS action board",
    ),
    project_site_manager: mission(
      "combined",
      C,
      "Site operating position",
      "See workforce, zone, safety and logistics blockers across the current project.",
      "Project priorities",
    ),
    workforce_contractor_admin: mission(
      "automation",
      A,
      "Crew, contractor and payroll readiness",
      "Resolve attendance, certification and contractor exceptions before cutoff.",
      "Workforce readiness board",
    ),
    logistics_materials_coordinator: mission(
      "automation",
      A,
      "Vehicle, material and delivery flow",
      "Prioritize delayed arrivals, authorization gaps and incomplete releases.",
      "Materials timeline",
    ),
    gate_guard_operator: mission(
      "security",
      S,
      "Gate and post actions",
      "Process access exceptions, dispatches and handover tasks for assigned posts.",
      "Gate action queue",
    ),
    customer_admin: mission(
      "combined",
      C,
      "Project readiness and blockers",
      "Separate site security readiness from workforce, permit and ERP integration readiness.",
      "Readiness",
    ),
    vizenta_admin: mission(
      "platform",
      P,
      "Customer and deployment health",
      "Resolve deployment, integration, entitlement and support risk across managed sites.",
      "Platform work queue",
    ),
  },
  healthcare: {
    security_admin: mission(
      "security",
      S,
      "Critical facility cases and response SLA",
      "Act on unauthorized access, unowned cases and degraded safety coverage.",
      "Security command queue",
    ),
    facilities_operations_manager: mission(
      "combined",
      C,
      "Facility operating position",
      "Resolve controlled-area, visitor, source and service-flow exceptions.",
      "Facilities action board",
    ),
    clinical_operations_coordinator: mission(
      "automation",
      A,
      "Department and service-area readiness",
      "Review non-clinical presence, staffing and access conditions across assigned units.",
      "Operations priorities",
    ),
    hr_workforce_admin: mission(
      "automation",
      A,
      "Workforce attendance and payroll cutoff",
      "Resolve workforce exceptions and HRMS synchronization failures before cutoff.",
      "Reconciliation queue",
    ),
    reception_visitor_desk: mission(
      "automation",
      A,
      "Today's visitor and contractor flow",
      "Handle waiting visitors, delayed hosts, denied access and overdue checkout.",
      "Arrival timeline",
    ),
    guard_response_operator: mission(
      "security",
      S,
      "Assigned response and handover",
      "Acknowledge events, complete dispatches and preserve evidence for escalation.",
      "Response queue",
    ),
    customer_admin: mission(
      "combined",
      C,
      "Health system readiness and blockers",
      "Separate security readiness from workforce, visitor and integration readiness.",
      "Readiness",
    ),
    vizenta_admin: mission(
      "platform",
      P,
      "Customer and deployment health",
      "Resolve deployment, integration, entitlement and support risk across facilities.",
      "Platform work queue",
    ),
  },
};
const fallback = mission(
  "combined",
  C,
  "What needs attention now",
  "Review the highest-value action in the assigned scope.",
  "Priority queue",
);

export function missionFor(industry: string, role: string): Mission {
  return missions[industry]?.[role] ?? fallback;
}

const securityRoles = new Set([
  "security_admin",
  "warden",
  "corporate_security_admin",
  "infosec_audit",
  "loss_prevention",
  "plant_security_admin",
  "ehs_incident_commander",
  "site_security_admin",
  "ehs_safety_manager",
  "gate_guard_operator",
  "guard_response_operator",
]);
const managerRoles = new Set([
  "dean",
  "coordinator",
  "facilities_manager",
  "regional_operations",
  "regional_manager",
  "location_manager",
  "shift_supervisor",
  "plant_operations_manager",
  "project_site_manager",
  "facilities_operations_manager",
  "clinical_operations_coordinator",
]);
const operatorRoles = new Set([
  "faculty",
  "reception_lead",
  "hr_workforce_admin",
  "logistics",
  "workforce_contractor_admin",
  "stores_logistics_manager",
  "logistics_materials_coordinator",
  "reception_visitor_desk",
]);

/** Five reusable access roles; industry job titles remain persona context. */
export function canonicalRoleFor(role: string) {
  if (role === "vizenta_admin") return "Vizenta Admin";
  if (role === "customer_admin") return "Customer Admin";
  if (securityRoles.has(role)) return "Security Admin";
  if (managerRoles.has(role)) return "Manager";
  if (operatorRoles.has(role)) return "Operator";
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Customer-facing labels for the repeated generated home-page measures. */
export function homeMetricLabel(role: string, label: string) {
  const canonical = canonicalRoleFor(role);
  if (/source exclusions/i.test(label)) return "Data gaps";
  if (/verified or ready/i.test(label))
    return (
      {
        "Vizenta Admin": "Deployment readiness",
        "Customer Admin": "Customer readiness",
        "Security Admin": "Security readiness",
        Manager: "Operational readiness",
        Operator: "Work completed",
      }[canonical] ?? label
    );
  if (/requiring action|needs action/i.test(label))
    return (
      {
        "Vizenta Admin": "Deployments needing action",
        "Customer Admin": "Blocking issues",
        "Security Admin": "Critical items",
        Manager: "Exceptions needing action",
        Operator: "Tasks needing attention",
      }[canonical] ?? label
    );
  return label;
}

/** Zero data gaps stay in source details instead of occupying a top KPI. */
export function showHomeMetric(label: string, value: string) {
  if (!/source exclusions/i.test(label)) return true;
  return !/^0(?:\.0+)?%?$/.test(value.trim());
}

export type Family = "Presence" | "Safety" | "Insights";
const presenceFirst: Family[] = ["Presence", "Safety", "Insights"];
const safetyFirst: Family[] = ["Safety", "Presence", "Insights"];

/** Security missions lead with Safety; the warden keeps residence presence first. */
export function familyOrder(industry: string, role: string): Family[] {
  return missionFor(industry, role).family === "security" && role !== "warden"
    ? safetyFirst
    : presenceFirst;
}

/** Stable sort by family, keeping the contract's order within each family. */
export function orderByFamily(
  products: string[],
  families: Record<string, { family: string }>,
  order: Family[],
) {
  const rank = (p: string) => {
    const i = order.indexOf(families[p]?.family as Family);
    return i < 0 ? order.length : i;
  };
  return [...products].sort((a, b) => rank(a) - rank(b));
}

/** One emphasized KPI: the first critical, else the first needing attention. */
export function primaryMetricIndex(metrics: { tone?: string }[]) {
  const critical = metrics.findIndex((m) => m.tone === "critical");
  if (critical >= 0) return critical;
  const attention = metrics.findIndex((m) =>
    ["attention", "pending", "unavailable"].includes(m.tone ?? ""),
  );
  return attention >= 0 ? attention : 0;
}

const affectedTones = ["attention", "critical", "unavailable", "pending"];
/** Whether the page's sources change the reliability of its conclusions. */
export function sourceHealth(sources: { tone?: string }[]) {
  const affected = sources.filter((s) =>
    affectedTones.includes(s.tone ?? ""),
  ).length;
  return affected
    ? {
        tone: "attention" as const,
        affected,
        label: `${affected} source${affected === 1 ? " affects" : "s affect"} this page`,
      }
    : {
        tone: "healthy" as const,
        affected,
        label: "Supporting sources current",
      };
}

export const isEvidencePanel = (title: string) =>
  /data and decision coverage|source|evidence/i.test(title);

/** Evidence starts collapsed for operators unless a source affects the page. */
export function evidenceStartsCollapsed(
  role: string,
  sources: { tone?: string }[],
) {
  return (
    !["customer_admin", "vizenta_admin"].includes(role) &&
    sourceHealth(sources).affected === 0
  );
}

export interface QueueItem<R> {
  record: R;
  title: string;
  context: string;
  state: string;
  tone: string;
}
/**
 * The top of the action queue: the first visible rows, titled by the first
 * column with the next two columns as context.
 */
export function queueItems<
  V,
  R extends {
    cells: Record<string, V>;
    state: { label: string; tone: string };
    detail: { title: string };
  },
>(
  rows: R[],
  columnIds: string[],
  text: (cell: V | undefined) => string,
  limit = 3,
): QueueItem<R>[] {
  const value = (r: R, id?: string) => {
    const t = id ? text(r.cells[id]) : "";
    return t && t !== "—" ? t : "";
  };
  return rows.slice(0, limit).map((record) => ({
    record,
    title: value(record, columnIds[0]) || record.detail.title,
    context: columnIds
      .slice(1, 3)
      .map((id) => value(record, id))
      .filter(Boolean)
      .join(" · "),
    state: record.state.label,
    tone: record.state.tone,
  }));
}

const actionTones = ["critical", "attention", "pending"];
export const needsAction = (tone: string) => actionTones.includes(tone);

/** Records that need action, critical first, keeping contract order otherwise. */
export function actionQueue<R extends { state: { tone: string } }>(rows: R[]) {
  const rank = (tone: string) => (tone === "critical" ? 0 : 1);
  return rows
    .filter((r) => needsAction(r.state.tone))
    .sort((a, b) => rank(a.state.tone) - rank(b.state.tone));
}

const ownerLabel = /^(owner|assignee|responsible)([^a-z]|$)/i;
/** Who acts on a record: its owner fact, else its assigned scope. */
export function decisionOwner<V>(
  facts: { label: string; value: V }[],
  text: (value: V) => string,
  scope: string,
) {
  const owner = facts.find((f) => ownerLabel.test(f.label));
  if (owner) return { label: "Owner", value: text(owner.value) };
  const assigned = facts.find((f) => /^assigned scope$/i.test(f.label));
  return { label: "Scope", value: assigned ? text(assigned.value) : scope };
}
