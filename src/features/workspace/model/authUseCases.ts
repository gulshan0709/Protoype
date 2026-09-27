export const authUseCases = [
  {
    id: "corporate",
    label: "Corporate",
    shortLabel: "Corporate",
    source: require("../../../../assets/auth/surveillance-lobby-front.png"),
    imageLabel:
      "Corporate office lobby with front-facing people and cyan detection brackets",
    headline: "Every workplace.",
    description: "Bring your people, spaces, and daily operations into focus.",
    firstTitle: "People & presence",
    firstDetail: "A clearer view of your workplace",
    secondTitle: "Space awareness",
    secondDetail: "Focus on what matters",
  },
  {
    id: "education",
    label: "Education",
    shortLabel: "Education",
    source: require("../../../../assets/auth/education-classroom-marked.png"),
    imageLabel:
      "Eight students seated at classroom desks, each with a cyan detection marker",
    headline: "Every campus.",
    description:
      "Connect campus presence, shared spaces, and safety in one view.",
    firstTitle: "Campus presence",
    firstDetail: "Keep campus activity in view",
    secondTitle: "Shared spaces",
    secondDetail: "Awareness across your campus",
  },
  {
    id: "retail",
    label: "Retail",
    shortLabel: "Retail",
    source: require("../../../../assets/auth/retail-surveillance.png"),
    imageLabel:
      "Retail supermarket with shoppers, merchandise and cyan detection brackets",
    headline: "Every store.",
    description:
      "See store activity, customer movement, and your team's presence.",
    firstTitle: "Store activity",
    firstDetail: "Understand movement in your store",
    secondTitle: "Floor awareness",
    secondDetail: "Keep important areas in view",
  },
  {
    id: "manufacturing",
    label: "Warehouse & Manufacturing",
    shortLabel: "Warehouse & Mfg.",
    source: require("../../../../assets/auth/manufacturing-surveillance.png"),
    imageLabel:
      "Warehouse and manufacturing floor with workers in safety equipment and cyan detection brackets",
    headline: "Every operation.",
    description:
      "Bring visibility to your warehouse, production floor, and safety zones.",
    firstTitle: "Workforce presence",
    firstDetail: "A shared view of your operations",
    secondTitle: "Safety zones",
    secondDetail: "Awareness where it matters",
  },
] as const;
export type AuthUseCaseId = (typeof authUseCases)[number]["id"];
export const AUTH_SLIDE_INTERVAL = 4000;
