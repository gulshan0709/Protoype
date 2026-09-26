import React, { useId } from "react";
import { Image, View } from "react-native";
import Svg, {
  Path,
  Circle,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { useTheme } from "../theme/Theme";
const paths: Record<string, string> = {
  more: "M12 5h.01M12 12h.01M12 19h.01",
  home: "M3 10 12 3l9 7v10H3ZM9 20v-7h6v7",
  grid: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
  class: "M3 4h18v13H3ZM8 21l4-4 4 4M7 9h4M7 13h9",
  gate: "M4 21V5h16v16M8 21V9h8v12M2 21h20",
  bed: "M3 18V6M3 13h18v5M7 13V9h7v4M21 13V9",
  shield: "M12 3 20 6v5c0 5-4 8-8 10-4-2-8-5-8-10V6ZM8 12l3 3 5-6",
  guard: "M5 5h14M8 5V2h8v3M6 21c0-8 12-8 12 0M9 8a3 3 0 1 0 6 0",
  visitor:
    "M4 4h16v17H4ZM8 4V2m8 2V2M8 17c0-4 8-4 8 0M10 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0",
  chart: "M3 3v18h18M7 16l5-5 4 2 5-7",
  sparkle: "m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z",
  building: "M3 21h18M5 21V3h10v18M15 9h5v12M8 7h4M8 11h4M8 15h4",
  folder: "M3 6h7l2 3h9v11H3Z",
  users:
    "M3 21c0-8 12-8 12 0M16 14c3 0 5 3 5 7M16 3c5 0 5 8 0 8M6 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  settings: "M3 6h8m4 0h6M3 12h3m4 0h11M3 18h11m4 0h3M11 3v6M6 9v6m8 0v6",
  site: "M12 22S4 14 4 9a8 8 0 0 1 16 0c0 5-8 13-8 13ZM9 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  bell: "M18 8a6 6 0 0 0-12 0c0 6-3 7-3 9h18c0-2-3-3-3-9M10 21h4",
  help: "M9 9c0-4 7-4 6 0 0 2-3 2-3 5M12 17v1",
  search: "M21 21l-6-6M3 9a6 6 0 1 0 12 0A6 6 0 0 0 3 9",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  back: "M20 12H4m6-6-6 6 6 6",
  close: "m6 6 12 12M18 6 6 18",
  check: "m5 12 4 4L19 6",
  menu: "M4 6h16M4 12h16M4 18h16",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  logout: "M9 3H3v18h6M8 12h13m-5-5 5 5-5 5",
  clock: "M12 7v6l4 2",
  plus: "M12 4v16M4 12h16",
  minus: "M4 12h16",
  play: "m8 5 11 7-11 7Z",
  pause: "M8 5v14M16 5v14",
  sun: "M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
  filter: "M3 5h18M6 12h12M9 19h6",
  refresh: "M20 8A8 8 0 1 0 20 16M20 3v5h-5",
  lock: "M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4",
  fingerprint:
    "M5 11a7 7 0 0 1 12.5-4.3M19 10.5V12c0 3-.6 5.6-1.8 8M8.5 20.5C9.5 18 10 15.5 10 12a2 2 0 0 1 4 0c0 3.8-.5 6.8-1.5 9.5M16 12.5c0 2.2-.3 4.2-.8 6M5 15c.6-1 1-2.3 1-3.5",
  face: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M9 9v1.5M15 9v1.5M12 9v4.5h-1M9.5 16.5c1.6 1 3.4 1 5 0",
  backspace: "M9 5h11v14H9l-6-7ZM12 9l5 6M17 9l-5 6",
  activity: "M2 12h5l3-8 4 16 3-8h5",
  camera: "M3 7h13v12H3ZM16 10l5-3v12l-5-3",
  mail: "M3 5h18v14H3ZM3 5l9 8 9-8",
};
export const Icon = React.memo(function Icon({
  name,
  size = 20,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const c = useTheme();
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? c.muted}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {["help", "clock"].includes(name) && <Circle cx={12} cy={12} r={9} />}{" "}
      {name === "sun" && <Circle cx={12} cy={12} r={4} />}
      <Path d={paths[name] ?? paths.folder} />
    </Svg>
  );
});
export function BrandMark({
  size = 34,
  radius = 5,
  markScale = 1,
}: {
  size?: number;
  radius?: number;
  /** Mark width as a fraction of the tile, for tiles beside other controls. */
  markScale?: number;
}) {
  const c = useTheme();
  const gradientId = `vizenta-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const mark = size * markScale;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Vizenta AI"
      style={{
        width: size,
        height: size,
        overflow: "hidden",
        backgroundColor: c.sidebar,
        borderRadius: radius,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      {/* Standalone paths from the reference brand favicon; no wordmark crop. */}
      <Svg
        width={mark}
        height={(mark * 193) / 271}
        viewBox="0 0 271 193"
        fill="none"
      >
        <Defs>
          <LinearGradient
            id={`${gradientId}-right`}
            x1="196"
            y1="0"
            x2="196"
            y2="91"
            gradientUnits="userSpaceOnUse"
          >
            <Stop stopColor="#00C0C0" />
            <Stop offset="1" stopColor="#03B8FF" />
          </LinearGradient>
          <LinearGradient
            id={`${gradientId}-left`}
            x1="61.5"
            y1="0"
            x2="61.5"
            y2="54"
            gradientUnits="userSpaceOnUse"
          >
            <Stop stopColor="#00C0C0" />
            <Stop offset="1" stopColor="#03B8FF" />
          </LinearGradient>
        </Defs>
        <Path
          d="M84.485 71.7271C101.904 96.0283 119.013 119.904 136.907 144.873C146.752 131.256 155.738 118.913 164.633 106.504C178.685 86.8996 192.67 67.2473 206.703 47.6289C208.105 45.6689 209.302 43.25 212.016 42.9337C222.135 41.7543 232.242 41.5441 244 43.4274C208.109 93.6104 173.051 142.627 137.024 193C101.166 142.914 66.0038 93.8003 30 43.511C41.9255 41.4506 52.2469 41.7011 62.5657 43.0444C64.9006 43.3483 65.8705 45.7895 67.1348 47.539C72.8437 55.4392 78.5002 63.3769 84.485 71.7271Z"
          fill="#FFFFFF"
        />
        <Path
          d="M167.728 1.14679C170.769 0.502342 173.354 0.0333919 175.939 0.0291162C204.756 -0.0185587 233.573 0.00556767 262.39 0.0102412C264.731 0.0106187 267.072 0.0102855 271 0.0102855C267.839 7.05574 263.156 11.5552 260.207 17.0367C255.761 25.303 249.575 27.7949 240.414 27.3595C223.78 26.5689 207.077 27.3991 190.416 26.9893C184.687 26.8484 181.161 28.9034 178.019 33.4666C166.154 50.6948 154.052 67.7544 142.038 84.8765C140.544 87.0058 139.433 89.5113 135.74 91C131.108 84.2763 126.25 77.5088 121.722 70.5219C119.734 67.4558 122.312 65.0301 123.926 62.7438C138.344 42.3199 152.815 21.9347 167.728 1.14679Z"
          fill={`url(#${gradientId}-right)`}
        />
        <Path
          d="M3.76905 8.2504C2.19373 5.82581 0.308344 4.16217 0 1.47825C1.83871 -0.780031 4.41539 0.222561 6.63147 0.217266C36.3553 0.146024 66.0804 0.300922 95.8024 0.0554059C100.955 0.0128557 104.25 1.58502 107.036 5.89505C111.49 12.7848 116.393 19.3812 121.205 26.0278C122.905 28.375 123.869 30.5421 121.918 33.246C117.288 39.6637 112.743 46.1448 107.17 54C102.377 47.2779 97.941 41.7246 94.255 35.702C90.4892 29.5491 85.9184 26.9532 78.4441 27.2177C60.9667 27.8362 43.4476 27.157 25.9576 27.5531C19.7721 27.6932 15.4684 26.1551 12.3616 20.535C10.0377 16.3309 6.86595 12.606 3.76905 8.2504Z"
          fill={`url(#${gradientId}-left)`}
        />
      </Svg>
    </View>
  );
}
export function BrandWordmark({ width = 154 }: { width?: number }) {
  return (
    <Image
      accessibilityLabel="Vizenta AI"
      source={require("../../../assets/brand/vizenta-logo.png")}
      resizeMode="contain"
      style={{ width, height: (width * 840) / 3644 }}
    />
  );
}
