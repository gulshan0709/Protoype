import {
  detectionKind,
  detectionStyles,
  type DetectionKind,
} from "../../../domain/contracts/detectionDemo";
import { userIdentity } from "../../../domain/contracts/userIdentity";
import {
  demoGender,
  demoPortrait,
  portraitSource,
} from "../../../shared/ui/demoPortrait";
import { demoStills, type DemoStill } from "./demoCaptures";
import { useReducedMotion } from "../../../shared/motion/MotionProvider";
import React, { useState, useEffect, useRef } from "react";
import {
  Image,
  View,
  Pressable,
  Platform,
  Animated,
  StyleSheet,
} from "react-native";
import { Asset } from "expo-asset";
import { useVideoPlayer, VideoView } from "expo-video";
import type { DataRecord } from "../../../domain/contracts/types";
import { Dialog } from "../../../shared/ui/Dialog";
import { Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { useTheme } from "../../../shared/theme/Theme";
const captures = [
  require("../../../../assets/media/capture-1.jpg"),
  require("../../../../assets/media/capture-2.jpg"),
  require("../../../../assets/media/capture-3.jpg"),
];
const videos = [
  require("../../../../assets/media/gate-1.mp4"),
  require("../../../../assets/media/gate-2.mp4"),
  require("../../../../assets/media/gate-3.mp4"),
];
// Poster frame for camera recordings; person captures use stillFor instead.
const captureFor = (record: DataRecord) =>
  typeof record.captureAsset === "number" && typeof record.videoAsset === "number"
    ? captures[record.captureAsset]
    : undefined;
const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};
/** One HD still per person (UID, else name), matching the demo gender when known. */
export function stillFor(record: DataRecord): DemoStill | undefined {
  if (typeof record.captureAsset !== "number" || typeof record.videoAsset === "number")
    return undefined;
  const person = userIdentity(record);
  const gender = demoGender(person?.name, person?.image);
  const pool = gender ? demoStills.filter((s) => s.gender === gender) : demoStills;
  const key = person?.uid || person?.name || record.detail.title || record.id;
  return pool[hash(key) % pool.length];
}
const labelShadow = {
  textShadowColor: "rgba(16,32,48,0.95)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
};
/** Whole 16:9 frame with the person's box and label drawn inside it. */
function CaptureFrame({
  still,
  kind,
  title,
}: {
  still: DemoStill;
  kind: DetectionKind;
  title: string;
}) {
  const [width, setWidth] = useState(0);
  const { color, label } = detectionStyles[kind];
  const [x, y, w, h] = still.box;
  const font = Math.max(10, Math.min(18, width * 0.0146));
  const above = (y / 100) * (width * 0.5625) > font * 1.4 + 6;
  const right = x + w / 2 > 50;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        width: "100%",
        aspectRatio: 16 / 9,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: "#071c2c",
      }}
    >
      <Image
        source={still.source}
        accessibilityLabel={"Capture for " + title}
        resizeMode="cover"
        style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: `${w}%`,
          height: `${h}%`,
          borderWidth: Math.max(2, width / 480),
          borderColor: color,
        }}
      />
      {width > 0 && (
        <Txt
          bold
          size={font}
          color={color}
          style={[
            labelShadow,
            { position: "absolute" },
            right ? { right: `${100 - x - w}%` } : { left: `${x}%` },
            above
              ? { bottom: `${100 - y}%`, marginBottom: 4 }
              : { top: `${y}%`, marginTop: 4, marginLeft: 6, marginRight: 6 },
          ]}
        >
          {label.toUpperCase() + " (DEMO)"}
        </Txt>
      )}
    </View>
  );
}
/** Small preview cropped around the person so the box stays visible. */
function CaptureThumb({ still, kind }: { still: DemoStill; kind: DetectionKind }) {
  const W = 64,
    H = 52;
  const [x, y, w, h] = still.box.map((v) => v / 100);
  const fw = Math.max((H * 16) / 9, Math.min((W * 0.75) / w, (H * 0.85) / (h * 0.5625)));
  const fh = fw * 0.5625;
  const left = Math.min(0, Math.max(W - fw, W / 2 - (x + w / 2) * fw));
  const top = Math.min(0, Math.max(H - fh, H / 2 - (y + h / 2) * fh));
  return (
    <View
      style={{
        width: W,
        height: H,
        borderRadius: 9,
        overflow: "hidden",
        backgroundColor: "#071c2c",
      }}
    >
      <Image
        source={still.source}
        style={{ position: "absolute", left, top, width: fw, height: fh }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: left + x * fw,
          top: top + y * fh,
          width: w * fw,
          height: h * fh,
          borderWidth: 1.5,
          borderColor: detectionStyles[kind].color,
        }}
      />
    </View>
  );
}
function DetectionLegend() {
  const c = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Txt size={11} color={c.muted}>
        HD demo footage · Simulated detections
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {Object.values(detectionStyles).map(({ label, color }) => (
          <View
            key={label}
            style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          >
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                backgroundColor: color,
              }}
            />
            <Txt size={11} color={c.text}>
              {label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
export function MediaPlayer({ record }: { record: DataRecord }) {
  const c = useTheme();
  const capture = captureFor(record);
  const video =
    typeof record.videoAsset === "number"
      ? videos[record.videoAsset]
      : undefined;
  const uri = video ? Asset.fromModule(video).uri : undefined;
  if (uri && Platform.OS === "web")
    return (
      <View style={{ gap: 10 }}>
        {React.createElement("video", {
          src: uri,
          poster: capture ? Asset.fromModule(capture).uri : undefined,
          controls: true,
          playsInline: true,
          preload: "metadata",
          "aria-label": "Recording for " + record.detail.title,
          style: {
            width: "100%",
            maxHeight: "65vh",
            borderRadius: 10,
            backgroundColor: "#071c2c",
          },
        })}
        <DetectionLegend />
      </View>
    );
  const still = video ? undefined : stillFor(record);
  // Stills stay a compact 640px preview; recordings keep the full width.
  return (
    <View
      style={
        still
          ? { gap: 12, width: "100%", maxWidth: 640, alignSelf: "flex-start" }
          : { gap: 12, alignSelf: "stretch" }
      }
    >
      {still && (
        <CaptureFrame
          still={still}
          kind={detectionKind(record)}
          title={record.detail.title}
        />
      )}
      {!still && (capture || video) && (
        <NativeMedia
          key={record.id}
          capture={capture}
          video={video}
          title={record.detail.title}
        />
      )}
      <DetectionLegend />
      <Txt size={12} color={c.muted}>
        {record.detail.title}
      </Txt>
    </View>
  );
}
function NativeMedia({
  capture,
  video,
  title,
}: {
  capture?: number;
  video?: number;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  const size = capture ? Asset.fromModule(capture) : undefined;
  const ratio = size?.width && size.height ? size.width / size.height : 4 / 3;
  // Constrain the frame so native bundled image dimensions cannot widen the layout.
  return (
    <View
      style={{
        width: "100%",
        aspectRatio: ratio,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: "#071c2c",
      }}
    >
      {video && playing ? (
        <NativeVideo source={video} title={title} />
      ) : (
        <>
          {capture && (
            <Image
              accessibilityLabel={"Capture for " + title}
              source={capture}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
            />
          )}
          {video && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={"Play recording for " + title}
              onPress={() => setPlaying(true)}
              style={[
                StyleSheet.absoluteFill,
                { alignItems: "center", justifyContent: "center" },
              ]}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  borderWidth: 2,
                  borderColor: "rgba(255,255,255,0.9)",
                  backgroundColor: "rgba(7,28,44,0.72)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="play" size={28} color="#fff" />
              </View>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
// Mounted only after Play so lists of cameras don't each create a player.
function NativeVideo({ source, title }: { source: number; title: string }) {
  const player = useVideoPlayer(source, (p) => p.play());
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      surfaceType="textureView"
      accessibilityLabel={"Recording for " + title}
      style={StyleSheet.absoluteFill}
    />
  );
}
function FaceCapture({
  uri,
  name,
  size = 52,
  color,
}: {
  uri: string;
  name?: string;
  size?: number;
  color: string;
}) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const scan = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    scan.setValue(0);
    if (reduced) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.delay(800),
        Animated.timing(scan, {
          toValue: 0,
          duration: 0,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
      { iterations: 2 },
    );
    animation.start();
    return () => animation.stop();
  }, [scan, reduced, uri]);
  const inset = size * 0.13;
  const edge = size * 0.22;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        overflow: "hidden",
        backgroundColor: c.primarySoft,
      }}
    >
      <Image
        // The person's own portrait at the drawn size (thumbnail or HD).
        source={
          portraitSource(name ?? "", { image: uri, size }) ??
          demoPortrait(uri, name)
        }
        accessibilityLabel="Face capture"
        resizeMode="cover"
        style={{ width: size, height: size }}
      />
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
        {(["tl", "tr", "bl", "br"] as const).map((corner) => (
          <View
            key={corner}
            style={{
              position: "absolute",
              width: edge,
              height: edge,
              borderColor: color,
              ...(corner[0] === "t"
                ? { top: 0, borderTopWidth: 2 }
                : { bottom: 0, borderBottomWidth: 2 }),
              ...(corner[1] === "l"
                ? { left: 0, borderLeftWidth: 2 }
                : { right: 0, borderRightWidth: 2 }),
            }}
          />
        ))}
        {!reduced && (
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 2,
              right: 2,
              height: 1,
              backgroundColor: color,
              opacity: scan.interpolate({
                inputRange: [0, 0.15, 0.85, 1],
                outputRange: [0, 0.7, 0.7, 0],
              }),
              transform: [
                {
                  translateY: scan.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, size - inset * 2],
                  }),
                },
              ],
            }}
          />
        )}
      </View>
    </View>
  );
}
export function RecordMedia({ record }: { record: DataRecord }) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const video = typeof record.videoAsset === "number";
  const person = record.person as { image?: string; name?: string } | undefined;
  const face = !video ? person?.image : undefined;
  const capture = captureFor(record);
  const still = stillFor(record);
  if (!capture && !still)
    return (
      <Txt size={12} color={c.muted}>
        Unavailable
      </Txt>
    );
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          (video ? "Play recording for " : "View capture for ") +
          record.detail.title
        }
        onPress={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        style={{
          alignSelf: "flex-start",
          minWidth: 52,
          minHeight: 52,
          borderRadius: 9,
        }}
      >
        {face ? (
          <FaceCapture
            uri={face}
            name={person?.name}
            color={detectionStyles[detectionKind(record)].color}
          />
        ) : still ? (
          <CaptureThumb still={still} kind={detectionKind(record)} />
        ) : (
          <View>
            <Image
              source={capture}
              accessibilityLabel={"Capture for " + record.detail.title}
              style={{ width: video ? 80 : 64, height: 52, borderRadius: 9 }}
            />
            {video && (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  inset: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Txt size={20} color="#fff">
                  {"\u25b6"}
                </Txt>
              </View>
            )}
          </View>
        )}
      </Pressable>
      {open && (
        <Dialog
          title={video ? "Recorded video" : "Face capture"}
          onClose={() => setOpen(false)}
          wide={video}
        >
          {face ? (
            <View style={{ alignItems: "center", gap: 16 }}>
              <FaceCapture
                uri={face}
                name={person?.name}
                size={240}
                color={detectionStyles[detectionKind(record)].color}
              />
              <Txt bold color={detectionStyles[detectionKind(record)].color}>
                {detectionStyles[detectionKind(record)].label} · Demo capture
              </Txt>
              <Txt size={14} bold>
                {record.detail.title}
              </Txt>
            </View>
          ) : (
            <MediaPlayer record={record} />
          )}
        </Dialog>
      )}
    </View>
  );
}
