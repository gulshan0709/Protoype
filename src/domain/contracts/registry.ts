import education from "./data/education.json";
import corporate from "./data/corporate.json";
import retail from "./data/retail.json";
import manufacturing from "./data/manufacturing.json";
import type { Industry, IndustryId, Workspace, Location } from "./types";
export const industries = {
  education,
  corporate,
  retail,
  manufacturing,
} as unknown as Record<IndustryId, Industry>;
export const defaultWorkspace: Workspace = {
  industry: "education",
  role: "customer_admin",
  scope: "Across campuses",
};
export function validWorkspace(candidate: Workspace): Workspace {
  const industry = industries[candidate?.industry];
  const role = industry?.core.roles[candidate?.role];
  return role && role.scopes.includes(candidate.scope)
    ? candidate
    : defaultWorkspace;
}
export function visibleProducts(w: Workspace) {
  return industries[w.industry].core.roles[w.role].products.filter(
    (p) =>
      !(
        w.industry === "retail" &&
        w.role === "location_manager" &&
        w.scope.startsWith("Store ") &&
        p === "Guard"
      ),
  );
}
export function homeLocation(w: Workspace): Location {
  const industry = industries[w.industry];
  const name = industry.core.roles[w.role].home;
  return {
    type: "org",
    name,
    tab: Object.keys(industry.pages[w.role].org[name])[0],
  };
}
export function getBranch(w: Workspace, type: "org" | "product", name: string) {
  if (type === "product" && !visibleProducts(w).includes(name))
    return undefined;
  return industries[w.industry].pages[w.role][type]?.[name];
}
export function getPage(w: Workspace, location: Location) {
  const base = getBranch(w, location.type, location.name)?.[location.tab];
  return (
    base?.variants?.[w.scope.startsWith("Store ") ? "store" : "warehouse"] ??
    base
  );
}
