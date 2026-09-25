import type { Industry, DataRecord, PageContract } from "./types";
const text = (value: unknown) => (typeof value === "string" ? value : "");
const dash = "—";
function facts(record: DataRecord, items: { label: string; value: string }[]) {
  for (const item of items) {
    const current = record.detail.facts.find((f) => f.label === item.label);
    if (current) current.value = item.value;
    else record.detail.facts.push(item);
  }
}
function section(
  record: DataRecord,
  title: string,
  items: { label: string; value: string }[],
) {
  record.detail.sections = record.detail.sections.filter(
    (s) => s.title !== title,
  );
  record.detail.sections.push({ title, items });
}
export function populateDemoData(education: Industry) {
  const seeded = education as Industry & {demoDataReady?: boolean};
  if (seeded.demoDataReady) return;
  seeded.demoDataReady = true;
  for (const [role, areas] of Object.entries(education.pages)) {
    const residence = areas.product.Warden;
    if (residence) {
      const hostelNames = residence.Hostels.records.map((r) =>
        text(r.cells.hostel),
      );
      residence.Wardens.records.forEach((r, i) => {
        const name = text(r.cells.warden);
        const email =
          name
            .toLowerCase()
            .replace(/[^a-z]+/g, ".")
            .replace(/^\.|\.$/g, "") + "@example.com";
        const phone = "98765010" + String(i + 10);
        const hostels = [hostelNames[i % hostelNames.length]].filter(Boolean);
        r.setupKind = "warden";
        r.setup = {
          name,
          email,
          phone,
          designation: "Warden",
          hostels,
          permissions: {},
        };
        Object.assign(r.cells, {
          email,
          phone,
          hostels: hostels.join(", "),
          state: "Active",
        });
        r.state = { label: "Active", tone: "healthy" };
        r.detail.summary =
          "Responsible for resident welfare, leave approvals and gate exceptions in assigned hostels.";
        facts(r, [
          { label: "Email", value: email },
          { label: "Phone", value: phone },
          { label: "Hostels", value: hostels.join(", ") },
        ]);
      });
      residence.Hostels.records.forEach((r, i) => {
        const owner =
          residence.Wardens.records[i % residence.Wardens.records.length];
        const wardens = owner ? [text(owner.cells.warden)] : [];
        const closing =
          text(r.cells.closing).match(/\d{2}:\d{2}/)?.[0] ?? "22:00";
        r.setupKind = "hostel";
        r.setup = {
          hostel_name: text(r.cells.hostel),
          closing_time: closing,
          wardens,
          rooms: text(r.cells.rooms),
        };
        r.cells.wardens = wardens.join(", ");
        r.cells.closing = closing;
        facts(r, [
          { label: "Wardens", value: wardens.join(", ") },
          { label: "Closing time", value: closing },
        ]);
      });
      for (const w of residence.Wardens.records) {
        const assigned = residence.Hostels.records
          .filter((h) =>
            (h.setup as { wardens: string[] }).wardens.includes(
              text(w.cells.warden),
            ),
          )
          .map((h) => text(h.cells.hostel));
        (w.setup as { hostels: string[] }).hostels = assigned;
        w.cells.hostels = assigned.join(", ");
        facts(w, [{ label: "Hostels", value: assigned.join(", ") }]);
      }
      const base = residence.Wardens.records[0];
      if (base) {
        const r = structuredClone(base);
        r.id = role + "-residence-subadmin";
        r.cells = {
          warden: "Priya Menon",
          email: "priya.menon@example.com",
          phone: "9876501025",
          designation: "Sub Admin",
          hostels: "All (view only)",
        };
        r.setup = {
          name: "Priya Menon",
          email: r.cells.email,
          phone: r.cells.phone,
          designation: "Sub Admin",
          hostels: [],
          permissions: Object.fromEntries(
            [
              "Hostels",
              "Leave management",
              "In/Out",
              "Gate attendance",
              "Reports",
            ].map((m) => [m, ["View", "Download"]]),
          ),
        };
        r.detail.title = "Priya Menon";
        r.detail.eyebrow = "SUB ADMIN";
        r.detail.summary =
          "Reviews residence operations and downloads reports across assigned campuses.";
        r.detail.facts = Object.entries(r.cells).map(([label, value]) => ({
          label,
          value,
        }));
        residence.Wardens.records.push(r);
      }
    }
    for (const branches of Object.values(areas))
      for (const tabs of Object.values(branches))
        for (const page of Object.values(tabs)) {
          page.records.forEach((r, i) => {
            if (r.type === "surveillance_user" && r.setup) {
              const u = r.setup as Record<string, string>;
              u.phone = "987651" + String(1000 + i);
              r.cells.phone = u.phone;
              facts(r, [{ label: "Phone", value: u.phone }]);
            }
            if (
              ["ca-class-sources", "ca-gate-cameras"].includes(page.id) &&
              r.type !== "gate_processor"
            ) {
              const gate = page.id === "ca-gate-cameras";
              const location = text(r.cells[gate ? "gate" : "mapped"]);
              const bits = location.split(" \u00b7 ");
              r.setupKind = "camera";
              r.setup = {
                building: gate ? bits[0] : "Academic Block",
                room_number: gate
                  ? (bits[1] || "Lane 1").replace(/^Lane\s*/, "")
                  : location.replace(/^Room\s*/, ""),
                capture_per_hour: "12",
                detection: "0.6",
                recognition: "0.85",
                attendance_type: gate
                  ? text(r.cells.direction) || "Entry"
                  : "Periodic Snapshot",
                allow_duplicate_classes: false,
                cameras: [
                  {
                    display_name: text(r.cells.source),
                    camera_brand: "Hikvision",
                    ip: "192.0.2." + (40 + i),
                    port: "554",
                    camera_id: r.id,
                    user_name: "camera.operator",
                    password: "VizentaPreview2026",
                  },
                ],
              };
            }
            if (page.id === "ca-setup-cameras") {
              const location = text(r.cells.location);
              const setup = {
                display_name: text(r.cells.display),
                group: location,
                brand: i % 2 ? "Axis" : "Hikvision",
                ip: "192.0.2." + (20 + i),
                port: "554",
                camera_id: "CAM-" + String(i + 1).padStart(3, "0"),
                user_name: "camera.operator",
                password: "VizentaPreview2026",
                days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                start: "06:00",
                end: "23:00",
                location,
                camera_type: "Check In",
              };
              r.setupKind = "setupCamera";
              r.setup = setup;
              Object.assign(r.cells, {
                brand: setup.brand,
                cameraId: setup.camera_id,
                ip: setup.ip,
                port: setup.port,
                user: setup.user_name,
                days: setup.days.join(", "),
                start: setup.start,
                end: setup.end,
              });
              facts(r, [
                { label: "Brand", value: setup.brand },
                { label: "Endpoint", value: setup.ip + ":" + setup.port },
                { label: "Camera ID", value: setup.camera_id },
              ]);
              section(r, "Capture schedule", [
                { label: "Location", value: location },
                { label: "Active days", value: setup.days.join(", ") },
                { label: "Hours", value: "06:00 - 23:00" },
              ]);
            }
            if (
              [
                "ca-class-learners",
                "dean-learners",
                "coordinator-learners",
              ].includes(page.id)
            ) {
              const [name, uid] = text(r.cells.learner).split(" \u00b7 ");
              const parts = (name || "").split(" ");
              const path = text(r.cells.path).split(" \u00b7 ");
              r.setupKind = "learner";
              r.setup = {
                uid: (uid || String(24031 + i)).replace(/^UID\s*/, ""),
                first_name: parts[0],
                last_name: parts.slice(1).join(" "),
                gender: i % 2 ? "Female" : "Male",
                email: parts.join(".").toLowerCase() + "@example.com",
                mobile: "987652" + String(1000 + i),
                dob: "2005-04-12",
                type: "Learner",
                group_name: "2026 intake",
                Department_name: path[0] || "Computing",
                program: path[1] || "B.Tech",
                section: path[2] || "A",
                parentsemail: "guardian." + String(i + 1) + "@example.com",
                parentsmobile: "987653" + String(1000 + i),
              };
            }
            if (
              /^(ca-class-coverage|dean-classes|dean-labs|coordinator-classes|coordinator-labs)$/.test(
                page.id,
              )
            ) {
              const denominator = text(r.cells.attendance).match(
                /\/\s*(\d+)/,
              )?.[1];
              const count = Math.min(
                100,
                Number(
                  text(r.cells.expected).match(/^\d+/)?.[0] ||
                    denominator ||
                    text(r.cells.roster).match(/^\d+/)?.[0] ||
                    "24",
                ),
              );
              const label = text(r.cells.space || r.cells.class || r.cells.lab);
              const lab = /lab/i.test(label) || page.id.endsWith("labs");
              const path = text(r.cells.path).split(" \u00b7 ");
              r.setupKind = lab ? "lab" : "class";
              r.setup = {
                class_name: label.split(" \u00b7 ")[0],
                program: path[1] || "B.Tech CSE",
                department: path[0] || text(r.cells.owner) || "Computing",
                cohort: "2026",
                section: label.split(" \u00b7 ")[1] || "A",
                semester: "5",
                faculty_email: "faculty." + (i + 1) + "@example.com",
                Tag: lab ? "Lab" : "Lecture",
                attendance_type: lab ? "Continuous" : "Snapshot",
                start_date: "2026-08-01",
                end_date: "2026-12-18",
                day: "Monday",
                start_time: "09:00",
                end_time: lab ? "11:00" : "10:00",
                building: "Academic Block",
                room: label.match(/Room\s+(\d+)/)?.[1] || String(204 + i),
                capacity: String(Math.max(count, 30)),
              };
              const first = [
                "Aarav",
                "Riya",
                "Kabir",
                "Ananya",
                "Arjun",
                "Priya",
                "Neha",
                "Dev",
                "Meera",
                "Rahul",
                "Isha",
                "Karan",
              ];
              const last = [
                "Mehta",
                "Sharma",
                "Rao",
                "Das",
                "Nair",
                "Sen",
                "Patel",
                "Gupta",
              ];
              r.demoLearners = Array.from({ length: count }, (_, j) => ({
                uid: String(24031 + j),
                name:
                  first[j % first.length] +
                  " " +
                  last[(j + Math.floor(j / first.length)) % last.length],
                email: "student." + (24031 + j) + "@example.com",
              }));
            }
          });
        }
  }
  const setupPages = education.pages.customer_admin.org["Sources & Setup"];
  const cameras = setupPages["Camera Setup"].records;
  for (const tab of ["Surveillance Dashboard", "Surveillance Attendance"]) {
    const page = setupPages[tab];
    cameras.forEach((camera, i) => {
      const name = ["Aarav Mehta", "Riya Sharma", "Kabir Rao"][i % 3];
      const time = i === 0 ? "09:12" : "08:47";
      const uid = String(24031 + i);
      const location = text(camera.cells.location);
      page.records.push({
        id: page.id + "-recognition-" + i,
        type: "detection",
        scope: [...camera.scope],
        cells: {
          uid,
          name,
          camera: location,
          type: "Identified",
          time,
          confidence: "98.4%",
          state: "Identified",
        },
        state: { label: "Identified", tone: "healthy" },
        action: "Open recognition",
        detail: {
          title: name + " - " + location,
          eyebrow: "RECOGNITION",
          summary:
            "Verified recognition retained from the last available camera event.",
          facts: [
            { label: "UID", value: uid },
            { label: "Camera", value: location },
            { label: "Time", value: time },
            { label: "Confidence", value: "98.4%" },
          ],
          sections: [],
          timeline: [
            {
              time,
              event: "Recognition recorded",
              actor: "Recognition service",
            },
          ],
          permittedActions: [],
        },
      });
    });
    const filter = page.filters.find((f) => f.id === "camera");
    if (filter)
      filter.options = [
        "All cameras",
        ...new Set(page.records.map((r) => text(r.cells.camera))),
      ];
  }
  const shifts = education.pages.customer_admin.org["Sources & Setup"].Shift;
  const schedules = [
    ["Morning", "06:00", "14:00"],
    ["General", "09:00", "18:00"],
    ["Evening", "14:00", "22:00"],
  ];
  shifts.records = education.core.roles.customer_admin.scopes
    .filter((s) => s !== "Across campuses")
    .flatMap((scope, campus) =>
      schedules.map(([name, start, end], i) => {
        const setup = {
          name: name + " - " + scope,
          start,
          end,
          startBuffer: "15",
          endBuffer: "15",
        };
        return {
          id: "SHIFT-" + campus + "-" + i,
          type: "shift",
          setupKind: "shift",
          setup,
          cells: {
            name: setup.name,
            start,
            end,
            startBuffer: "15",
            endBuffer: "15",
          },
          state: { label: "Configured", tone: "healthy" },
          action: "Open shift",
          scope: ["Across campuses", scope],
          detail: {
            title: setup.name,
            eyebrow: "SHIFT",
            summary:
              "Attendance window with a 15-minute arrival and departure buffer.",
            facts: [
              { label: "Campus", value: scope },
              { label: "Start", value: start },
              { label: "End", value: end },
            ],
            sections: [],
            timeline: [
              {
                time: "09:00",
                event: "Shift configured",
                actor: "Operations administrator",
              },
            ],
            permittedActions: [],
          },
        } as DataRecord;
      }),
    );
}
