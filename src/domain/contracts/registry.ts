import { populateMediaDemo } from "./mediaDemo";
import { populateDemoData } from "./demoData";
import { sourcesAndSetup, moveSurveillanceToShield } from "./sourcesExtension";
import { wardenProduct } from "./wardenExtension";
import { gateAttendance } from "./gateExtension";
import surveillanceSamples from "../surveillance/samples.json";
import { surveillanceUsers } from "./surveillanceExtension";
import { customerAdminLearners } from "./learnerExtension";
import { familyOrder, orderByFamily } from "./priority";
import { withDemoVolume, realisticContacts } from "./demoVolume";
import { applyCorporateRows, type AuthoredRow } from "./corporateDemo";
import corporateRows1 from "./corporate/rows-1.json";
import corporateRows2 from "./corporate/rows-2.json";
import corporateRows3 from "./corporate/rows-3.json";
import corporateRows4 from "./corporate/rows-4.json";
import education from "./data/education.json";
import corporate from "./data/corporate.json";
import retail from "./data/retail.json";
import manufacturing from "./data/manufacturing.json";
import type {
  Industry,
  IndustryId,
  Workspace,
  Location,
  DataRecord,
} from "./types";
export const industries = {
  education,
  corporate,
  retail,
  manufacturing,
} as unknown as Record<IndustryId, Industry>;
customerAdminLearners(industries.education.pages);
gateAttendance(industries.education);
wardenProduct(industries.education);
sourcesAndSetup(industries.education);
surveillanceUsers(
  industries.education,
  surveillanceSamples as unknown as Record<string, DataRecord[]>,
);
populateDemoData(industries.education);
populateMediaDemo(industries.education);
moveSurveillanceToShield(industries.education);
// Recognition users are managed from the consolidated People & Access directory.
for (const [roleId, role] of Object.entries(industries.education.core.roles)) {
  if (industries.education.pages[roleId]?.org["People & Access"]?.Users) {
    role.organization = role.organization.filter((name) => name !== "Surveillance Users");
  }
}

applyCorporateRows(industries.corporate, {
  ...corporateRows1,
  ...corporateRows2,
  ...corporateRows3,
  ...corporateRows4,
} as unknown as Record<string, AuthoredRow[]>);
// Only these corpora carry placeholder contacts or copied wording (tests keep the others clean).
realisticContacts(industries.education);
realisticContacts(industries.retail);
// People & Access reads learner pages directly, so fill them up front.
for (const [roleId, areas] of Object.entries(industries.education.pages)) {
  const learners = areas.product["Class & Lab Attendance"]?.Learners;
  if (learners) withDemoVolume(learners, industries.education, roleId, "Learners");
}

const learnerTabs =
  industries.education.core.productTabs.customer_admin[
    "Class & Lab Attendance"
  ];
if (!learnerTabs.includes("Learners"))
  learnerTabs.splice(learnerTabs.indexOf("Mappings") + 1, 0, "Learners");
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
  const core = industries[w.industry].core;
  const products = core.roles[w.role].products.filter(
    (p) =>
      !(
        w.industry === "retail" &&
        w.role === "location_manager" &&
        w.scope.startsWith("Store ") &&
        p === "Guard"
      ),
  );
  const order = familyOrder(w.industry, w.role);
  // Search and other flat lists follow the same family order as navigation.
  return order[0] === "Presence"
    ? products
    : orderByFamily(products, core.productFamilies, order);
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
  const variant = w.scope.startsWith("Store ") ? "store" : "warehouse";
  const page = base?.variants?.[variant] ?? base;
  // Demo rows are derived the first time a page is opened.
  return page
    ? withDemoVolume(
        page,
        industries[w.industry],
        w.role,
        location.tab,
        base?.variants?.[variant] ? variant : undefined,
      )
    : page;
}
