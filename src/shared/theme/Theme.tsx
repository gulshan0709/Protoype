import React, { createContext, useContext } from "react";
export const light = {
  // Pure neutral foundations keep the interface crisp while semantic color
  // carries the product hierarchy.
  background: "#FFFFFF",
  surface: "#FFFFFF",
  text: "#102033",
  muted: "#5B6B7B",
  subtle: "#697A8A",
  border: "#DCE4EA",
  primary: "#2cb7e8",
  primarySoft: "#EFF8FC",
  link: "#087ba8",
  hero: "#F6FAFC",
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
  healthyBg: "#EDF9F5",
  attention: "#d99011",
  attentionBg: "#FFF8E8",
  critical: "#e15768",
  criticalBg: "#FFF0F2",
  pending: "#d99011",
  pendingBg: "#FFF8E8",
  unavailable: "#8f82ff",
  unavailableBg: "#F3F0FF",
  neutral: "#5d7388",
  neutralBg: "#F3F6F8",
  ink: "#102d49",
  white: "#FFFFFF",
  overlay: "rgba(5,20,34,0.6)",
  chart: "#2cb7e8",
  grid: "#DCE4EA",
  panelShadow: "0 10px 28px rgba(16,45,73,0.08)",
  // Mission accents (22 September priority update), from the palette above.
  missionSecurity: "#e15768",
  missionAutomation: "#087ba8",
  missionCombined: "#6956c7",
  missionPlatform: "#5d7388",
};
export const dark: typeof light = {
  ...light,
  background: "#000000",
  surface: "#0B0D10",
  text: "#F7FAFC",
  muted: "#A8B3C0",
  subtle: "#94A2B0",
  border: "#29313A",
  primarySoft: "#111820",
  link: "#42C7F2",
  hero: "#0E141A",
  heroInk: "#F7FAFC",
  sidebar: "#050505",
  sidebarText: "#F7FAFC",
  sidebarMuted: "#A8B3C0",
  sidebarIcon: "#D5E8F2",
  sidebarLine: "rgba(255,255,255,0.13)",
  sidebarActive: "rgba(44,183,232,0.18)",
  sidebarHover: "rgba(255,255,255,0.07)",
  healthy: "#55d7b7",
  healthyBg: "#0E211C",
  attention: "#ffc75c",
  attentionBg: "#231B0B",
  criticalBg: "#241014",
  pending: "#ffc75c",
  pendingBg: "#231B0B",
  unavailableBg: "#181329",
  neutral: "#a5bbcd",
  neutralBg: "#15191E",
  ink: "#F7FAFC",
  grid: "#29313A",
  overlay: "rgba(0,0,0,0.76)",
  panelShadow: "0 14px 36px rgba(0,0,0,0.5)",
  missionAutomation: "#2cb7e8",
  missionCombined: "#8f82ff",
  missionPlatform: "#a5bbcd",
};
export type Colors = typeof light;
export type ThemeStyle = "signature" | "cobalt" | "teal";

const styleTokens: Record<ThemeStyle, Partial<Colors>> = {
  signature: {},
  cobalt: {
    primary: "#2E90FA",
    link: "#175CD3",
    chart: "#2E90FA",
    sidebar: "#0B1F3A",
    sidebarAccent: "#53B1FD",
    presence: "#53B1FD",
    actionPrimary: "#175CD3",
    actionPrimaryHover: "#1849A9",
    actionPrimaryPressed: "#194185",
    missionAutomation: "#175CD3",
  },
  teal: {
    primary: "#15B8A6",
    link: "#087F70",
    chart: "#15B8A6",
    sidebar: "#0A383A",
    sidebarAccent: "#5FE3D1",
    presence: "#5FE3D1",
    actionPrimary: "#087F70",
    actionPrimaryHover: "#067368",
    actionPrimaryPressed: "#055F57",
    missionAutomation: "#087F70",
  },
};

const darkStyleTokens: Record<ThemeStyle, Partial<Colors>> = {
  signature: {},
  cobalt: {
    link: "#53B1FD",
    sidebar: "#03070D",
    missionAutomation: "#53B1FD",
  },
  teal: {
    link: "#5FE3D1",
    sidebar: "#020807",
    missionAutomation: "#5FE3D1",
  },
};

export function themeFor(style: ThemeStyle, mode: "light" | "dark") {
  const base = mode === "dark" ? dark : light;
  return {
    ...base,
    ...styleTokens[style],
    ...(mode === "dark" ? darkStyleTokens[style] : {}),
  };
}
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
