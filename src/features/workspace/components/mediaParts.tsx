import { useEffect, useRef, type ReactNode } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";
import type { DataRecord, Status } from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { IconButton, Txt } from "../../../shared/ui/Primitives";

// Pieces shared by the capture, gallery and camera-frame views.

/** Behind camera images while they load, and around letterboxed frames. */
export const MEDIA_BG = "#071c2c";
/** Tint for captures taken in the dark hours. */
const LOW_LIGHT = "rgba(4,16,34,0.34)";
const CORNERS = ["tl", "tr", "bl", "br"] as const;

/** Darkens the media under it, for a capture taken in the dark hours. */
export function LowLightTint({ radius }: { radius?: number }) {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: radius, backgroundColor: LOW_LIGHT },
      ]}
    />
  );
}

/** The detected person's box, in percent of the frame. */
export function DetectionBox({
  box,
  color,
  stroke,
}: {
  box: readonly [number, number, number, number];
  color: string;
  stroke: number;
}) {
  const [x, y, w, h] = box;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${w}%`,
        height: `${h}%`,
        borderWidth: stroke,
        borderColor: color,
      }}
    />
  );
}

/**
 * A square face crop: the image at the capture's framing, the low-light tint
 * and, with a `color`, corner brackets `inset` from the edges. `children` are
 * drawn inside the bracket frame (the scan line).
 */
export function FaceCrop({
  source,
  label,
  size,
  radius,
  background,
  framing,
  lowLight,
  color,
  bracket,
  children,
}: {
  source?: ImageSourcePropType;
  label?: string;
  size: number;
  radius: number;
  background: string;
  /** Where the crop sits on the face (zoom, offset as a share of the size). */
  framing?: { scale: number; x: number; y: number };
  lowLight?: boolean;
  color?: string;
  bracket: { inset: number; edge: number; stroke: number };
  children?: ReactNode;
}) {
  const { inset, edge, stroke } = bracket;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: background,
      }}
    >
      {source && (
        <Image
          source={source}
          accessibilityLabel={label}
          resizeMode="cover"
          // Explicit size: RN Web otherwise draws a bundled image at its own size.
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: size,
            height: size,
            transform: framing
              ? [
                  { translateX: framing.x * size },
                  { translateY: framing.y * size },
                  { scale: framing.scale },
                ]
              : undefined,
          }}
        />
      )}
      {lowLight && <LowLightTint />}
      {(!!color || !!children) && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: inset,
            left: inset,
            right: inset,
            bottom: inset,
          }}
        >
          {!!color &&
            CORNERS.map((corner) => (
              <View
                key={corner}
                style={{
                  position: "absolute",
                  width: edge,
                  height: edge,
                  borderColor: color,
                  ...(corner[0] === "t"
                    ? { top: 0, borderTopWidth: stroke }
                    : { bottom: 0, borderBottomWidth: stroke }),
                  ...(corner[1] === "l"
                    ? { left: 0, borderLeftWidth: stroke }
                    : { right: 0, borderRightWidth: stroke }),
                }}
              />
            ))}
          {children}
        </View>
      )}
    </View>
  );
}

/** Previous / next buttons over the middle of a picture's left and right edges. */
export function StepArrows({
  size,
  labels,
  canStep,
  onStep,
}: {
  size: number;
  /** Accessible names of the back and forward buttons. */
  labels: [string, string];
  canStep: (delta: -1 | 1) => boolean;
  onStep: (delta: -1 | 1) => void;
}) {
  return (
    <>
      {([-1, 1] as const).map((delta) => (
        <View
          key={delta}
          style={{
            position: "absolute",
            top: "50%",
            marginTop: -size / 2,
            ...(delta < 0 ? { left: 8 } : { right: 8 }),
          }}
        >
          <IconButton
            variant="overlay"
            shape="round"
            size={size}
            iconSize={size / 2}
            name={delta < 0 ? "left" : "chevron"}
            label={labels[delta < 0 ? 0 : 1]}
            disabled={!canStep(delta)}
            onPress={() => onStep(delta)}
          />
        </View>
      ))}
    </>
  );
}

/** ← and → call `onStep` on web, except while typing in a field. */
export function useArrowKeys(onStep: (delta: -1 | 1) => void) {
  const latest = useRef(onStep);
  latest.current = onStep;
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === "INPUT") return;
      if (event.key === "ArrowRight") latest.current(1);
      else if (event.key === "ArrowLeft") latest.current(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}

/** The keyboard shortcuts of a media viewer (web only). */
export function KeyboardHint() {
  const c = useTheme();
  if (Platform.OS !== "web") return null;
  return (
    <Txt size={11} color={c.subtle}>
      ← → to move · Esc to close
    </Txt>
  );
}

/**
 * A record for media that is not a record of its own (a slot's recording, a
 * learner's capture), so the shared media views can show it. Other fields,
 * such as captureAsset, videoAsset, person and demoDetection, pass through.
 */
export function mediaRecord({
  title,
  eyebrow,
  summary = "",
  action = "",
  cells = {},
  ...fields
}: {
  id: string;
  type: string;
  scope: string[];
  state: Status;
  title: string;
  eyebrow: string;
  summary?: string;
  action?: string;
  cells?: DataRecord["cells"];
  [field: string]: unknown;
}): DataRecord {
  return {
    ...fields,
    cells,
    action,
    detail: {
      title,
      eyebrow,
      summary,
      facts: [],
      sections: [],
      timeline: [],
      permittedActions: [],
    },
  };
}
