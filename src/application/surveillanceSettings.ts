import { useSyncExternalStore } from "react";
import type { Workspace } from "../domain/contracts/types";
import { useApp } from "./AppProvider";

// Sources & Setup → Setup and Camera Criteria settings (legacy skillatracker-ui
// Surveillance/SetUp). No setup service is connected yet: each industry, role
// and scope keeps its own copy for this session.

export interface Channel {
  enable: boolean;
  userTypes: string[];
  interval: string;
  recipients: { name: string; contact: string }[];
}
export interface SurveillanceSettings {
  modules: { gate: boolean; analytics: boolean; video: boolean };
  notify: Record<"web" | "email" | "sms", Channel>;
  general: {
    fields: string[];
    keepSurveillance: string;
    keepAttendance: string;
  };
  criteria: Record<string, string>;
}
const channel = (): Channel => ({
  enable: false,
  userTypes: ["Identified"],
  interval: "1440",
  recipients: [{ name: "", contact: "" }],
});
const defaults: SurveillanceSettings = {
  modules: { gate: true, analytics: false, video: true },
  notify: {
    web: {
      ...channel(),
      enable: true,
      userTypes: ["Threat", "Visitor"],
      interval: "5",
    },
    email: {
      ...channel(),
      enable: true,
      userTypes: ["Threat"],
      interval: "60",
      recipients: [
        { name: "Campus operations", contact: "operations@example.com" },
      ],
    },
    sms: {
      ...channel(),
      recipients: [{ name: "Security desk", contact: "9876501001" }],
    },
  },
  general: {
    fields: ["Department", "Employee code", "Emergency contact"],
    keepSurveillance: "30",
    keepAttendance: "90",
  },
  criteria: {
    min_mean_intensity: "40",
    max_mean_intensity: "220",
    ideal_min: "80",
    ideal_max: "180",
    uniformity_min: "0.7",
    min_std_dev: "20",
    min_dynamic_range: "80",
    min_laplacian_variance: "100",
    ideal_laplacian_variance: "250",
    edge_density_min: "0.1",
    min_width: "1280",
    min_height: "720",
    recommended_width: "1920",
    recommended_height: "1080",
    min_face_confidence: "0.85",
    max_detection_time_ms: "500",
    max_yaw_degrees: "30",
    max_pitch_degrees: "20",
  },
};
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const settingsByScope = new Map<string, SurveillanceSettings>();

/** Store key: settings are kept per industry, role and scope. */
const settingsKey = (
  workspace: Pick<Workspace, "industry" | "role" | "scope">,
) => JSON.stringify([workspace.industry, workspace.role, workspace.scope]);

/** The current workspace's settings (the defaults until something is saved). */
export function useSettings() {
  const key = settingsKey(useApp().workspace);
  return useSyncExternalStore(
    subscribe,
    () => settingsByScope.get(key) ?? defaults,
  );
}

/** Saves part of the current workspace's settings. */
export function useSaveSettings() {
  const key = settingsKey(useApp().workspace);
  return (next: Partial<SurveillanceSettings>) => {
    settingsByScope.set(key, {
      ...(settingsByScope.get(key) ?? defaults),
      ...next,
    });
    listeners.forEach((l) => l());
  };
}
