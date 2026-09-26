const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
// Loads src/**/*.ts the way Metro does (extensionless imports, JSON imports).
require("../scripts/lib/ts-hooks.cjs");
const { parsePersonName, firstNameGender } = require("../src/shared/people/personName.ts");
const {
  portraitIdFor,
  portraitIds,
  portraitChoice,
  bundledPhotoOwner,
  PORTRAIT_THUMB_MAX,
} = require("../src/shared/people/portraits.ts");
const { assignPortraits } = require("../scripts/lib/portrait-coloring.cjs");
const { build, current } = require("../scripts/assign-demo-portraits.cjs");

const root = path.resolve(__dirname, "..");
const assignments = JSON.parse(fs.readFileSync(path.join(root, "src/shared/people/portraitAssignments.json"), "utf8"));
const pool = JSON.parse(fs.readFileSync(path.join(root, "src/shared/people/portraitPool.json"), "utf8"));
const poolById = new Map(pool.map((p) => [p.id, p]));
const samples = require("../src/domain/surveillance/samples.json");
// One full scan of every industry's pages, sessions and samples, shared by the tests below.
const built = build();
const { scan, result } = built;
const initialForm = /^\p{Lu}\.\s/u;

test("parsePersonName recognises people, titles and UID suffixes", () => {
  const kavita = { name: "Kavita Rao", gender: "woman", look: "south-asian", initials: "KR" };
  assert.deepEqual(parsePersonName("Kavita Rao"), kavita);
  assert.deepEqual(parsePersonName("Dr. Kavita Rao"), kavita);
  assert.deepEqual(parsePersonName("Kavita Rao · E1001"), { ...kavita, uid: "E1001" });
  assert.deepEqual(parsePersonName("  Prof Kavita   Rao  "), kavita);
  assert.equal(parsePersonName("Aarav Mehta · UID 24031").uid, "24031");
  assert.equal(parsePersonName("Aarav Naidu · VIS-9067").uid, "VIS-9067");
  const daniel = parsePersonName("Daniel Kim · Badge V-108");
  assert.deepEqual(daniel, { name: "Daniel Kim", uid: "V-108", gender: "man", look: "international", initials: "DK" });
  // A role, time or team after the separator is not a UID.
  assert.deepEqual(parsePersonName("Aisha Patel · CSM"), { name: "Aisha Patel", gender: "woman", look: "south-asian", initials: "AP" });
  assert.equal(parsePersonName("Maya Chen · 10:00 · Finance").uid, undefined);
  assert.equal(parsePersonName("Maya Chen · 10:00 · Finance").name, "Maya Chen");
  const people = {
    "Rachel Kim": ["woman", "international"],
    "Marcus Bell": ["man", "international"],
    "Tom Reyes": ["man", "international"],
    "Lena Novak": ["woman", "international"],
    "Jason Lee · Badge V-214": ["man", "international"],
    "Kevin Moore": ["man", "international"],
    "Mike Sullivan · V-304": ["man", "international"],
    "Laura Bennett": ["woman", "international"],
    "Grace Liu": ["woman", "international"],
    "Ryan O'Connell": ["man", "international"],
    "Tomás Rivera": ["man", "international"],
    "Jordan Fields · Summit": ["man", "international"],
    "Dana Kowalski": ["woman", "international"],
    "Priya Raman": ["woman", "south-asian"],
    "Neil Chandra": ["man", "south-asian"],
    "Nina Patel": ["woman", "south-asian"],
    "Riya Sharma · E1002": ["woman", "south-asian"],
    "Kabir Rao · V2001": ["man", "south-asian"],
  };
  for (const [text, [gender, look]] of Object.entries(people)) {
    const p = parsePersonName(text);
    assert.ok(p, text);
    assert.deepEqual([p.gender, p.look], [gender, look], text);
  }
});

test("initial forms get a stable gender from the name and a look from the surname", () => {
  const nair = parsePersonName("K. Nair · contractor");
  assert.equal(nair.name, "K. Nair");
  assert.equal(nair.initials, "KN");
  assert.equal(nair.look, "south-asian");
  assert.equal(nair.uid, undefined);
  assert.ok(["man", "woman"].includes(nair.gender));
  for (const text of ["K. Nair", "Dr. K. Nair", "K. Nair · WM-2736"]) assert.equal(parsePersonName(text).gender, nair.gender, text);
  assert.deepEqual(parsePersonName("R. Santos · Allied Universal").look, "international");
  assert.equal(parsePersonName("K. Nair · WM-2736").uid, "WM-2736");
  // The hash spreads initial forms over both genders.
  const genders = ["A. Shah", "A. Verma", "D. Ghosh", "K. Nair", "M. Iyer", "R. Santos", "S. Patel", "V. Gupta", "Y. Rathore", "M. Alvarez"].map(
    (n) => parsePersonName(n).gender,
  );
  assert.ok(genders.includes("man") && genders.includes("woman"), genders.join());
  // A known first name wins over the hash.
  assert.deepEqual(parsePersonName("Kavita R."), { name: "Kavita R.", gender: "woman", look: "south-asian", initials: "KR" });
  assert.equal(parsePersonName("Dev M.").gender, "man");
  const id = portraitIdFor("K. Nair · contractor");
  assert.ok(portraitIds(nair.gender, "south-asian").includes(id));
  assert.equal(portraitIdFor("K. Nair"), id);
  assert.equal(parsePersonName("K. R."), undefined);
});

test("parsePersonName rejects organisations, roles, places, teams and products", () => {
  for (const text of [
    "Northbridge Education",
    "Customer Admin",
    "Maintenance Manager",
    "Stores Lead",
    "Stores Lead · Dock 3",
    "Dev Ops",
    "Data Ops",
    "Metro HVAC",
    "Harbor Couriers",
    "Harbor Couriers · Badge V-109",
    "Central Region",
    "Import row 882",
    "Unknown capture G-472",
    "Watchlist profile",
    "Watchlist profile · T1001",
    "Warden Rao",
    "Chief Warden",
    "Austin Campus",
    "Madison Annex",
    "Main Gate · 18:42",
    "Security Ops · Daniel Okafor",
    "Meera Patel family · 3 people",
    "Hannah Lee → Amir Haddad",
    "Marcus Reed, Nia Carter",
    "Marcus Lee + Corporate Security",
    "Dr. Kavita Sen / 100%",
    "Kavita",
    "Kavita rao",
    "",
    "—",
  ])
    assert.equal(parsePersonName(text), undefined, text);
  assert.equal(parsePersonName(undefined), undefined);
});

test("the name lists include every demo name pool", () => {
  const source = fs.readFileSync(path.join(root, "src/domain/contracts/demoVolume.ts"), "utf8");
  const pool = (name) => {
    const at = source.indexOf(`const ${name} = [`);
    return JSON.parse(source.slice(source.indexOf("[", at), source.indexOf("]", at) + 1));
  };
  const cases = [
    ["indianFemale", (w) => w + " Sharma", "woman", "south-asian"],
    ["indianMale", (w) => w + " Sharma", "man", "south-asian"],
    ["westernFemale", (w) => w + " Brooks", "woman", "international"],
    ["westernMale", (w) => w + " Brooks", "man", "international"],
    ["indianLast", (w) => "Rachel " + w, "woman", "south-asian"],
    ["westernLast", (w) => "Rachel " + w, "woman", "international"],
  ];
  for (const [list, text, gender, look] of cases)
    for (const word of pool(list)) {
      const p = parsePersonName(text(word));
      assert.ok(p, text(word));
      assert.deepEqual([p.gender, p.look], [gender, look], `${list}: ${text(word)}`);
    }
});

// Values in person columns that are organisations, roles, teams or places, by first word.
const NON_PERSON_LEADS = new Set(
  "Academic Acting Administration Allied Apex Awaiting Bluebonnet Building CSE Campus Catering Chemical Chief College Computing Control Corporate Customer Data Dev Dispatch Distribution ECE East Electrical Exam Executive Facilities Finished-goods Gate Guard Harbor High-voltage Hostel InfoSec Innovation LP Lab Laundry Location Logistics MBA Maintenance Management Meridian Metro Network Night Northline Northstar Operations PG Payroll People Plant Platform Privacy Product Program Quality Reception Regional Registrar Research Scrap Security Service Shift Solutions Store Stores Student Swift Team Tri-State Unit Vendor Warden Warehouse Weighbridge Workplace".split(
    " ",
  ),
);
const personColumn =
  /person|user|learner|resident|student|visitor|host|owner|assignee|approver|approved|requester|requested|principal|actor|subject|^name$|employee|operator|dean|warden|guard|officer|escort|reviewer|sponsor|contact|supervisor|relief|on-call|sign-off|waiting|escalat|countersign/i;
const nameShaped = /^(?:(?:Dr|Prof|Mr|Mrs|Ms)\.?\s+)?(\p{Lu}[\p{L}'’-]*)\s(\p{Lu}[\p{L}'’-]*|\p{Lu}\.)$/u;

test("every person-name cell across all industries has a gender", () => {
  const unknown = new Set();
  let people = 0;
  for (const cell of scan.cells) {
    if (!personColumn.test(cell.column.replace(/^fact:/, ""))) continue;
    const m = nameShaped.exec(cell.text.split(/\s+·\s+/)[0]);
    if (!m || NON_PERSON_LEADS.has(m[1])) continue;
    const p = parsePersonName(cell.text);
    if (p?.gender && p.look) people++;
    else unknown.add(`${cell.industry} ${cell.page} ${cell.column}: ${cell.text}`);
  }
  assert.deepEqual([...unknown], [], "unclassified person-like cells (add the first name to personName.ts or the lead here)");
  assert.ok(people > 3000, "person cells scanned: " + people);
  // Every person found anywhere has a gender; the lead words above are not first names.
  assert.deepEqual([...scan.persons.values()].filter((p) => !p.gender || !p.look).map((p) => p.name), []);
  assert.deepEqual([...NON_PERSON_LEADS].filter((w) => firstNameGender(w) && w !== "Dev"), []);
  const perIndustry = (industry) => [...scan.persons.values()].filter((p) => p.industries.has(industry));
  for (const industry of ["education", "corporate", "retail"]) assert.ok(perIndustry(industry).length > 100, industry);
  // Manufacturing names its people only by initials ("K. Nair · contractor").
  assert.ok(perIndustry("manufacturing").length >= 20);
  assert.ok(perIndustry("manufacturing").every((p) => initialForm.test(p.name)));
});

test("the assignment covers every person with a portrait from their own group", () => {
  const missing = [];
  for (const [name, p] of scan.persons) {
    const id = assignments[name];
    const entry = poolById.get(id);
    if (!entry || entry.gender !== p.gender || entry.look !== p.look) missing.push(`${name} → ${id}`);
  }
  assert.deepEqual(missing, []);
  assert.equal(Object.keys(assignments).length, scan.persons.size);
  // Session learners, surveillance samples and initial forms are covered too.
  for (const name of ["Aarav Mehta", "Riya Sharma", "Neha Patel", "Kabir Rao", "Ananya Das", "Arjun Nair", "Priya Sen", "Isha Gupta", "K. Nair", "A. Shah", "R. Santos"])
    assert.ok(assignments[name], name);
});

test("learner setup gender follows the learner's name", () => {
  const { industries } = require("../src/domain/contracts/registry.ts");
  const label = { woman: "Female", man: "Male" };
  const wrong = [];
  let learners = 0;
  for (const areas of Object.values(industries.education.pages))
    for (const branch of Object.values(areas))
      for (const tabs of Object.values(branch))
        for (const base of Object.values(tabs))
          for (const page of [base, ...Object.values(base.variants ?? {})])
            for (const r of page.records) {
              if (r.setupKind !== "learner" || r.setup?.gender === undefined) continue;
              learners++;
              const name = [r.setup.first_name, r.setup.last_name].filter(Boolean).join(" ");
              const expected = label[parsePersonName(name)?.gender] ?? "";
              if (r.setup.gender !== expected) wrong.push(`${page.id} ${name}: ${r.setup.gender}, expected ${expected}`);
            }
  assert.deepEqual(wrong, []);
  assert.ok(learners >= 60, "learner rows: " + learners);
});

test("no page shows two different people with the same portrait", () => {
  const groupSize = new Map();
  for (const p of pool) groupSize.set(p.gender + "/" + p.look, (groupSize.get(p.gender + "/" + p.look) ?? 0) + 1);
  const failures = [];
  const overfull = [];
  for (const page of scan.pages) {
    const byGroup = new Map();
    for (const name of page.people) {
      const p = scan.persons.get(name);
      const key = p.gender + "/" + p.look;
      byGroup.set(key, [...(byGroup.get(key) ?? []), name]);
    }
    for (const [key, names] of byGroup) {
      const ids = new Set(names.map((n) => assignments[n]));
      if (names.length > groupSize.get(key)) overfull.push(`${page.id} [${key}] ${names.length}`);
      if (ids.size !== names.length) failures.push(`${page.id} [${key}] ${names.length} people, ${ids.size} portraits`);
    }
  }
  assert.deepEqual(failures, []);
  // Every group fits its pool, even on the largest class rosters (44 learners of one gender).
  assert.deepEqual(overfull, []);
  assert.deepEqual(result.overfull, []);
  assert.deepEqual(result.conflicts, []);
  assert.ok(scan.pages.length > 900);
});

test("the same name always maps to the same portrait", () => {
  const id = assignments["Kavita Rao"];
  assert.ok(id);
  for (const text of ["Kavita Rao", "Dr. Kavita Rao", "Kavita Rao · E1001", "Prof. Kavita Rao · UID 24031"])
    assert.equal(portraitIdFor(text), id, text);
  for (const [name, assigned] of Object.entries(assignments)) assert.equal(portraitIdFor(name), assigned, name);
});

test("names outside the demo data hash stably into their own group", () => {
  const cases = [
    ["Priyanka Chawla", "woman", "south-asian"],
    ["Rohan Zaveri", "man", "south-asian"],
    ["Zara Whitfield", "woman", "international"],
    ["Hiro Nakamura", "man", "international"],
  ];
  for (const [name, gender, look] of cases) {
    assert.equal(assignments[name], undefined, name);
    const id = portraitIdFor(name);
    assert.ok(portraitIds(gender, look).includes(id), `${name} → ${id}`);
    assert.equal(portraitIdFor("Dr. " + name), id);
    assert.equal(portraitIdFor(name), id);
  }
  const spread = new Set(Array.from({ length: 60 }, (_, i) => portraitIdFor(`Priya ${String.fromCharCode(65 + (i % 26))}ab${String.fromCharCode(97 + Math.floor(i / 26))}`)));
  assert.ok(spread.size > 20, "fallback spreads over the pool: " + spread.size);
  // An initial form outside the data hashes within its own (hashed) gender and surname look.
  const rao = parsePersonName("Q. Rao");
  assert.equal(assignments["Q. Rao"], undefined);
  assert.ok(portraitIds(rao.gender, "south-asian").includes(portraitIdFor("Q. Rao")));
  for (const text of ["Zeynep Kaya", "Customer Admin", "", "Kavita", "K. R."]) assert.equal(portraitIdFor(text), undefined, text);
  assert.deepEqual(
    ["woman", "man"].flatMap((g) => ["south-asian", "international"].map((l) => portraitIds(g, l).length)),
    [48, 24, 48, 24],
  );
});

test("portraitChoice: uploaded photos win; dummy photos and missing images use the pool", () => {
  const riya = portraitIdFor("Riya Sharma");
  const aarav = portraitIdFor("Aarav Mehta");
  const dummy = (uid) => samples.customer_admin.find((r) => r.setup.uid === uid).setup.image;
  assert.deepEqual(portraitChoice("Kavita Rao", { image: "file:///data/learner.jpg" }), { uri: "file:///data/learner.jpg" });
  assert.deepEqual(portraitChoice("Zeynep Kaya", { image: "blob:http://localhost/1" }), { uri: "blob:http://localhost/1" });
  assert.deepEqual(portraitChoice("Riya Sharma", { image: dummy("E1002") }), { id: riya, file: "hd" });
  assert.deepEqual(portraitChoice("", { image: dummy("E1001"), size: 40 }), { id: aarav, file: "thumb" });
  assert.deepEqual(portraitChoice("Riya Sharma · E1002", { size: PORTRAIT_THUMB_MAX }), { id: riya, file: "thumb" });
  assert.deepEqual(portraitChoice("Riya Sharma", { size: 97 }), { id: riya, file: "hd" });
  assert.deepEqual(portraitChoice("Riya Sharma"), { id: riya, file: "hd" });
  assert.equal(portraitChoice("Customer Admin"), undefined);
  assert.deepEqual(portraitChoice("K. Nair · contractor", { size: 36 }), { id: portraitIdFor("K. Nair"), file: "thumb" });
  assert.equal(portraitChoice("Zeynep Kaya", { image: dummy("E1003") }), undefined);
  assert.equal(bundledPhotoOwner(dummy("V2001")), "Kabir Rao");
  assert.equal(bundledPhotoOwner("/assets/assets/profiles/e1003.jpg"), "Neha Patel");
  assert.equal(bundledPhotoOwner("http://localhost:8081/assets/?unstable_path=.%2Fassets%2Fprofiles%2Fv2001.jpg"), "Kabir Rao");
  assert.equal(bundledPhotoOwner("file:///photos/e1001.jpg"), undefined);
  assert.equal(bundledPhotoOwner(undefined), undefined);
});

test("assignment is deterministic and independent of scan order", () => {
  const reversedPersons = new Map([...scan.persons].reverse());
  const again = assignPortraits([...pool].reverse(), reversedPersons, [...scan.pages].reverse());
  assert.deepEqual(again.assignments, result.assignments);
  assert.deepEqual(Object.keys(assignments), Object.keys(assignments).slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
});

test("generated files are up to date (npm run portraits:assign)", () => {
  for (const [file, text] of Object.entries(built.outputs))
    assert.ok(current(file) === text, path.relative(root, file) + " is stale; run npm run portraits:assign");
  const images = fs.readFileSync(path.join(root, "src/shared/ui/portraitImages.ts"), "utf8");
  for (const { id } of pool) {
    assert.ok(images.includes(`hd: require("../../../assets/profiles/people/${id}.jpg")`), id);
    assert.ok(images.includes(`thumb: require("../../../assets/profiles/people/thumbs/${id}.jpg")`), id);
  }
  for (const p of pool) assert.match(p.id, new RegExp(`^${p.look === "south-asian" ? "sa" : "in"}-${p.gender[0]}-\\d\\d$`));
});

test("the retired demo-man/demo-woman portraits are not referenced", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(tsx?|jsx?|cjs|json)$/.test(entry.name) && /demo-(man|woman)\.png/.test(fs.readFileSync(file, "utf8")))
        offenders.push(path.relative(root, file));
    }
  };
  for (const dir of ["src", "app"]) walk(path.join(root, dir));
  assert.deepEqual(offenders, []);
});
