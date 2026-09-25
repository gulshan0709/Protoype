import type { PageContract } from "./types";

// Pages added on top of the imported reference contracts
// (scripts/import-contracts.cjs regenerates data/*.json, so additions live
// here instead of in the JSON).

type Pages = Record<string, Record<string, Record<string, PageContract>>>;

/** Inserts `tab` into a product branch right after `after`, keeping order. */
function insertTab(
  branch: Record<string, PageContract>,
  after: string,
  tab: string,
  page: PageContract,
) {
  const entries = Object.entries(branch).filter(([k]) => k !== tab);
  const at = entries.findIndex(([k]) => k === after) + 1;
  entries.splice(at || entries.length, 0, [tab, page]);
  for (const key of Object.keys(branch)) delete branch[key];
  Object.assign(branch, Object.fromEntries(entries));
}

/**
 * Customer Admin → Class & Lab Attendance → Learners.
 * Built from the learner records the reference provides (Engineering
 * College, which the Academic Structure contract places on Main Campus).
 * Metrics count those records; they are not new measurements.
 */
function customerAdminLearners(
  pages: Record<string, { product: Pages[string] }>,
) {
  const dean = pages.dean?.product["Class & Lab Attendance"]?.Learners;
  const branch = pages.customer_admin?.product["Class & Lab Attendance"];
  if (!dean || !branch || branch.Learners) return;
  const scope = ["Across campuses", "Main Campus"];
  const records = dean.records.map((r) => ({
    ...r,
    id: r.id.replace(/^dean-/, "ca-"),
    scope,
  }));
  const count = (test: (r: (typeof records)[number]) => boolean) =>
    String(records.filter(test).length);
  const page: PageContract = {
    ...dean,
    id: "ca-class-learners",
    heading: "Learners across campuses",
    description:
      "Learner identity, academic path and mapping status used by class and lab attendance.",
    metrics: [
      {
        label: "Learners listed",
        value: count(() => true),
        context: "Reference roster · Main Campus",
        tone: "healthy",
      },
      {
        label: "Mapping complete",
        value: count((r) => r.cells.mapping === "Complete"),
        context: "Ready for attendance",
        tone: "healthy",
      },
      {
        label: "Needs review",
        value: count((r) => r.state.tone === "attention"),
        context: "Open exceptions",
        tone: "attention",
      },
      {
        label: "Mapping blocked",
        value: count((r) => r.cells.mapping === "Blocked"),
        context: "Duplicate or missing UID",
        tone: "critical",
      },
    ],
    filters: dean.filters.filter((f) =>
      ["department", "program", "mapping", "state"].includes(f.id),
    ),
    // The dean's side panels describe the dean's college; only the shared
    // source list applies here.
    sidePanels: [],
    records,
  };
  insertTab(branch, "Mappings", "Learners", page);
}

/**
 * Surveillance Users (people the cameras recognise) for Vizenta Admin and
 * Customer Admin, from the legacy /UsersList screen. The reference has no
 * such page, so it starts empty; users are added in the session.
 */
function surveillanceUsers(education: Education) {
  const targets: [role: string, id: string, after: string][] = [
    ["vizenta_admin", "va-surveillance-users", "Customers & Deployments"],
    ["customer_admin", "ca-surveillance-users", "People & Access"],
  ];
  for (const [role, id, after] of targets) {
    const persona = education.core.roles[role];
    const pages = education.pages[role];
    if (!persona || !pages || pages.org["Surveillance Users"]) continue;
    const page = {
      id,
      heading: "Surveillance users",
      description:
        "People the cameras recognise: identified staff and residents, visitors with a validity window, and threats that raise an alert.",
      detailType: "surveillance_user",
      recordLabel: "user",
      // Replaced by live counts of the rows in scope (see LIVE_METRICS).
      metrics: ["Identified", "Threat", "Visitor", "Without face image"].map(
        (label) => ({ label, value: "0", context: "", tone: "healthy" }),
      ),
      columns: [
        { id: "user", label: "User / UID", type: "text" },
        { id: "email", label: "Email", type: "text" },
        { id: "phone", label: "Phone", type: "text" },
        { id: "type", label: "User type", type: "text" },
        { id: "shift", label: "Shift / validity", type: "text" },
        { id: "group", label: "Camera group", type: "text" },
        { id: "image", label: "Face image", type: "text" },
      ],
      filters: [
        {
          id: "type",
          label: "User type",
          options: ["All types", "Identified", "Threat", "Visitor"],
        },
        {
          id: "image",
          label: "Face image",
          options: ["All images", "Provided", "Missing"],
        },
      ],
      records: [],
      sidePanels: [],
      sources: [
        {
          label: "Recognition service",
          value: "Not connected",
          tone: "unavailable",
          impact:
            "Users are enrolled for recognition once the service is connected",
        },
      ],
      states: {
        empty:
          "No surveillance users yet. Use + User or Bulk Upload User to add the people the cameras should recognise.",
        degraded: "The recognition service is not connected.",
        notConfigured:
          "Surveillance users cannot be enrolled until the recognition service is connected.",
        unauthorized: "Your role does not permit this view.",
        insufficientHistory: "There is not enough history yet.",
      },
    } as unknown as PageContract;
    const org = persona.organization;
    org.splice(Math.max(org.indexOf(after) + 1, 1), 0, "Surveillance Users");
    pages.org["Surveillance Users"] = { Users: page };
  }
}

type Rec = PageContract["records"][number];

/**
 * Gate → User Attendance and In/Out (legacy /User_Attendance and /in_out)
 * for Customer Admin, Warden and Vizenta Admin. Rows come from the gate
 * history and resident movement records the reference provides.
 */
function gateAttendance(education: Education) {
  const src = education.pages;
  const history = (role: string): Rec[] =>
    src[role]?.product.Gate?.History?.records ?? [];
  const movement: Rec[] =
    src.warden?.product.Gate?.["Resident Movement"]?.records ?? [];
  const text = (v: unknown) => (typeof v === "string" ? v : "");

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

  const states = (subject: string) => ({
    empty: `No ${subject} match this scope and filter set.`,
    degraded: `A gate source is degraded; affected ${subject} keep their last verified event and are not treated as absent.`,
    notConfigured: "This view needs configured gate cameras.",
    unauthorized: "Your role does not permit this view.",
    insufficientHistory: "There is not enough gate history yet.",
  });
  const attendancePage = (id: string, records: Rec[]): PageContract =>
    ({
      id,
      heading: "User attendance",
      description:
        "Daily gate attendance per person: first verified entry, last exit and time on campus.",
      detailType: "gate_attendance",
      // Replaced by live counts of the rows in scope.
      metrics: ["Present", "Still inside", "Low confidence", "Absent"].map(
        (label) => ({ label, value: "0", context: "", tone: "healthy" }),
      ),
      columns: [
        { id: "user", label: "Name / UID", type: "text" },
        { id: "type", label: "User type", type: "text" },
        { id: "date", label: "Date", type: "text" },
        { id: "shift", label: "Shift", type: "text" },
        { id: "status", label: "Status", type: "text" },
        { id: "log", label: "Log hours", type: "text" },
        { id: "checkIn", label: "Check-in", type: "text" },
        { id: "checkOut", label: "Check-out", type: "text" },
      ],
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
      metrics: ["In", "Out", "Out without return"].map((label) => ({
        label,
        value: "0",
        context: "",
        tone: "healthy",
      })),
      columns: [
        { id: "person", label: "Name / ID", type: "text" },
        { id: "hostel", label: "Hostel", type: "text" },
        { id: "status", label: "Status", type: "text" },
        { id: "gate", label: "Gate", type: "text" },
        { id: "captured", label: "Captured time", type: "text" },
      ],
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
    const campus = (r: Rec) => [
      "Across campuses",
      ...r.scope.filter(
        (x) => x !== "Across campuses" && !x.startsWith("Hostel"),
      ),
    ];
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
    const tenant = () => ["All customers", "Northbridge Education"];
    vaPages.product.Gate = {
      "User Attendance": attendancePage(
        "va-gate-user-attendance",
        attendanceRows(history("security_admin"), "va", tenant),
      ),
      "In/Out": inOutPage("va-gate-in-out", inOutRows("va", tenant)),
    };
    if (!va.products.includes("Gate")) va.products.push("Gate");
  }
}

/**
 * Presence → Warden (legacy /warden, /hostel and /leave_management) for
 * Customer Admin and Vizenta Admin. Seeded from the wardens, hostels and
 * leave requests the reference provides; details the reference does not
 * hold (warden email and phone) are left for the admin to complete.
 */
function wardenProduct(education: Education) {
  const src = education.pages;
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  const hostels: Rec[] =
    src.customer_admin?.product.Hostel?.Hostels?.records ?? [];
  const leaves: Rec[] =
    src.warden?.product.Hostel?.["Leave & Returns"]?.records ?? [];
  const rosters: Rec[] =
    src.customer_admin?.product.Hostel?.Rosters?.records ?? [];
  // Warden names that appear as owners in the warden's hostel pages.
  const wardenNames = [
    ...new Set(
      Object.values(src.warden?.product.Hostel ?? {})
        .flatMap((p) => p.records)
        .map((r) => text(r.cells.owner))
        .filter((o) => /^Warden\s/.test(o)),
    ),
  ];
  const states = (subject: string) => ({
    empty: `No ${subject} match this scope and filter set.`,
    degraded: "A source is degraded.",
    notConfigured: "This view is not configured.",
    unauthorized: "Your role does not permit this view.",
    insufficientHistory: "There is not enough history yet.",
  });
  const residentSources =
    src.customer_admin?.product.Hostel?.Rosters?.sources ?? [];

  const build = (prefix: string, scope: (r?: Rec) => string[]) => {
    const wardenRows: Rec[] = wardenNames.map((name, i) => ({
      id: `${prefix}-WDN-${i + 1}`,
      type: "warden",
      cells: {
        warden: name,
        email: "—",
        phone: "—",
        designation: "Warden",
        hostels: "—",
        state: "Details missing",
      },
      state: { label: "Details missing", tone: "attention" },
      action: "Open warden",
      scope: scope(),
      detail: {
        title: name,
        eyebrow: "WARDEN",
        summary:
          "Named as an owner in the hostel records. Add email, phone and assigned hostels with Edit.",
        facts: [
          { label: "Designation", value: "Warden" },
          { label: "Email", value: "—" },
          { label: "Phone", value: "—" },
          { label: "Hostels", value: "—" },
        ],
        sections: [],
        timeline: [],
        permittedActions: [],
      },
    })) as Rec[];
    const hostelRows: Rec[] = hostels.map((r) => ({
      ...r,
      id: `${prefix}-HST-${r.id}`,
      type: "hostel",
      cells: {
        hostel: r.cells.hostel,
        wardens: r.cells.wardens,
        closing: r.cells.closing,
        rooms: r.cells.structure,
        state: r.cells.state,
      },
      scope: scope(r),
    }));
    const leaveRows: Rec[] = leaves.map((r) => {
      const [name, uid] = text(r.cells.resident).split(" · ");
      const window = text(r.cells.window);
      const [start, end] = leaveDates(window);
      const decision = text(r.cells.decision);
      const status = /^Approved/.test(decision)
        ? "Approved"
        : /^Rejected/.test(decision)
          ? "Rejected"
          : "Pending";
      return {
        ...r,
        id: `${prefix}-LV-${r.id}`,
        type: "leave",
        cells: {
          student: `${name} · ${uid ?? "—"}`,
          start,
          end,
          count: String(leaveCount(window)),
          reason: r.cells.destination,
          status,
          state: status,
        },
        state: {
          label: status,
          tone:
            status === "Approved"
              ? "complete"
              : status === "Rejected"
                ? "critical"
                : "pending",
        },
        scope: scope(r),
      };
    });
    // Residents a leave can be raised for (hostel rosters and existing leaves).
    const students = [
      ...new Set([
        ...rosters
          .map((r) => text(r.cells.resident))
          .filter((x) => x.includes(" · ")),
        ...leaveRows.map((r) => text(r.cells.student)),
      ]),
    ];
    const page = (
      id: string,
      heading: string,
      description: string,
      detailType: string,
      recordLabel: string,
      columns: [string, string][],
      filters: { id: string; label: string; options: string[] }[],
      records: Rec[],
      extra: Record<string, unknown> = {},
    ) =>
      ({
        id,
        heading,
        description,
        detailType,
        recordLabel,
        metrics: [],
        columns: columns.map(([cid, label]) => ({
          id: cid,
          label,
          type: "text",
        })),
        filters,
        records,
        sidePanels: [],
        sources: residentSources,
        states: states(`${recordLabel}s`),
        ...extra,
      }) as unknown as PageContract;
    return {
      Wardens: page(
        `${prefix}-warden-wardens`,
        "Warden / sub admin management",
        "Wardens manage their assigned hostels; sub admins see the whole residence dashboard in view-only mode and can download reports.",
        "warden",
        "warden",
        [
          ["warden", "Name"],
          ["email", "Email"],
          ["phone", "Phone"],
          ["designation", "Designation"],
          ["hostels", "Hostels"],
        ],
        [
          {
            id: "designation",
            label: "Designation",
            options: ["All", "Warden", "Sub Admin"],
          },
        ],
        wardenRows,
      ),
      Hostels: page(
        `${prefix}-warden-hostels`,
        "Hostel management",
        "Hostels, their closing time and the wardens responsible for them.",
        "hostel",
        "hostel",
        [
          ["hostel", "Hostel name"],
          ["wardens", "Wardens"],
          ["closing", "Closing time"],
          ["rooms", "Blocks / rooms"],
        ],
        [],
        hostelRows,
      ),
      "Leave Management": page(
        `${prefix}-warden-leaves`,
        "Leave management",
        "Leave applications for residents. Approved leave explains an exit; pending leave can still be edited.",
        "leave",
        "leave",
        [
          ["student", "Name / UID"],
          ["start", "Start date"],
          ["end", "End date"],
          ["count", "Leave count"],
          ["reason", "Reason"],
          ["status", "Status"],
        ],
        [
          {
            id: "status",
            label: "Status",
            options: ["All statuses", "Pending", "Approved", "Rejected"],
          },
        ],
        leaveRows,
        { students },
      ),
    };
  };

  const add = (role: string, prefix: string, scope: (r?: Rec) => string[]) => {
    const persona = education.core.roles[role];
    const pages = src[role];
    if (!persona?.products || !pages || pages.product.Warden) return;
    pages.product.Warden = build(prefix, scope);
    const at = persona.products.indexOf("Hostel");
    if (!persona.products.includes("Warden"))
      persona.products.splice(
        at >= 0 ? at + 1 : persona.products.length,
        0,
        "Warden",
      );
  };
  add("customer_admin", "ca", (r) => [
    // Campus-level scopes only; the campus-wide view lists every record.
    "Across campuses",
    ...(r
      ? r.scope.filter(
          (x) => x !== "Across campuses" && !x.startsWith("Hostel"),
        )
      : ["Residential Campus"]),
  ]);
  add("vizenta_admin", "va", () => ["All customers", "Northbridge Education"]);
  const families = (
    education.core as unknown as {
      productFamilies: Record<string, { family: string; icon: string }>;
    }
  ).productFamilies;
  if (families && !families.Warden)
    families.Warden = { family: "Presence", icon: "users" };
}

/**
 * Customer Admin → Sources & Setup, restructured around the legacy
 * /skilla_SetUp tabs (Setup, Camera Setup, Shift, Camera Criteria) plus
 * /Surveillance_dashboard, /Surveillance_Attendance and /Video_Analytics.
 * The reference "Cameras" tab becomes Camera Setup; Schedules,
 * Notifications and Integrations stay.
 */
function sourcesAndSetup(education: Education) {
  const src = education.pages;
  const branch = src.customer_admin?.org["Sources & Setup"];
  if (!branch || branch.Setup) return;
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  const cameras: Rec[] = branch.Cameras?.records ?? [];
  const sources = branch.Cameras?.sources ?? [];
  const gate = src.security_admin?.product.Gate;
  const states = (subject: string) => ({
    empty: `No ${subject} match this scope and filter set.`,
    degraded:
      "A camera source is degraded; affected values are not treated as zero.",
    notConfigured: "This view needs configured cameras.",
    unauthorized: "Your role does not permit this view.",
    insufficientHistory: "There is not enough history yet.",
  });
  const page = (
    id: string,
    heading: string,
    description: string,
    detailType: string,
    recordLabel: string | undefined,
    columns: [string, string][],
    filters: { id: string; label: string; options: string[] }[],
    records: Rec[],
  ) =>
    ({
      id,
      heading,
      description,
      detailType,
      ...(recordLabel ? { recordLabel } : {}),
      metrics: [],
      columns: columns.map(([cid, label]) => ({
        id: cid,
        label,
        type: "text",
      })),
      filters,
      records,
      sidePanels: [],
      sources,
      states: states(recordLabel ? `${recordLabel}s` : "records"),
    }) as unknown as PageContract;

  // Camera Setup: the reference cameras, in the legacy camera-list shape.
  const cameraRows: Rec[] = cameras.map((r) => {
    const result = text(r.cells.result);
    const active = /^Online/.test(result);
    return {
      ...r,
      id: `SET-${r.id}`,
      type: "setup_camera",
      cells: {
        display: r.cells.camera,
        location: r.cells.location,
        brand: "—",
        cameraId: "—",
        ip: "—",
        port: "—",
        user: "—",
        days: "—",
        start: "—",
        end: "—",
        use: r.cells.use,
        status: active ? "Active" : "Not active",
        state: result,
      },
      state: r.state,
    };
  });

  // Detections for Surveillance Attendance and the dashboard, from the gate
  // live feed, watchlist hits and visitors on site.
  const detections: Rec[] = [
    ...(gate?.Live?.records ?? []).map((r) => {
      const t = text(r.cells.type);
      const [kind, uid] = t.split(" · ");
      const unknown = /unmatched/i.test(kind);
      const [, time] = text(r.cells.movement).split(" · ");
      return {
        ...r,
        id: `DET-LIVE-${r.id}`,
        cells: {
          uid: unknown
            ? text(r.cells.person).replace(/^Unknown capture\s*/, "")
            : (uid ?? "—"),
          name: unknown ? "Unregistered" : r.cells.person,
          camera: r.cells.gate,
          type: unknown ? "Unidentified" : "Identified",
          time: time ?? "—",
          confidence: r.cells.confidence,
          state: unknown ? "Unidentified" : "Identified",
        },
        state: unknown
          ? { label: "Unidentified", tone: "attention" }
          : { label: "Identified", tone: "healthy" },
      } as Rec;
    }),
    ...(gate?.Watchlist?.records ?? []).map((r) => {
      const [subject, uid] = text(r.cells.subject).split(" · ");
      const [camera, time] = text(r.cells.gate).split(" · ");
      return {
        ...r,
        id: `DET-WL-${r.id}`,
        cells: {
          uid: uid ?? "—",
          name: /concealed|potential/i.test(subject)
            ? "Identity withheld"
            : subject,
          camera,
          type: "Threat",
          time: time ?? "—",
          confidence: r.cells.confidence,
          state: "Threat",
        },
        state: { label: "Threat", tone: "critical" },
      } as Rec;
    }),
    ...(src.security_admin?.product.Visitor?.["On Site"]?.records ?? []).map(
      (r) => {
        const [name] = text(r.cells.visitor).split(" · ");
        const [last, time] = text(r.cells.last).split(" · ");
        // "4 / 4 reconciled" is a count, not a place: fall back to the area.
        const area = /\d\s*\/\s*\d/.test(last) ? text(r.cells.areas) : last;
        return {
          ...r,
          id: `DET-VIS-${r.id}`,
          cells: {
            uid: r.cells.visit,
            name,
            camera: area,
            type: "Visitor",
            time: time ?? "—",
            confidence: "—",
            state: "Visitor",
          },
          state: { label: "Visitor", tone: "attention" },
        } as Rec;
      },
    ),
  ].map((r) => ({
    ...r,
    scope: [
      "Across campuses",
      ...r.scope.filter((x) => x !== "Across campuses"),
    ],
  }));

  // Video Analytics: clip and frame references held as Shield evidence.
  const clips: Rec[] = (
    src.security_admin?.product.Shield?.Evidence?.records ?? []
  ).map((r) => {
    const [place, cam] = text(r.cells.source).split(" · ");
    const [date, start] = text(r.cells.captured).split(" · ");
    return {
      ...r,
      id: `VID-${r.id}`,
      cells: {
        camera: place,
        users: text(r.cells.access).includes("withheld")
          ? "Identity withheld"
          : "Restricted",
        cameraId: cam ?? "—",
        date,
        start: start ?? "—",
        kind: r.cells.kind,
        media: /unavailable|expired/i.test(
          `${text(r.cells.integrity)} ${text(r.cells.retention)}`,
        )
          ? "Media unavailable"
          : "Reference only",
        state: r.cells.integrity,
      },
      scope: [
        "Across campuses",
        ...r.scope.filter((x) => x !== "Across campuses"),
      ],
    } as Rec;
  });

  const detectionColumns: [string, string][] = [
    ["uid", "UID"],
    ["name", "Name"],
    ["camera", "Camera name"],
    ["type", "User type"],
    ["time", "Time"],
    ["confidence", "Confidence"],
  ];
  const typeFilter = {
    id: "type",
    label: "User type",
    options: ["All types", "Identified", "Threat", "Visitor", "Unidentified"],
  };
  const next: Record<string, PageContract> = {
    Setup: page(
      "ca-setup-setup",
      "Setup",
      "Modules, notification channels and data retention for surveillance.",
      "setup",
      undefined,
      [],
      [],
      [],
    ),
    "Camera Setup": page(
      "ca-setup-cameras",
      "Camera setup",
      "Camera configuration: connection, schedule and location for every camera.",
      "camera",
      "camera",
      [
        ["display", "Display name"],
        ["location", "Location"],
        ["brand", "Camera brand"],
        ["cameraId", "Camera ID"],
        ["ip", "IP address"],
        ["port", "Port"],
        ["days", "Active days"],
        ["start", "Start time"],
        ["end", "End time"],
        ["status", "Status"],
      ],
      [
        {
          id: "status",
          label: "Status",
          options: ["All", "Active", "Not active"],
        },
      ],
      cameraRows,
    ),
    Shift: page(
      "ca-setup-shifts",
      "Shifts",
      "Shifts assigned to surveillance users, with check-in and check-out buffers.",
      "shift",
      "shift",
      [
        ["name", "Shift name"],
        ["start", "Start time"],
        ["end", "End time"],
        ["startBuffer", "Start buffer (mins)"],
        ["endBuffer", "End buffer (mins)"],
      ],
      [],
      [],
    ),
    "Camera Criteria": page(
      "ca-setup-criteria",
      "Camera acceptance criteria",
      "Quality thresholds used to score every camera during the service-status health check.",
      "criteria",
      undefined,
      [],
      [],
      [],
    ),
    "Surveillance Dashboard": page(
      "ca-setup-dashboard",
      "Surveillance dashboard",
      "Per-camera view: camera details, today's recognitions and recordings.",
      "dashboard",
      undefined,
      detectionColumns,
      [],
      detections,
    ),
    "Surveillance Attendance": page(
      "ca-setup-attendance",
      "Surveillance attendance",
      "Every recognition across all cameras. Unregistered people can be registered as surveillance users.",
      "detection",
      "detection",
      detectionColumns,
      [
        {
          id: "camera",
          label: "Camera",
          options: [
            "All cameras",
            ...new Set(detections.map((d) => text(d.cells.camera))),
          ],
        },
        typeFilter,
      ],
      detections,
    ),
    "Video Analytics": page(
      "ca-setup-video",
      "Video analytics",
      "Recorded clips and frames by camera. Media plays only where the recording service holds the file.",
      "video",
      "recording",
      [
        ["camera", "Camera"],
        ["users", "Users"],
        ["cameraId", "Camera ID"],
        ["date", "Date"],
        ["start", "Start time"],
        ["kind", "Recording"],
        ["media", "Video"],
      ],
      [
        {
          id: "camera",
          label: "Camera",
          options: [
            "All cameras",
            ...new Set(clips.map((c) => text(c.cells.camera))),
          ],
        },
      ],
      clips,
    ),
  };
  const rest = Object.fromEntries(
    Object.entries(branch).filter(([k]) => k !== "Cameras"),
  );
  for (const key of Object.keys(branch)) delete branch[key];
  Object.assign(branch, next, rest);
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
/** "Sep 16–18" / "Sep 15 17:00–22:00" → ISO start and end dates (2026). */
function leaveDates(window: string): [string, string] {
  const m = window.match(/^([A-Z][a-z]{2}) (\d{1,2})(?:–(\d{1,2})(?!:))?/);
  if (!m) return [window, window];
  const month = String(MONTHS.indexOf(m[1]) + 1).padStart(2, "0");
  const day = (d: string) => `2026-${month}-${d.padStart(2, "0")}`;
  return [day(m[2]), day(m[3] ?? m[2])];
}
function leaveCount(window: string): number {
  const [start, end] = leaveDates(window);
  const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  return Number.isFinite(days) && days > 0 ? days : 1;
}

/** "Sep 14 10:04" → ["Sep 14", "10:04"]. */
function splitStamp(stamp: string): [string, string] {
  const m = stamp.match(/^(.*\S)\s+(\d{1,2}:\d{2})$/);
  return m ? [m[1], m[2]] : [stamp, "—"];
}

type Education = {
  core: {
    roles: Record<string, { organization: string[]; products?: string[] }>;
  };
  pages: Record<
    string,
    {
      product: Pages[string];
      org: Record<string, Record<string, PageContract>>;
    }
  >;
};

export function extendEducation(education: Education) {
  customerAdminLearners(education.pages);
  surveillanceUsers(education);
  gateAttendance(education);
  wardenProduct(education);
  sourcesAndSetup(education);
}
