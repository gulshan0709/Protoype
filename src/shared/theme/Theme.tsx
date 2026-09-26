import React, { createContext, useContext } from "react";
export const light = {
  // Reference palette with deeper action colors for readable white labels.
  background: "#f2f7fb",
  surface: "#FFFFFF",
  text: "#132940",
  muted: "#5d7388",
  subtle: "#5d7388",
  border: "#cbdce9",
  primary: "#2cb7e8",
  primarySoft: "#eaf2f8",
  link: "#087ba8",
  hero: "#eaf2f8",
  heroInk: "#102d49",
  sidebar: "#0d385d",
  sidebarText: "#e7f3fb",
  sidebarMuted: "#bcd8e9",
  sidebarIcon: "#c3e4f4",
  sidebarLine: "rgba(255,255,255,0.2)",
  sidebarActive: "rgba(255,255,255,0.16)",
  sidebarHover: "rgba(255,255,255,0.08)",
  sidebarAccent: "#34cef0",
  presence: "#63d7f4",
  safety: "#ff7181",
  insights: "#aa9cff",
  export: "#2bc4aa",
  assistant: "#8f82ff",
  actionInk: "#FFFFFF",
  actionPrimary: "#087ba8",
  actionPrimaryHover: "#076e96",
  actionPrimaryPressed: "#09678d",
  actionSecondary: "#0d385d",
  actionSecondaryHover: "#164d73",
  actionSecondaryPressed: "#092b48",
  actionExport: "#087f70",
  actionExportHover: "#076f62",
  actionExportPressed: "#065e53",
  actionAssistant: "#6956c7",
  actionAssistantHover: "#5b48b5",
  actionAssistantPressed: "#4e3d9c",
  actionDisabled: "#65788b",
  healthy: "#16886e",
  healthyBg: "#eaf2f8",
  attention: "#d99011",
  attentionBg: "#fcf7ee",
  critical: "#e15768",
  criticalBg: "#eaf2f8",
  pending: "#d99011",
  pendingBg: "#eaf2f8",
  unavailable: "#8f82ff",
  unavailableBg: "#eaf2f8",
  neutral: "#5d7388",
  neutralBg: "#eaf2f8",
  ink: "#102d49",
  white: "#FFFFFF",
  overlay: "rgba(5,20,34,0.6)",
  chart: "#2cb7e8",
  grid: "#cbdce9",
  panelShadow: "0 10px 30px rgba(19,58,88,0.06)",
  // Mission accents (22 September priority update), from the palette above.
  missionSecurity: "#e15768",
  missionAutomation: "#087ba8",
  missionCombined: "#6956c7",
  missionPlatform: "#5d7388",
};
export const dark: typeof light = {
  ...light,
  background: "#081725",
  surface: "#102a43",
  text: "#edf6ff",
  muted: "#a5bbcd",
  subtle: "#a5bbcd",
  border: "#315874",
  primarySoft: "#173754",
  link: "#2cb7e8",
  hero: "#173754",
  heroInk: "#edf6ff",
  sidebar: "#123f65",
  healthy: "#55d7b7",
  healthyBg: "#173754",
  attention: "#ffc75c",
  attentionBg: "#213549",
  criticalBg: "#173754",
  pending: "#ffc75c",
  pendingBg: "#173754",
  unavailableBg: "#173754",
  neutral: "#a5bbcd",
  neutralBg: "#173754",
  grid: "#315874",
  missionAutomation: "#2cb7e8",
  missionCombined: "#8f82ff",
  missionPlatform: "#a5bbcd",
};
export type Colors = typeof light;
export const ThemeContext = createContext(light);
export const useTheme = () => useContext(ThemeContext);
export const font = {
  regular: "Inter",
  medium: "InterMedium",
  bold: "InterBold",
};
export function toneColors(c: Colors, tone = "neutral") {
  const key =
    tone === "complete"
      ? "healthy"
      : ["healthy", "attention", "critical", "pending", "unavailable"].includes(
            tone,
          )
        ? tone
        : "neutral";
  return {
    color: c[key as keyof Colors],
    backgroundColor: c[`${key}Bg` as keyof Colors],
  };
}
export function missionColor(c: Colors, family: string) {
  return family === "security"
    ? c.missionSecurity
    : family === "automation"
      ? c.missionAutomation
      : family === "platform"
        ? c.missionPlatform
        : c.missionCombined;
}
