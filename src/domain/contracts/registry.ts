import { populateMediaDemo } from "./mediaDemo";
import { populateDemoData } from "./demoData";
import { sourcesAndSetup, moveSurveillanceToShield } from "./sourcesExtension";
import { wardenProduct } from "./wardenExtension";
import { gateAttendance } from "./gateExtension";
import surveillanceSamples from "../surveillance/samples.json";
import { surveillanceUsers } from "./surveillanceExtension";
import { mediaExplorer } from "./mediaExtension";
import { vizentaAdminClasses } from "./classExtension";
import { customerAdminLearners } from "./learnerExtension";
import { familyOrder, orderByFamily } from "./priority";
import { withDemoVolume, realisticContacts } from "./demoVolume";
import { applyCorporateRows, type AuthoredRow } from "./corporateDemo";
import { constructionIndustry, healthcareIndustry } from "./derivedIndustries";
import corpora from "./data/corpora.cjs";
import type {
  Industry,
  IndustryId,
  Workspace,
  Location,
  DataRecord,
} from "./types";

/*
 * Industries are built on first use: a session usually stays in one industry,
 * and parsing and preparing all six corpora up front cost most of the start-up
 * time (data/corpora.cjs evaluates a corpus only when it is first loaded). A
 * derived industry is built together with its source, before any page of the
 * source is expanded (withDemoVolume fills pages in place), exactly as if all
 * of them were built at start.
 */
function educationIndustry(): Industry {
  const education = corpora.education() as Industry;
  customerAdminLearners(education.pages);
  gateAttendance(education);
  wardenProduct(education);
  sourcesAndSetup(education);
  surveillanceUsers(
    education,
    surveillanceSamples as unknown as Record<string, DataRecord[]>,
  );
  populateDemoData(education);
  populateMediaDemo(education);
  moveSurveillanceToShield(education);
  mediaExplorer(education);
  // Recognition users are managed from the consolidated People & Access directory.
  for (const [roleId, role] of Object.entries(education.core.roles)) {
    if (education.pages[roleId]?.org["People & Access"]?.Users) {
      role.organization = role.organization.filter((name) => name !== "Surveillance Users");
    }
  }
  // Only education and retail carry placeholder contacts or copied wording (tests keep the others clean).
  realisticContacts(education);
  // People & Access reads learner pages directly, so fill them up front.
  for (const [roleId, areas] of Object.entries(education.pages)) {
    const learners = areas.product["Class & Lab Attendance"]?.Learners;
    if (learners) withDemoVolume(learners, education, roleId, "Learners");
  }
  const learnerTabs =
    education.core.productTabs.customer_admin["Class & Lab Attendance"];
  if (!learnerTabs.includes("Learners"))
    learnerTabs.splice(learnerTabs.indexOf("Mappings") + 1, 0, "Learners");
  // After demo volume and contacts, so Vizenta Admin lists the same rows.
  vizentaAdminClasses(education);
  return education;
}
function corporateFamily() {
  const corporate = corpora.corporate() as Industry;
  applyCorporateRows(
    corporate,
    corpora.corporateRows() as Record<string, AuthoredRow[]>,
  );
  return { corporate, healthcare: healthcareIndustry(corporate) };
}
function manufacturingFamily() {
  const manufacturing = corpora.manufacturing() as Industry;
  return {
    manufacturing,
    construction: constructionIndustry(manufacturing),
  };
}
function retailIndustry(): Industry {
  const retail = corpora.retail() as Industry;
  realisticContacts(retail);
  return retail;
}
const builders: Record<IndustryId, () => Partial<Record<IndustryId, Industry>>> = {
  education: () => ({ education: educationIndustry() }),
  corporate: corporateFamily,
  retail: () => ({ retail: retailIndustry() }),
  manufacturing: manufacturingFamily,
  construction: manufacturingFamily,
  healthcare: corporateFamily,
};
/** Every industry by id; each is built the first time it is read. */
export const industries = {} as Record<IndustryId, Industry>;
for (const id of Object.keys(builders) as IndustryId[])
  Object.defineProperty(industries, id, {
    enumerable: true,
    configurable: true,
    get() {
      for (const [built, value] of Object.entries(builders[id]()))
        Object.defineProperty(industries, built, {
          value,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      return industries[id];
    },
  });
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
