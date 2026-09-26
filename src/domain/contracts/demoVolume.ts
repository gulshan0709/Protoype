import type { Cell, DataRecord, Industry, IndustryId, PageContract, Tone } from "./types";

/*
 * Demo volume: each reference page ships three to nine authored rows. For
 * client demos every page is filled out to a realistic list by deriving new
 * rows from the authored ones. A derived row keeps its template's story
 * (state, detail sections, actions) and changes its identity consistently
 * across cells, detail and setup: people, IDs, room/lane numbers, counts,
 * event times and the assigned scope. Seeds are fixed, so every reload,
 * deep link and audit key sees the same rows. Pages are expanded the first
 * time they are opened, which keeps app start-up fast.
 */

type Rng = () => number;
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function random(text: string): Rng {
  let a = hash(text);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

const indianFemale = ["Aanya", "Aditi", "Ananya", "Anjali", "Asha", "Avni", "Diya", "Divya", "Gauri", "Ira", "Isha", "Ishita", "Kavya", "Kiara", "Meera", "Mira", "Naina", "Neha", "Nisha", "Pooja", "Priya", "Riya", "Saanvi", "Sana", "Shreya", "Sneha", "Tanvi", "Tara", "Trisha", "Anika", "Pallavi", "Ritika", "Sakshi", "Simran", "Swati", "Nandini", "Kriti", "Megha", "Kavita", "Anita", "Anaya", "Devika", "Lakshmi", "Radhika", "Shruti"];
const indianMale = ["Aarav", "Aditya", "Akash", "Amit", "Arjun", "Aryan", "Dev", "Dhruv", "Harsh", "Ishaan", "Kabir", "Karan", "Krish", "Manav", "Nikhil", "Pranav", "Rahul", "Rohan", "Sahil", "Sameer", "Siddharth", "Varun", "Vihaan", "Vikram", "Yash", "Ayaan", "Rishi", "Kunal", "Tushar", "Nitin", "Rajat", "Gaurav", "Abhinav", "Ankit", "Mohit", "Ravi", "Arun", "Deepak", "Suresh", "Manish", "Sanjay", "Imran", "Farhan"];
const indianLast = ["Sharma", "Verma", "Gupta", "Mehta", "Patel", "Shah", "Rao", "Nair", "Iyer", "Menon", "Reddy", "Das", "Sen", "Bose", "Joshi", "Kulkarni", "Deshpande", "Pillai", "Kapoor", "Malhotra", "Chopra", "Singh", "Chauhan", "Agarwal", "Bansal", "Saxena", "Mishra", "Pandey", "Tiwari", "Banerjee", "Chatterjee", "Ghosh", "Naidu", "Hegde", "Kamath", "Shetty", "Bhat", "Rathore", "Yadav", "Khanna", "Arora", "Sethi", "Dutta", "Krishnan", "Varghese", "Thomas", "Fernandes", "Khan", "Qureshi", "Siddiqui", "Desai", "Kumar", "Joseph"];
const westernFemale = ["Maya", "Lena", "Lina", "Emma", "Olivia", "Sofia", "Grace", "Hannah", "Chloe", "Nora", "Ava", "Leah", "Zoe", "Ruby", "Claire", "Julia"];
const westernMale = ["Owen", "Liam", "Noah", "Ethan", "Lucas", "Daniel", "Marcus", "Ryan", "Adam", "Caleb", "Nathan", "Julian", "Leo", "Miles", "Isaac", "Oscar"];
const westernLast = ["Chen", "Brooks", "Ellis", "Carter", "Hughes", "Morgan", "Reed", "Foster", "Bennett", "Parker", "Hayes", "Kim", "Nguyen", "Lopez", "Walsh", "Turner"];
const female = new Set([...indianFemale, ...westernFemale]);
const western = new Set([...westernFemale, ...westernMale]);
const firstNames = [...new Set([...indianFemale, ...indianMale, ...westernFemale, ...westernMale])];
const lastNames = [...new Set([...indianLast, ...westernLast])];
const fullName = new RegExp(
  `\\b(?:(Dr|Prof|Mr|Ms|Mrs)\\.\\s)?(${firstNames.join("|")})\\s(${lastNames.join("|")})\\b`,
  "g",
);
const initialName = new RegExp(`\\b([A-Z])\\.\\s(${lastNames.join("|")})\\b`, "g");
const shortName = new RegExp(`\\b(${firstNames.join("|")})\\s([A-Z])\\.(?=[\\s,;)·]|$)`, "g");
const email = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g;
const nameWords = new Set([...firstNames, ...lastNames]);
/** Cheap pre-check: the large name patterns only run when a known name word is present. */
function mayName(text: string) {
  for (const m of text.matchAll(/[A-Z][a-z]+/g)) if (nameWords.has(m[0])) return true;
  return false;
}

const months = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December";
const labels = "Room|Lab|Lane|Dock|Block|Floor|Level|Gate|Bay|Aisle|Line|Cell|Zone|Post|Round|Crew|Door|Wing|Batch|Tower|Hall|Station|Desk|Counter|Till|Rack|Row|Shelf|Bench|Booth|Corridor|Guard|Team|Route|Stage|Press|Oven|Furnace|Machine|Carrier|Trailer|Truck|Van|Bus|Cage|Yard|Pallet|Checkpoint|Camera|Kiosk|Turnstile|Section";
// One pass over each string; alternatives are tried left to right at each position.
const tokens = new RegExp(
  [
    "(?<iso>\\b\\d{4}-\\d{2}-\\d{2}\\b)",
    `(?<date>\\b(?:\\d{1,2}\\s(?:${months})\\b(?:\\s\\d{4})?|(?:${months})\\s\\d{1,2}(?:\\s?[–-]\\s?\\d{1,2})?\\b(?:,?\\s\\d{4})?))`,
    "(?<range>\\b(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?\\s?[–-]\\s?(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?\\b)",
    "(?<time>\\b(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?\\b)",
    "(?<ip>\\b\\d{1,3}(?:\\.\\d{1,3}){3}\\b)",
    "(?<phone>(?<!\\d)(?:\\+91[\\s-]?)?[6-9]\\d{9}(?!\\d))",
    "(?<percent>(?<![\\d.])\\d{1,3}(?:\\.\\d+)?%)",
    "(?<keep>\\b\\d+h\\s?\\d+m\\b|\\bv?\\d+(?:\\.\\d+)+|(?<![\\w-])20[2-3]\\d(?:[–-]\\d{2})?(?!\\d)|\\b\\d+\\s?(?:h|hrs?|hours?|d|days?|wks?|weeks?|months?|yrs?|years?)\\b|\\bp\\d{2,3}\\b|\\b24\\/7\\b|\\b(?:week|Week|Wk|Semester|Sem|Term|Wave|Phase|Sprint|Build|Shift|Year|Grade|Class|Standard)\\s\\d+\\b|(?<=[-_#])0\\d(?!\\d))",
    `(?<label>\\b(?:${labels})\\s(?:No\\.\\s)?(?<labelNo>\\d{1,2})(?!\\d))`,
    "(?<long>(?<![\\d.])\\d{3,}(?![\\d.]))",
    "(?<two>(?<![\\d.,])[1-9]\\d(?![\\d.,%:]))",
  ].join("|"),
  "gi",
);
const hold = (saved: string[], value: string) =>
  String.fromCharCode(0xe000 + saved.push(value) - 1);
const restore = (text: string, saved: string[]) =>
  saved.length
    ? text.replace(/[-]/g, (c) => saved[c.charCodeAt(0) - 0xe000])
    : text;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const domains: Record<IndustryId, string> = {
  education: "northbridge.edu",
  corporate: "northstarcorp.com",
  retail: "northstarretail.com",
  manufacturing: "meridianmfg.com",
};
const mobilePrefixes = ["98", "97", "96", "95", "94", "93", "91", "90", "88", "87", "86", "85", "84", "81", "79", "78", "77", "76", "75", "73", "70"];
/** Stable realistic mobile number for a placeholder such as 9876501010. */
function realisticPhone(original: string) {
  const rng = random("phone:" + original);
  const prefix = original.match(/^\+91[\s-]?/)?.[0] ?? "";
  let digits = pick(rng, mobilePrefixes);
  while (digits.length < 10) digits += Math.floor(rng() * 10);
  return prefix + digits;
}
function realisticIp(original: string) {
  const [a, b, c, d] = original.split(".").map(Number);
  return a === 192 && b === 0 && c === 2 ? `10.24.${10 + (d % 40)}.${d}` : original;
}

type Person = { first: string; last: string };
class Page {
  used = new Set<string>();
  industry: IndustryId;
  constructor(industry: IndustryId) {
    this.industry = industry;
  }
  person(first: string, rng: Rng): Person {
    const west = western.has(first) && this.industry !== "education";
    const firsts = female.has(first)
      ? west ? westernFemale : indianFemale
      : west ? westernMale : indianMale;
    const lasts = west ? westernLast : indianLast;
    for (let i = 0; i < 40; i++) {
      const p = { first: pick(rng, firsts), last: pick(rng, lasts) };
      const name = p.first + " " + p.last;
      if (!this.used.has(name)) {
        this.used.add(name);
        return p;
      }
    }
    return { first: pick(rng, firsts), last: pick(rng, lasts) };
  }
}

/** Everything that changes between a template row and one derived row. */
class Plan {
  people = new Map<string, Person>();
  firsts = new Map<string, string>();
  lasts = new Map<string, string>();
  initials = new Map<string, string>();
  shorts = new Map<string, string>();
  twos = new Map<number, number>();
  twoUsed = new Set<number>();
  labelNos = new Map<string, string>();
  offset: number;
  scale: number;
  minutes: number;
  percent: number;
  rng: Rng;
  page: Page;
  clone: number;
  phrases: RegExp | undefined;
  phraseMap: Map<string, string>;
  domain: string;
  constructor(
    rng: Rng,
    page: Page,
    clone: number,
    phrases: RegExp | undefined,
    phraseMap: Map<string, string>,
    domain: string,
  ) {
    this.rng = rng;
    this.page = page;
    this.clone = clone;
    this.phrases = phrases;
    this.phraseMap = phraseMap;
    this.domain = domain;
    this.offset = 6 + Math.floor(rng() * 230);
    this.scale = 0.74 + rng() * 0.6;
    this.minutes = -(4 + Math.floor(rng() * 70));
    this.percent = Math.round((rng() * 5 - 3) * 10) / 10;
  }
  meet(first: string, last: string) {
    const key = first + " " + last;
    let next = this.people.get(key);
    if (!next) {
      next = this.page.person(first, this.rng);
      this.people.set(key, next);
      if (!this.firsts.has(first)) this.firsts.set(first, next.first);
      if (!this.lasts.has(last)) this.lasts.set(last, next.last);
    }
    return next;
  }
  scan(text: string) {
    if (!mayName(text)) return;
    for (const m of text.matchAll(fullName)) this.meet(m[2], m[3]);
  }
  long(value: string) {
    const n = Number(value);
    // IDs move further than small counts so they stay distinct.
    let v = n + (n >= 1000 ? this.offset * 3 : this.offset);
    if (String(v).length > value.length) v = n - this.offset;
    if (v < 0) v = n;
    return String(v).padStart(value.length, "0");
  }
  two(value: string) {
    const n = Number(value);
    let v = this.twos.get(n);
    if (v === undefined) {
      v = Math.max(10, Math.round(n * this.scale));
      while (this.twoUsed.has(v)) v++;
      this.twos.set(n, v);
      this.twoUsed.add(v);
    }
    return String(v);
  }
  label(value: string) {
    let v = this.labelNos.get(value);
    if (!v) {
      const n = Number(value) + 1 + this.clone;
      v = String(n).padStart(value.length, "0");
      this.labelNos.set(value, v);
    }
    return v;
  }
  time(value: string, shift: number) {
    const [h, m, s] = value.split(":").map(Number);
    const total = h * 60 + m + shift;
    if (total < 0) return value;
    const t =
      String(Math.floor(total / 60)).padStart(2, "0") +
      ":" +
      String(total % 60).padStart(2, "0");
    return s === undefined ? t : t + ":" + String(s).padStart(2, "0");
  }
  times(value: string) {
    const parts = value.match(/\d{2}:\d{2}(?::\d{2})?/g) ?? [];
    // Scheduled windows (quarter-hour times) move in half hours; events by the minute.
    const scheduled = parts.every((p) => Number(p.slice(3, 5)) % 15 === 0);
    const shift = scheduled ? Math.round(this.minutes / 30) * 30 : this.minutes;
    return value.replace(/\d{2}:\d{2}(?::\d{2})?/g, (p) => this.time(p, shift));
  }
  percentOf(value: string) {
    const n = Number(value.slice(0, -1));
    if (n >= 99.5 || n <= 0) return value;
    const decimals = value.includes(".") ? 1 : 0;
    let v = Math.min(99.9, Math.max(1, n + this.percent));
    v = Math.round(v * 10 ** decimals) / 10 ** decimals;
    if (!decimals && v >= 100) v = 99;
    return v.toFixed(decimals) + "%";
  }
  emailOf(value: string) {
    const [local, host] = value.split("@");
    let next = local;
    for (const [key, p] of this.people) {
      const [f, l] = key.toLowerCase().split(" ");
      const nf = p.first.toLowerCase();
      const nl = p.last.toLowerCase();
      next = next
        .replace(f + "." + l, nf + "." + nl)
        .replace(f + "_" + l, nf + "_" + nl)
        .replace(f + l, nf + nl)
        .replace(f[0] + "." + l, nf[0] + "." + nl);
    }
    next = next.replace(/\d{3,}/g, (d) => this.long(d));
    return next + "@" + (host === "example.com" ? this.domain : host);
  }
  text(value: string) {
    if (this.firsts.has(value)) return this.firsts.get(value)!;
    if (this.lasts.has(value)) return this.lasts.get(value)!;
    const saved: string[] = [];
    let out = value;
    if (this.phrases)
      out = out.replace(this.phrases, (m) => hold(saved, this.phraseMap.get(m) ?? m));
    if (mayName(out)) {
      out = out.replace(fullName, (_m, title, f, l) => {
        const p = this.meet(f, l);
        return hold(saved, (title ? title + ". " : "") + p.first + " " + p.last);
      });
      out = out.replace(initialName, (m) => {
        let v = this.initials.get(m);
        if (!v) {
          const p = this.page.person(pick(this.rng, indianMale), this.rng);
          v = p.first[0] + ". " + p.last;
          this.initials.set(m, v);
        }
        return hold(saved, v);
      });
      out = out.replace(shortName, (m, f) => {
        let v = this.shorts.get(m);
        if (!v) {
          const p = this.page.person(f, this.rng);
          v = p.first + " " + p.last[0] + ".";
          this.shorts.set(m, v);
        }
        return hold(saved, v);
      });
    }
    if (out.includes("@")) out = out.replace(email, (m) => hold(saved, this.emailOf(m)));
    if (/\d/.test(out))
      out = out.replace(tokens, (m, ...args) => {
        const g = args[args.length - 1] as Record<string, string | undefined>;
        if (g.range || g.time) return hold(saved, this.times(m));
        if (g.phone) return hold(saved, realisticPhone(m));
        if (g.ip) return hold(saved, realisticIp(m));
        if (g.percent) return hold(saved, this.percentOf(m));
        if (g.label && g.labelNo)
          return hold(saved, m.slice(0, m.length - g.labelNo.length) + this.label(g.labelNo));
        if (g.long) return hold(saved, this.long(m));
        if (g.two) return hold(saved, this.two(m));
        return hold(saved, m);
      });
    return restore(out, saved);
  }
}

/** Keys that hold identifiers, enums, media or rosters; derived rows copy them. */
const fixedTop = new Set(["type", "setupKind", "captureAsset", "videoAsset", "demoLearners", "demo"]);
const fixed = new Set(["tone", "kind", "permittedActions", "drill", "image"]);
const skip = (key: string, top: boolean) => fixed.has(key) || (top && fixedTop.has(key));
function copy(v: unknown) {
  return v && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v;
}
function walk(value: unknown, visit: (s: string) => string, top = false): unknown {
  if (typeof value === "string") return visit(value);
  if (Array.isArray(value)) return value.map((v) => walk(v, visit));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value))
      out[k] = skip(k, top) ? copy(v) : walk(v, visit);
    return out;
  }
  return value;
}
function strings(value: unknown, visit: (s: string) => void, top = false) {
  if (typeof value === "string") visit(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, visit));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) if (!skip(k, top)) strings(v, visit);
}

const toneWeight: Record<Tone, number> = {
  healthy: 5,
  complete: 4,
  neutral: 4,
  pending: 2,
  attention: 2,
  critical: 1,
  unavailable: 0.6,
};
// Structural lists name real campuses, plants, stores or catalog entries.
const structural = /^(Campuses|Colleges|Departments|Programs|Sites|Locations|Regions|Plants|Companies|Hostels|Customers|Entitlements|Templates|Portfolio|Buildings)$/;
const catalog = /(Report|Polic|Retention|Role Packages|Definitions|Rules|Saved Views|Ask Vizenta|Data Access|Usage|Trends|Integrations|Notifications|Products|Readiness|Setup|Schedules|Watchlist|Standards|Templates|Criteria)/;
/** Education pages whose rows are cross-linked by setup forms and media. */
const linked = new Set(["va-surveillance-users", "ca-surveillance-users", "va-warden-wardens", "va-warden-hostels", "ca-warden-wardens", "ca-warden-hostels", "ca-setup-cameras", "ca-setup-shifts", "ca-setup-dashboard", "ca-setup-attendance", "ca-setup-video", "ca-setup-setup", "ca-setup-criteria"]);

const aggregateWord = /^(all|across|assigned|enterprise|my)$/i;
function words(scope: string) {
  return new Set(
    scope
      .replace(/[0-9·]/g, " ")
      .split(/[\s-]+/)
      .filter((w) => w.length > 1 && !aggregateWord.test(w))
      .map((w) => (w === "Unit" ? "Plant" : w)),
  );
}
function sameKind(a: string, b: string) {
  const wa = words(a);
  for (const w of words(b)) if (wa.has(w)) return true;
  return false;
}

export function targetRows(tab: string, authored: number) {
  if (structural.test(tab)) return authored;
  if (catalog.test(tab)) return authored + 2;
  return authored >= 6 ? 30 : 24;
}
const clockRange = /\b\d{2}:\d{2}\s?[–-]\s?\d{2}:\d{2}\b/;
const clock = /\b\d{2}:\d{2}(?::\d{2})?\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2}\b/g;
/** Timetables list one person's sessions; they are complete as authored. */
function timetable(page: PageContract) {
  const first = page.columns[0]?.id;
  return !!first && page.records.every((r) => clockRange.test(cellText(r.cells[first])));
}
/** Rows with a qualified state ("Present · corrected") are exceptions, so rarer. */
function weight(record: DataRecord, clones: number) {
  const base = toneWeight[record.state.tone] ?? 1;
  return (base * (record.state.label.includes("·") ? 0.35 : 1)) / (1 + clones * 0.6);
}

// Same as logic.cellText; kept local so node tests can load this module alone.
function cellText(value: Cell | undefined): string {
  if (value == null) return "—";
  return typeof value === "object"
    ? String(value.primary ?? value.label ?? value.value ?? "—")
    : String(value);
}
/** What makes a row a different thing, ignoring when it happened. */
function identity(page: PageContract, record: DataRecord, mode: (lead: string) => LeadMode) {
  const [lead, ...rest] = leadCells(page, record);
  if (!lead) return record.detail.title;
  // A category lead ("Critical") needs the next columns; an entity name
  // ("Main Gate", "CAM-012", "SecureLine") identifies the row on its own.
  const m = mode(lead);
  if (m === "category") return [lead, ...rest.slice(0, 2)].join("|");
  return m === "scoped" ? lead + "@" + record.scope.join("+") : lead;
}
/** First columns without their times; a time-only first column (audit logs) defers to the next ones. */
function leadCells(page: PageContract, record: DataRecord) {
  return page.columns
    .slice(0, 4)
    .map((c) => cellText(record.cells[c.id]).replace(clock, "").replace(/^[\s·–-]+$/, "").trim())
    .filter(Boolean);
}
const severity = /^(critical|high|medium|low|normal|review|open|closed|urgent|watch|info|warning|minor|major)$/i;
type LeadMode = "entity" | "scoped" | "category";
/**
 * How a first-column value identifies its row: an entity name is unique; a
 * name the authored rows repeat once per scope ("Furnace Control Room" per
 * plant) is unique within its scope; severity words, or leads repeated inside
 * one scope, are categories. Filter values are not categories: they often
 * list the entities themselves (campuses, people).
 */
function categories(page: PageContract, authored: DataRecord[]) {
  const counts = new Map<string, number>();
  const scopes = new Map<string, Set<string>>();
  for (const r of authored) {
    const lead = leadCells(page, r)[0];
    if (!lead) continue;
    counts.set(lead, (counts.get(lead) ?? 0) + 1);
    scopes.set(lead, (scopes.get(lead) ?? new Set()).add(r.scope.join("+")));
  }
  const mode = (lead: string): LeadMode => {
    if (severity.test(lead)) return "category";
    const n = counts.get(lead) ?? 0;
    if (n <= 1) return "entity";
    return scopes.get(lead)!.size === n ? "scoped" : "category";
  };
  return { counts, mode };
}

const expanded = new WeakSet<PageContract>();
export function withDemoVolume(
  page: PageContract,
  industry: Industry,
  role: string,
  tab: string,
  variant?: string,
) {
  if (expanded.has(page)) return page;
  expanded.add(page);
  const authored = page.records;
  // Corporate lists are authored in full by corporateDemo.ts.
  if (industry.id === "corporate") return page;
  if (!authored.length || linked.has(page.id) || !page.columns.length) return page;
  const target = timetable(page) ? authored.length : targetRows(tab, authored.length);
  const state = new Page(industry.id);
  for (const r of authored)
    strings(
      r,
      (s) => {
        if (mayName(s)) for (const m of s.matchAll(fullName)) state.used.add(m[2] + " " + m[3]);
      },
      true,
    );
  const roleScopes = (industry.core.roles[role]?.scopes ?? []).filter(
    (s) => !variant || (variant === "store") === s.startsWith("Store "),
  );
  const common = authored
    .map((r) => r.scope)
    .reduce((a, b) => a.filter((s) => b.includes(s)));
  const protectedPhrases = new Set<string>();
  for (const f of page.filters)
    for (const o of f.options) {
      const label = typeof o === "string" ? o : o.label;
      // Filterable codes and names must keep matching their filter.
      if (label.length >= 3 && (/\d/.test(label) || label.search(fullName) >= 0))
        protectedPhrases.add(label);
    }
  for (const s of industry.core.roles[role]?.scopes ?? []) protectedPhrases.add(s);
  const phraseList = [...protectedPhrases].sort((a, b) => b.length - a.length);
  const phrases = phraseList.length
    ? new RegExp(phraseList.map(escape).join("|"), "g")
    : undefined;
  const assets = [...new Set(authored.map((r) => r.captureAsset).filter((a) => a !== undefined))];
  const records = [...authored];
  const ids = new Set(records.map((r) => r.id));
  const cats = categories(page, authored);
  const keys = new Set(records.map((r) => identity(page, r, cats.mode)));
  // Rows per category lead, so e.g. "Critical" never floods a queue.
  const perLead = new Map(cats.counts);
  const clones = new Map<DataRecord, number>();
  // A template gets at most its fair share of new rows, so a page whose only
  // variable row is an exception does not fill up with that exception.
  const shares = authored.map((r) => weight(r, 0));
  const shareTotal = shares.reduce((a, b) => a + b, 0);
  const quota = new Map(
    authored.map((r, i) => [r, Math.ceil(((target - authored.length) * shares[i]) / shareTotal) + 1]),
  );
  const misses = new Map<DataRecord, number>();
  const rng = random([industry.id, role, page.id, variant ?? ""].join("|"));
  let attempts = 0;
  while (records.length < target && attempts < target * 5) {
    attempts++;
    const weights = authored.map((r) =>
      (clones.get(r) ?? 0) >= quota.get(r)! || (misses.get(r) ?? 0) >= 4
        ? 0
        : weight(r, clones.get(r) ?? 0),
    );
    const sum = weights.reduce((a, b) => a + b, 0);
    if (!sum) break;
    let roll = rng() * sum;
    const template = authored.find((_r, i) => (roll -= weights[i]) < 0) ?? authored[0];
    const clone = (clones.get(template) ?? 0) + (misses.get(template) ?? 0);
    const moving = template.scope.filter((s) => !common.includes(s));
    const phraseMap = new Map<string, string>();
    let scope = template.scope;
    if (moving.length === 1) {
      const pool = roleScopes.filter((s) => !common.includes(s) && sameKind(s, moving[0]));
      const next = pool.length ? pick(rng, pool) : moving[0];
      phraseMap.set(moving[0], next);
      scope = template.scope.map((s) => (s === moving[0] ? next : s));
    }
    const plan = new Plan(random(template.id + "#" + clone), state, clone, phrases, phraseMap, domains[industry.id]);
    strings(template, (s) => plan.scan(s), true);
    const next = walk(template, (s) => plan.text(s), true) as DataRecord;
    next.scope = [...scope];
    const key = identity(page, next, cats.mode);
    const lead = leadCells(page, next)[0] ?? "";
    const cap = Math.max(4, 3 * (cats.counts.get(lead) ?? 1));
    if (keys.has(key) || (cats.mode(lead) === "category" && (perLead.get(lead) ?? 0) >= cap)) {
      misses.set(template, (misses.get(template) ?? 0) + 1);
      continue;
    }
    perLead.set(lead, (perLead.get(lead) ?? 0) + 1);
    let id = next.id;
    for (let n = 2; ids.has(id); n++) id = template.id + "-" + String(n).padStart(2, "0");
    next.id = id;
    if (template.captureAsset !== undefined && template.videoAsset === undefined && assets.length)
      next.captureAsset = assets[(records.length + clone) % assets.length];
    ids.add(id);
    keys.add(key);
    clones.set(template, (clones.get(template) ?? 0) + 1);
    records.push(next);
  }
  page.records = records;
  return page;
}

/** Retail rows the reference copied from Education or mangled by a rename. */
const retailWording: [RegExp, string][] = [
  [/^Faculty$/, "Store staff"],
  [/^Academic$/, "Day shift"],
  [/\bvendor (\d+) vendor\b/g, "Vendor $1 rep"],
  [/^vendor · /, "Vendor · "],
];
function fixRetailWording(s: string) {
  let out = s;
  for (const [re, to] of retailWording) out = out.replace(re, to);
  return out;
}

const placeholder = /@example\.com|9876\d{6}|192\.0\.2\./;
const copiedWording = /^(Faculty|Academic)$|vendor/;
/** Replaces placeholder contact details (example.com, 98765…, 192.0.2.x) in place. */
export function realisticContacts(industry: Industry) {
  const domain = domains[industry.id];
  const retail = industry.id === "retail";
  const fix = (s: string) =>
    (retail ? fixRetailWording(s) : s)
      .replace(/@example\.com\b/g, "@" + domain)
      .replace(/(?<!\d)9876\d{6}(?!\d)/g, realisticPhone)
      .replace(/\b192\.0\.2\.\d{1,3}\b/g, realisticIp);
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const bag = value as Record<string, unknown>;
    for (const [k, v] of Object.entries(bag)) {
      if (k === "image" || k === "captureAsset" || k === "videoAsset") continue;
      // Detail headers must not leak internal record IDs ("MOVEMENT_PAIR · security_admin-gate-history-1").
      if (k === "eyebrow" && typeof v === "string") {
        bag[k] = fix(v.replace(/\s·\s[a-z][a-z0-9_-]*\d[a-z0-9_-]*$/, ""));
        continue;
      }
      if (typeof v === "string") {
        if (placeholder.test(v) || (retail && copiedWording.test(v))) bag[k] = fix(v);
      } else visit(v);
    }
  };
  for (const areas of Object.values(industry.pages))
    for (const branches of Object.values(areas))
      for (const tabs of Object.values(branches))
        for (const base of Object.values(tabs))
          for (const page of [base, ...Object.values(base.variants ?? {})])
            page.records.forEach(visit);
}
