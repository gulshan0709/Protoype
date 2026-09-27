import type { DataRecord } from "./types";

export const detectionStyles = {
  threat: { label: "Threat", color: "#FACC15" },
  identified: { label: "Identified", color: "#22C55E" },
  visitor: { label: "Visitor", color: "#A855F7" },
  unidentified: { label: "Unidentified", color: "#EF4444" },
} as const;
export type DetectionKind = keyof typeof detectionStyles;

/** Demo labels come from record data, never from a person's appearance. */
export function detectionKind(record: DataRecord): DetectionKind {
  const setup = record.setup as { user_type?: string } | undefined;
  const value = [
    record.demoDetection,
    setup?.user_type,
    record.cells.type,
    record.cells.userType,
    record.cells.classification,
    record.cells.person,
    record.cells.user,
    record.detail.title,
  ]
    .filter(Boolean)
    .join(" ");
  if (/\b(threat|watchlist)\b/i.test(value)) return "threat";
  if (/\b(unidentified|unknown|unregistered|withheld)\b/i.test(value))
    return "unidentified";
  if (/\bvisitor\b/i.test(value) || record.type === "visitor") return "visitor";
  return "identified";
}
