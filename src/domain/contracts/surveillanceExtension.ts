import type { Industry, PageContract, DataRecord } from "./types";
export function surveillanceUsers(
  education: Industry,
  samples: Record<string, DataRecord[]> = {},
) {
  const targets: [role: string, id: string, after: string][] = [
    ["vizenta_admin", "va-surveillance-users", "Customers & Deployments"],
    ["customer_admin", "ca-surveillance-users", "People & Access"],
  ];
  for (const [role, id, after] of targets) {
    const persona = education.core.roles[role];
    const pages = education.pages[role];
    if (!persona || !pages || pages.org["Surveillance Users"]) continue;
    const page = {
      id,
      heading: "Surveillance users",
      description:
        "People the cameras recognise: identified staff and residents, visitors with a validity window, and threats that raise an alert.",
      detailType: "surveillance_user",
      recordLabel: "user",
      // Workspace counts are calculated from the scoped session records.
      metrics: ["Identified", "Threat", "Visitor", "Without face image"].map(
        (label) => ({ label, value: "0", context: "", tone: "healthy" }),
      ),
      columns: [
        { id: "user", label: "User", type: "text" },
        { id: "email", label: "Email", type: "text" },
        { id: "phone", label: "Phone", type: "text" },
        { id: "type", label: "User type", type: "text" },
        { id: "shift", label: "Shift / validity", type: "text" },
        { id: "group", label: "Camera group", type: "text" },
      ],
      filters: [
        {
          id: "type",
          label: "User type",
          options: ["All types", "Identified", "Threat", "Visitor"],
        },
        {
          id: "image",
          label: "Face image",
          options: ["All images", "Provided", "Missing"],
        },
      ],
      records: structuredClone(samples[role] ?? []),
      sidePanels: [],
      sources: [
        {
          label: "Recognition service",
          value: "Not connected",
          tone: "unavailable",
          impact:
            "Users are enrolled for recognition once the service is connected",
        },
      ],
      states: {
        empty:
          "No surveillance users yet. Use Add or Bulk upload to add the people the cameras should recognise.",
        degraded: "The recognition service is not connected.",
        notConfigured:
          "Surveillance users cannot be enrolled until the recognition service is connected.",
        unauthorized: "Your role does not permit this view.",
        insufficientHistory: "There is not enough history yet.",
      },
    } as unknown as PageContract;
    const org = persona.organization;
    org.splice(Math.max(org.indexOf(after) + 1, 1), 0, "Surveillance Users");
    pages.org["Surveillance Users"] = { Users: page };
  }
}
