import type { DataRecord, Industry, PageContract, Tone } from "./types";

/*
 * The Corporate reference ships one generic placeholder row per site on every
 * page ("customer users · New York HQ | Enterprise | Current"). The authored
 * demo rows in ./corporate/rows-*.json replace them with specific records.
 * Each row names its site; every persona sees the rows inside its assignment
 * (site, lobby, company, region or customer).
 */

export interface AuthoredRow {
  site: string;
  state: string;
  tone: Tone;
  cells: Record<string, string>;
  summary: string;
  facts?: { label: string; value: string }[];
  timeline?: { time: string; event: string; actor?: string }[];
}

const sites = ["New York HQ", "Austin Campus", "Denver Operations"];
/** Assignments that contain each site, per persona scope type. */
const containing: Record<string, string[]> = {
  "New York HQ": ["East Region", "Asteron Services", "Asteron Group", "East Lobby", "Executive Reception"],
  "Austin Campus": ["Central Region", "Asteron Labs", "Northstar Holdings"],
  "Denver Operations": ["West Region", "Asteron Services", "Asteron Group"],
};
const aggregate = /^(All|Across|Enterprise|Assigned)\b/;

function scopeFor(row: AuthoredRow, index: number, roleScopes: string[], common: string[]) {
  const specific = roleScopes.filter((s) => !common.includes(s));
  // A row about another customer belongs to no single customer assignment.
  const customer = row.cells.customer;
  if (customer && roleScopes.some((s) => containing[row.site]?.includes(s))) {
    const own = specific.find((s) => customer.startsWith(s));
    if (own) return [...common, own];
    if (specific.some((s) => s === "Asteron Group" || s === "Northstar Holdings")) {
      const groups = common.filter((s) => aggregate.test(s));
      return groups.length ? groups : undefined;
    }
  }
  // Prefer an assignment the row names itself (e.g. "East Lobby").
  const named = specific.find((s) => Object.values(row.cells).some((v) => v.includes(s)));
  if (named && (named === row.site || containing[row.site]?.includes(named)))
    return [...common, named];
  const direct = specific.filter((s) => s === row.site || containing[row.site]?.includes(s));
  if (direct.length) return [...common, direct[index % direct.length]];
  if (common.includes(row.site))
    return specific.length ? [...common, specific[index % specific.length]] : [...common];
  // A site-assigned persona does not see sites outside its assignment.
  if (roleScopes.some((s) => sites.includes(s))) return undefined;
  const groups = common.filter((s) => aggregate.test(s));
  return groups.length ? groups : undefined;
}

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function build(page: PageContract, rows: AuthoredRow[], roleScopes: string[]) {
  const templates = page.records;
  const common = templates
    .map((r) => r.scope)
    .reduce((a, b) => a.filter((s) => b.includes(s)));
  const template = (tone: Tone) =>
    templates.find((t) => t.state.tone === tone) ??
    templates.find((t) => (tone === "complete" ? t.state.tone === "healthy" : tone === "pending" && t.state.tone === "attention")) ??
    templates[0];
  const records: DataRecord[] = [];
  rows.forEach((row, i) => {
    const scope = scopeFor(row, i, roleScopes, common);
    if (!scope?.length) return;
    const t = template(row.tone);
    const cells = Object.fromEntries(page.columns.map((c) => [c.id, row.cells[c.id] ?? "—"]));
    const title = String(cells[page.columns[0]?.id] ?? row.summary);
    records.push({
      id: `${page.id}-${String(i + 1).padStart(2, "0")}`,
      type: t.type,
      cells,
      state: { label: row.state, tone: row.tone },
      action: t.action,
      scope,
      detail: {
        title,
        eyebrow: t.detail.eyebrow.replace(/_/g, " "),
        summary: row.summary,
        facts: [
          ...page.columns.map((c) => ({ label: c.label, value: cells[c.id] })),
          ...(row.facts ?? []),
        ],
        sections: [
          {
            title: "Decision context",
            description: page.description,
            items: [
              { label: "Current state", value: row.state, tone: row.tone },
              { label: "Site", value: row.site },
              { label: "Assigned scope", value: scope.join(" · ") },
            ],
          },
        ],
        timeline: row.timeline?.length ? row.timeline : t.detail.timeline,
        related: t.detail.related,
        permittedActions: t.detail.permittedActions,
      },
    });
  });
  return records;
}

/** Tidies generated page wording ("customer users current" → "Current customer users"). */
function tidy(page: PageContract) {
  for (const m of page.metrics)
    m.label = sentence(m.label.replace(/^(.+) current$/, "Current $1"));
  for (const p of page.sidePanels) p.title = sentence(p.title);
  for (const [k, v] of Object.entries(page.states)) page.states[k] = sentence(v);
}

export function applyCorporateRows(industry: Industry, rows: Record<string, AuthoredRow[]>) {
  const seeded = industry as Industry & { corporateRowsReady?: boolean };
  if (seeded.corporateRowsReady) return;
  seeded.corporateRowsReady = true;
  for (const [role, areas] of Object.entries(industry.pages))
    for (const branches of Object.values(areas))
      for (const [branch, tabs] of Object.entries(branches))
        for (const [tab, page] of Object.entries(tabs)) {
          tidy(page);
          const list = rows[branch + " / " + tab];
          if (!list?.length || !page.records.length) continue;
          const records = build(page, list, industry.core.roles[role]?.scopes ?? []);
          if (records.length) page.records = records;
        }
}
