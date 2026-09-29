import type { IndustryId } from "./types";
import { canonicalRoleFor } from "./priority";

export type SolutionId = "education" | "enterprise";

const enterpriseTemplates: Exclude<IndustryId, "education">[] = [
  "corporate",
  "retail",
  "manufacturing",
  "construction",
  "healthcare",
];

export const solutionFor = (industry: IndustryId): SolutionId =>
  industry === "education" ? "education" : "enterprise";

export const solutionLabel = (industry: IndustryId) =>
  industry === "education" ? "Education" : "Enterprise";

export const templateLabel = (industry: IndustryId) =>
  ({
    education: "Education",
    corporate: "Corporate",
    retail: "Retail & Warehouse",
    manufacturing: "Manufacturing",
    construction: "Construction",
    healthcare: "Healthcare",
  })[industry];

export const templatesFor = (solution: SolutionId): IndustryId[] =>
  solution === "education" ? ["education"] : enterpriseTemplates;

export const workspaceRoleLabel = (role: string, persona: string) => {
  const accessRole = canonicalRoleFor(role);
  return accessRole === persona ? persona : `${accessRole} · ${persona}`;
};

const productIcons: Record<string, string> = {
  Gate: "gate",
  Zones: "zone",
  "Workforce Attendance": "users",
  Shield: "shield",
  Guard: "guard",
  Visitor: "visitor",
  "AI Analytics": "sparkle",
};

export function productIcon(
  industry: IndustryId,
  product: string,
  authored: string,
) {
  return industry === "education"
    ? authored
    : (productIcons[product] ?? authored);
}

const productDescriptions: Record<string, string> = {
  Gate: "Monitor movement across site boundaries, investigate exceptions and review presence history.",
  Zones:
    "Monitor authorized and unauthorized presence across periodic and continuous zones.",
  "Workforce Attendance":
    "Review workforce presence, resolve attendance exceptions and prepare approved data for connected systems.",
  Shield:
    "Triage alerts, manage cases and incidents, preserve evidence and coordinate escalation.",
  Guard:
    "Manage posts, patrols, dispatches, coverage gaps and response activity.",
  Visitor:
    "Manage expected visitors, arrivals, on-site presence, exceptions and departures.",
  "AI Analytics":
    "Ask operational questions, monitor trends, use saved views and produce reports across assigned sites.",
};

/**
 * Education keeps its authored vertical descriptions. Enterprise products use
 * one common explanation; the selected template changes records and defaults,
 * not the meaning of the product.
 */
export function pageDescription(
  industry: IndustryId,
  type: "org" | "product",
  name: string,
  authored?: string,
) {
  if (industry === "education" || type !== "product") return authored;
  return productDescriptions[name] ?? authored;
}
