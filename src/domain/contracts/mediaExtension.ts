import type { Industry, PageContract } from "./types";
import { mediaSummary, RETENTION_DAYS, SLOT_MINUTES } from "../media/explorer";

export const MEDIA_EXPLORER_PAGE = "va-media-explorer";

/**
 * Vizenta Admin → Media Explorer: browse every camera image in the frame store
 * by customer, camera, date and time slot (skillatracker-ui-demo's
 * /media_explorer). The page renders a custom view; it has no table rows.
 */
export function mediaExplorer(education: Industry, now = new Date()) {
  const persona = education.core.roles.vizenta_admin;
  const pages = education.pages.vizenta_admin;
  if (!persona || !pages || pages.org["Media Explorer"]) return;
  const summaries = Object.fromEntries(
    persona.scopes.map((scope) => [scope, mediaSummary(scope, now)]),
  );
  const byScope = (
    format: (summary: ReturnType<typeof mediaSummary>) => string,
  ) =>
    Object.fromEntries(
      Object.entries(summaries).map(([scope, s]) => [scope, format(s)]),
    );
  const all = mediaSummary(persona.scopes[0], now);
  const retention = `Last ${RETENTION_DAYS} days`;
  const page = {
    id: MEDIA_EXPLORER_PAGE,
    heading: "Camera media explorer",
    description:
      "Browse every processed camera image by customer, camera, date and half-hour time slot.",
    detailType: "media_frame",
    recordLabel: "frame",
    window: retention,
    metrics: [
      {
        label: "Cameras with frames",
        value: String(all.cameras),
        valuesByScope: byScope((s) => String(s.cameras)),
        context: "",
        contextsByScope: byScope(
          (s) =>
            `${s.customers} customer${s.customers === 1 ? "" : "s"} · ${retention.toLowerCase()}`,
        ),
        calculation:
          "Cameras with at least one frame folder in the retention window",
        tone: "healthy",
      },
      {
        label: "Recording now",
        value: `${all.active} / ${all.cameras}`,
        valuesByScope: byScope((s) => `${s.active} / ${s.cameras}`),
        context: "",
        contextsByScope: byScope((s) =>
          s.inactive.length
            ? `${s.inactive.join(", ")} not active`
            : "All cameras active",
        ),
        calculation: "Active cameras in the registry over cameras with frames",
        tone: "healthy",
      },
      {
        label: "Time slot",
        value: `${SLOT_MINUTES} min`,
        context: "Frames are grouped by camera, day and half hour",
        tone: "neutral",
      },
      {
        label: "Retention",
        value: `${RETENTION_DAYS} days`,
        context: "Older day folders leave the store",
        tone: "neutral",
      },
    ],
    columns: [],
    filters: [],
    records: [],
    sidePanels: [],
    sources: [
      {
        label: "Frame store",
        value: "Demo media",
        tone: "healthy",
        impact:
          "Frames are bundled HD demo footage with simulated detections. No camera bucket or media service is contacted.",
      },
    ],
    states: {
      empty: "No camera frames are stored for this scope yet.",
      degraded:
        "Some cameras are not reporting; their newest folders may be missing.",
      unavailable:
        "The frame store cannot be read right now. Folder contents are unknown, not empty.",
      notConfigured: "No frame store is configured for this deployment.",
      unauthorized: "Your role does not permit this view.",
      insufficientHistory: "There is not enough history yet.",
    },
  } as unknown as PageContract;
  const org = persona.organization;
  org.splice(
    Math.max(org.indexOf("Estate Health") + 1, 1),
    0,
    "Media Explorer",
  );
  pages.org["Media Explorer"] = { "Camera Frames": page };
}
