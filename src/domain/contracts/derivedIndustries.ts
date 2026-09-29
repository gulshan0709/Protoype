import type { Industry, IndustryId, Persona } from "./types";
import { escapeRegExp } from "../common/text";

type RoleSpec = {
  id: string;
  from: string;
  label: string;
  home?: string;
  scopes?: string[];
  products?: string[];
  replacements?: [string, string][];
};

type Fix = (text: string) => string;

/**
 * One replacement pass: longest patterns first, each applied to the result of
 * the one before. The corpora repeat a few thousand distinct strings hundreds
 * of thousands of times, so each result is remembered.
 */
function replacer(pairs: [string, string][]): Fix {
  const ordered = [...pairs].sort((a, b) => b[0].length - a[0].length);
  // A text with none of the patterns stays as it is: no pass can change it.
  const any = new RegExp(ordered.map(([from]) => escapeRegExp(from)).join("|"));
  const memo = new Map<string, string>();
  return (text) => {
    let out = memo.get(text);
    if (out === undefined) {
      out = any.test(text)
        ? ordered.reduce(
            (t, [from, to]) => (t.includes(from) ? t.split(from).join(to) : t),
            text,
          )
        : text;
      memo.set(text, out);
    }
    return out;
  };
}
const then =
  (first: Fix, second: Fix): Fix =>
  (text) =>
    second(first(text));

/** A deep copy with every string and object key passed through `fix`. */
function mapDeep<T>(value: T, fix: Fix): T {
  const walk = (input: unknown): unknown => {
    if (typeof input === "string") return fix(input);
    if (Array.isArray(input)) return input.map(walk);
    if (input && typeof input === "object")
      return Object.fromEntries(
        Object.entries(input).map(([key, entry]) => [fix(key), walk(entry)]),
      );
    return input;
  };
  return walk(value) as T;
}

function roleFrom(
  source: Industry,
  spec: RoleSpec,
  industryFix: Fix,
): {
  persona: Persona;
  pages: Industry["pages"][string];
  productTabs: Record<string, string[]>;
} {
  // The role's own replacements run after the industry's, as a second pass would.
  const fix = spec.replacements?.length
    ? then(industryFix, replacer(spec.replacements))
    : industryFix;
  const persona = mapDeep(source.core.roles[spec.from], fix);
  const pages = mapDeep(source.pages[spec.from], fix);
  const productTabs = mapDeep(source.core.productTabs[spec.from] ?? {}, fix);
  persona.label = spec.label;
  if (spec.scopes) persona.scopes = spec.scopes;
  if (spec.products) persona.products = spec.products;
  if (spec.home && spec.home !== persona.home) {
    const oldHome = persona.home;
    pages.org[spec.home] = pages.org[oldHome];
    delete pages.org[oldHome];
    persona.organization = persona.organization.map((name) =>
      name === oldHome ? spec.home! : name,
    );
    persona.home = spec.home;
  }
  return { persona, pages, productTabs };
}

function derive(
  source: Industry,
  id: IndustryId,
  label: string,
  tenant: string,
  replacements: [string, string][],
  roles: RoleSpec[],
): Industry {
  const fix = replacer(replacements);
  // Roles, tabs and pages are rebuilt per role below, so the source's pages
  // (nearly all of its size) are not rewritten here.
  const base = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      fix(key),
      key === "pages" ? {} : mapDeep(value, fix),
    ]),
  ) as unknown as Industry;
  const result: Industry = {
    ...base,
    id,
    label,
    tenant,
    core: {
      ...base.core,
      roles: {},
      productTabs: {},
    },
    pages: {},
  };
  for (const spec of roles) {
    const role = roleFrom(source, spec, fix);
    result.core.roles[spec.id] = role.persona;
    result.core.productTabs[spec.id] = role.productTabs;
    result.pages[spec.id] = role.pages;
  }
  return result;
}

const commonProducts = [
  "Gate",
  "Zones",
  "Workforce Attendance",
  "Shield",
  "Guard",
  "Visitor",
  "AI Analytics",
];

export function constructionIndustry(manufacturing: Industry): Industry {
  return derive(
    manufacturing,
    "construction",
    "Construction",
    "Apex Construction",
    [
      ["Apex Manufacturing Group", "Apex Construction Group"],
      ["Meridian Manufacturing", "Apex Construction"],
      ["Meridian Industrial", "Apex Construction"],
      ["Manufacturing", "Construction"],
      ["manufacturing", "construction"],
      ["Enterprise · all plants", "Portfolio · all projects"],
      ["Across assigned plants", "Across assigned sites"],
      ["Unit II · Hisar", "Riverfront Tower Project"],
      ["Plant North", "Hospital Expansion Site"],
      ["Plant South", "Metro Infrastructure Site"],
      ["Distribution Unit", "Central Materials Yard"],
      ["Plants, Lines & Stations", "Projects, Work Areas & Zones"],
      ["Plants & Security Areas", "Sites & Security Areas"],
      ["Plant Structure", "Project Structure"],
      ["Plant Readiness", "Project Readiness"],
      ["Plant governance", "Project governance"],
      ["Plant operations", "Site operations"],
      ["Plant security", "Site security"],
      ["Plant", "Site"],
      ["plant", "site"],
      ["Lines", "Work Areas"],
      ["Line", "Work Area"],
      ["lines", "work areas"],
      ["line", "work area"],
      ["Stations", "Zones"],
      ["stations", "zones"],
    ],
    [
      {
        id: "vizenta_admin",
        from: "vizenta_admin",
        label: "Vizenta Admin",
      },
      {
        id: "customer_admin",
        from: "customer_admin",
        label: "Customer Admin",
        products: commonProducts,
      },
      {
        id: "site_security_admin",
        from: "plant_security_admin",
        label: "Security Admin",
      },
      {
        id: "ehs_safety_manager",
        from: "ehs_incident_commander",
        label: "EHS / Safety Manager",
        replacements: [["EHS / Incident Commander", "EHS / Safety Manager"]],
      },
      {
        id: "project_site_manager",
        from: "plant_operations_manager",
        label: "Project / Site Manager",
        replacements: [["Site Operations Manager", "Project / Site Manager"]],
      },
      {
        id: "workforce_contractor_admin",
        from: "workforce_contractor_admin",
        label: "Workforce / Contractor Admin",
      },
      {
        id: "logistics_materials_coordinator",
        from: "stores_logistics_manager",
        label: "Logistics / Materials Coordinator",
        replacements: [
          ["Stores & Logistics Manager", "Logistics / Materials Coordinator"],
          ["Stores and logistics", "Materials and logistics"],
        ],
      },
      {
        id: "gate_guard_operator",
        from: "plant_security_admin",
        label: "Gate / Guard Operator",
        home: "Gate Operations",
        scopes: [
          "Assigned gate and posts",
          "Riverfront Tower Project",
          "Central Materials Yard",
        ],
        products: ["Gate", "Guard", "Shield", "Visitor", "AI Analytics"],
        replacements: [
          ["Security Admin", "Gate / Guard Operator"],
          ["Security Overview", "Gate Operations"],
          ["Site security", "Gate operations"],
          ["security command", "gate and guard operations"],
        ],
      },
    ],
  );
}

export function healthcareIndustry(corporate: Industry): Industry {
  return derive(
    corporate,
    "healthcare",
    "Healthcare",
    "Meridian Health System",
    [
      ["Northstar Corporate", "Meridian Health System"],
      ["Northstar Holdings", "Meridian Health System"],
      ["Asteron Group", "Meridian Health Network"],
      ["Asteron Services", "Meridian Shared Services"],
      ["Asteron Labs", "Meridian Diagnostics"],
      ["New York HQ", "Central Medical Center"],
      ["Austin Campus", "Lakeside Hospital"],
      ["Denver Operations", "North Ambulatory Center"],
      ["East Lobby", "Emergency Department Reception"],
      ["Executive Reception", "Main Patient Reception"],
      ["Corporate Structure", "Healthcare Structure"],
      ["Corporate Security", "Security Operations"],
      ["Corporate", "Healthcare"],
      ["corporate", "healthcare"],
      ["Across sites", "Across facilities"],
      ["Across buildings", "Across facilities"],
      ["Enterprise scope", "Health system scope"],
      ["All companies", "All workforce groups"],
      ["Building Overview", "Facilities Overview"],
      ["Portfolio Overview", "Clinical Operations Overview"],
      ["Reception Overview", "Visitor Reception Overview"],
      ["Governance Overview", "Response Overview"],
      ["Buildings", "Facilities"],
      ["buildings", "facilities"],
      ["Building", "Facility"],
      ["building", "facility"],
      ["Office", "Department"],
      ["office", "department"],
    ],
    [
      {
        id: "vizenta_admin",
        from: "vizenta_admin",
        label: "Vizenta Admin",
      },
      {
        id: "customer_admin",
        from: "customer_admin",
        label: "Customer Admin",
        products: commonProducts,
      },
      {
        id: "security_admin",
        from: "corporate_security_admin",
        label: "Security Admin",
        replacements: [["Healthcare Security Admin", "Security Admin"]],
      },
      {
        id: "facilities_operations_manager",
        from: "facilities_manager",
        label: "Facilities Operations Manager",
      },
      {
        id: "clinical_operations_coordinator",
        from: "regional_operations",
        label: "Clinical Operations Coordinator",
        home: "Clinical Operations Overview",
        products: ["Zones", "Shield", "Guard", "AI Analytics"],
        replacements: [
          ["Regional Operations", "Clinical Operations Coordinator"],
          ["Regional", "Clinical operations"],
          ["regional", "clinical operations"],
        ],
      },
      {
        id: "hr_workforce_admin",
        from: "hr_workforce_admin",
        label: "HR / Workforce Admin",
      },
      {
        id: "reception_visitor_desk",
        from: "reception_lead",
        label: "Reception / Visitor Desk",
        home: "Visitor Reception Overview",
        replacements: [["Reception Lead", "Reception / Visitor Desk"]],
      },
      {
        id: "guard_response_operator",
        from: "corporate_security_admin",
        label: "Guard / Response Operator",
        home: "Response Overview",
        scopes: [
          "Assigned facility and posts",
          "Central Medical Center",
          "Lakeside Hospital",
        ],
        products: ["Shield", "Guard", "Gate", "Visitor", "AI Analytics"],
        replacements: [
          ["Healthcare Security Admin", "Guard / Response Operator"],
          ["Security Admin", "Guard / Response Operator"],
          ["Security Overview", "Response Overview"],
          ["security command", "guard and response operations"],
        ],
      },
    ],
  );
}
