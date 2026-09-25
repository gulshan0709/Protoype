import type { Industry, PageContract } from "./types";
type Rec = PageContract["records"][number];
export function wardenProduct(education: Industry) {
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
  for (const role of ["customer_admin", "vizenta_admin"]) {
    education.core.productTabs[role] ??= {};
    education.core.productTabs[role].Warden = Object.keys(
      src[role].product.Warden,
    );
  }
  const families = (
    education.core as unknown as {
      productFamilies: Record<string, { family: string; icon: string }>;
    }
  ).productFamilies;
  if (families && !families.Warden)
    families.Warden = { family: "Presence", icon: "users" };
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
