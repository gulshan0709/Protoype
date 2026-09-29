import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
} from "react-native";
import { Asset } from "expo-asset";
import {
  FRAME_PAGE_SIZE,
  describeFrame,
  formatBytes,
  formatCount,
  listFrames,
  type MediaFrame,
  type MediaRecording,
  type MediaSelection,
} from "../../../domain/media/explorer";
import { detectionStyles } from "../../../domain/contracts/detectionDemo";
import type { DataRecord } from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import {
  Badge,
  Button,
  IconButton,
  Row,
  Txt,
} from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Dialog } from "../../../shared/ui/Dialog";
import { CaptureFrame, MediaPlayer } from "./RecordMedia";
import { demoStills } from "./demoCaptures";
import { mediaFrameSources } from "./mediaFrameSources";

/** Tile widths behind the density switch: how many frames fit on one screen. */
const DENSITY = {
  large: { label: "Large", min: 300, phone: 260 },
  medium: { label: "Medium", min: 200, phone: 150 },
  small: { label: "Small", min: 140, phone: 100 },
} as const;
type Density = keyof typeof DENSITY;
const META = 42;
const OVERSCAN = 2;
// Explicit size: RN Web otherwise draws a bundled image at its intrinsic size.
const FILL = {
  position: "absolute",
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
} as const;
const stillOf = (frame: MediaFrame) =>
  frame.still ? demoStills.find((s) => s.id === frame.still) : undefined;

/** Grid thumbnail. Stills get their detection box drawn; clip frames carry theirs. */
function FrameThumb({ frame, height }: { frame: MediaFrame; height: number }) {
  const [failed, setFailed] = useState(false);
  const source = mediaFrameSources[frame.file];
  const still = stillOf(frame);
  const [x, y, w, h] = still?.box ?? [0, 0, 0, 0];
  return (
    <View style={{ height, backgroundColor: "#071c2c", overflow: "hidden" }}>
      {source && !failed ? (
        <Image
          source={source.thumb}
          resizeMode="cover"
          onError={() => setFailed(true)}
          style={FILL}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { alignItems: "center", justifyContent: "center", gap: 4 },
          ]}
        >
          <Icon name="image" size={18} color="#8da2b5" />
          <Txt size={11} color="#8da2b5">
            Unavailable
          </Txt>
        </View>
      )}
      {still && frame.kind && !failed && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            width: `${w}%`,
            height: `${h}%`,
            borderWidth: 1.5,
            borderColor: detectionStyles[frame.kind].color,
          }}
        />
      )}
    </View>
  );
}

const FrameTile = memo(function FrameTile({
  frame,
  index,
  width,
  height,
  onOpen,
}: {
  frame: MediaFrame;
  index: number;
  width: number;
  height: number;
  onOpen: (index: number) => void;
}) {
  const c = useTheme();
  const meta = describeFrame(frame.name);
  return (
    <Pressable
      testID="media-frame-tile"
      accessibilityRole="button"
      accessibilityLabel={`Open frame ${meta.sequence} at ${meta.timeShort}`}
      onPress={() => onOpen(index)}
      style={({ pressed, hovered }: any) => ({
        width,
        height,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: hovered ? c.link : c.border,
        backgroundColor: pressed ? c.primarySoft : c.surface,
        overflow: "hidden",
      })}
    >
      <FrameThumb frame={frame} height={height - META} />
      <Row style={{ height: META, paddingHorizontal: 8, gap: 6 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={12} bold lines={1} style={{ lineHeight: 17 }}>
            {meta.timeShort || frame.name}
          </Txt>
          <Txt size={10} color={c.muted} lines={1} style={{ lineHeight: 15 }}>
            {`${meta.sequence} · ${formatBytes(frame.size)}`}
          </Txt>
        </View>
        <Txt size={10} color={c.subtle}>
          {formatCount(index + 1)}
        </Txt>
      </Row>
    </Pressable>
  );
});

/**
 * Everything in one half-hour slot, following the legacy FrameGrid. Two things
 * keep it light: frames arrive FRAME_PAGE_SIZE at a time (Load more, or on
 * scroll when switched on), and only the rows near the viewport are mounted.
 */
export function FrameGrid({
  selection,
  scope,
  now,
  contextLine,
  onCount,
}: {
  selection: MediaSelection;
  scope: string;
  now: Date;
  contextLine: string;
  onCount: (count: { loaded: number; hasMore: boolean }) => void;
}) {
  const c = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const phone = windowWidth < 768;
  const scrollRef = useRef<ScrollView>(null);
  const [first] = useState(() => listFrames(selection, scope, now));
  const [frames, setFrames] = useState(first.frames);
  const [cursor, setCursor] = useState({
    marker: first.nextMarker,
    hasMore: first.hasMore,
  });
  const [density, setDensity] = useState<Density>("medium");
  const [autoLoad, setAutoLoad] = useState(false);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [top, setTop] = useState(0);
  const [lightbox, setLightbox] = useState(-1);
  const [playing, setPlaying] = useState<MediaRecording>();

  const pad = phone ? 8 : 12;
  const gap = phone ? 8 : 12;
  const inner = Math.max(0, box.width - pad * 2);
  const min = phone ? DENSITY[density].phone : DENSITY[density].min;
  const columns = Math.max(1, Math.floor((inner + gap) / (min + gap)));
  const tileWidth = inner ? (inner - gap * (columns - 1)) / columns : min;
  const tileHeight = Math.round((tileWidth * 9) / 16) + META;
  const rowHeight = tileHeight + gap;
  const rowCount = Math.ceil(frames.length / columns);
  const firstRow = Math.max(0, Math.floor((top - pad) / rowHeight) - OVERSCAN);
  const lastRow = Math.min(
    rowCount,
    firstRow + Math.ceil((box.height || rowHeight) / rowHeight) + OVERSCAN * 2,
  );
  const totalHeight = Math.max(0, rowCount * rowHeight - gap);
  const distanceToBottom = totalHeight + pad - top - box.height;
  const viewport = phone
    ? Math.min(900, Math.max(320, windowHeight - 240))
    : Math.min(1200, Math.max(360, windowHeight - 320));

  const loadMore = useCallback(() => {
    if (!cursor.hasMore) return;
    const page = listFrames(selection, scope, now, { marker: cursor.marker });
    setFrames((current) => [...current, ...page.frames]);
    setCursor({ marker: page.nextMarker, hasMore: page.hasMore });
  }, [cursor, selection, scope, now]);
  // Off by default: an explicit "Load more" keeps a 1,300-frame slot in the user's hands.
  useEffect(() => {
    if (autoLoad && cursor.hasMore && box.height && distanceToBottom < 600)
      loadMore();
  }, [autoLoad, cursor.hasMore, box.height, distanceToBottom, loadMore]);
  useEffect(() => {
    onCount({ loaded: frames.length, hasMore: cursor.hasMore });
  }, [frames.length, cursor.hasMore, onCount]);
  const toTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setTop(0);
  };
  const step = useCallback(
    (delta: number) =>
      setLightbox((index) =>
        Math.min(frames.length - 1, Math.max(0, index + delta)),
      ),
    [frames.length],
  );
  const recordingRecord = (recording: MediaRecording): DataRecord => ({
    id: recording.key,
    type: "recording",
    scope: [scope],
    cells: {},
    state: { label: "Available", tone: "healthy" },
    action: "Open recording",
    videoAsset: recording.video,
    captureAsset: recording.video,
    detail: {
      title: contextLine,
      eyebrow: "RECORDING",
      summary: "",
      facts: [],
      sections: [],
      timeline: [],
      permittedActions: [],
    },
  });

  return (
    <View style={{ gap: 12 }}>
      <Row
        style={{ flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}
      >
        <Row style={{ gap: 8, flexWrap: "wrap" }}>
          <Icon name="image" size={18} color={c.link} />
          <Txt size={15} bold>
            {`${formatCount(frames.length)} frame${frames.length === 1 ? "" : "s"} loaded`}
          </Txt>
          {cursor.hasMore ? (
            <Badge label="More available" tone="attention" />
          ) : (
            frames.length > 0 && <Badge label="Complete slot" tone="healthy" />
          )}
        </Row>
        <Row style={{ gap: 10, flexWrap: "wrap" }}>
          <Row style={{ gap: 6 }}>
            <Switch
              accessibilityLabel="Auto-load on scroll"
              value={autoLoad}
              onValueChange={setAutoLoad}
              trackColor={{ false: c.border, true: c.actionPrimary }}
              thumbColor="#FFFFFF"
              {...(Platform.OS === "web"
                ? { activeThumbColor: "#FFFFFF" }
                : {})}
            />
            <Txt size={12} color={c.muted}>
              Auto-load on scroll
            </Txt>
          </Row>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Tile size"
            style={{
              flexDirection: "row",
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {(Object.keys(DENSITY) as Density[]).map((key, i) => (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityLabel={`${DENSITY[key].label} tiles`}
                accessibilityState={{ checked: density === key }}
                aria-checked={density === key}
                onPress={() => setDensity(key)}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderLeftWidth: i ? 1 : 0,
                  borderColor: c.border,
                  backgroundColor:
                    density === key ? c.actionPrimary : c.surface,
                }}
              >
                <Txt
                  size={12}
                  bold={density === key}
                  color={density === key ? c.actionInk : c.text}
                >
                  {DENSITY[key].label}
                </Txt>
              </Pressable>
            ))}
          </View>
          <IconButton
            name="top"
            label="Back to the first frame"
            onPress={toTop}
          />
        </Row>
      </Row>

      {first.recordings.length > 0 && (
        <Row style={{ flexWrap: "wrap", gap: 8 }}>
          <Icon name="play" size={16} color={c.muted} />
          <Txt size={12} color={c.muted}>
            {`Recording${first.recordings.length === 1 ? "" : "s"} in this slot:`}
          </Txt>
          {first.recordings.map((recording) => (
            <Pressable
              key={recording.key}
              testID="media-recording"
              accessibilityRole="button"
              accessibilityLabel={`Play recording ${recording.name}`}
              onPress={() => setPlaying(recording)}
              style={({ pressed, hovered }: any) => ({
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 99,
                borderWidth: 1,
                borderColor: hovered ? c.link : c.border,
                backgroundColor: pressed ? c.primarySoft : c.surface,
              })}
            >
              <Txt size={12} color={c.link} lines={1}>
                {`${recording.name} · ${formatBytes(recording.size)}`}
              </Txt>
            </Pressable>
          ))}
        </Row>
      )}

      <ScrollView
        ref={scrollRef}
        testID="media-frame-scroller"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setBox((b) =>
            b.width === width && b.height === height ? b : { width, height },
          );
        }}
        // Only whole rows change what is mounted, so scrolling re-renders once per row.
        onScroll={(e) =>
          setTop(Math.floor(e.nativeEvent.contentOffset.y / 48) * 48)
        }
        style={{
          height: viewport,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 12,
          backgroundColor: c.background,
        }}
        contentContainerStyle={{ padding: pad }}
      >
        {frames.length === 0 ? (
          <View
            style={{
              height: viewport - pad * 2,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Icon name="image" size={22} color={c.subtle} />
            <Txt color={c.muted}>No frames in this time slot.</Txt>
          </View>
        ) : (
          <>
            {/* The spacer keeps the full height so the scrollbar is honest about
                how much is loaded, though only a window of rows is mounted. */}
            <View style={{ height: totalHeight }}>
              {box.width > 0 &&
                Array.from(
                  { length: Math.max(0, lastRow - firstRow) },
                  (_, k) => {
                    const row = firstRow + k;
                    return (
                      <View
                        key={row}
                        style={{
                          position: "absolute",
                          top: row * rowHeight,
                          left: 0,
                          right: 0,
                          flexDirection: "row",
                          gap,
                        }}
                      >
                        {frames
                          .slice(row * columns, row * columns + columns)
                          .map((frame, i) => (
                            <FrameTile
                              key={frame.key}
                              frame={frame}
                              index={row * columns + i}
                              width={tileWidth}
                              height={tileHeight}
                              onOpen={setLightbox}
                            />
                          ))}
                      </View>
                    );
                  },
                )}
            </View>
            <View
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTopWidth: 1,
                borderColor: c.border,
                alignItems: "center",
                gap: 8,
              }}
            >
              {cursor.hasMore ? (
                <>
                  <Button
                    testID="media-load-more"
                    label={`Load next ${FRAME_PAGE_SIZE} frames`}
                    variant="primary"
                    onPress={loadMore}
                  />
                  <Txt size={11} color={c.muted}>
                    {`${formatCount(frames.length)} loaded so far · this slot has more.`}
                  </Txt>
                </>
              ) : (
                <Txt size={11} color={c.muted}>
                  {`End of slot · ${formatCount(frames.length)} frame${frames.length === 1 ? "" : "s"} in total.`}
                </Txt>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {lightbox >= 0 && lightbox < frames.length && (
        <FrameLightbox
          frames={frames}
          index={lightbox}
          hasMore={cursor.hasMore}
          contextLine={contextLine}
          onClose={() => setLightbox(-1)}
          onStep={step}
        />
      )}
      {playing && (
        <Dialog
          title={`Recording · ${playing.name}`}
          onClose={() => setPlaying(undefined)}
          wide
        >
          <MediaPlayer record={recordingRecord(playing)} />
        </Dialog>
      )}
    </View>
  );
}

/**
 * One frame at full size. It repeats which customer, camera, day and slot the
 * frame came from: at full size the grid's context is off screen.
 */
function FrameLightbox({
  frames,
  index,
  hasMore,
  contextLine,
  onClose,
  onStep,
}: {
  frames: MediaFrame[];
  index: number;
  hasMore: boolean;
  contextLine: string;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const c = useTheme();
  const frame = frames[index];
  const meta = describeFrame(frame.name);
  const still = stillOf(frame);
  const source = mediaFrameSources[frame.file];
  const web = Platform.OS === "web";
  useEffect(() => {
    if (!web) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === "INPUT") return;
      if (event.key === "ArrowRight") onStep(1);
      else if (event.key === "ArrowLeft") onStep(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [web, onStep]);
  const openOriginal = () => {
    if (source)
      window.open(Asset.fromModule(source.full).uri, "_blank", "noopener");
  };
  return (
    <Dialog title="Camera frame" onClose={onClose} wide>
      <View testID="media-lightbox" style={{ gap: 12 }}>
        <View style={{ gap: 2 }}>
          <Txt size={15} bold>
            {meta.time || frame.name}
            <Txt size={15} color={c.muted}>{`  ${meta.sequence}`}</Txt>
          </Txt>
          <Txt size={12} color={c.muted}>
            {contextLine}
          </Txt>
        </View>
        <View>
          {still && frame.kind ? (
            <CaptureFrame still={still} kind={frame.kind} title={frame.name} />
          ) : (
            <View
              style={{
                width: "100%",
                aspectRatio: 16 / 9,
                borderRadius: 10,
                overflow: "hidden",
                backgroundColor: "#071c2c",
              }}
            >
              {source && (
                <Image
                  key={frame.key}
                  source={source.full}
                  accessibilityLabel={`Frame ${meta.sequence}`}
                  resizeMode="contain"
                  style={FILL}
                />
              )}
            </View>
          )}
          {[-1, 1].map((delta) => {
            const disabled =
              delta < 0 ? index === 0 : index === frames.length - 1;
            return (
              <Pressable
                key={delta}
                accessibilityRole="button"
                accessibilityLabel={delta < 0 ? "Previous frame" : "Next frame"}
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => onStep(delta)}
                style={({ pressed }) => ({
                  position: "absolute",
                  top: "50%",
                  marginTop: -22,
                  ...(delta < 0 ? { left: 8 } : { right: 8 }),
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? "rgba(0,0,0,0.7)"
                    : "rgba(0,0,0,0.45)",
                  opacity: disabled ? 0.35 : 1,
                })}
              >
                <View style={{ transform: [{ scaleX: delta < 0 ? -1 : 1 }] }}>
                  <Icon name="chevron" size={22} color="#FFFFFF" />
                </View>
              </Pressable>
            );
          })}
        </View>
        <Row
          style={{ flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}
        >
          <View style={{ flex: 1, minWidth: 200 }}>
            <Txt size={11} color={c.muted} lines={1}>
              {frame.name}
            </Txt>
            <Txt size={11} color={c.muted}>
              {formatBytes(frame.size)}
            </Txt>
          </View>
          <Badge
            label={`${formatCount(index + 1)} of ${formatCount(frames.length)}${hasMore ? "+" : ""} loaded`}
          />
        </Row>
        {web && (
          <Row
            style={{
              flexWrap: "wrap",
              gap: 10,
              justifyContent: "space-between",
            }}
          >
            <Button
              compact
              label="Open original"
              icon="external"
              onPress={openOriginal}
            />
            <Txt size={11} color={c.subtle}>
              ← → to move · Esc to close
            </Txt>
          </Row>
        )}
      </View>
    </Dialog>
  );
}
