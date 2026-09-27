import type { Industry, PageContract } from "./types";
type Rec = PageContract["records"][number];
export function sourcesAndSetup(education: Industry) {
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
      records: structuredClone(records),
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

/** Keep monitoring with Shield while retaining stable page IDs and preferences. */
export function moveSurveillanceToShield(education: Industry) {
  const admin = education.pages.customer_admin;
  const setup = admin?.org["Sources & Setup"];
  const shield = admin?.product.Shield;
  if (!setup || !shield) return;
  const monitoring = [
    "Surveillance Dashboard",
    "Surveillance Attendance",
    "Video Analytics",
  ];
  const moved = Object.fromEntries(
    monitoring
      .map((tab) => [tab, setup[tab] ?? shield[tab]])
      .filter(([, page]) => !!page),
  );
  const remaining = Object.entries(shield).filter(
    ([tab]) => !monitoring.includes(tab),
  );
  for (const tab of monitoring) delete setup[tab];
  for (const tab of Object.keys(shield)) delete shield[tab];
  Object.assign(shield, moved, Object.fromEntries(remaining));
  education.core.productTabs.customer_admin.Shield = Object.keys(shield);
}
