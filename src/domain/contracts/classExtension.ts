import type { Industry, PageContract } from "./types";
import { keepDemoVolume, withDemoVolume } from "./demoVolume";
import { EDUCATION_TENANT_SCOPE } from "./pageBuilders";

const PRODUCT = "Class & Lab Attendance";

/**
 * Vizenta Admin → Class & Lab Attendance: Customer Admin's tabs (Coverage,
 * Mappings, Learners, Sources, Policies, Reports) for the education tenant
 * (Northbridge Education), as Gate and Warden are. Rows are copied after demo
 * volume fills them, so both roles list the same classes, learners and
 * cameras. Record ids are kept, so a class shows the same roster in both
 * roles; session edits stay per role (the setup store is keyed by role).
 */
export function vizentaAdminClasses(education: Industry) {
  const va = education.core.roles.vizenta_admin;
  const vaPages = education.pages.vizenta_admin;
  const ca = education.pages.customer_admin?.product[PRODUCT];
  const tabs = education.core.productTabs.customer_admin?.[PRODUCT];
  if (!va || !vaPages || !ca || !tabs || vaPages.product[PRODUCT]) return;
  const branch: Record<string, PageContract> = {};
  for (const tab of tabs) {
    const source = withDemoVolume(ca[tab], education, "customer_admin", tab);
    const page = structuredClone(source);
    page.id = source.id.replace(/^ca-/, "va-");
    page.description = page.description?.replace(
      " specifically granted to Customer Admin",
      "",
    );
    for (const record of page.records) record.scope = [...EDUCATION_TENANT_SCOPE];
    branch[tab] = keepDemoVolume(page);
  }
  vaPages.product[PRODUCT] = branch;
  if (!va.products.includes(PRODUCT)) va.products.unshift(PRODUCT);
  education.core.productTabs.vizenta_admin ??= {};
  education.core.productTabs.vizenta_admin[PRODUCT] = [...tabs];
}
