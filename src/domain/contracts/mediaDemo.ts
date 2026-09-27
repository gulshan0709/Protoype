import type { Industry, DataRecord } from "./types";
export function populateMediaDemo(education: Industry) {
  const seeded = education as Industry & { mediaDemoReady?: boolean };
  if (seeded.mediaDemoReady) return;
  seeded.mediaDemoReady = true;
  const portraits = education.pages.customer_admin.org[
    "Surveillance Users"
  ].Users.records
    .filter((r) => (r.setup as { image?: string })?.image)
    .map((r) => (r.setup as { image: string }).image);
  // Seed existing learner profiles with bundled portraits; uploaded photos take precedence.
  for (const areas of Object.values(education.pages)) {
    const learners = areas.product["Class & Lab Attendance"]?.Learners;
    learners?.records.forEach((record, index) => {
      const user = record.setup as { image?: string } | undefined;
      if (user && !user.image && portraits.length) user.image = portraits[index % portraits.length];
    });
  }
  const setup = education.pages.customer_admin.org["Sources & Setup"];
  const videos = setup["Video Analytics"];
  // Add an available recording for each configured camera; preserve unavailable evidence records.
  setup["Camera Setup"].records.forEach((camera, i) => {
    camera.videoAsset = i % 3;
    camera.captureAsset = i % 3;
    const name = String(camera.cells.display);
    const location = String(camera.cells.location);
    videos.records.unshift({
      id: "RECORDING-" + camera.id,
      type: "recording",
      scope: [...camera.scope],
      videoAsset: i % 3,
      captureAsset: i % 3,
      cells: {
        camera: location,
        users: "Recorded activity",
        cameraId: name,
        date: "Sep 25",
        start: "09:12:00",
        end: "09:12:08",
        kind: "Video clip",
        media: "Play recording",
        state: "Available",
      },
      state: { label: "Available", tone: "healthy" },
      action: "Open recording",
      detail: {
        title: name + " - 09:12 recording",
        eyebrow: "RECORDING",
        summary: "Recorded gate activity. Duration: 8 seconds.",
        facts: [
          { label: "Camera", value: name },
          { label: "Location", value: location },
          { label: "Start", value: "09:12:00" },
          { label: "End", value: "09:12:08" },
        ],
        sections: [],
        timeline: [],
        permittedActions: [],
      },
    });
  });
  for (const areas of Object.values(education.pages))
    for (const branches of Object.values(areas))
      for (const tabs of Object.values(branches))
        for (const page of Object.values(tabs)) {
          const attendance = page.detailType === "gate_attendance",
            inout = page.detailType === "gate_in_out",
            detection = ["ca-setup-dashboard", "ca-setup-attendance"].includes(
              page.id,
            ),
            video = page.id === "ca-setup-video";
          if (!attendance && !inout && !detection && !video) continue;
          if (!page.columns.some((c) => c.id === "capture"))
            page.columns.splice(1, 0, {
              id: "capture",
              label: video ? "Recording" : "Capture",
              type: "text",
            });
          if (!video) page.columns[0].label = "Person";
          page.records.forEach((r, i) => {
            if (!video) {
              const label = String(
                r.cells.user ||
                  r.cells.person ||
                  r.cells.name ||
                  r.detail.title,
              );
              const parts = label.split(" \u00b7 ");
              const name = parts[0];
              const uid = String(r.cells.uid || parts[1] || r.id);
              const privateIdentity =
                /withheld|unregistered|unknown/i.test(name) ||
                r.cells.type === "Threat";
              r.person = {
                name,
                uid,
                image: privateIdentity
                  ? undefined
                  : portraits[
                      (
                        {
                          "Aarav Mehta": 0,
                          "Vikram Shah": 3,
                          "Rohan Desai": 3,
                          "Kabir Rao": 3,
                          "R. Desai": 0,
                          "Priya Nair": 1,
                          "Anaya Gupta": 1,
                          "Meera Patel": 2,
                          "Tara Iyer": 2,
                        } as Record<string, number>
                      )[name] ??
                        [...name].reduce(
                          (sum, char) => sum + char.charCodeAt(0),
                          0,
                        ) % portraits.length
                    ],
              };
            }
            if (!video && r.cells.status !== "Absent") r.captureAsset = i % 3;
            r.cells.capture =
              typeof r.videoAsset === "number"
                ? "Play recording"
                : typeof r.captureAsset === "number"
                  ? "View capture"
                  : "Unavailable";
          });
        }
  const cameraFilter = videos.filters.find((f) => f.id === "camera");
  if (cameraFilter)
    cameraFilter.options = [
      "All cameras",
      ...new Set(videos.records.map((r) => String(r.cells.camera))),
    ];
}
