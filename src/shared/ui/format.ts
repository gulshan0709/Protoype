// Display formatting shared by the workspace views.

/** "gate_in-out" → "gate in out": record types and eyebrows as plain words. */
export const humanize = (text: string) =>
  text.replaceAll("-", " ").replaceAll("_", " ");

/** An audit event's timestamp in the viewer's locale. */
export const formatAuditTime = (at: string) => new Date(at).toLocaleString();
