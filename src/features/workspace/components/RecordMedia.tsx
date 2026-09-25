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
export function MediaPlayer({ record }: { record: DataRecord }) {
  const c = useTheme();
  const capture =
    typeof record.captureAsset === "number"
      ? captures[record.captureAsset]
      : undefined;
  const video =
    typeof record.videoAsset === "number"
      ? videos[record.videoAsset]
      : undefined;
  const uri = video ? Asset.fromModule(video).uri : undefined;
  if (uri && Platform.OS === "web")
    return React.createElement("video", {
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
    });
  return (
    <View style={{ gap: 12, alignSelf: "stretch" }}>
      {(capture || video) && (
        <NativeMedia
          key={record.id}
          capture={capture}
          video={video}
          title={record.detail.title}
        />
      )}
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
  // Android gives bundled images their file size (640 x 480) as a default
  // style, so an Image with width "100%" and aspectRatio widens to 640. Size
  // this frame instead and fill it with the capture or player.
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
function FaceCapture({ uri, size = 52 }: { uri: string; size?: number }) {
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
        source={{ uri }}
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
              borderColor: c.healthy,
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
              backgroundColor: c.healthy,
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
  const person = record.person as { image?: string } | undefined;
  const face = !video ? person?.image : undefined;
  const capture =
    typeof record.captureAsset === "number"
      ? captures[record.captureAsset]
      : undefined;
  if (!capture)
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
          <FaceCapture uri={face} />
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
              <FaceCapture uri={face} size={240} />
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
