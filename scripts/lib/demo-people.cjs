// Every person the demo app shows, grouped by the page they appear on.
// Loads the real app data exactly as the app does (registry.ts → industries +
// getPage over every industry × role × scope × org/product branch × tab), plus
// class/lab session rosters (ClassAttendance) and the surveillance samples.
// Shared by scripts/assign-demo-portraits.cjs and tests/portraits.test.cjs.
require("./ts-hooks.cjs");
const path = require("node:path");

const src = path.resolve(__dirname, "../../src");
const load = (file) => require(path.join(src, file));

/** Text of a cell, fact or panel value (same as logic.cellText, plus secondary/meta lines). */
function texts(value) {
  if (value == null) return [];
  if (typeof value !== "object") return [String(value)];
  const out = [String(value.primary ?? value.label ?? value.value ?? "—")];
  for (const extra of [value.secondary, value.meta]) if (typeof extra === "string") out.push(extra);
  return out;
}

/** Pages whose rows are class or lab sessions (mirrors src/domain/classes/attendance.ts). */
const sessionRowsOf = (industries) =>
  Object.values(industries.education.pages).flatMap((areas) =>
    ["Classes", "Labs"].flatMap((tab) => areas.product["Class & Lab Attendance"]?.[tab]?.records ?? []),
  );

let cached;
/**
 * Scans the demo data once per process.
 * pages:   [{ id, industry, people: string[] }] — display names (no honorific) of every
 *          person on the page: table cells, detail facts/sections/timeline, record.person,
 *          record.setup and side panels. A row's detail counts as its page.
 * persons: Map name → { gender?, look?, initials, industries: Set, texts: Set }
 * cells:   [{ industry, page, column, text }] — every cell and fact value, for tests.
 */
function scanDemoPeople() {
  if (cached) return cached;
  const reg = load("domain/contracts/registry.ts");
  const { classSession } = load("domain/classes/attendance.ts");
  const { parsePersonName } = load("shared/people/personName.ts");
  const samples = load("domain/surveillance/samples.json");
  const { industries, getPage } = reg;
  // Session rows before any page is expanded: a session without its own count
  // borrows one from a sibling row, so rosters are computed for both states.
  const authoredSessionRows = sessionRowsOf(industries).slice();

  const persons = new Map();
  const pages = [];
  const cells = [];
  const seen = new Map();
  const note = (people, text, industry) => {
    const p = parsePersonName(text);
    if (!p) return;
    people.add(p.name);
    const e = persons.get(p.name) ?? { ...p, industries: new Set(), texts: new Set() };
    delete e.uid;
    e.industries.add(industry);
    if (e.texts.size < 4) e.texts.add(text);
    persons.set(p.name, e);
  };
  const recordPeople = (people, record, industry, pageId) => {
    for (const [column, value] of Object.entries(record.cells ?? {}))
      for (const text of texts(value)) {
        cells.push({ industry, page: pageId, column, text });
        note(people, text, industry);
      }
    const d = record.detail ?? {};
    note(people, d.title ?? "", industry);
    for (const fact of d.facts ?? [])
      for (const text of texts(fact.value)) {
        cells.push({ industry, page: pageId, column: "fact:" + fact.label, text });
        note(people, text, industry);
      }
    for (const section of d.sections ?? [])
      for (const item of section.items ?? []) for (const text of texts(item.value)) note(people, text, industry);
    for (const t of d.timeline ?? []) if (t.actor) note(people, t.actor, industry);
    for (const item of d.related ?? []) for (const text of texts(item.value)) note(people, text, industry);
    const person = record.person;
    if (person?.name) note(people, person.name, industry);
    const setup = record.setup;
    if (setup?.first_name) note(people, [setup.first_name, setup.last_name].filter(Boolean).join(" "), industry);
  };

  for (const [industryId, industry] of Object.entries(industries))
    for (const [role, areas] of Object.entries(industry.pages))
      for (const scope of industry.core.roles[role]?.scopes ?? [])
        for (const type of ["org", "product"])
          for (const [name, tabs] of Object.entries(areas[type] ?? {}))
            for (const tab of Object.keys(tabs)) {
              const page = getPage({ industry: industryId, role, scope }, { type, name, tab });
              if (!page) continue;
              const variant = page === tabs[tab] ? "" : "#" + (scope.startsWith("Store ") ? "store" : "warehouse");
              const id = [industryId, role, type, name, tab].join("/") + variant;
              if (seen.has(page)) continue;
              const entry = { id, industry: industryId, pageId: page.id, role, page, people: new Set() };
              seen.set(page, entry);
              pages.push(entry);
              for (const record of page.records ?? []) recordPeople(entry.people, record, industryId, page.id);
              for (const panel of page.sidePanels ?? [])
                for (const item of panel.items ?? []) for (const text of texts(item.value)) note(entry.people, text, industryId);
            }

  // Gate User Attendance also lists every surveillance user in scope (absent rows).
  for (const entry of pages) {
    if (entry.page.detailType !== "gate_attendance") continue;
    const users = industries[entry.industry].pages[entry.role]?.org["Surveillance Users"]?.Users?.records ?? [];
    for (const r of users)
      if (r.setup?.first_name && r.setup.user_type !== "Threat")
        note(entry.people, [r.setup.first_name, r.setup.last_name].filter(Boolean).join(" "), entry.industry);
  }

  // Class and lab sessions: each session's learners (ClassAttendance), its mapped
  // learners (ClassLearners) and its row's own people as one page.
  const expandedSessionRows = sessionRowsOf(industries);
  const sessions = [];
  for (const entry of pages.filter((e) => e.industry === "education"))
    for (const record of entry.page.records ?? []) {
      const people = new Set();
      for (const related of [authoredSessionRows, expandedSessionRows]) {
        const session = classSession(entry.pageId, record, related);
        for (const learner of session?.learners ?? []) note(people, learner.name, "education");
      }
      for (const learner of record.demoLearners ?? []) note(people, learner.name, "education");
      if (!people.size) continue;
      recordPeople(people, record, "education", entry.pageId);
      sessions.push({ id: entry.id + "/session/" + record.id, industry: "education", people });
    }

  // Surveillance samples (Surveillance Users / recognition profiles).
  const sampleGroups = Object.entries(samples).map(([role, records]) => {
    const people = new Set();
    for (const r of records) recordPeople(people, r, "education", "samples");
    return { id: "education/samples/" + role, industry: "education", people };
  });

  const all = [...pages, ...sessions, ...sampleGroups].map((e) => ({
    id: e.id,
    industry: e.industry,
    people: [...e.people].sort(),
  }));
  cached = { pages: all, persons, cells, pageCount: pages.length, sessionCount: sessions.length };
  return cached;
}

module.exports = { scanDemoPeople, texts };
