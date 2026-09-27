export const authUseCases = [
  {
    id: "enterprise",
    label: "Enterprise",
    shortLabel: "Enterprise",
    source: require("../../../../assets/auth/surveillance-lobby-front.png"),
    imageLabel:
      "Enterprise site entrance with people and cyan detection brackets",
    headline: "Every operation.",
    description:
      "Connect people, sites, zones, security, and daily operations in one view.",
    firstTitle: "People & presence",
    firstDetail: "One view across assigned sites",
    secondTitle: "Safety & response",
    secondDetail: "Focus attention where it matters",
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
] as const;
export type AuthUseCaseId = (typeof authUseCases)[number]["id"];
export const AUTH_SLIDE_INTERVAL = 4000;
