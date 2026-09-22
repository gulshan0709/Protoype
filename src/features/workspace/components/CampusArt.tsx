import React from "react";
import Svg, { Path, Circle, Rect, G, Ellipse } from "react-native-svg";
import { useTheme } from "../../../shared/theme/Theme";
export function CampusArt() {
  const c = useTheme();
  return (
    <Svg
      width="100%"
      height={215}
      viewBox="0 0 430 235"
      accessibilityLabel="Connected spaces illustration"
    >
      <Ellipse
        cx={226}
        cy={179}
        rx={174}
        ry={42}
        fill={c.grid}
        opacity={0.45}
      />
      <Path
        d="m47 174 158-80 178 84-157 48Z"
        fill={c.primarySoft}
        stroke={c.chart}
      />
      <Path
        d="m72 161 131-64 157 74-134 68Z"
        fill="none"
        stroke={c.chart}
        strokeDasharray="4 5"
      />
      <G stroke={c.chart} strokeWidth={1.3}>
        <Path d="m109 154 62-30 60 29-62 32Z" fill={c.surface} />
        <Path d="m109 99 62-30v55l-62 30Z" fill={c.primarySoft} />
        <Path d="m171 69 60 30v54l-60-29Z" fill={c.grid} />
        <Path d="m109 99 62-30 60 30-62 29Z" fill={c.surface} />
        <Path d="m143 94 28-13 27 13-28 13Z" fill={c.grid} />
        <Path d="m224 182 49-24 54 26-49 24Z" fill={c.surface} />
        <Path d="m224 125 49-24v57l-49 24Z" fill={c.primarySoft} />
        <Path d="m273 101 54 25v58l-54-26Z" fill={c.grid} />
        <Path d="m224 125 49-24 54 25-49 24Z" fill={c.surface} />
        <Path d="m173 180 33-16 32 15-32 17Z" fill={c.surface} />
        <Path d="m173 153 33-16v27l-33 16Z" fill={c.primarySoft} />
        <Path d="m206 137 32 15v27l-32-15Z" fill={c.grid} />
        <Path d="m173 153 33-16 32 15-32 17Z" fill={c.surface} />
      </G>
      {[0, 1, 2].map((i) => (
        <G key={i} fill={c.chart}>
          <Path d={`m${119 + i * 14} ${110 - i * 7} 7-3v11l-7 3Z`} />
          <Path d={`m${181 + i * 14} ${87 + i * 7} 7 3v11l-7-3Z`} />
          <Path d={`m${235 + i * 11} ${137 - i * 5} 6-3v10l-6 3Z`} />
          <Path d={`m${283 + i * 11} ${120 + i * 5} 6 3v10l-6-3Z`} />
        </G>
      ))}
      {[
        [81, 155],
        [348, 177],
        [298, 94],
      ].map(([x, y], i) => (
        <G key={i}>
          <Path d={`M${x} ${y}v-26`} stroke={c.primary} strokeWidth={2} />
          <Ellipse cx={x} cy={y - 30} rx={11} ry={17} fill={c.chart} />
        </G>
      ))}
      <Path
        d="M172 61V30h119v55M119 90H72V55"
        stroke={c.chart}
        strokeDasharray="4 5"
        fill="none"
      />
      <Circle cx={72} cy={48} r={14} fill={c.surface} stroke={c.chart} />
      <Path d="m66 48 4 4 8-9" stroke={c.primary} strokeWidth={2} fill="none" />
      <Rect x={273} y={16} width={36} height={30} rx={9} fill={c.primary} />
      <Path
        d="m282 29 6 6 12-12"
        stroke={c.surface}
        strokeWidth={2}
        fill="none"
      />
      <Circle cx={353} cy={91} r={21} fill={c.surface} />
      <Path
        d="m353 78 10 4v6c0 8-10 14-10 14s-10-6-10-14v-6Z"
        fill={c.primarySoft}
        stroke={c.primary}
      />
      <Circle cx={353} cy={88} r={3} fill={c.primary} />
    </Svg>
  );
}
